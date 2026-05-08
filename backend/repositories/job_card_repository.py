from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from sqlalchemy import desc
from typing import Optional, List
from datetime import date
import uuid

from models.job_card import JobCard


class JobCardRepository:
    """Repository for JobCard entity.

    Validates: Requirements 3.1
    """

    def __init__(self, db: Session):
        self.db = db

    def create(
        self,
        job_card_number: str,
        box_type: str,
        box_length: float,
        box_width: float,
        box_height: float,
        ply_type: str,
        ply_count: int,
        quantity_to_produce: int,
        planned_start_date: date,
        planned_end_date: date,
        created_by: uuid.UUID,
    ) -> JobCard:
        job_card = JobCard(
            job_card_number=job_card_number,
            box_type=box_type,
            box_length=box_length,
            box_width=box_width,
            box_height=box_height,
            ply_type=ply_type,
            ply_count=ply_count,
            quantity_to_produce=quantity_to_produce,
            planned_start_date=planned_start_date,
            planned_end_date=planned_end_date,
            created_by=created_by,
            status="CREATED",
        )
        self.db.add(job_card)
        try:
            self.db.commit()
            self.db.refresh(job_card)
            return job_card
        except IntegrityError:
            self.db.rollback()
            raise ValueError(
                f"Job card with number '{job_card_number}' already exists"
            )

    def get_by_id(self, job_card_id: uuid.UUID) -> Optional[JobCard]:
        return self.db.query(JobCard).filter(JobCard.id == job_card_id).first()

    def get_by_number(self, job_card_number: str) -> Optional[JobCard]:
        return (
            self.db.query(JobCard)
            .filter(JobCard.job_card_number == job_card_number)
            .first()
        )

    def list(
        self,
        status: Optional[str] = None,
        box_type: Optional[str] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> List[JobCard]:
        query = self.db.query(JobCard)
        if status is not None:
            query = query.filter(JobCard.status == status)
        if box_type is not None:
            query = query.filter(JobCard.box_type == box_type)
        return (
            query.order_by(desc(JobCard.created_at)).offset(skip).limit(limit).all()
        )

    def update(self, job_card_id: uuid.UUID, **fields) -> Optional[JobCard]:
        job_card = self.get_by_id(job_card_id)
        if job_card is None:
            return None
        for key, value in fields.items():
            if value is not None and hasattr(job_card, key):
                setattr(job_card, key, value)
        self.db.commit()
        self.db.refresh(job_card)
        return job_card

    def update_status(
        self,
        job_card_id: uuid.UUID,
        new_status: str,
        approved_by: Optional[uuid.UUID] = None,
        actual_start_date: Optional[date] = None,
        actual_end_date: Optional[date] = None,
    ) -> Optional[JobCard]:
        job_card = self.get_by_id(job_card_id)
        if job_card is None:
            return None
        job_card.status = new_status
        if approved_by is not None:
            job_card.approved_by = approved_by
        if actual_start_date is not None:
            job_card.actual_start_date = actual_start_date
        if actual_end_date is not None:
            job_card.actual_end_date = actual_end_date
        self.db.commit()
        self.db.refresh(job_card)
        return job_card

    def update_calculations(
        self,
        job_card_id: uuid.UUID,
        calculated_paper_area: float,
        required_paper_quantity: float,
    ) -> Optional[JobCard]:
        job_card = self.get_by_id(job_card_id)
        if job_card is None:
            return None
        job_card.calculated_paper_area = calculated_paper_area
        job_card.required_paper_quantity = required_paper_quantity
        self.db.commit()
        self.db.refresh(job_card)
        return job_card
