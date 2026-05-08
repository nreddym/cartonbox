from sqlalchemy import Column, String, Numeric, Date, TIMESTAMP, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid
from database import Base


class MaterialIssue(Base):
    __tablename__ = "material_issues"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    job_card_id = Column(UUID(as_uuid=True), ForeignKey("job_cards.id"), nullable=False, index=True)
    paper_roll_id = Column(UUID(as_uuid=True), ForeignKey("paper_rolls.id"), nullable=False, index=True)
    requested_quantity = Column(Numeric(10, 2), nullable=False)
    issued_quantity = Column(Numeric(10, 2), nullable=False)
    unit = Column(String, nullable=False)
    issue_date = Column(Date, nullable=False, index=True)
    status = Column(String, nullable=False, default="PENDING", index=True)
    requested_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    approved_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True, index=True)
    approval_date = Column(TIMESTAMP(timezone=True), nullable=True)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
