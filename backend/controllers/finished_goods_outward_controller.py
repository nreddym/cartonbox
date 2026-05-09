from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import date, datetime
import uuid

from database import get_db
from auth.dependencies import get_current_user, require_roles
from models.user import User
from services.finished_goods_outward_service import (
    FinishedGoodsOutwardService,
)
from services.audit_service import AuditService


router = APIRouter(
    prefix="/api/finished-goods/outward", tags=["Finished Goods Outward"]
)


class CreateOutwardRequest(BaseModel):
    finished_goods_id: str
    quantity: int = Field(gt=0)
    destination: str = Field(min_length=1)
    dispatch_date: date


class OutwardResponse(BaseModel):
    id: str
    finished_goods_id: str
    quantity: int
    destination: str
    dispatch_date: date
    status: str
    requested_by: str
    approved_by: Optional[str] = None
    approval_date: Optional[datetime] = None

    class Config:
        from_attributes = True


def _to_response(outward) -> OutwardResponse:
    return OutwardResponse(
        id=str(outward.id),
        finished_goods_id=str(outward.finished_goods_id),
        quantity=int(outward.quantity),
        destination=outward.destination,
        dispatch_date=outward.dispatch_date,
        status=outward.status,
        requested_by=str(outward.requested_by),
        approved_by=str(outward.approved_by) if outward.approved_by else None,
        approval_date=outward.approval_date,
    )


def _parse_uuid(value: str, label: str) -> uuid.UUID:
    try:
        return uuid.UUID(value)
    except (ValueError, AttributeError):
        raise HTTPException(status_code=400, detail=f"Invalid {label}")


@router.post(
    "", response_model=OutwardResponse, status_code=status.HTTP_201_CREATED
)
def create_outward(
    payload: CreateOutwardRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles(["DISPATCH_MANAGER", "STORE_MANAGER", "ADMIN"])
    ),
):
    fg_id = _parse_uuid(payload.finished_goods_id, "finished_goods_id")
    service = FinishedGoodsOutwardService(db)
    try:
        outward = service.create_outward(
            finished_goods_id=fg_id,
            quantity=payload.quantity,
            destination=payload.destination,
            dispatch_date=payload.dispatch_date,
            requested_by=current_user.id,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    AuditService(db).record_create(
        transaction_type="FG_OUTWARD", entity_type="FG_OUTWARD",
        entity=outward, performed_by=current_user.id, request=request,
        extra={
            "finished_goods_id": str(fg_id),
            "quantity": float(payload.quantity),
            "destination": payload.destination,
        },
    )
    return _to_response(outward)


@router.get("", response_model=List[OutwardResponse])
def list_outwards(
    finished_goods_id: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    fg_id = (
        _parse_uuid(finished_goods_id, "finished_goods_id")
        if finished_goods_id
        else None
    )
    service = FinishedGoodsOutwardService(db)
    outwards = service.list_outwards(
        finished_goods_id=fg_id, status=status_filter, skip=skip, limit=limit
    )
    return [_to_response(o) for o in outwards]


@router.get("/{outward_id}", response_model=OutwardResponse)
def get_outward(
    outward_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    oid = _parse_uuid(outward_id, "outward_id")
    service = FinishedGoodsOutwardService(db)
    outward = service.get(oid)
    if outward is None:
        raise HTTPException(status_code=404, detail="Outward not found")
    return _to_response(outward)


@router.post("/{outward_id}/approve", response_model=OutwardResponse)
def approve_outward(
    outward_id: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles(["DISPATCH_MANAGER", "ADMIN"])
    ),
):
    oid = _parse_uuid(outward_id, "outward_id")
    service = FinishedGoodsOutwardService(db)
    try:
        outward = service.approve_outward(oid, current_user.id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    AuditService(db).record_state_change(
        transaction_type="FG_OUTWARD", entity_type="FG_OUTWARD", entity=outward,
        action="APPROVE", performed_by=current_user.id, request=request,
    )
    return _to_response(outward)


@router.post("/{outward_id}/reject", response_model=OutwardResponse)
def reject_outward(
    outward_id: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles(["DISPATCH_MANAGER", "ADMIN"])
    ),
):
    oid = _parse_uuid(outward_id, "outward_id")
    service = FinishedGoodsOutwardService(db)
    try:
        outward = service.reject_outward(oid, current_user.id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    AuditService(db).record_state_change(
        transaction_type="FG_OUTWARD", entity_type="FG_OUTWARD", entity=outward,
        action="REJECT", performed_by=current_user.id, request=request,
    )
    return _to_response(outward)
