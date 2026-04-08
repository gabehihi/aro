"""3-Layer abbreviation codebook service.

Layer 1 (builtin): Common Korean medical abbreviations (~200)
Layer 2 (institution): Institution-specific conventions
Layer 3 (personal): Per-user custom abbreviations stored in User.personal_codebook
"""

import json
from pathlib import Path
from typing import Any

from core.schemas.codebook import CodebookEntry, CodebookResolveResult

_DATA_DIR = Path(__file__).resolve().parents[3] / "data"

_layer1_cache: dict[str, dict[str, Any]] | None = None
_layer2_cache: dict[str, dict[str, Any]] | None = None


def _load_json(path: Path) -> dict[str, dict[str, Any]]:
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def _get_layer1() -> dict[str, dict[str, Any]]:
    global _layer1_cache
    if _layer1_cache is None:
        _layer1_cache = _load_json(_DATA_DIR / "codebook_builtin.json")
    return _layer1_cache


def _get_layer2() -> dict[str, dict[str, Any]]:
    global _layer2_cache
    if _layer2_cache is None:
        _layer2_cache = _load_json(_DATA_DIR / "codebook_institution.json")
    return _layer2_cache


class CodebookService:
    """Resolve abbreviations across 3 layers with priority: personal > institution > builtin."""

    def resolve(
        self,
        abbreviation: str,
        personal_codebook: dict[str, dict[str, Any]] | None = None,
    ) -> CodebookResolveResult:
        """Resolve a single abbreviation. Returns the highest-priority match."""
        # Layer 3: personal
        if personal_codebook:
            for _cat, entries in personal_codebook.items():
                if abbreviation in entries:
                    return CodebookResolveResult(
                        abbreviation=abbreviation,
                        entry=CodebookEntry(**entries[abbreviation]),
                        layer="personal",
                    )

        # Layer 2: institution
        layer2 = _get_layer2()
        for _cat, entries in layer2.items():
            if abbreviation in entries:
                return CodebookResolveResult(
                    abbreviation=abbreviation,
                    entry=CodebookEntry(**entries[abbreviation]),
                    layer="institution",
                )

        # Layer 1: builtin
        layer1 = _get_layer1()
        for _cat, entries in layer1.items():
            if abbreviation in entries:
                return CodebookResolveResult(
                    abbreviation=abbreviation,
                    entry=CodebookEntry(**entries[abbreviation]),
                    layer="builtin",
                )

        return CodebookResolveResult(abbreviation=abbreviation, entry=None, layer=None)

    def get_merged_codebook(
        self,
        personal_codebook: dict[str, dict[str, Any]] | None = None,
    ) -> dict[str, dict[str, Any]]:
        """Merge all 3 layers. Personal > Institution > Builtin."""
        merged: dict[str, dict[str, Any]] = {}

        # Start with builtin (lowest priority)
        for cat, entries in _get_layer1().items():
            merged.setdefault(cat, {}).update(entries)

        # Override with institution
        for cat, entries in _get_layer2().items():
            merged.setdefault(cat, {}).update(entries)

        # Override with personal (highest priority)
        if personal_codebook:
            for _cat, entries in personal_codebook.items():
                merged.setdefault(cat, {}).update(entries)

        return merged

    def get_prompt_text(
        self,
        personal_codebook: dict[str, dict[str, Any]] | None = None,
    ) -> str:
        """Generate codebook text for LLM system prompt injection (~2000 tokens)."""
        merged = self.get_merged_codebook(personal_codebook)
        lines: list[str] = ["## 의료 약어 코드북"]

        for category, entries in merged.items():
            lines.append(f"\n### {category}")
            for abbrev, data in entries.items():
                parts = [f"{abbrev} = {data['full']}"]
                if data.get("kcd"):
                    parts.append(f"KCD:{data['kcd']}")
                if data.get("atc"):
                    parts.append(f"ATC:{data['atc']}")
                if data.get("unit"):
                    parts.append(f"({data['unit']})")
                lines.append(" | ".join(parts))

        return "\n".join(lines)

    @staticmethod
    def add_personal_entry(
        personal_codebook: dict[str, dict[str, Any]] | None,
        category: str,
        abbreviation: str,
        entry: dict[str, Any],
    ) -> dict[str, dict[str, Any]]:
        """Add an entry to personal codebook (returns new dict, does not mutate)."""
        cb = {}
        if personal_codebook:
            for cat, entries in personal_codebook.items():
                cb[cat] = dict(entries)
        cb.setdefault(category, {})[abbreviation] = entry
        return cb

    @staticmethod
    def remove_personal_entry(
        personal_codebook: dict[str, dict[str, Any]] | None,
        category: str,
        abbreviation: str,
    ) -> dict[str, dict[str, Any]]:
        """Remove an entry from personal codebook (returns new dict)."""
        cb = {}
        if personal_codebook:
            for cat, entries in personal_codebook.items():
                cb[cat] = dict(entries)
        if category in cb:
            cb[category].pop(abbreviation, None)
            if not cb[category]:
                del cb[category]
        return cb


codebook_service = CodebookService()
