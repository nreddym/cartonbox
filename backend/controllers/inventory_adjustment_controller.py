from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
import uuid

from database import get_db
from auth.dependencies import get_current_user, require_roles
from models.user import User
from services.inventory_adjustment_service import (
    InventoryAdjustmentService,
)
from services.audit_service import AuditService


router = APIRouter(
    prefix="/api/inventory/adjustments", tags=["Inventory Adjustments"]
)


class CreateAdjustmentRequest(BaseModel):
    inventory_type: str = Field(pattern="^(RAW_MATERIAL|FINISHED_GOODS)$")
    item_id: str
    adjustment_quantity: float
    reason: str = Field(min_length=10)


class AdjustmentResponse(BaseModel):
    id: str
    inventory_type: str
    item_id: str
    adjustment_quantity: float
    reason: str
    status: str
    requested_by: str
    approved_by: Optional[str] = None
    approval_date: Optional[datetime] = None

    class Config:
        from_attributes = True


def _to_response(adj) -> AdjustmentResponse:
    return AdjustmentResponse(
        id=str(adj.id),
        inventory_type=adj.inventory_type,
        item_id=str(adj.item_id),
        adjustment_quantity=float(adj.adjustment_quantity),
        reason=adj.reason,
        status=adj.status,
        requested_by=str(adj.requested_by),
        approved_by=str(adj.approved_by) if adj.approved_by else None,
        approval_date=adj.approval_date,
    )


def _parse_uuid(value: str, label: str) -> uuid.UUID:
    try:
        return uuid.UUID(value)
    except (ValueError, AttributeError):
        raise HTTPException(status_code=400, detail=f"Invalid {label}")


@router.post(
    "", response_model=AdjustmentResponse, status_code=status.HTTP_201_CREATED
)
def create_adjustment(
    payload: CreateAdjustmentRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles(["STORE_MANAGER", "PRODUCTION_MANAGER", "ADMIN"])
    ),
):
    item_id = _parse_uuid(payload.item_id, "item_id")
    service = InventoryAdjustmentService(db)
    try:
        adj = service.create_adjustment(
            inventory_type=payload.inventory_type,
            item_id=item_id,
            adjustment_quantity=payload.adjustment_quantity,
            reason=payload.reason,
            requested_by=current_user.id,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    AuditService(db).record_create(
        transaction_type="INVENTORY_ADJUSTMENT", entity_type="INVENTORY_ADJUSTMENT",
        entity=adj, performed_by=current_user.id, request=request,
        extra={
            "inventory_type": payload.inventory_type,
            "item_id": str(item_id),
            "adjustment_quantity": float(payload.adjustment_quantity),
            "reason": payload.reason,
        },
    )
    return _to_response(adj)


@router.get("", response_model=List[AdjustmentResponse])
def list_adjustments(
    inventory_type: Optional[str] = Query(None),
    item_id: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    parsed_item_id = _parse_uuid(item_id, "item_id") if item_id else None
    service = InventoryAdjustmentService(db)
    adjustments = service.list_adjustments(
        inventory_type=inventory_type,
        item_id=parsed_item_id,
        status=status_filter,
        skip=skip,
        limit=limit,
    )
    return [_to_response(a) for a in adjustments]


@router.get("/{adjustment_id}", response_model=AdjustmentResponse)
def get_adjustment(
    adjustment_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    aid = _parse_uuid(adjustment_id, "adjustment_id")
    service = InventoryAdjustmentService(db)
    adj = service.get(aid)
    if adj is None:
        raise HTTPException(status_code=404, detail="Adjustment not found")
    return _to_response(adj)


@router.post(
    "/{adjustment_id}/approve", response_model=AdjustmentResponse
)
def approve_adjustment(
    adjustment_id: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["ADMIN", "PRODUCTION_MANAGER", "STORE_MANAGER"])),
):
    aid = _parse_uuid(adjustment_id, "adjustment_id")
    service = InventoryAdjustmentService(db)
    try:
        adj = service.approve_adjustment(aid, current_user.id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    AuditService(db).record_state_change(
        transaction_type="INVENTORY_ADJUSTMENT", entity_type="INVENTORY_ADJUSTMENT", entity=adj,
        action="APPROVE", performed_by=current_user.id, request=request,
    )
    return _to_response(adj)


@router.post(
    "/{adjustment_id}/reject", response_model=AdjustmentResponse
)
def reject_adjustment(
    adjustment_id: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["ADMIN", "PRODUCTION_MANAGER", "STORE_MANAGER"])),
):
    aid = _parse_uuid(adjustment_id, "adjustment_id")
    service = InventoryAdjustmentService(db)
    try:
        adj = service.reject_adjustment(aid, current_user.id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    AuditService(db).record_state_change(
        transaction_type="INVENTORY_ADJUSTMENT", entity_type="INVENTORY_ADJUSTMENT", entity=adj,
        action="REJECT", performed_by=current_user.id, request=request,
    )
    return _to_response(adj)
