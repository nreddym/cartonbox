from sqlalchemy import Column, String, Integer, Numeric, Date, TIMESTAMP, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid
from database import Base


class JobCard(Base):
    __tablename__ = "job_cards"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    job_card_number = Column(String, unique=True, nullable=False, index=True)
    box_type = Column(String, nullable=False)
    box_length = Column(Numeric(10, 2), nullable=False)
    box_width = Column(Numeric(10, 2), nullable=False)
    box_height = Column(Numeric(10, 2), nullable=False)
    ply_type = Column(String, nullable=False)
    ply_count = Column(Integer, nullable=False)
    quantity_to_produce = Column(Integer, nullable=False)
    planned_start_date = Column(Date, nullable=False, index=True)
    planned_end_date = Column(Date, nullable=False, index=True)
    actual_start_date = Column(Date, nullable=True)
    actual_end_date = Column(Date, nullable=True)
    status = Column(String, nullable=False, default="CREATED", index=True)
    calculated_paper_area = Column(Numeric(10, 2), nullable=True)
    required_paper_quantity = Column(Numeric(10, 2), nullable=True)
    actual_quantity_produced = Column(Integer, nullable=True)
    rejected_quantity = Column(Integer, nullable=True)
    wastage_quantity = Column(Numeric(10, 2), nullable=True)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    approved_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True, index=True)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
