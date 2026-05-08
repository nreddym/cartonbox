from sqlalchemy.orm import Session
from typing import Optional, List
import uuid

from models.audit_log import AuditLog
from repositories.audit_log_repository import AuditLogRepository


class AuditService:
    """Service for recording and querying audit log entries.

    Validates: Requirements 2.4, 4.5, 8.5, 9.5, 16.1, 16.2, 16.3
    """

    def __init__(self, db: Session):
        self.db = db
        self.repo = AuditLogRepository(db)

    @staticmethod
    def _serialize(value):
        """Make a value JSON-safe."""
        if value is None:
            return None
        if isinstance(value, dict):
            return {k: AuditService._serialize(v) for k, v in value.items()}
        if isinstance(value, (list, tuple)):
            return [AuditService._serialize(v) for v in value]
        if isinstance(value, uuid.UUID):
            return str(value)
        # datetime / date / Decimal etc. -> str
        if hasattr(value, "isoformat"):
            return value.isoformat()
        if isinstance(value, (str, int, float, bool)):
            return value
        return str(value)

    def log(
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
        return self.repo.create(
            transaction_type=transaction_type,
            transaction_id=transaction_id,
            entity_type=entity_type,
            entity_id=entity_id,
            action=action,
            before_data=self._serialize(before_data),
            after_data=self._serialize(after_data) or {},
            performed_by=performed_by,
            ip_address=ip_address,
            user_agent=user_agent,
        )

    def get_trail_for_transaction(
        self, transaction_id: uuid.UUID
    ) -> List[AuditLog]:
        return self.repo.get_by_transaction_id(transaction_id)

    def query_logs(
        self,
        transaction_type: Optional[str] = None,
        entity_type: Optional[str] = None,
        entity_id: Optional[uuid.UUID] = None,
        performed_by: Optional[uuid.UUID] = None,
        action: Optional[str] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> List[AuditLog]:
        return self.repo.list(
            transaction_type=transaction_type,
            entity_type=entity_type,
            entity_id=entity_id,
            performed_by=performed_by,
            action=action,
            skip=skip,
            limit=limit,
        )
