"""Approval workflow configuration.

Maps each transaction type to the role(s) authorized to approve it.
This is configuration (not state) and is loaded from a JSON file when present,
falling back to sane defaults derived from the requirements.

Validates: Requirements 13.1, 13.2
"""
from __future__ import annotations
import json
import os
from typing import Dict, List, Set


# Transaction type identifiers used across the system.
TXN_INVENTORY_INWARD = "INVENTORY_INWARD"
TXN_MATERIAL_ISSUE = "MATERIAL_ISSUE"
TXN_JOB_CARD = "JOB_CARD"
TXN_FG_OUTWARD = "FG_OUTWARD"
TXN_INVENTORY_ADJUSTMENT = "INVENTORY_ADJUSTMENT"


# Default approver mapping (Req 13.1, 13.2).
DEFAULT_APPROVAL_WORKFLOW: Dict[str, List[str]] = {
    TXN_INVENTORY_INWARD: ["STORE_MANAGER", "ADMIN"],
    TXN_MATERIAL_ISSUE: ["STORE_MANAGER", "ADMIN"],
    TXN_JOB_CARD: ["PRODUCTION_MANAGER", "ADMIN"],
    TXN_FG_OUTWARD: ["STORE_MANAGER", "ADMIN"],
    TXN_INVENTORY_ADJUSTMENT: ["ADMIN"],
}


_CONFIG_PATH_ENV = "APPROVAL_WORKFLOW_CONFIG"


class ApprovalWorkflowConfig:
    """Read-only view of approval workflow configuration."""

    def __init__(self, mapping: Dict[str, List[str]]):
        # Normalize: copy and freeze role lists into tuples for safety.
        self._mapping: Dict[str, List[str]] = {
            txn: list(roles) for txn, roles in mapping.items()
        }

    @classmethod
    def load(cls, path: str | None = None) -> "ApprovalWorkflowConfig":
        """Load config from JSON file if available, else use defaults.

        Path is taken from argument, then env var APPROVAL_WORKFLOW_CONFIG,
        else falls back to defaults.
        """
        path = path or os.environ.get(_CONFIG_PATH_ENV)
        if path and os.path.exists(path):
            with open(path, "r", encoding="utf-8") as fh:
                data = json.load(fh)
            if not isinstance(data, dict):
                raise ValueError("Approval workflow config must be a JSON object")
            for key, value in data.items():
                if not isinstance(value, list) or not all(
                    isinstance(r, str) for r in value
                ):
                    raise ValueError(
                        f"Approval roles for '{key}' must be a list of strings"
                    )
            merged: Dict[str, List[str]] = {**DEFAULT_APPROVAL_WORKFLOW, **data}
            return cls(merged)
        return cls(DEFAULT_APPROVAL_WORKFLOW)

    def get_approver_roles(self, transaction_type: str) -> List[str]:
        """Return the list of role names authorized to approve `transaction_type`."""
        if transaction_type not in self._mapping:
            raise ValueError(f"Unknown transaction type: {transaction_type}")
        return list(self._mapping[transaction_type])

    def can_approve(self, transaction_type: str, user_roles: List[str]) -> bool:
        """Return True if the user holds at least one approver role for the txn."""
        approver_roles: Set[str] = set(self.get_approver_roles(transaction_type))
        return bool(approver_roles.intersection(user_roles or []))

    def transaction_types(self) -> List[str]:
        return list(self._mapping.keys())

    def as_dict(self) -> Dict[str, List[str]]:
        return {txn: list(roles) for txn, roles in self._mapping.items()}


# Module-level singleton loaded lazily.
_default_config: ApprovalWorkflowConfig | None = None


def get_approval_workflow() -> ApprovalWorkflowConfig:
    """Return the process-wide ApprovalWorkflowConfig singleton."""
    global _default_config
    if _default_config is None:
        _default_config = ApprovalWorkflowConfig.load()
    return _default_config
