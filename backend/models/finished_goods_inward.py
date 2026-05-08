from sqlalchemy import Column, Integer, TIMESTAMP, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid
from database import Base


class FinishedGoodsInward(Base):
    __tablename__ = "finished_goods_inward"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    finished_goods_id = Column(UUID(as_uuid=True), ForeignKey("finished_goods.id"), nullable=False, index=True)
    job_card_id = Column(UUID(as_uuid=True), ForeignKey("job_cards.id"), nullable=False, index=True)
    quantity_produced = Column(Integer, nullable=False)
    quantity_rejected = Column(Integer, nullable=False)
    net_quantity = Column(Integer, nullable=False)
    confirmed_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    confirmation_date = Column(TIMESTAMP(timezone=True), nullable=False)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), nullable=False)
