from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path

_ACTION_ORDER = {"HOLD": 0, "REDUCE": 1, "MONITOR": 2}


@dataclass
class SickDayAlert:
    drug_inn: str
    action: str  # HOLD | REDUCE | MONITOR
    reason: str
    trigger_matched: str
    detail: str


class SickDayAdvancedChecker:
    def __init__(self, rules: list[dict]) -> None:
        self._rules = {r["drug_inn"].lower(): r for r in rules}

    def check(
        self,
        drug_inns: list[str],
        clinical_flags: list[str],
        labs: list[dict],
    ) -> list[SickDayAlert]:
        active_flags = {f.upper() for f in clinical_flags}
        active_flags |= self._flags_from_labs(labs)

        alerts: list[SickDayAlert] = []
        for inn in drug_inns:
            rule = self._rules.get(inn.lower())
            if not rule:
                continue
            matched = self._match_trigger(rule, active_flags, labs)
            if matched:
                alerts.append(
                    SickDayAlert(
                        drug_inn=inn,
                        action=rule["action"],
                        reason=rule["reason"],
                        trigger_matched=matched,
                        detail=rule.get("detail", ""),
                    )
                )
        return sorted(alerts, key=lambda a: _ACTION_ORDER.get(a.action, 9))

    def _match_trigger(self, rule: dict, active_flags: set[str], labs: list[dict]) -> str | None:
        for t in rule.get("triggers", []):
            if t.upper() in active_flags:
                return t
        for lab_trigger in rule.get("lab_triggers", []):
            if self._check_lab_trigger(lab_trigger, labs):
                return lab_trigger["condition"]
        return None

    def _flags_from_labs(self, labs: list[dict]) -> set[str]:
        flags: set[str] = set()
        for lab in labs:
            name = lab.get("name", "").lower()
            value = lab.get("value")
            baseline = lab.get("baseline")
            cr_rise = (
                name == "creatinine"
                and value is not None
                and baseline is not None
                and value >= baseline * 1.5
            )
            if cr_rise:
                flags.add("AKI")
            if name == "potassium" and value is not None and value >= 5.5:
                flags.add("HYPERKALEMIA")
        return flags

    def _check_lab_trigger(self, trigger: dict, labs: list[dict]) -> bool:
        condition = trigger.get("condition", "")
        for lab in labs:
            name = lab.get("name", "").lower()
            value = lab.get("value")
            baseline = lab.get("baseline")
            if (
                condition == "acute_rise_1.5x"
                and name == "creatinine"
                and value is not None
                and baseline is not None
                and value >= baseline * 1.5
            ):
                return True
            if (
                condition == "hyperkalemia_5.5"
                and name == "potassium"
                and value is not None
                and value >= 5.5
            ):
                return True
        return False


def load_sick_day_checker() -> SickDayAdvancedChecker:
    data_path = Path(__file__).parent / "data" / "sick_day_rules.json"
    with data_path.open(encoding="utf-8") as f:
        rules: list[dict] = json.load(f)
    return SickDayAdvancedChecker(rules)
