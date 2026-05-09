from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import date, datetime
import uuid

from database import get_db
from auth.dependencies import get_current_user, require_roles
from models.user import User
from services.material_issue_service import MaterialIssueService
from services.audit_service import AuditService


router = APIRouter(prefix="/api/material-issues", tags=["Material Issues"])


class CreateMaterialIssueRequest(BaseModel):
    job_card_id: str
    paper_roll_id: str
    requested_quantity: float = Field(gt=0)
    issued_quantity: Optional[float] = Field(default=None, gt=0)
    unit: str = Field(min_length=1)
    issue_date: date


class ApproveMaterialIssueRequest(BaseModel):
    issued_quantity: Optional[float] = Field(default=None, gt=0)


class MaterialIssueResponse(BaseModel):
    id: str
    job_card_id: str
    paper_roll_id: str
    requested_quantity: float
    issued_quantity: float
    unit: str
    issue_date: date
    status: str
    requested_by: str
    approved_by: Optional[str] = None
    approval_date: Optional[datetime] = None

    class Config:
        from_attributes = True


def _to_response(mi) -> MaterialIssueResponse:
    return MaterialIssueResponse(
        id=str(mi.id),
        job_card_id=str(mi.job_card_id),
        paper_roll_id=str(mi.paper_roll_id),
        requested_quantity=float(mi.requested_quantity),
        issued_quantity=float(mi.issued_quantity),
        unit=mi.unit,
        issue_date=mi.issue_date,
        status=mi.status,
        requested_by=str(mi.requested_by),
        approved_by=str(mi.approved_by) if mi.approved_by else None,
        approval_date=mi.approval_date,
    )


def _parse_uuid(value: str, label: str) -> uuid.UUID:
    try:
        return uuid.UUID(value)
    except (ValueError, AttributeError):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid {label} format",
        )


@router.post(
    "", response_model=MaterialIssueResponse, status_code=status.HTTP_201_CREATED
)
def create_material_issue(
    request: CreateMaterialIssueRequest,
    http_request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles(["PRODUCTION_MANAGER", "SUPERVISOR", "ADMIN"])
    ),
):
    """Create a material issue request. Validates: Requirements 4.1, 4.2, 4.4"""
    service = MaterialIssueService(db)
    try:
        mi = service.create_issue(
            job_card_id=_parse_uuid(request.job_card_id, "job_card_id"),
            paper_roll_id=_parse_uuid(request.paper_roll_id, "paper_roll_id"),
            requested_quantity=request.requested_quantity,
            issued_quantity=(
                request.issued_quantity
                if request.issued_quantity is not None
                else request.requested_quantity
            ),
            unit=request.unit,
            issue_date=request.issue_date,
            requested_by=current_user.id,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    AuditService(db).record_create(
        transaction_type="MATERIAL_ISSUE", entity_type="MATERIAL_ISSUE",
        entity=mi, performed_by=current_user.id, request=http_request,
        extra={
            "job_card_id": str(mi.job_card_id),
            "paper_roll_id": str(mi.paper_roll_id),
            "requested_quantity": float(mi.requested_quantity),
            "unit": mi.unit,
        },
    )
    return _to_response(mi)


@router.get("", response_model=List[MaterialIssueResponse])
def list_material_issues(
    job_card_id: Optional[str] = Query(default=None),
    status_filter: Optional[str] = Query(default=None, alias="status"),
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List material issues with optional filters. Validates: Requirements 4.1"""
    service = MaterialIssueService(db)
    jc_uuid = _parse_uuid(job_card_id, "job_card_id") if job_card_id else None
    items = service.list_issues(
        job_card_id=jc_uuid, status=status_filter, skip=skip, limit=limit
    )
    return [_to_response(m) for m in items]


@router.get("/{issue_id}", response_model=MaterialIssueResponse)
def get_material_issue(
    issue_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get material issue details. Validates: Requirements 4.1"""
    issue_uuid = _parse_uuid(issue_id, "issue_id")
    service = MaterialIssueService(db)
    mi = service.get(issue_uuid)
    if mi is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Material issue not found",
        )
    return _to_response(mi)


@router.post("/{issue_id}/approve", response_model=MaterialIssueResponse)
def approve_material_issue(
    issue_id: str,
    request: Request,
    body: Optional[ApproveMaterialIssueRequest] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["STORE_MANAGER", "ADMIN"])),
):
    """Approve a material issue. Validates: Requirements 4.2, 4.3, 5.3"""
    issue_uuid = _parse_uuid(issue_id, "issue_id")
    service = MaterialIssueService(db)
    try:
        mi = service.approve_issue(
            issue_uuid,
            approver_id=current_user.id,
            issued_quantity=(body.issued_quantity if body else None),
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    AuditService(db).record_state_change(
        transaction_type="MATERIAL_ISSUE", entity_type="MATERIAL_ISSUE", entity=mi,
        action="APPROVE", performed_by=current_user.id, request=request,
    )
    return _to_response(mi)


@router.post("/{issue_id}/reject", response_model=MaterialIssueResponse)
def reject_material_issue(
    issue_id: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["STORE_MANAGER", "ADMIN"])),
):
    """Reject a material issue. Validates: Requirements 4.2"""
    issue_uuid = _parse_uuid(issue_id, "issue_id")
    service = MaterialIssueService(db)
    try:
        mi = service.reject_issue(issue_uuid, approver_id=current_user.id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    AuditService(db).record_state_change(
        transaction_type="MATERIAL_ISSUE", entity_type="MATERIAL_ISSUE", entity=mi,
        action="REJECT", performed_by=current_user.id, request=request,
    )
    return _to_response(mi)
