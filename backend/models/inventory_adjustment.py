from sqlalchemy import Column, String, Numeric, TIMESTAMP, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid
from database import Base


class InventoryAdjustment(Base):
    __tablename__ = "inventory_adjustments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    inventory_type = Column(String, nullable=False, index=True)
    item_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    adjustment_quantity = Column(Numeric(10, 2), nullable=False)
    reason = Column(String, nullable=False)
    status = Column(String, nullable=False, default="PENDING", index=True)
    requested_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    approved_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True, index=True)
    approval_date = Column(TIMESTAMP(timezone=True), nullable=True)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
