from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import date, timedelta
from pathlib import Path
from typing import Any

_RULES: list[dict] = json.loads(
    (Path(__file__).parent / "data" / "followup_rules.json").read_text()
)["rules"]


@dataclass
class FollowUpCandidate:
    item: str
    value: Any
    interval_days: int
    due_date: date
    priority: str  # "urgent" | "due" | "upcoming"
    message: str


class FollowUpEngine:
    """Evaluate abnormal findings and return F/U alert candidates."""

    def evaluate(
        self,
        findings: list[dict[str, Any]],
        last_date: date,
        patient_has_dm: bool = False,
    ) -> list[FollowUpCandidate]:
        candidates: list[FollowUpCandidate] = []
        for finding in findings:
            name = finding["name"]
            value = finding["value"]
            tier = finding["tier"]
            if tier == "normal":
                continue
            rule = self._find_rule(name, value, patient_has_dm)
            if rule is None:
                continue
            interval = rule["interval_days"]
            due = last_date + timedelta(days=interval)
            priority = self._priority(due, rule["priority_logic"])
            msg = rule["message_template"].format(value=value)
            candidates.append(
                FollowUpCandidate(
                    item=name,
                    value=value,
                    interval_days=interval,
                    due_date=due,
                    priority=priority,
                    message=msg,
                )
            )
        return candidates

    def _find_rule(
        self,
        name: str,
        value: Any,
        patient_has_dm: bool,
    ) -> dict | None:
        for rule in _RULES:
            if rule["item"] != name:
                continue
            cond = rule["condition"]
            if "patient_has_dm" in cond and not patient_has_dm:
                continue
            try:
                val_f = float(value)
                if "value < 60" in cond and val_f >= 60:
                    continue
                if "value >= 7.0" in cond and val_f < 7.0:
                    continue
                if "value >= 40" in cond and val_f < 40:
                    continue
                if "value > 100" in cond and val_f <= 100:
                    continue
                if "value > 4.0 OR value < 0.4" in cond and not (val_f > 4.0 or val_f < 0.4):
                    continue
            except (ValueError, TypeError):
                pass
            return rule
        return None

    def _priority(self, due: date, logic: dict) -> str:
        today = date.today()
        days_remaining = (due - today).days
        # Overdue by more than the grace window → urgent
        if days_remaining < logic.get("urgent_grace_days", 0):
            return "urgent"
        if days_remaining <= logic["due_if_within_days"]:
            return "due"
        return "upcoming"
