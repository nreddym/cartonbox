from sqlalchemy.orm import Session
from datetime import date
from typing import Optional, List
import uuid

from models.finished_goods_outward import FinishedGoodsOutward
from repositories.finished_goods_outward_repository import (
    FinishedGoodsOutwardRepository,
)
from repositories.finished_goods_repository import FinishedGoodsRepository
from repositories.finished_goods_inventory_repository import (
    FinishedGoodsInventoryRepository,
)


STATUS_PENDING = "PENDING"
STATUS_APPROVED = "APPROVED"
STATUS_REJECTED = "REJECTED"


class FinishedGoodsOutwardService:
    """Service implementing the finished-goods outward approval workflow.

    Validates: Requirements 8.1, 8.2, 8.3, 8.4
    """

    def __init__(self, db: Session):
        self.db = db
        self.outward_repo = FinishedGoodsOutwardRepository(db)
        self.fg_repo = FinishedGoodsRepository(db)
        self.fg_inventory_repo = FinishedGoodsInventoryRepository(db)

    # ------------------------------------------------------------------
    # Create (Req 8.1)
    # ------------------------------------------------------------------
    def create_outward(
        self,
        finished_goods_id: uuid.UUID,
        quantity: int,
        destination: str,
        dispatch_date: date,
        requested_by: uuid.UUID,
    ) -> FinishedGoodsOutward:
        if quantity <= 0:
            raise ValueError("quantity must be positive")
        if not destination or not destination.strip():
            raise ValueError("destination is required")

        finished_goods = self.fg_repo.get_by_id(finished_goods_id)
        if finished_goods is None:
            raise ValueError(
                f"FinishedGoods {finished_goods_id} not found"
            )

        return self.outward_repo.create(
            finished_goods_id=finished_goods_id,
            quantity=int(quantity),
            destination=destination,
            dispatch_date=dispatch_date,
            requested_by=requested_by,
        )

    # ------------------------------------------------------------------
    # Approve (Req 8.2, 8.3, 8.4)
    # ------------------------------------------------------------------
    def approve_outward(
        self, outward_id: uuid.UUID, approver_id: uuid.UUID
    ) -> FinishedGoodsOutward:
        """Approve a pending outward. Validates stock sufficiency
        (Req 8.4) and deducts FG inventory (Req 8.3).
        """
        outward = self.outward_repo.get_by_id(outward_id)
        if outward is None:
            raise ValueError(f"FinishedGoodsOutward {outward_id} not found")
        if outward.status != STATUS_PENDING:
            raise ValueError(
                f"Cannot approve outward in status '{outward.status}'"
            )
        if outward.requested_by == approver_id:
            raise ValueError(
                "Approver must be different from the requesting user"
            )

        # Req 8.4: stock sufficiency check before approval / deduction.
        inventory = self.fg_inventory_repo.get_by_finished_goods_id(
            outward.finished_goods_id
        )
        available = int(inventory.current_stock) if inventory is not None else 0
        if available < int(outward.quantity):
            raise ValueError(
                f"Insufficient finished goods stock: required "
                f"{int(outward.quantity)}, available {available}"
            )

        # Req 8.3: deduct stock on approval.
        self.fg_inventory_repo.decrement_stock(
            finished_goods_id=outward.finished_goods_id,
            delta=int(outward.quantity),
        )

        return self.outward_repo.update_status(
            outward_id=outward_id,
            new_status=STATUS_APPROVED,
            approved_by=approver_id,
        )

    # ------------------------------------------------------------------
    # Reject
    # ------------------------------------------------------------------
    def reject_outward(
        self, outward_id: uuid.UUID, approver_id: uuid.UUID
    ) -> FinishedGoodsOutward:
        outward = self.outward_repo.get_by_id(outward_id)
        if outward is None:
            raise ValueError(f"FinishedGoodsOutward {outward_id} not found")
        if outward.status != STATUS_PENDING:
            raise ValueError(
                f"Cannot reject outward in status '{outward.status}'"
            )
        return self.outward_repo.update_status(
            outward_id=outward_id,
            new_status=STATUS_REJECTED,
            approved_by=approver_id,
        )

    # ------------------------------------------------------------------
    # Lookups
    # ------------------------------------------------------------------
    def get(self, outward_id: uuid.UUID) -> Optional[FinishedGoodsOutward]:
        return self.outward_repo.get_by_id(outward_id)

    def list_outwards(
        self,
        finished_goods_id: Optional[uuid.UUID] = None,
        status: Optional[str] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> List[FinishedGoodsOutward]:
        return self.outward_repo.list(
            finished_goods_id=finished_goods_id,
            status=status,
            skip=skip,
            limit=limit,
        )
