from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import Optional, List
from datetime import date, datetime
import uuid

from models.inventory_inward import InventoryInward


class InventoryInwardRepository:
    """Repository for InventoryInward entity (raw material receipts).

    Validates: Requirements 2.1
    """

    def __init__(self, db: Session):
        self.db = db

    def create(
        self,
        paper_roll_id: uuid.UUID,
        supplier: str,
        purchase_reference: str,
        quantity_received: float,
        unit: str,
        receipt_date: date,
        requested_by: uuid.UUID,
    ) -> InventoryInward:
        """Create a new inventory inward request in PENDING status."""
        inward = InventoryInward(
            paper_roll_id=paper_roll_id,
            supplier=supplier,
            purchase_reference=purchase_reference,
            quantity_received=quantity_received,
            unit=unit,
            receipt_date=receipt_date,
            requested_by=requested_by,
            status="PENDING",
        )
        self.db.add(inward)
        self.db.commit()
        self.db.refresh(inward)
        return inward

    def get_by_id(self, inward_id: uuid.UUID) -> Optional[InventoryInward]:
        return self.db.query(InventoryInward).filter(InventoryInward.id == inward_id).first()

    def list(
        self,
        status: Optional[str] = None,
        paper_roll_id: Optional[uuid.UUID] = None,
        supplier: Optional[str] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> List[InventoryInward]:
        """List inward requests with optional status / paper roll / supplier filters."""
        query = self.db.query(InventoryInward)
        if status is not None:
            query = query.filter(InventoryInward.status == status)
        if paper_roll_id is not None:
            query = query.filter(InventoryInward.paper_roll_id == paper_roll_id)
        if supplier is not None:
            query = query.filter(InventoryInward.supplier == supplier)
        return (
            query.order_by(desc(InventoryInward.created_at))
            .offset(skip)
            .limit(limit)
            .all()
        )

    def update_status(
        self,
        inward_id: uuid.UUID,
        new_status: str,
        approved_by: Optional[uuid.UUID] = None,
        approval_date: Optional[datetime] = None,
    ) -> Optional[InventoryInward]:
        """Update status and approval metadata for an inward request."""
        inward = self.get_by_id(inward_id)
        if inward is None:
            return None
        inward.status = new_status
        if approved_by is not None:
            inward.approved_by = approved_by
        if approval_date is not None:
            inward.approval_date = approval_date
        self.db.commit()
        self.db.refresh(inward)
        return inward
