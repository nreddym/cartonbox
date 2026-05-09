from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import date
import uuid

from database import get_db
from auth.dependencies import get_current_user, require_roles
from models.user import User
from services.job_card_service import JobCardService


router = APIRouter(prefix="/api/jobcards", tags=["Job Cards"])


class CreateJobCardRequest(BaseModel):
    job_card_number: str = Field(min_length=1)
    box_type: str = Field(min_length=1)
    box_length: float = Field(gt=0)
    box_width: float = Field(gt=0)
    box_height: float = Field(gt=0)
    ply_type: str = Field(min_length=1)
    ply_count: int = Field(gt=0)
    quantity_to_produce: int = Field(gt=0)
    planned_start_date: date
    planned_end_date: date


class UpdateJobCardRequest(BaseModel):
    box_type: Optional[str] = None
    box_length: Optional[float] = None
    box_width: Optional[float] = None
    box_height: Optional[float] = None
    ply_type: Optional[str] = None
    ply_count: Optional[int] = None
    quantity_to_produce: Optional[int] = None
    planned_start_date: Optional[date] = None
    planned_end_date: Optional[date] = None


class JobCardResponse(BaseModel):
    id: str
    job_card_number: str
    box_type: str
    box_length: float
    box_width: float
    box_height: float
    ply_type: str
    ply_count: int
    quantity_to_produce: int
    planned_start_date: date
    planned_end_date: date
    actual_start_date: Optional[date] = None
    actual_end_date: Optional[date] = None
    status: str
    calculated_paper_area: Optional[float] = None
    required_paper_quantity: Optional[float] = None
    created_by: str
    approved_by: Optional[str] = None

    class Config:
        from_attributes = True


class MaterialRequirementResponse(BaseModel):
    job_card_id: str
    calculated_paper_area: float
    required_paper_quantity: float


def _to_response(jc) -> JobCardResponse:
    return JobCardResponse(
        id=str(jc.id),
        job_card_number=jc.job_card_number,
        box_type=jc.box_type,
        box_length=float(jc.box_length),
        box_width=float(jc.box_width),
        box_height=float(jc.box_height),
        ply_type=jc.ply_type,
        ply_count=jc.ply_count,
        quantity_to_produce=jc.quantity_to_produce,
        planned_start_date=jc.planned_start_date,
        planned_end_date=jc.planned_end_date,
        actual_start_date=jc.actual_start_date,
        actual_end_date=jc.actual_end_date,
        status=jc.status,
        calculated_paper_area=float(jc.calculated_paper_area)
        if jc.calculated_paper_area is not None
        else None,
        required_paper_quantity=float(jc.required_paper_quantity)
        if jc.required_paper_quantity is not None
        else None,
        created_by=str(jc.created_by),
        approved_by=str(jc.approved_by) if jc.approved_by else None,
    )


def _parse_uuid(value: str, label: str) -> uuid.UUID:
    try:
        return uuid.UUID(value)
    except (ValueError, AttributeError):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid {label} format",
        )


@router.post("", response_model=JobCardResponse, status_code=status.HTTP_201_CREATED)
def create_job_card(
    request: CreateJobCardRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles(["SUPERVISOR", "PRODUCTION_MANAGER", "ADMIN"])
    ),
):
    """Create a job card. Validates: Requirements 3.1, 3.2, 3.3, 5.1"""
    service = JobCardService(db)
    try:
        jc = service.create_job_card(
            job_card_number=request.job_card_number,
            box_type=request.box_type,
            box_length=request.box_length,
            box_width=request.box_width,
            box_height=request.box_height,
            ply_type=request.ply_type,
            ply_count=request.ply_count,
            quantity_to_produce=request.quantity_to_produce,
            planned_start_date=request.planned_start_date,
            planned_end_date=request.planned_end_date,
            created_by=current_user.id,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    return _to_response(jc)


@router.get("", response_model=List[JobCardResponse])
def list_job_cards(
    status_filter: Optional[str] = Query(default=None, alias="status"),
    box_type: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List job cards with optional filters. Validates: Requirements 5.5"""
    service = JobCardService(db)
    items = service.list_job_cards(
        status=status_filter, box_type=box_type, skip=skip, limit=limit
    )
    return [_to_response(j) for j in items]


@router.get("/{job_card_id}", response_model=JobCardResponse)
def get_job_card(
    job_card_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get job card details. Validates: Requirements 3.1"""
    jc_uuid = _parse_uuid(job_card_id, "job_card_id")
    service = JobCardService(db)
    jc = service.get(jc_uuid)
    if jc is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Job card not found"
        )
    return _to_response(jc)


@router.put("/{job_card_id}", response_model=JobCardResponse)
def update_job_card(
    job_card_id: str,
    request: UpdateJobCardRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles(["SUPERVISOR", "PRODUCTION_MANAGER", "ADMIN"])
    ),
):
    """Update job card details. Validates: Requirements 3.1"""
    jc_uuid = _parse_uuid(job_card_id, "job_card_id")
    service = JobCardService(db)
    existing = service.get(jc_uuid)
    if existing is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Job card not found"
        )
    if existing.status != "CREATED":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot update job card in status '{existing.status}'",
        )
    updated = service.job_card_repo.update(
        jc_uuid, **request.model_dump(exclude_none=True)
    )
    # Recalculate if dimensions or quantity changed
    fields_changed = request.model_dump(exclude_none=True).keys()
    if fields_changed & {
        "box_length",
        "box_width",
        "box_height",
        "ply_count",
        "quantity_to_produce",
    }:
        service.calculate_and_persist_material_requirement(jc_uuid)
        updated = service.get(jc_uuid)
    return _to_response(updated)


@router.post(
    "/{job_card_id}/calculate-materials",
    response_model=MaterialRequirementResponse,
)
def calculate_materials(
    job_card_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles(["SUPERVISOR", "PRODUCTION_MANAGER", "ADMIN"])
    ),
):
    """Compute and persist paper area + required quantity. Validates: Requirements 3.2, 3.3"""
    jc_uuid = _parse_uuid(job_card_id, "job_card_id")
    service = JobCardService(db)
    try:
        area, required = service.calculate_and_persist_material_requirement(jc_uuid)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    return MaterialRequirementResponse(
        job_card_id=job_card_id,
        calculated_paper_area=area,
        required_paper_quantity=required,
    )


@router.post("/{job_card_id}/approve", response_model=JobCardResponse)
def approve_job_card(
    job_card_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["PRODUCTION_MANAGER", "ADMIN"])),
):
    """Approve a job card after validating raw material stock.

    Validates: Requirements 3.4, 3.5, 5.2
    """
    jc_uuid = _parse_uuid(job_card_id, "job_card_id")
    service = JobCardService(db)
    try:
        jc = service.approve_job_card(jc_uuid, approver_id=current_user.id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    return _to_response(jc)


@router.post("/{job_card_id}/reject", response_model=JobCardResponse)
def reject_job_card(
    job_card_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["PRODUCTION_MANAGER", "ADMIN"])),
):
    """Reject a CREATED job card. Approver must differ from creator."""
    jc_uuid = _parse_uuid(job_card_id, "job_card_id")
    service = JobCardService(db)
    try:
        jc = service.reject_job_card(jc_uuid, approver_id=current_user.id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    return _to_response(jc)


@router.post("/{job_card_id}/start", response_model=JobCardResponse)
def start_job_card(
    job_card_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["PRODUCTION_MANAGER", "ADMIN"])),
):
    """Mark a job card as IN_PRODUCTION. Validates: Requirements 5.3"""
    jc_uuid = _parse_uuid(job_card_id, "job_card_id")
    service = JobCardService(db)
    try:
        jc = service.start_production(jc_uuid)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    return _to_response(jc)


@router.post("/{job_card_id}/complete", response_model=JobCardResponse)
def complete_job_card(
    job_card_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["SUPERVISOR", "ADMIN"])),
):
    """Mark a job card as COMPLETED. Validates: Requirements 5.4"""
    jc_uuid = _parse_uuid(job_card_id, "job_card_id")
    service = JobCardService(db)
    try:
        jc = service.complete_production(jc_uuid)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    return _to_response(jc)
