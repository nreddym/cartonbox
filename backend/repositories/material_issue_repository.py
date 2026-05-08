from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import Optional, List
from datetime import date, datetime, timezone
import uuid

from models.material_issue import MaterialIssue


class MaterialIssueRepository:
    """Repository for MaterialIssue entity.

    Validates: Requirements 4.1, 4.5
    """

    def __init__(self, db: Session):
        self.db = db

    def create(
        self,
        job_card_id: uuid.UUID,
        paper_roll_id: uuid.UUID,
        requested_quantity: float,
        issued_quantity: float,
        unit: str,
        issue_date: date,
        requested_by: uuid.UUID,
    ) -> MaterialIssue:
        material_issue = MaterialIssue(
            job_card_id=job_card_id,
            paper_roll_id=paper_roll_id,
            requested_quantity=requested_quantity,
            issued_quantity=issued_quantity,
            unit=unit,
            issue_date=issue_date,
            requested_by=requested_by,
            status="PENDING",
        )
        self.db.add(material_issue)
        self.db.commit()
        self.db.refresh(material_issue)
        return material_issue

    def get_by_id(self, issue_id: uuid.UUID) -> Optional[MaterialIssue]:
        return (
            self.db.query(MaterialIssue)
            .filter(MaterialIssue.id == issue_id)
            .first()
        )

    def list(
        self,
        job_card_id: Optional[uuid.UUID] = None,
        status: Optional[str] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> List[MaterialIssue]:
        query = self.db.query(MaterialIssue)
        if job_card_id is not None:
            query = query.filter(MaterialIssue.job_card_id == job_card_id)
        if status is not None:
            query = query.filter(MaterialIssue.status == status)
        return (
            query.order_by(desc(MaterialIssue.created_at))
            .offset(skip)
            .limit(limit)
            .all()
        )

    def list_by_job_card(self, job_card_id: uuid.UUID) -> List[MaterialIssue]:
        return (
            self.db.query(MaterialIssue)
            .filter(MaterialIssue.job_card_id == job_card_id)
            .order_by(desc(MaterialIssue.created_at))
            .all()
        )

    def update_status(
        self,
        issue_id: uuid.UUID,
        new_status: str,
        approved_by: Optional[uuid.UUID] = None,
    ) -> Optional[MaterialIssue]:
        material_issue = self.get_by_id(issue_id)
        if material_issue is None:
            return None
        material_issue.status = new_status
        if approved_by is not None:
            material_issue.approved_by = approved_by
            material_issue.approval_date = datetime.now(timezone.utc)
        self.db.commit()
        self.db.refresh(material_issue)
        return material_issue

    def total_issued_for_job_card(self, job_card_id: uuid.UUID) -> float:
        """Sum of issued_quantity for APPROVED issues against a job card."""
        rows = (
            self.db.query(MaterialIssue)
            .filter(
                MaterialIssue.job_card_id == job_card_id,
                MaterialIssue.status == "APPROVED",
            )
            .all()
        )
        return sum(float(r.issued_quantity) for r in rows)
