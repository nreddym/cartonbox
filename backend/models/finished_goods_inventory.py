from sqlalchemy import Column, String, Integer, TIMESTAMP, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid
from database import Base


class FinishedGoodsInventory(Base):
    __tablename__ = "finished_goods_inventory"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    finished_goods_id = Column(UUID(as_uuid=True), ForeignKey("finished_goods.id"), nullable=False, index=True)
    current_stock = Column(Integer, nullable=False, default=0)
    unit = Column(String, nullable=False)
    last_updated = Column(TIMESTAMP(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
