from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import date, datetime
import uuid

from database import get_db
from auth.dependencies import get_current_user, require_roles
from models.user import User
from services.inventory_inward_service import InventoryInwardService
from services.audit_service import AuditService


router = APIRouter(prefix="/api/inventory/inward", tags=["Inventory Inward"])


class CreateInwardRequest(BaseModel):
    paper_roll_id: str
    supplier: str = Field(min_length=1)
    purchase_reference: str = Field(min_length=1)
    quantity_received: float = Field(gt=0)
    unit: str = Field(min_length=1)
    receipt_date: date


class InwardResponse(BaseModel):
    id: str
    paper_roll_id: str
    supplier: str
    purchase_reference: str
    quantity_received: float
    unit: str
    receipt_date: date
    status: str
    requested_by: str
    approved_by: Optional[str] = None
    approval_date: Optional[datetime] = None

    class Config:
        from_attributes = True


def _to_response(inward) -> InwardResponse:
    return InwardResponse(
        id=str(inward.id),
        paper_roll_id=str(inward.paper_roll_id),
        supplier=inward.supplier,
        purchase_reference=inward.purchase_reference,
        quantity_received=float(inward.quantity_received),
        unit=inward.unit,
        receipt_date=inward.receipt_date,
        status=inward.status,
        requested_by=str(inward.requested_by),
        approved_by=str(inward.approved_by) if inward.approved_by else None,
        approval_date=inward.approval_date,
    )


def _parse_uuid(value: str, label: str) -> uuid.UUID:
    try:
        return uuid.UUID(value)
    except (ValueError, AttributeError):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid {label} format",
        )


@router.post("", response_model=InwardResponse, status_code=status.HTTP_201_CREATED)
def create_inward(
    request: CreateInwardRequest,
    http_request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["STORE_MANAGER", "ADMIN"])),
):
    """Create a new inventory inward request (PENDING).

    Validates: Requirements 2.1, 2.2
    """
    paper_roll_uuid = _parse_uuid(request.paper_roll_id, "paper_roll_id")
    service = InventoryInwardService(db)
    try:
        inward = service.record_receipt(
            paper_roll_id=paper_roll_uuid,
            supplier=request.supplier,
            purchase_reference=request.purchase_reference,
            quantity_received=request.quantity_received,
            unit=request.unit,
            receipt_date=request.receipt_date,
            requested_by=current_user.id,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    AuditService(db).record_create(
        transaction_type="INVENTORY_INWARD", entity_type="INVENTORY_INWARD",
        entity=inward, performed_by=current_user.id, request=http_request,
        extra={
            "paper_roll_id": str(inward.paper_roll_id),
            "supplier": inward.supplier,
            "quantity_received": float(inward.quantity_received),
            "unit": inward.unit,
        },
    )
    return _to_response(inward)


@router.get("", response_model=List[InwardResponse])
def list_inward(
    status_filter: Optional[str] = Query(default=None, alias="status"),
    paper_roll_id: Optional[str] = None,
    supplier: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List inward requests with optional filters.

    Validates: Requirements 2.1
    """
    paper_roll_uuid = _parse_uuid(paper_roll_id, "paper_roll_id") if paper_roll_id else None
    service = InventoryInwardService(db)
    try:
        items = service.list_requests(
            status=status_filter,
            paper_roll_id=paper_roll_uuid,
            supplier=supplier,
            skip=skip,
            limit=limit,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    return [_to_response(i) for i in items]


@router.get("/{inward_id}", response_model=InwardResponse)
def get_inward(
    inward_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a single inward request by id.

    Validates: Requirements 2.1
    """
    inward_uuid = _parse_uuid(inward_id, "inward_id")
    service = InventoryInwardService(db)
    inward = service.get_request(inward_uuid)
    if inward is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Inward request not found"
        )
    return _to_response(inward)


@router.post("/{inward_id}/approve", response_model=InwardResponse)
def approve_inward(
    inward_id: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["PRODUCTION_MANAGER", "ADMIN"])),
):
    """Approve an inward request and update raw material stock.

    Validates: Requirements 2.2, 2.3, 2.4
    """
    inward_uuid = _parse_uuid(inward_id, "inward_id")
    service = InventoryInwardService(db)
    try:
        inward = service.approve(inward_id=inward_uuid, approver_id=current_user.id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    AuditService(db).record_state_change(
        transaction_type="INVENTORY_INWARD",
        entity_type="INVENTORY_INWARD",
        entity=inward,
        action="APPROVE",
        performed_by=current_user.id,
        request=request,
    )
    return _to_response(inward)


@router.post("/{inward_id}/reject", response_model=InwardResponse)
def reject_inward(
    inward_id: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["PRODUCTION_MANAGER", "ADMIN"])),
):
    """Reject an inward request. Stock is not updated.

    Validates: Requirements 2.2, 2.4
    """
    inward_uuid = _parse_uuid(inward_id, "inward_id")
    service = InventoryInwardService(db)
    try:
        inward = service.reject(inward_id=inward_uuid, approver_id=current_user.id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    AuditService(db).record_state_change(
        transaction_type="INVENTORY_INWARD",
        entity_type="INVENTORY_INWARD",
        entity=inward,
        action="REJECT",
        performed_by=current_user.id,
        request=request,
    )
    return _to_response(inward)
