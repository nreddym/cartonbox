from sqlalchemy import Column, String, Numeric, Date, TIMESTAMP, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid
from database import Base


class InventoryInward(Base):
    __tablename__ = "inventory_inward"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    paper_roll_id = Column(UUID(as_uuid=True), ForeignKey("paper_rolls.id"), nullable=False, index=True)
    supplier = Column(String, nullable=False)
    purchase_reference = Column(String, nullable=False)
    quantity_received = Column(Numeric(10, 2), nullable=False)
    unit = Column(String, nullable=False)
    receipt_date = Column(Date, nullable=False, index=True)
    status = Column(String, nullable=False, default="PENDING", index=True)
    requested_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    approved_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True, index=True)
    approval_date = Column(TIMESTAMP(timezone=True), nullable=True)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
