from sqlalchemy.orm import Session
from datetime import date
from typing import Optional, List, Tuple
import uuid

from models.job_card import JobCard
from repositories.job_card_repository import JobCardRepository
from repositories.paper_roll_repository import PaperRollRepository
from repositories.raw_material_inventory_repository import (
    RawMaterialInventoryRepository,
)
from repositories.material_issue_repository import MaterialIssueRepository


# Job card state machine
STATUS_CREATED = "CREATED"
STATUS_APPROVED = "APPROVED"
STATUS_REJECTED = "REJECTED"
STATUS_IN_PRODUCTION = "IN_PRODUCTION"
STATUS_COMPLETED = "COMPLETED"
STATUS_CANCELLED = "CANCELLED"

ALLOWED_TRANSITIONS = {
    STATUS_CREATED: {STATUS_APPROVED, STATUS_REJECTED, STATUS_CANCELLED},
    STATUS_APPROVED: {STATUS_IN_PRODUCTION, STATUS_CANCELLED},
    STATUS_REJECTED: set(),
    STATUS_IN_PRODUCTION: {STATUS_COMPLETED},
    STATUS_COMPLETED: set(),
    STATUS_CANCELLED: set(),
}

# Conversion factor mm^2 -> m^2
MM2_PER_M2 = 1_000_000.0


class JobCardService:
    """Service implementing job card workflow and material calculation.

    Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 5.1, 5.2, 5.3, 5.4
    """

    def __init__(self, db: Session):
        self.db = db
        self.job_card_repo = JobCardRepository(db)
        self.paper_roll_repo = PaperRollRepository(db)
        self.inventory_repo = RawMaterialInventoryRepository(db)

    # ------------------------------------------------------------------
    # Material requirement calculation
    # ------------------------------------------------------------------
    @staticmethod
    def calculate_paper_area_sqm(
        box_length_mm: float,
        box_width_mm: float,
        box_height_mm: float,
        ply_count: int,
        quantity: int,
    ) -> float:
        """Calculate total paper area required (in square meters).

        Formula: area = 2 × (L×W + W×H + H×L) × ply_count × quantity
        Inputs are in millimeters; result is converted to m^2.

        Validates: Requirements 3.2, 3.3
        """
        if box_length_mm <= 0 or box_width_mm <= 0 or box_height_mm <= 0:
            raise ValueError("box dimensions must be positive")
        if ply_count <= 0:
            raise ValueError("ply_count must be positive")
        if quantity <= 0:
            raise ValueError("quantity must be positive")

        single_box_surface_mm2 = 2.0 * (
            box_length_mm * box_width_mm
            + box_width_mm * box_height_mm
            + box_height_mm * box_length_mm
        )
        total_area_mm2 = single_box_surface_mm2 * ply_count * quantity
        return total_area_mm2 / MM2_PER_M2

    def calculate_and_persist_material_requirement(
        self, job_card_id: uuid.UUID
    ) -> Tuple[float, float]:
        """Calculate paper area + required quantity and persist on the job card.

        Returns: (calculated_paper_area_sqm, required_paper_quantity_sqm)
        """
        job_card = self.job_card_repo.get_by_id(job_card_id)
        if job_card is None:
            raise ValueError(f"Job card {job_card_id} not found")

        area = self.calculate_paper_area_sqm(
            box_length_mm=float(job_card.box_length),
            box_width_mm=float(job_card.box_width),
            box_height_mm=float(job_card.box_height),
            ply_count=int(job_card.ply_count),
            quantity=int(job_card.quantity_to_produce),
        )
        # Required paper quantity tracks the total paper area required.
        # (Conversion to weight/length is unit-dependent and out of scope.)
        required = area
        self.job_card_repo.update_calculations(
            job_card_id=job_card_id,
            calculated_paper_area=area,
            required_paper_quantity=required,
        )
        return area, required

    # ------------------------------------------------------------------
    # State machine helpers
    # ------------------------------------------------------------------
    @staticmethod
    def _ensure_transition(current: str, target: str) -> None:
        if target not in ALLOWED_TRANSITIONS.get(current, set()):
            raise ValueError(
                f"Invalid status transition: {current} -> {target}"
            )

    # ------------------------------------------------------------------
    # CRUD-ish operations
    # ------------------------------------------------------------------
    def create_job_card(
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
        """Create a job card in CREATED status with auto-calculated requirements.

        Validates: Requirements 3.1, 5.1
        """
        if planned_end_date < planned_start_date:
            raise ValueError("planned_end_date must be >= planned_start_date")

        job_card = self.job_card_repo.create(
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
        )
        self.calculate_and_persist_material_requirement(job_card.id)
        return self.job_card_repo.get_by_id(job_card.id)

    # ------------------------------------------------------------------
    # Approval with stock validation (Req 3.4, 3.5)
    # ------------------------------------------------------------------
    def _aggregate_available_paper_area(self) -> float:
        """Sum current_stock across all raw material inventory rows.

        NOTE: For the current scope, all paper is treated as a fungible pool
        for stock validation. Per-paper-roll matching can be added when the
        job card gains an explicit paper roll selection.
        """
        all_inv = self.inventory_repo.get_all(skip=0, limit=10_000)
        return sum(float(i.current_stock) for i in all_inv)

    def approve_job_card(
        self, job_card_id: uuid.UUID, approver_id: uuid.UUID
    ) -> JobCard:
        """Approve a job card after validating sufficient raw material stock.

        Validates: Requirements 3.4, 3.5, 5.2
        """
        job_card = self.job_card_repo.get_by_id(job_card_id)
        if job_card is None:
            raise ValueError(f"Job card {job_card_id} not found")
        self._ensure_transition(job_card.status, STATUS_APPROVED)
        if job_card.created_by == approver_id:
            raise ValueError(
                "Approver must be different from the user who created the job card"
            )

        if (
            job_card.calculated_paper_area is None
            or job_card.required_paper_quantity is None
        ):
            self.calculate_and_persist_material_requirement(job_card_id)
            job_card = self.job_card_repo.get_by_id(job_card_id)

        required = float(job_card.required_paper_quantity)
        available = self._aggregate_available_paper_area()
        if available < required:
            raise ValueError(
                f"Insufficient raw material stock: required {required:.2f}, "
                f"available {available:.2f}"
            )

        return self.job_card_repo.update_status(
            job_card_id=job_card_id,
            new_status=STATUS_APPROVED,
            approved_by=approver_id,
        )

    def reject_job_card(
        self, job_card_id: uuid.UUID, approver_id: uuid.UUID
    ) -> JobCard:
        """Reject a CREATED job card. Approver must differ from creator."""
        job_card = self.job_card_repo.get_by_id(job_card_id)
        if job_card is None:
            raise ValueError(f"Job card {job_card_id} not found")
        self._ensure_transition(job_card.status, STATUS_REJECTED)
        if job_card.created_by == approver_id:
            raise ValueError(
                "Approver must be different from the user who created the job card"
            )
        return self.job_card_repo.update_status(
            job_card_id=job_card_id,
            new_status=STATUS_REJECTED,
            approved_by=approver_id,
        )

    def cancel_job_card(
        self, job_card_id: uuid.UUID, actor_id: uuid.UUID
    ) -> JobCard:
        """Cancel a CREATED or APPROVED job card. Terminal, no inventory impact.

        Cancellation is intended for mistakenly-created or no-longer-needed
        job cards before any production output exists. IN_PRODUCTION /
        COMPLETED / REJECTED job cards cannot be cancelled.
        """
        job_card = self.job_card_repo.get_by_id(job_card_id)
        if job_card is None:
            raise ValueError(f"Job card {job_card_id} not found")
        self._ensure_transition(job_card.status, STATUS_CANCELLED)
        return self.job_card_repo.update_status(
            job_card_id=job_card_id,
            new_status=STATUS_CANCELLED,
            approved_by=actor_id,
        )

    # ------------------------------------------------------------------
    # State transitions for production lifecycle (Req 5.3, 5.4)
    # ------------------------------------------------------------------
    def start_production(
        self,
        job_card_id: uuid.UUID,
        actual_start_date: Optional[date] = None,
    ) -> JobCard:
        """Move APPROVED -> IN_PRODUCTION.

        Validates: Requirements 5.3
        """
        job_card = self.job_card_repo.get_by_id(job_card_id)
        if job_card is None:
            raise ValueError(f"Job card {job_card_id} not found")
        self._ensure_transition(job_card.status, STATUS_IN_PRODUCTION)

        # Guard: production cannot start until raw material has been issued
        # and approved against this job card. This keeps raw stock
        # reconciled with production output.
        issue_repo = MaterialIssueRepository(self.db)
        approved_issued = issue_repo.total_issued_for_job_card(job_card_id)
        if approved_issued <= 0:
            raise ValueError(
                "Cannot start production: no APPROVED material issue exists "
                "for this job card. Issue and approve raw material first."
            )

        return self.job_card_repo.update_status(
            job_card_id=job_card_id,
            new_status=STATUS_IN_PRODUCTION,
            actual_start_date=actual_start_date or date.today(),
        )

    def complete_production(
        self,
        job_card_id: uuid.UUID,
        actual_end_date: Optional[date] = None,
    ) -> JobCard:
        """Move IN_PRODUCTION -> COMPLETED.

        Validates: Requirements 5.4
        """
        job_card = self.job_card_repo.get_by_id(job_card_id)
        if job_card is None:
            raise ValueError(f"Job card {job_card_id} not found")
        self._ensure_transition(job_card.status, STATUS_COMPLETED)
        return self.job_card_repo.update_status(
            job_card_id=job_card_id,
            new_status=STATUS_COMPLETED,
            actual_end_date=actual_end_date or date.today(),
        )

    # ------------------------------------------------------------------
    # Lookups
    # ------------------------------------------------------------------
    def get(self, job_card_id: uuid.UUID) -> Optional[JobCard]:
        return self.job_card_repo.get_by_id(job_card_id)

    def list_job_cards(
        self,
        status: Optional[str] = None,
        box_type: Optional[str] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> List[JobCard]:
        return self.job_card_repo.list(
            status=status, box_type=box_type, skip=skip, limit=limit
        )
