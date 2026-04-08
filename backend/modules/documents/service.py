"""Document generation orchestration service.

Implements the 4-layer Grounded Generation pipeline:
1. Source Data Assembly (assembler.py)
2. Constrained Generation (prompts.py → LLM)
3. Fact-check + Subjective filter + Term normalization
4. Human-in-the-loop (frontend handles this)
"""

import json
import uuid
from dataclasses import dataclass, field

from sqlalchemy.ext.asyncio import AsyncSession

from core.llm.guards import GuardWarning, subjective_filter
from core.llm.service import LLMResponse, LLMService, ModelTier
from core.models.enums import DocType
from modules.documents.assembler import source_assembler
from modules.documents.guards import document_fact_checker
from modules.documents.normalizer import term_normalizer
from modules.documents.parser import parse_document_response
from modules.documents.prompts import (
    build_document_cached_system,
    build_document_dynamic_system,
)


@dataclass
class DocumentResult:
    """Result of the document generation pipeline."""

    generated_text: str = ""
    content: dict = field(default_factory=dict)
    source_data: dict = field(default_factory=dict)
    warnings: list[dict] = field(default_factory=list)
    has_unresolved_errors: bool = False
    llm_meta: dict = field(default_factory=dict)


class DocumentService:
    """Orchestrates the 4-layer Grounded Generation pipeline."""

    def __init__(self, llm_service: LLMService) -> None:
        self._llm = llm_service

    async def generate(
        self,
        patient_id: uuid.UUID,
        encounter_id: uuid.UUID | None,
        doc_type: DocType,
        db: AsyncSession,
    ) -> DocumentResult:
        """Generate a medical document with full validation pipeline.

        Args:
            patient_id: Target patient UUID.
            encounter_id: Related encounter UUID (optional).
            doc_type: Type of document to generate.
            db: Async database session.

        Returns:
            DocumentResult with generated text, warnings, and metadata.
        """
        # Layer 1: Source Data Assembly
        source_data = await source_assembler.assemble(patient_id, encounter_id, doc_type, db)

        # Layer 2: Constrained Generation
        cached_system = build_document_cached_system(doc_type)
        dynamic_system = build_document_dynamic_system(source_data)

        llm_response = await self._llm.generate_with_cache(
            cached_system=cached_system,
            dynamic_system=dynamic_system,
            messages=[{"role": "user", "content": f"{doc_type} 문서를 작성해 주세요."}],
            model_tier=ModelTier.SONNET,
            max_tokens=4096,
            temperature=0.0,
        )

        # Parse LLM JSON response
        parsed = parse_document_response(llm_response.content, doc_type)

        # Build generated_text from parsed content
        generated_text = self._build_generated_text(parsed, doc_type)

        # Layer 3a: Fact-check against source data
        guard_result = document_fact_checker.check(generated_text, source_data, doc_type)

        # Layer 3b: Subjective expression filter
        subj_warnings = subjective_filter.scan(generated_text)

        # Layer 3c: Term normalization
        normalized_text = term_normalizer.normalize(generated_text, doc_type)

        # Combine all warnings
        all_warnings = self._format_warnings(
            parsed.get("warnings", []),
            guard_result.warnings,
            subj_warnings,
        )

        has_errors = guard_result.has_errors or any(
            w.get("severity") == "error" for w in all_warnings
        )

        return DocumentResult(
            generated_text=normalized_text,
            content=parsed,
            source_data=source_data,
            warnings=all_warnings,
            has_unresolved_errors=has_errors,
            llm_meta=self._format_llm_meta(llm_response),
        )

    @staticmethod
    def _build_generated_text(parsed: dict, doc_type: str) -> str:
        """Assemble generated text from parsed content fields.

        Args:
            parsed: Parsed LLM JSON output.
            doc_type: Document type name.

        Returns:
            Full document text as a single string.
        """
        parts: list[str] = []
        for key, value in parsed.items():
            if key in ("title", "warnings"):
                continue
            if isinstance(value, str) and value:
                parts.append(value)
            elif isinstance(value, (dict, list)):
                parts.append(json.dumps(value, ensure_ascii=False))
        return "\n\n".join(parts) if parts else f"{doc_type} 문서 내용 없음"

    @staticmethod
    def _format_warnings(
        llm_warnings: list[str],
        guard_warnings: list[GuardWarning],
        subj_warnings: list[GuardWarning],
    ) -> list[dict]:
        """Merge warnings from all validation layers into a unified list.

        Args:
            llm_warnings: Raw warnings from LLM response.
            guard_warnings: Warnings from DocumentFactChecker.
            subj_warnings: Warnings from SubjectiveExpressionFilter.

        Returns:
            List of warning dicts with type, message, severity, and location.
        """
        warnings: list[dict] = []
        for w in llm_warnings:
            warnings.append({"type": "llm", "message": w, "severity": "warning"})
        for w in guard_warnings:
            warnings.append(
                {
                    "type": w.type,
                    "message": w.message,
                    "severity": w.severity,
                    "location": w.location,
                }
            )
        for w in subj_warnings:
            warnings.append(
                {
                    "type": w.type,
                    "message": w.message,
                    "severity": w.severity,
                    "location": w.location,
                }
            )
        return warnings

    @staticmethod
    def _format_llm_meta(response: LLMResponse) -> dict:
        """Format LLM response metadata for the result.

        Args:
            response: LLM response with token and cost info.

        Returns:
            Dict with model, latency, cost, and token counts.
        """
        return {
            "model": response.model,
            "latency_ms": response.latency_ms,
            "cost_usd": response.cost_usd,
            "input_tokens": response.input_tokens,
            "output_tokens": response.output_tokens,
            "cache_read_tokens": response.cache_read_tokens,
        }
