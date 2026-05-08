from sqlalchemy import Column, String, Numeric, TIMESTAMP
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid
from database import Base


class FinishedGoods(Base):
    __tablename__ = "finished_goods"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    box_type = Column(String, nullable=False)
    box_length = Column(Numeric(10, 2), nullable=False)
    box_width = Column(Numeric(10, 2), nullable=False)
    box_height = Column(Numeric(10, 2), nullable=False)
    ply_type = Column(String, nullable=False)
    specification = Column(String, nullable=True)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
