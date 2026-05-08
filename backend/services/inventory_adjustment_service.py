from sqlalchemy.orm import Session
from typing import Optional, List
import uuid

from models.inventory_adjustment import InventoryAdjustment
from repositories.inventory_adjustment_repository import (
    InventoryAdjustmentRepository,
)
from repositories.raw_material_inventory_repository import (
    RawMaterialInventoryRepository,
)
from repositories.finished_goods_inventory_repository import (
    FinishedGoodsInventoryRepository,
)


STATUS_PENDING = "PENDING"
STATUS_APPROVED = "APPROVED"
STATUS_REJECTED = "REJECTED"

INVENTORY_TYPE_RAW_MATERIAL = "RAW_MATERIAL"
INVENTORY_TYPE_FINISHED_GOODS = "FINISHED_GOODS"

MIN_REASON_LENGTH = 10


class InventoryAdjustmentService:
    """Service implementing inventory adjustment workflow.

    Validates: Requirements 9.1, 9.2, 9.3, 9.4
    """

    def __init__(self, db: Session):
        self.db = db
        self.adjustment_repo = InventoryAdjustmentRepository(db)
        self.raw_inventory_repo = RawMaterialInventoryRepository(db)
        self.fg_inventory_repo = FinishedGoodsInventoryRepository(db)

    # ------------------------------------------------------------------
    # Create (Req 9.1, 9.4)
    # ------------------------------------------------------------------
    def create_adjustment(
        self,
        inventory_type: str,
        item_id: uuid.UUID,
        adjustment_quantity: float,
        reason: str,
        requested_by: uuid.UUID,
    ) -> InventoryAdjustment:
        if inventory_type not in {
            INVENTORY_TYPE_RAW_MATERIAL,
            INVENTORY_TYPE_FINISHED_GOODS,
        }:
            raise ValueError(
                f"Invalid inventory_type '{inventory_type}'"
            )
        # Req 9.4: zero is meaningless; allow positive or negative only.
        if adjustment_quantity == 0:
            raise ValueError("adjustment_quantity cannot be zero")

        # Req 9.1: reason is mandatory and must be substantive.
        if reason is None or len(reason.strip()) < MIN_REASON_LENGTH:
            raise ValueError(
                f"reason must be at least {MIN_REASON_LENGTH} characters"
            )

        return self.adjustment_repo.create(
            inventory_type=inventory_type,
            item_id=item_id,
            adjustment_quantity=adjustment_quantity,
            reason=reason.strip(),
            requested_by=requested_by,
        )

    # ------------------------------------------------------------------
    # Approve (Req 9.2, 9.3, 9.4)
    # ------------------------------------------------------------------
    def approve_adjustment(
        self, adjustment_id: uuid.UUID, approver_id: uuid.UUID
    ) -> InventoryAdjustment:
        adjustment = self.adjustment_repo.get_by_id(adjustment_id)
        if adjustment is None:
            raise ValueError(
                f"InventoryAdjustment {adjustment_id} not found"
            )
        if adjustment.status != STATUS_PENDING:
            raise ValueError(
                f"Cannot approve adjustment in status "
                f"'{adjustment.status}'"
            )
        # Req 9.2: approver must differ from requester.
        if adjustment.requested_by == approver_id:
            raise ValueError(
                "Approver must be different from the requesting user"
            )

        delta = float(adjustment.adjustment_quantity)

        # Req 9.3: apply adjustment to the appropriate inventory.
        if adjustment.inventory_type == INVENTORY_TYPE_RAW_MATERIAL:
            inventory = self.raw_inventory_repo.get_by_paper_roll_id(
                adjustment.item_id
            )
            if inventory is None:
                raise ValueError(
                    f"No raw material inventory for item "
                    f"{adjustment.item_id}"
                )
            new_stock = float(inventory.current_stock) + delta
            if new_stock < 0:
                raise ValueError(
                    f"Adjustment would produce negative stock "
                    f"({new_stock:.4f})"
                )
            self.raw_inventory_repo.update_stock(
                paper_roll_id=adjustment.item_id, new_stock=new_stock
            )
        else:  # FINISHED_GOODS
            inventory = self.fg_inventory_repo.get_by_finished_goods_id(
                adjustment.item_id
            )
            current = (
                int(inventory.current_stock) if inventory is not None else 0
            )
            new_stock = current + int(delta)
            if new_stock < 0:
                raise ValueError(
                    f"Adjustment would produce negative stock ({new_stock})"
                )
            if delta > 0:
                self.fg_inventory_repo.increment_stock(
                    finished_goods_id=adjustment.item_id,
                    quantity=int(delta),
                )
            else:
                self.fg_inventory_repo.decrement_stock(
                    finished_goods_id=adjustment.item_id,
                    quantity=int(-delta),
                )

        return self.adjustment_repo.update_status(
            adjustment_id=adjustment_id,
            new_status=STATUS_APPROVED,
            approved_by=approver_id,
        )

    # ------------------------------------------------------------------
    # Reject
    # ------------------------------------------------------------------
    def reject_adjustment(
        self, adjustment_id: uuid.UUID, approver_id: uuid.UUID
    ) -> InventoryAdjustment:
        adjustment = self.adjustment_repo.get_by_id(adjustment_id)
        if adjustment is None:
            raise ValueError(
                f"InventoryAdjustment {adjustment_id} not found"
            )
        if adjustment.status != STATUS_PENDING:
            raise ValueError(
                f"Cannot reject adjustment in status "
                f"'{adjustment.status}'"
            )
        return self.adjustment_repo.update_status(
            adjustment_id=adjustment_id,
            new_status=STATUS_REJECTED,
            approved_by=approver_id,
        )

    # ------------------------------------------------------------------
    # Lookups
    # ------------------------------------------------------------------
    def get(
        self, adjustment_id: uuid.UUID
    ) -> Optional[InventoryAdjustment]:
        return self.adjustment_repo.get_by_id(adjustment_id)

    def list_adjustments(
        self,
        inventory_type: Optional[str] = None,
        item_id: Optional[uuid.UUID] = None,
        status: Optional[str] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> List[InventoryAdjustment]:
        return self.adjustment_repo.list(
            inventory_type=inventory_type,
            item_id=item_id,
            status=status,
            skip=skip,
            limit=limit,
        )
