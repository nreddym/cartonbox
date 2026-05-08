from sqlalchemy import Column, String, Integer, Date, TIMESTAMP, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid
from database import Base


class FinishedGoodsOutward(Base):
    __tablename__ = "finished_goods_outward"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    finished_goods_id = Column(UUID(as_uuid=True), ForeignKey("finished_goods.id"), nullable=False, index=True)
    quantity = Column(Integer, nullable=False)
    destination = Column(String, nullable=False)
    dispatch_date = Column(Date, nullable=False, index=True)
    status = Column(String, nullable=False, default="PENDING", index=True)
    requested_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    approved_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True, index=True)
    approval_date = Column(TIMESTAMP(timezone=True), nullable=True)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
