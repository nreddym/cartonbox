from sqlalchemy.orm import Session
from datetime import date, datetime, timezone
from typing import Optional, List
import uuid

from models.inventory_inward import InventoryInward
from repositories.inventory_inward_repository import InventoryInwardRepository
from repositories.raw_material_inventory_repository import RawMaterialInventoryRepository
from repositories.paper_roll_repository import PaperRollRepository


VALID_STATUSES = ("PENDING", "APPROVED", "REJECTED")


class InventoryInwardService:
    """Service implementing inventory inward approval workflow.

    Validates: Requirements 2.1, 2.2, 2.3, 2.4
    """

    def __init__(self, db: Session):
        self.db = db
        self.inward_repo = InventoryInwardRepository(db)
        self.inventory_repo = RawMaterialInventoryRepository(db)
        self.paper_roll_repo = PaperRollRepository(db)

    def record_receipt(
        self,
        paper_roll_id: uuid.UUID,
        supplier: str,
        purchase_reference: str,
        quantity_received: float,
        unit: str,
        receipt_date: date,
        requested_by: uuid.UUID,
    ) -> InventoryInward:
        """Record a raw material receipt request. Status starts as PENDING.

        Validates: Requirements 2.1, 2.2 (approval required before stock update)
        """
        if quantity_received <= 0:
            raise ValueError("quantity_received must be greater than zero")
        if not supplier or not supplier.strip():
            raise ValueError("supplier is required")
        if not purchase_reference or not purchase_reference.strip():
            raise ValueError("purchase_reference is required")
        if self.paper_roll_repo.get_by_id(paper_roll_id) is None:
            raise ValueError(f"Paper roll {paper_roll_id} does not exist")

        return self.inward_repo.create(
            paper_roll_id=paper_roll_id,
            supplier=supplier,
            purchase_reference=purchase_reference,
            quantity_received=quantity_received,
            unit=unit,
            receipt_date=receipt_date,
            requested_by=requested_by,
        )

    def approve(
        self,
        inward_id: uuid.UUID,
        approver_id: uuid.UUID,
    ) -> InventoryInward:
        """Approve an inward request and increase paper roll stock balance.

        Validates: Requirements 2.2, 2.3, 2.4
        """
        inward = self.inward_repo.get_by_id(inward_id)
        if inward is None:
            raise ValueError(f"Inward request {inward_id} not found")
        if inward.status != "PENDING":
            raise ValueError(
                f"Cannot approve inward request in status '{inward.status}'"
            )
        if inward.requested_by == approver_id:
            raise ValueError(
                "Approver must be different from the user who requested the inward"
            )

        # Update inventory current stock by quantity_received
        inventory = self.inventory_repo.get_by_paper_roll_id(inward.paper_roll_id)
        if inventory is None:
            raise ValueError(
                f"No inventory record exists for paper roll {inward.paper_roll_id}"
            )
        new_stock = float(inventory.current_stock) + float(inward.quantity_received)
        self.inventory_repo.update_stock(
            paper_roll_id=inward.paper_roll_id, new_stock=new_stock
        )

        return self.inward_repo.update_status(
            inward_id=inward_id,
            new_status="APPROVED",
            approved_by=approver_id,
            approval_date=datetime.now(timezone.utc),
        )

    def reject(
        self,
        inward_id: uuid.UUID,
        approver_id: uuid.UUID,
    ) -> InventoryInward:
        """Reject an inward request. Stock balance is NOT updated.

        Validates: Requirements 2.2, 2.4
        """
        inward = self.inward_repo.get_by_id(inward_id)
        if inward is None:
            raise ValueError(f"Inward request {inward_id} not found")
        if inward.status != "PENDING":
            raise ValueError(
                f"Cannot reject inward request in status '{inward.status}'"
            )
        return self.inward_repo.update_status(
            inward_id=inward_id,
            new_status="REJECTED",
            approved_by=approver_id,
            approval_date=datetime.now(timezone.utc),
        )

    def list_requests(
        self,
        status: Optional[str] = None,
        paper_roll_id: Optional[uuid.UUID] = None,
        supplier: Optional[str] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> List[InventoryInward]:
        if status is not None and status not in VALID_STATUSES:
            raise ValueError(f"Invalid status filter: {status}")
        return self.inward_repo.list(
            status=status,
            paper_roll_id=paper_roll_id,
            supplier=supplier,
            skip=skip,
            limit=limit,
        )

    def get_request(self, inward_id: uuid.UUID) -> Optional[InventoryInward]:
        return self.inward_repo.get_by_id(inward_id)
