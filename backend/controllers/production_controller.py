from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from typing import Optional
from datetime import date, datetime
import uuid

from database import get_db
from auth.dependencies import get_current_user, require_roles
from models.user import User
from services.production_service import ProductionService


router = APIRouter(prefix="/api/production", tags=["Production"])


class CompleteProductionRequest(BaseModel):
    actual_quantity_produced: int = Field(ge=0)
    rejected_quantity: int = Field(ge=0)
    wastage_quantity: Optional[float] = Field(default=None, ge=0)
    actual_end_date: Optional[date] = None


class FinishedGoodsInwardResponse(BaseModel):
    id: str
    finished_goods_id: str
    job_card_id: str
    quantity_produced: int
    quantity_rejected: int
    net_quantity: int
    confirmed_by: str
    confirmation_date: datetime

    class Config:
        from_attributes = True


class CompleteProductionResponse(BaseModel):
    job_card_id: str
    job_card_status: str
    actual_quantity_produced: int
    rejected_quantity: int
    net_quantity: int
    inward: FinishedGoodsInwardResponse


@router.post(
    "/job-cards/{job_card_id}/complete",
    response_model=CompleteProductionResponse,
    status_code=status.HTTP_200_OK,
)
def complete_production(
    job_card_id: str,
    payload: CompleteProductionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles(["SUPERVISOR", "PRODUCTION_MANAGER", "ADMIN"])
    ),
):
    """Record production completion and automatically create finished goods
    inward + update inventory. Validates Req 6.1-6.4, 7.1-7.4.
    """
    try:
        jc_uuid = uuid.UUID(job_card_id)
    except (ValueError, AttributeError):
        raise HTTPException(status_code=400, detail="Invalid job_card_id")

    service = ProductionService(db)
    try:
        job_card, inward = service.complete_production(
            job_card_id=jc_uuid,
            actual_quantity_produced=payload.actual_quantity_produced,
            rejected_quantity=payload.rejected_quantity,
            confirmed_by=current_user.id,
            wastage_quantity=payload.wastage_quantity,
            actual_end_date=payload.actual_end_date,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return CompleteProductionResponse(
        job_card_id=str(job_card.id),
        job_card_status=job_card.status,
        actual_quantity_produced=int(job_card.actual_quantity_produced or 0),
        rejected_quantity=int(job_card.rejected_quantity or 0),
        net_quantity=int(inward.net_quantity),
        inward=FinishedGoodsInwardResponse(
            id=str(inward.id),
            finished_goods_id=str(inward.finished_goods_id),
            job_card_id=str(inward.job_card_id),
            quantity_produced=int(inward.quantity_produced),
            quantity_rejected=int(inward.quantity_rejected),
            net_quantity=int(inward.net_quantity),
            confirmed_by=str(inward.confirmed_by),
            confirmation_date=inward.confirmation_date,
        ),
    )
