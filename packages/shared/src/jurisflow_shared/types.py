from enum import StrEnum


class MatterStatus(StrEnum):
    OPEN = "open"
    REVIEW = "review"
    CLOSED = "closed"


class DocumentKind(StrEnum):
    PDF = "pdf"
    DOCX = "docx"
    TXT = "txt"
    EMAIL = "email"
    UNKNOWN = "unknown"


class DocumentProcessingStatus(StrEnum):
    UPLOADED = "uploaded"
    PROCESSING = "processing"
    READY = "ready"
    FAILED = "failed"


class DeadlineKind(StrEnum):
    STATEMENT = "statement_deadline"
    APPEAL = "appeal_deadline"
    HEARING = "hearing_deadline"
    OTHER = "other"


class ResearchSource(StrEnum):
    FEDERAL_LAW = "federal_law"
    CASE_LAW = "case_law"
    EU_LAW = "eu_law"
    INTERNAL_DOCS = "internal_docs"


class DraftKind(StrEnum):
    LEGAL_MEMO = "legal_memo"
    PLEADING_OUTLINE = "pleading_outline"
    ARGUMENT_STRUCTURE = "argument_structure"


class UserRole(StrEnum):
    ADMIN = "admin"
    LAWYER = "lawyer"
    PARALEGAL = "paralegal"
    VIEWER = "viewer"

