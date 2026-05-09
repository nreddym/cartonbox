from sqlalchemy.orm import Session
from datetime import date
from typing import Optional, List
import uuid

from models.material_issue import MaterialIssue
from repositories.material_issue_repository import MaterialIssueRepository
from repositories.job_card_repository import JobCardRepository
from repositories.paper_roll_repository import PaperRollRepository
from repositories.raw_material_inventory_repository import (
    RawMaterialInventoryRepository,
)


STATUS_PENDING = "PENDING"
STATUS_APPROVED = "APPROVED"
STATUS_REJECTED = "REJECTED"

JOB_CARD_STATUS_APPROVED = "APPROVED"
JOB_CARD_STATUS_IN_PRODUCTION = "IN_PRODUCTION"


class MaterialIssueService:
    """Service implementing the material-issue approval workflow.

    Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5, 5.3
    """

    def __init__(self, db: Session):
        self.db = db
        self.issue_repo = MaterialIssueRepository(db)
        self.job_card_repo = JobCardRepository(db)
        self.paper_roll_repo = PaperRollRepository(db)
        self.inventory_repo = RawMaterialInventoryRepository(db)

    # ------------------------------------------------------------------
    # Create (link to approved job card; supports partial issues)
    # ------------------------------------------------------------------
    def create_issue(
        self,
        job_card_id: uuid.UUID,
        paper_roll_id: uuid.UUID,
        requested_quantity: float,
        issued_quantity: float,
        unit: str,
        issue_date: date,
        requested_by: uuid.UUID,
    ) -> MaterialIssue:
        """Create a PENDING material issue against an approved job card.

        Validates: Requirements 4.1, 4.2, 4.4
        """
        if requested_quantity <= 0:
            raise ValueError("requested_quantity must be positive")
        if issued_quantity <= 0:
            raise ValueError("issued_quantity must be positive")
        if issued_quantity > requested_quantity:
            raise ValueError(
                "issued_quantity cannot exceed requested_quantity"
            )

        job_card = self.job_card_repo.get_by_id(job_card_id)
        if job_card is None:
            raise ValueError(f"Job card {job_card_id} not found")
        if job_card.status not in {
            JOB_CARD_STATUS_APPROVED,
            JOB_CARD_STATUS_IN_PRODUCTION,
        }:
            raise ValueError(
                "Material issues can only be linked to APPROVED or "
                f"IN_PRODUCTION job cards (current: {job_card.status})"
            )

        paper_roll = self.paper_roll_repo.get_by_id(paper_roll_id)
        if paper_roll is None:
            raise ValueError(f"Paper roll {paper_roll_id} not found")

        # Partial-issue support: cumulative APPROVED issued quantity must not
        # exceed the job card's required paper quantity (Req 4.4).
        if job_card.required_paper_quantity is not None:
            already_issued = self.issue_repo.total_issued_for_job_card(
                job_card_id
            )
            required = float(job_card.required_paper_quantity)
            if already_issued + issued_quantity > required + 1e-6:
                raise ValueError(
                    "Total issued quantity would exceed job card required "
                    f"quantity ({already_issued + issued_quantity:.4f} > "
                    f"{required:.4f})"
                )

        return self.issue_repo.create(
            job_card_id=job_card_id,
            paper_roll_id=paper_roll_id,
            requested_quantity=requested_quantity,
            issued_quantity=issued_quantity,
            unit=unit,
            issue_date=issue_date,
            requested_by=requested_by,
        )

    # ------------------------------------------------------------------
    # Approve (deduct stock; transition job card to IN_PRODUCTION)
    # ------------------------------------------------------------------
    def approve_issue(
        self,
        issue_id: uuid.UUID,
        approver_id: uuid.UUID,
        issued_quantity: Optional[float] = None,
    ) -> MaterialIssue:
        """Approve a pending issue. Deducts stock and triggers job card
        transition to IN_PRODUCTION on first approval.

        If ``issued_quantity`` is provided, it overrides the value captured at
        request time (the store team decides the actual quantity issued).

        Validates: Requirements 4.2, 4.3, 5.3
        """
        material_issue = self.issue_repo.get_by_id(issue_id)
        if material_issue is None:
            raise ValueError(f"Material issue {issue_id} not found")
        if material_issue.status != STATUS_PENDING:
            raise ValueError(
                f"Cannot approve material issue in status "
                f"'{material_issue.status}'"
            )
        if material_issue.requested_by == approver_id:
            raise ValueError(
                "Approver must be different from the requesting user"
            )

        # Apply optional override from the approver (store team decides
        # actual issued quantity, may be a partial fulfilment).
        if issued_quantity is not None:
            if issued_quantity <= 0:
                raise ValueError("issued_quantity must be positive")
            if issued_quantity > float(material_issue.requested_quantity):
                raise ValueError(
                    "issued_quantity cannot exceed requested_quantity"
                )
            # Re-check the cumulative cap against job card requirement.
            job_card = self.job_card_repo.get_by_id(material_issue.job_card_id)
            if (
                job_card is not None
                and job_card.required_paper_quantity is not None
            ):
                already_issued = self.issue_repo.total_issued_for_job_card(
                    material_issue.job_card_id
                )
                required = float(job_card.required_paper_quantity)
                if already_issued + issued_quantity > required + 1e-6:
                    raise ValueError(
                        "Total issued quantity would exceed job card required "
                        f"quantity ({already_issued + issued_quantity:.4f} > "
                        f"{required:.4f})"
                    )
            material_issue.issued_quantity = issued_quantity
            self.db.commit()
            self.db.refresh(material_issue)

        # Validate stock and deduct (Req 4.3)
        inventory = self.inventory_repo.get_by_paper_roll_id(
            material_issue.paper_roll_id
        )
        if inventory is None:
            raise ValueError(
                f"No inventory record for paper roll "
                f"{material_issue.paper_roll_id}"
            )
        issued = float(material_issue.issued_quantity)
        current = float(inventory.current_stock)
        if current < issued:
            raise ValueError(
                f"Insufficient stock: required {issued:.4f}, "
                f"available {current:.4f}"
            )

        self.inventory_repo.update_stock(
            paper_roll_id=material_issue.paper_roll_id,
            new_stock=current - issued,
        )

        approved = self.issue_repo.update_status(
            issue_id=issue_id,
            new_status=STATUS_APPROVED,
            approved_by=approver_id,
        )

        # Transition job card APPROVED -> IN_PRODUCTION on first approved
        # issue (Req 5.3).
        job_card = self.job_card_repo.get_by_id(material_issue.job_card_id)
        if job_card is not None and job_card.status == JOB_CARD_STATUS_APPROVED:
            self.job_card_repo.update_status(
                job_card_id=job_card.id,
                new_status=JOB_CARD_STATUS_IN_PRODUCTION,
                actual_start_date=date.today(),
            )

        return approved

    # ------------------------------------------------------------------
    # Reject
    # ------------------------------------------------------------------
    def reject_issue(
        self, issue_id: uuid.UUID, approver_id: uuid.UUID
    ) -> MaterialIssue:
        material_issue = self.issue_repo.get_by_id(issue_id)
        if material_issue is None:
            raise ValueError(f"Material issue {issue_id} not found")
        if material_issue.status != STATUS_PENDING:
            raise ValueError(
                f"Cannot reject material issue in status "
                f"'{material_issue.status}'"
            )
        return self.issue_repo.update_status(
            issue_id=issue_id,
            new_status=STATUS_REJECTED,
            approved_by=approver_id,
        )

    # ------------------------------------------------------------------
    # Lookups
    # ------------------------------------------------------------------
    def get(self, issue_id: uuid.UUID) -> Optional[MaterialIssue]:
        return self.issue_repo.get_by_id(issue_id)

    def list_issues(
        self,
        job_card_id: Optional[uuid.UUID] = None,
        status: Optional[str] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> List[MaterialIssue]:
        return self.issue_repo.list(
            job_card_id=job_card_id, status=status, skip=skip, limit=limit
        )
