from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
import uuid
from database import get_db
from repositories.paper_roll_repository import PaperRollRepository
from repositories.raw_material_inventory_repository import RawMaterialInventoryRepository
from auth.dependencies import get_current_user, require_roles
from models.user import User


router = APIRouter(prefix="/api/materials", tags=["Materials"])


class CreatePaperRollRequest(BaseModel):
    material_code: str
    paper_type: str
    gsm: int
    roll_width: float
    roll_length: Optional[float] = None
    roll_weight: Optional[float] = None
    supplier: str
    opening_stock: float = 0.0
    unit: str = "kg"


class UpdatePaperRollRequest(BaseModel):
    paper_type: Optional[str] = None
    gsm: Optional[int] = None
    roll_width: Optional[float] = None
    roll_length: Optional[float] = None
    roll_weight: Optional[float] = None
    supplier: Optional[str] = None


class PaperRollResponse(BaseModel):
    id: str
    material_code: str
    paper_type: str
    gsm: int
    roll_width: float
    roll_length: Optional[float]
    roll_weight: Optional[float]
    supplier: str
    
    class Config:
        from_attributes = True


class StockResponse(BaseModel):
    paper_roll_id: str
    material_code: str
    opening_stock: float
    current_stock: float
    unit: str
    
    class Config:
        from_attributes = True


@router.post("", response_model=PaperRollResponse, status_code=status.HTTP_201_CREATED)
def create_paper_roll(
    request: CreatePaperRollRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["STORE_MANAGER", "ADMIN"]))
):
    """
    Create a new paper roll type
    Validates: Requirements 1.1
    """
    paper_roll_repo = PaperRollRepository(db)
    inventory_repo = RawMaterialInventoryRepository(db)
    
    try:
        # Create paper roll
        paper_roll = paper_roll_repo.create(
            material_code=request.material_code,
            paper_type=request.paper_type,
            gsm=request.gsm,
            roll_width=request.roll_width,
            roll_length=request.roll_length,
            roll_weight=request.roll_weight,
            supplier=request.supplier
        )
        
        # Create inventory record
        inventory_repo.create(
            paper_roll_id=paper_roll.id,
            opening_stock=request.opening_stock,
            current_stock=request.opening_stock,
            unit=request.unit
        )
        
        return PaperRollResponse(
            id=str(paper_roll.id),
            material_code=paper_roll.material_code,
            paper_type=paper_roll.paper_type,
            gsm=paper_roll.gsm,
            roll_width=float(paper_roll.roll_width),
            roll_length=float(paper_roll.roll_length) if paper_roll.roll_length else None,
            roll_weight=float(paper_roll.roll_weight) if paper_roll.roll_weight else None,
            supplier=paper_roll.supplier
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("", response_model=List[PaperRollResponse])
def list_paper_rolls(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    List all paper roll types
    Validates: Requirements 1.1
    """
    paper_roll_repo = PaperRollRepository(db)
    paper_rolls = paper_roll_repo.get_all(skip=skip, limit=limit)
    
    return [
        PaperRollResponse(
            id=str(pr.id),
            material_code=pr.material_code,
            paper_type=pr.paper_type,
            gsm=pr.gsm,
            roll_width=float(pr.roll_width),
            roll_length=float(pr.roll_length) if pr.roll_length else None,
            roll_weight=float(pr.roll_weight) if pr.roll_weight else None,
            supplier=pr.supplier
        )
        for pr in paper_rolls
    ]


@router.get("/{material_id}", response_model=PaperRollResponse)
def get_paper_roll(
    material_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get paper roll details by ID
    Validates: Requirements 1.1
    """
    try:
        material_uuid = uuid.UUID(material_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid material ID format"
        )
    
    paper_roll_repo = PaperRollRepository(db)
    paper_roll = paper_roll_repo.get_by_id(material_uuid)
    
    if not paper_roll:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Paper roll not found"
        )
    
    return PaperRollResponse(
        id=str(paper_roll.id),
        material_code=paper_roll.material_code,
        paper_type=paper_roll.paper_type,
        gsm=paper_roll.gsm,
        roll_width=float(paper_roll.roll_width),
        roll_length=float(paper_roll.roll_length) if paper_roll.roll_length else None,
        roll_weight=float(paper_roll.roll_weight) if paper_roll.roll_weight else None,
        supplier=paper_roll.supplier
    )


@router.put("/{material_id}", response_model=PaperRollResponse)
def update_paper_roll(
    material_id: str,
    request: UpdatePaperRollRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["STORE_MANAGER", "ADMIN"]))
):
    """
    Update paper roll type
    Validates: Requirements 1.1
    """
    try:
        material_uuid = uuid.UUID(material_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid material ID format"
        )
    
    paper_roll_repo = PaperRollRepository(db)
    paper_roll = paper_roll_repo.update(
        paper_roll_id=material_uuid,
        paper_type=request.paper_type,
        gsm=request.gsm,
        roll_width=request.roll_width,
        roll_length=request.roll_length,
        roll_weight=request.roll_weight,
        supplier=request.supplier
    )
    
    if not paper_roll:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Paper roll not found"
        )
    
    return PaperRollResponse(
        id=str(paper_roll.id),
        material_code=paper_roll.material_code,
        paper_type=paper_roll.paper_type,
        gsm=paper_roll.gsm,
        roll_width=float(paper_roll.roll_width),
        roll_length=float(paper_roll.roll_length) if paper_roll.roll_length else None,
        roll_weight=float(paper_roll.roll_weight) if paper_roll.roll_weight else None,
        supplier=paper_roll.supplier
    )


@router.get("/{material_id}/stock", response_model=StockResponse)
def get_stock_level(
    material_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get stock level and history for a paper roll
    Validates: Requirements 1.2
    """
    try:
        material_uuid = uuid.UUID(material_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid material ID format"
        )
    
    paper_roll_repo = PaperRollRepository(db)
    paper_roll = paper_roll_repo.get_by_id(material_uuid)
    
    if not paper_roll:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Paper roll not found"
        )
    
    inventory_repo = RawMaterialInventoryRepository(db)
    inventory = inventory_repo.get_by_paper_roll_id(material_uuid)
    
    if not inventory:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Inventory record not found for this paper roll"
        )
    
    return StockResponse(
        paper_roll_id=str(paper_roll.id),
        material_code=paper_roll.material_code,
        opening_stock=float(inventory.opening_stock),
        current_stock=float(inventory.current_stock),
        unit=inventory.unit
    )
