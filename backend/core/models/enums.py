import enum


class Sex(enum.StrEnum):
    M = "M"
    F = "F"


class InsuranceType(enum.StrEnum):
    건강보험 = "건강보험"
    의료급여1종 = "의료급여1종"
    의료급여2종 = "의료급여2종"


class UserRole(enum.StrEnum):
    doctor = "doctor"
    nurse = "nurse"
    admin = "admin"


class VisitType(enum.StrEnum):
    초진 = "초진"
    재진 = "재진"
    건강상담 = "건강상담"


class DrugRoute(enum.StrEnum):
    경구 = "경구"
    주사 = "주사"
    외용 = "외용"
    흡입 = "흡입"


class PrescribedBy(enum.StrEnum):
    보건소 = "보건소"
    타원 = "타원"


class MessagingMethod(enum.StrEnum):
    kakao = "kakao"
    sms = "sms"
    both = "both"


class AlertType(enum.StrEnum):
    lab_recheck = "lab_recheck"
    screening_fu = "screening_fu"
    no_show = "no_show"
    education = "education"


class AlertPriority(enum.StrEnum):
    urgent = "urgent"
    due = "due"
    upcoming = "upcoming"


class DocType(enum.StrEnum):
    진단서 = "진단서"
    소견서 = "소견서"
    의뢰서 = "의뢰서"
    확인서 = "확인서"
    건강진단서 = "건강진단서"
    검사결과안내서 = "검사결과안내서"
    교육문서 = "교육문서"


class DocStatus(enum.StrEnum):
    draft = "draft"
    reviewed = "reviewed"
    issued = "issued"


class ScreeningType(enum.StrEnum):
    국가건강검진 = "국가건강검진"
    암검진 = "암검진"
    생애전환기 = "생애전환기"
