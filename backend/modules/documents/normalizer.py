"""Medical term normalization for official documents.

Converts colloquial Korean medical terms to formal equivalents.
Different document types require different formality levels.
"""

import re

from core.models.enums import DocType

# Informal Korean → Formal Korean (for 진단서, 소견서, 확인서)
TERM_MAP: dict[str, str] = {
    "고혈압": "본태성 고혈압",
    "당뇨": "제2형 당뇨병",
    "고지혈증": "이상지질혈증",
    "빈혈": "철결핍성 빈혈",
    "통풍": "통풍성 관절염",
    "갑상선": "갑상선기능저하증",
    "골다공증": "골다공증",
    "지방간": "비알코올 지방간질환",
    "위염": "위염",
    "역류": "위식도 역류질환",
}

# English abbreviation → Full formal Korean (for 진단서, 소견서, 확인서)
# For 의뢰서, abbreviations are kept as-is (doctors can read them)
ENGLISH_TERM_MAP: dict[str, str] = {
    "HTN": "본태성 고혈압",
    "DM": "제2형 당뇨병",
    "DLD": "이상지질혈증",
    "CKD": "만성 콩팥병",
    "eGFR": "추정 사구체여과율",
    "HbA1c": "당화혈색소",
    "LDL": "저밀도 지질단백질 콜레스테롤",
    "HDL": "고밀도 지질단백질 콜레스테롤",
    "TG": "중성지방",
    "AST": "아스파르테이트 아미노전이효소",
    "ALT": "알라닌 아미노전이효소",
    "Cr": "크레아티닌",
    "BUN": "혈중요소질소",
    "TSH": "갑상선자극호르몬",
    "U/A": "요검사",
}

# Formal Korean → Easy layperson Korean (for 건강진단서)
LAYPERSON_MAP: dict[str, str] = {
    "본태성 고혈압": "혈압이 높은 상태",
    "제2형 당뇨병": "혈당이 높은 상태",
    "이상지질혈증": "피 속 지방 수치가 높은 상태",
    "만성 콩팥병": "콩팥 기능이 떨어진 상태",
    "추정 사구체여과율": "콩팥이 1분에 걸러내는 피의 양",
}


class MedicalTermNormalizer:
    """Normalizes medical terms based on the target document type.

    Handles three normalization paths:
    - 건강진단서: formal → easy layperson Korean
    - 의뢰서: English abbreviations kept as-is (doctors can read them)
    - 진단서/소견서/확인서: everything normalized to formal Korean
    """

    def normalize(self, text: str, doc_type: DocType) -> str:
        """Normalize medical terms in text according to document type.

        Args:
            text: Input text containing medical terms.
            doc_type: Target document type that determines formality level.

        Returns:
            Text with terms normalized for the target document type.
        """
        if doc_type == DocType.건강진단서:
            return self._apply_layperson(text)

        if doc_type == DocType.의뢰서:
            # Doctors can read English abbreviations — keep them as-is
            # Still normalize Korean informal terms to formal
            result = self._apply_term_map(text)
            return result

        # 진단서, 소견서, 확인서, 검사결과안내서, 교육문서
        result = self._apply_term_map(text)
        result = self._apply_english_term_map(result)
        return result

    def normalize_diagnosis(self, name: str) -> str:
        """Normalize a single diagnosis name using TERM_MAP only.

        Args:
            name: A single diagnosis term to normalize.

        Returns:
            Formal Korean term, or original if no mapping found.
        """
        return TERM_MAP.get(name, name)

    def _apply_term_map(self, text: str) -> str:
        """Apply TERM_MAP substitutions with word-boundary awareness.

        Args:
            text: Input text.

        Returns:
            Text with informal Korean terms replaced by formal terms.
        """
        result = text
        for informal, formal in TERM_MAP.items():
            # Skip if the formal term already appears in text (prevent double normalization)
            if formal in result:
                continue
            # Use word boundaries for Korean: match term not preceded/followed by Korean chars
            pattern = r"(?<![가-힣])" + re.escape(informal) + r"(?![가-힣])"
            result = re.sub(pattern, formal, result)
        return result

    def _apply_english_term_map(self, text: str) -> str:
        """Replace English abbreviations with full formal Korean terms.

        Appended with the original abbreviation in parentheses for traceability,
        e.g. "eGFR" → "추정 사구체여과율(eGFR)".

        Args:
            text: Input text.

        Returns:
            Text with English abbreviations expanded to formal Korean.
        """
        result = text
        for abbr, formal in ENGLISH_TERM_MAP.items():
            # Skip if formal term already present (prevent double normalization)
            if formal in result:
                continue
            # Word boundary for English abbreviations
            pattern = r"\b" + re.escape(abbr) + r"\b"
            replacement = f"{formal}({abbr})"
            result = re.sub(pattern, replacement, result)
        return result

    def _apply_layperson(self, text: str) -> str:
        """Apply LAYPERSON_MAP to convert formal terms to easy Korean.

        Also normalizes informal terms first so that
        "고혈압" → "본태성 고혈압" → "혈압이 높은 상태".

        Args:
            text: Input text.

        Returns:
            Text with terms converted to layperson-friendly Korean.
        """
        # First normalize to formal so we have a consistent base
        result = self._apply_term_map(text)

        # Then convert formal → layperson
        for formal, easy in LAYPERSON_MAP.items():
            # Skip if layperson term already present
            if easy in result:
                continue
            result = result.replace(formal, easy)
        return result


# Module-level singleton
term_normalizer = MedicalTermNormalizer()
