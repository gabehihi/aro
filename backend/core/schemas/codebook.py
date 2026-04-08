from pydantic import BaseModel, Field


class CodebookEntry(BaseModel):
    full: str
    kcd: str | None = None
    atc: str | None = None
    unit: str | None = None


class PersonalCodebookAdd(BaseModel):
    category: str = Field(description="diagnosis, medication, lab, vital, procedure, clinical")
    abbreviation: str = Field(max_length=30)
    entry: CodebookEntry


class PersonalCodebookDelete(BaseModel):
    category: str
    abbreviation: str


class CodebookResolveResult(BaseModel):
    abbreviation: str
    entry: CodebookEntry | None
    layer: str | None = None  # "builtin", "institution", "personal"


class CodebookResponse(BaseModel):
    """Merged codebook for current user (all 3 layers)."""

    categories: dict[str, dict[str, CodebookEntry]]
