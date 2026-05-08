from sqlalchemy.orm import Session
from typing import Optional, List
import uuid

from models.audit_log import AuditLog


class AuditLogRepository:
    """Immutable audit log repository.

    Audit logs are append-only — only `create` and read operations are
    exposed. No update or delete methods exist by design (Req 16.2).
    """

    def __init__(self, db: Session):
        self.db = db

    def create(
        self,
        transaction_type: str,
        transaction_id: uuid.UUID,
        entity_type: str,
        entity_id: uuid.UUID,
        action: str,
        after_data: dict,
        performed_by: uuid.UUID,
        before_data: Optional[dict] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> AuditLog:
        log = AuditLog(
            transaction_type=transaction_type,
            transaction_id=transaction_id,
            entity_type=entity_type,
            entity_id=entity_id,
            action=action,
            before_data=before_data,
            after_data=after_data,
            performed_by=performed_by,
            ip_address=ip_address,
            user_agent=user_agent,
        )
        self.db.add(log)
        self.db.commit()
        self.db.refresh(log)
        return log

    def get_by_id(self, log_id: uuid.UUID) -> Optional[AuditLog]:
        return (
            self.db.query(AuditLog)
            .filter(AuditLog.id == log_id)
            .first()
        )

    def get_by_transaction_id(
        self, transaction_id: uuid.UUID
    ) -> List[AuditLog]:
        return (
            self.db.query(AuditLog)
            .filter(AuditLog.transaction_id == transaction_id)
            .order_by(AuditLog.performed_at.asc())
            .all()
        )

    def list(
        self,
        transaction_type: Optional[str] = None,
        entity_type: Optional[str] = None,
        entity_id: Optional[uuid.UUID] = None,
        performed_by: Optional[uuid.UUID] = None,
        action: Optional[str] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> List[AuditLog]:
        q = self.db.query(AuditLog)
        if transaction_type is not None:
            q = q.filter(AuditLog.transaction_type == transaction_type)
        if entity_type is not None:
            q = q.filter(AuditLog.entity_type == entity_type)
        if entity_id is not None:
            q = q.filter(AuditLog.entity_id == entity_id)
        if performed_by is not None:
            q = q.filter(AuditLog.performed_by == performed_by)
        if action is not None:
            q = q.filter(AuditLog.action == action)
        return (
            q.order_by(AuditLog.performed_at.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )
