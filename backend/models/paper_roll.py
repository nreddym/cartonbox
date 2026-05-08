from sqlalchemy import Column, String, Integer, Numeric, TIMESTAMP
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid
from database import Base


class PaperRoll(Base):
    __tablename__ = "paper_rolls"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    material_code = Column(String, unique=True, nullable=False, index=True)
    paper_type = Column(String, nullable=False)
    gsm = Column(Integer, nullable=False)
    roll_width = Column(Numeric(10, 2), nullable=False)
    roll_length = Column(Numeric(10, 2), nullable=True)
    roll_weight = Column(Numeric(10, 2), nullable=True)
    supplier = Column(String, nullable=False)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
