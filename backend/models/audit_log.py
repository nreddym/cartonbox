from sqlalchemy import Column, String, TIMESTAMP, ForeignKey, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid
from database import Base


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    transaction_type = Column(String, nullable=False, index=True)
    transaction_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    entity_type = Column(String, nullable=False, index=True)
    entity_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    action = Column(String, nullable=False)
    before_data = Column(JSON, nullable=True)
    after_data = Column(JSON, nullable=False)
    performed_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    performed_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), nullable=False, index=True)
    ip_address = Column(String, nullable=True)
    user_agent = Column(String, nullable=True)
