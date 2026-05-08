from sqlalchemy.orm import Session
from datetime import datetime, timezone
from typing import Optional, List
import uuid

from models.inventory_adjustment import InventoryAdjustment


class InventoryAdjustmentRepository:
    """Repository for InventoryAdjustment requests."""

    def __init__(self, db: Session):
        self.db = db

    def create(
        self,
        inventory_type: str,
        item_id: uuid.UUID,
        adjustment_quantity: float,
        reason: str,
        requested_by: uuid.UUID,
    ) -> InventoryAdjustment:
        adjustment = InventoryAdjustment(
            inventory_type=inventory_type,
            item_id=item_id,
            adjustment_quantity=adjustment_quantity,
            reason=reason,
            requested_by=requested_by,
            status="PENDING",
        )
        self.db.add(adjustment)
        try:
            self.db.commit()
            self.db.refresh(adjustment)
            return adjustment
        except Exception as e:
            self.db.rollback()
            raise ValueError(f"Failed to create inventory adjustment: {e}")

    def get_by_id(
        self, adjustment_id: uuid.UUID
    ) -> Optional[InventoryAdjustment]:
        return (
            self.db.query(InventoryAdjustment)
            .filter(InventoryAdjustment.id == adjustment_id)
            .first()
        )

    def update_status(
        self,
        adjustment_id: uuid.UUID,
        new_status: str,
        approved_by: uuid.UUID,
    ) -> InventoryAdjustment:
        adjustment = self.get_by_id(adjustment_id)
        if adjustment is None:
            raise ValueError(
                f"InventoryAdjustment {adjustment_id} not found"
            )
        adjustment.status = new_status
        adjustment.approved_by = approved_by
        adjustment.approval_date = datetime.now(timezone.utc)
        self.db.commit()
        self.db.refresh(adjustment)
        return adjustment

    def list(
        self,
        inventory_type: Optional[str] = None,
        item_id: Optional[uuid.UUID] = None,
        status: Optional[str] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> List[InventoryAdjustment]:
        q = self.db.query(InventoryAdjustment)
        if inventory_type is not None:
            q = q.filter(InventoryAdjustment.inventory_type == inventory_type)
        if item_id is not None:
            q = q.filter(InventoryAdjustment.item_id == item_id)
        if status is not None:
            q = q.filter(InventoryAdjustment.status == status)
        return (
            q.order_by(InventoryAdjustment.created_at.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )
