from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
import uuid

from database import get_db
from auth.dependencies import require_roles
from models.user import User
from services.audit_service import AuditService


router = APIRouter(prefix="/api/audit-logs", tags=["Audit Logs"])


class AuditLogResponse(BaseModel):
    id: str
    transaction_type: str
    transaction_id: str
    entity_type: str
    entity_id: str
    action: str
    before_data: Optional[dict] = None
    after_data: dict
    performed_by: str
    performed_at: datetime
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None

    class Config:
        from_attributes = True


def _to_response(log) -> AuditLogResponse:
    return AuditLogResponse(
        id=str(log.id),
        transaction_type=log.transaction_type,
        transaction_id=str(log.transaction_id),
        entity_type=log.entity_type,
        entity_id=str(log.entity_id),
        action=log.action,
        before_data=log.before_data,
        after_data=log.after_data or {},
        performed_by=str(log.performed_by),
        performed_at=log.performed_at,
        ip_address=log.ip_address,
        user_agent=log.user_agent,
    )


def _parse_uuid(value: str, label: str) -> uuid.UUID:
    try:
        return uuid.UUID(value)
    except (ValueError, AttributeError):
        raise HTTPException(status_code=400, detail=f"Invalid {label}")


@router.get("", response_model=List[AuditLogResponse])
def list_audit_logs(
    transaction_type: Optional[str] = Query(None),
    entity_type: Optional[str] = Query(None),
    entity_id: Optional[str] = Query(None),
    performed_by: Optional[str] = Query(None),
    action: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["ADMIN", "AUDITOR"])),
):
    service = AuditService(db)
    logs = service.query_logs(
        transaction_type=transaction_type,
        entity_type=entity_type,
        entity_id=_parse_uuid(entity_id, "entity_id") if entity_id else None,
        performed_by=(
            _parse_uuid(performed_by, "performed_by") if performed_by else None
        ),
        action=action,
        skip=skip,
        limit=limit,
    )
    return [_to_response(log) for log in logs]


@router.get(
    "/transaction/{transaction_id}", response_model=List[AuditLogResponse]
)
def get_transaction_audit_trail(
    transaction_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["ADMIN", "AUDITOR"])),
):
    txn_id = _parse_uuid(transaction_id, "transaction_id")
    service = AuditService(db)
    logs = service.get_trail_for_transaction(txn_id)
    return [_to_response(log) for log in logs]
