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
        start_date=None,
        end_date=None,
        skip: int = 0,
        limit: int = 100,
    ) -> List[AuditLog]:
        return self.repo.list(
            transaction_type=transaction_type,
            entity_type=entity_type,
            entity_id=entity_id,
            performed_by=performed_by,
            action=action,
            start_date=start_date,
            end_date=end_date,
            skip=skip,
            limit=limit,
        )

    def count_logs(
        self,
        transaction_type: Optional[str] = None,
        entity_type: Optional[str] = None,
        entity_id: Optional[uuid.UUID] = None,
        performed_by: Optional[uuid.UUID] = None,
        action: Optional[str] = None,
        start_date=None,
        end_date=None,
    ) -> int:
        return self.repo.count(
            transaction_type=transaction_type,
            entity_type=entity_type,
            entity_id=entity_id,
            performed_by=performed_by,
            action=action,
            start_date=start_date,
            end_date=end_date,
        )

    # ------------------------------------------------------------------
    # Convenience helpers
    # ------------------------------------------------------------------
    def record_state_change(
        self,
        transaction_type: str,
        entity_type: str,
        entity,
        action: str,
        performed_by: uuid.UUID,
        before_status: Optional[str] = None,
        request=None,
    ) -> AuditLog:
        """Record a state-change audit entry for an entity with a `status` attr.

        Pulls IP/user-agent from a FastAPI Request when supplied.
        """
        ip = None
        ua = None
        if request is not None:
            try:
                ip = request.client.host if request.client else None
                ua = request.headers.get("user-agent")
            except Exception:
                pass
        after_status = getattr(entity, "status", None)
        return self.log(
            transaction_type=transaction_type,
            transaction_id=entity.id,
            entity_type=entity_type,
            entity_id=entity.id,
            action=action,
            after_data={"status": after_status, "id": str(entity.id)},
            before_data={"status": before_status} if before_status else None,
            performed_by=performed_by,
            ip_address=ip,
            user_agent=ua,
        )

    def record_create(
        self,
        transaction_type: str,
        entity_type: str,
        entity,
        performed_by: uuid.UUID,
        extra: Optional[dict] = None,
        request=None,
    ) -> AuditLog:
        """Record a CREATE audit entry. `extra` is merged into after_data."""
        ip = None
        ua = None
        if request is not None:
            try:
                ip = request.client.host if request.client else None
                ua = request.headers.get("user-agent")
            except Exception:
                pass
        after_data = {"id": str(entity.id)}
        status_val = getattr(entity, "status", None)
        if status_val is not None:
            after_data["status"] = status_val
        if extra:
            after_data.update(extra)
        return self.log(
            transaction_type=transaction_type,
            transaction_id=entity.id,
            entity_type=entity_type,
            entity_id=entity.id,
            action="CREATE",
            after_data=after_data,
            performed_by=performed_by,
            ip_address=ip,
            user_agent=ua,
        )
