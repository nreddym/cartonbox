from sqlalchemy.orm import Session
from datetime import date, datetime, timezone
from typing import Optional, Tuple
import uuid

from models.job_card import JobCard
from models.finished_goods_inward import FinishedGoodsInward
from repositories.job_card_repository import JobCardRepository
from repositories.finished_goods_repository import FinishedGoodsRepository
from repositories.finished_goods_inventory_repository import (
    FinishedGoodsInventoryRepository,
)
from repositories.finished_goods_inward_repository import (
    FinishedGoodsInwardRepository,
)


JC_STATUS_IN_PRODUCTION = "IN_PRODUCTION"
JC_STATUS_COMPLETED = "COMPLETED"


class ProductionService:
    """Service implementing production completion + automatic finished goods
    inward.

    Validates: Requirements 6.1, 6.2, 6.3, 6.4, 7.1, 7.2, 7.3, 7.4
    """

    def __init__(self, db: Session):
        self.db = db
        self.job_card_repo = JobCardRepository(db)
        self.fg_repo = FinishedGoodsRepository(db)
        self.fg_inventory_repo = FinishedGoodsInventoryRepository(db)
        self.fg_inward_repo = FinishedGoodsInwardRepository(db)

    # ------------------------------------------------------------------
    # Net finished goods calculation (Req 6.3)
    # ------------------------------------------------------------------
    @staticmethod
    def calculate_net_quantity(
        actual_quantity_produced: int, rejected_quantity: int
    ) -> int:
        """net = produced - rejected. Both must be non-negative; rejected
        cannot exceed produced.

        Validates: Requirements 6.3
        """
        if actual_quantity_produced < 0:
            raise ValueError("actual_quantity_produced must be >= 0")
        if rejected_quantity < 0:
            raise ValueError("rejected_quantity must be >= 0")
        if rejected_quantity > actual_quantity_produced:
            raise ValueError(
                "rejected_quantity cannot exceed actual_quantity_produced"
            )
        return int(actual_quantity_produced) - int(rejected_quantity)

    # ------------------------------------------------------------------
    # Record production completion (Req 6.1, 6.2, 6.4) and trigger
    # automatic finished goods inward (Req 7.1, 7.2, 7.3, 7.4)
    # ------------------------------------------------------------------
    def complete_production(
        self,
        job_card_id: uuid.UUID,
        actual_quantity_produced: int,
        rejected_quantity: int,
        confirmed_by: uuid.UUID,
        wastage_quantity: Optional[float] = None,
        actual_end_date: Optional[date] = None,
    ) -> Tuple[JobCard, FinishedGoodsInward]:
        """Record actual production, transition job card to COMPLETED, and
        automatically create the finished goods inward + update FG inventory.

        Validates: Requirements 6.1, 6.2, 6.3, 6.4, 7.1, 7.2, 7.3, 7.4
        """
        job_card = self.job_card_repo.get_by_id(job_card_id)
        if job_card is None:
            raise ValueError(f"Job card {job_card_id} not found")

        # Req 6.4: only IN_PRODUCTION job cards can record completion.
        if job_card.status != JC_STATUS_IN_PRODUCTION:
            raise ValueError(
                "Cannot record production completion for job card in status "
                f"'{job_card.status}'"
            )

        net_quantity = self.calculate_net_quantity(
            actual_quantity_produced=actual_quantity_produced,
            rejected_quantity=rejected_quantity,
        )

        # Persist production data on the job card and transition to COMPLETED.
        job_card.actual_quantity_produced = int(actual_quantity_produced)
        job_card.rejected_quantity = int(rejected_quantity)
        if wastage_quantity is not None:
            job_card.wastage_quantity = float(wastage_quantity)
        job_card.status = JC_STATUS_COMPLETED
        job_card.actual_end_date = actual_end_date or date.today()
        self.db.commit()
        self.db.refresh(job_card)

        # Req 7.1, 7.4: find/create FinishedGoods matching the job card
        # specification so inventory is linked back to the job card.
        finished_goods = self.fg_repo.get_or_create(
            box_type=job_card.box_type,
            box_length=float(job_card.box_length),
            box_width=float(job_card.box_width),
            box_height=float(job_card.box_height),
            ply_type=job_card.ply_type,
        )

        # Req 7.1, 7.3, 7.4: create the inward record (confirmed by supervisor).
        inward = self.fg_inward_repo.create(
            finished_goods_id=finished_goods.id,
            job_card_id=job_card.id,
            quantity_produced=int(actual_quantity_produced),
            quantity_rejected=int(rejected_quantity),
            net_quantity=net_quantity,
            confirmed_by=confirmed_by,
            confirmation_date=datetime.now(timezone.utc),
        )

        # Req 7.2: increase finished goods stock by net_quantity.
        if net_quantity > 0:
            self.fg_inventory_repo.increment_stock(
                finished_goods_id=finished_goods.id,
                delta=net_quantity,
                unit="boxes",
            )

        return job_card, inward
