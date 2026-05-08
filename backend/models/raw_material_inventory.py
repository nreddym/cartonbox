from sqlalchemy import Column, String, Numeric, TIMESTAMP, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid
from database import Base


class RawMaterialInventory(Base):
    __tablename__ = "raw_material_inventory"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    paper_roll_id = Column(UUID(as_uuid=True), ForeignKey("paper_rolls.id"), nullable=False, index=True)
    opening_stock = Column(Numeric(10, 2), nullable=False, default=0)
    current_stock = Column(Numeric(10, 2), nullable=False, default=0)
    unit = Column(String, nullable=False)
    last_updated = Column(TIMESTAMP(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
