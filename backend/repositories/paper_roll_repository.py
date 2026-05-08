from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from typing import Optional, List
from models.paper_roll import PaperRoll
import uuid


class PaperRollRepository:
    def __init__(self, db: Session):
        self.db = db

    def create(
        self,
        material_code: str,
        paper_type: str,
        gsm: int,
        roll_width: float,
        supplier: str,
        roll_length: Optional[float] = None,
        roll_weight: Optional[float] = None
    ) -> PaperRoll:
        """Create a new paper roll type"""
        paper_roll = PaperRoll(
            material_code=material_code,
            paper_type=paper_type,
            gsm=gsm,
            roll_width=roll_width,
            roll_length=roll_length,
            roll_weight=roll_weight,
            supplier=supplier
        )
        self.db.add(paper_roll)
        try:
            self.db.commit()
            self.db.refresh(paper_roll)
            return paper_roll
        except IntegrityError:
            self.db.rollback()
            raise ValueError(f"Paper roll with material code '{material_code}' already exists")

    def get_by_id(self, paper_roll_id: uuid.UUID) -> Optional[PaperRoll]:
        """Get paper roll by ID"""
        return self.db.query(PaperRoll).filter(PaperRoll.id == paper_roll_id).first()

    def get_by_material_code(self, material_code: str) -> Optional[PaperRoll]:
        """Get paper roll by material code"""
        return self.db.query(PaperRoll).filter(PaperRoll.material_code == material_code).first()

    def get_all(self, skip: int = 0, limit: int = 100) -> List[PaperRoll]:
        """Get all paper rolls with pagination"""
        return self.db.query(PaperRoll).offset(skip).limit(limit).all()

    def update(
        self,
        paper_roll_id: uuid.UUID,
        paper_type: Optional[str] = None,
        gsm: Optional[int] = None,
        roll_width: Optional[float] = None,
        roll_length: Optional[float] = None,
        roll_weight: Optional[float] = None,
        supplier: Optional[str] = None
    ) -> Optional[PaperRoll]:
        """Update paper roll details"""
        paper_roll = self.get_by_id(paper_roll_id)
        if paper_roll:
            if paper_type is not None:
                paper_roll.paper_type = paper_type
            if gsm is not None:
                paper_roll.gsm = gsm
            if roll_width is not None:
                paper_roll.roll_width = roll_width
            if roll_length is not None:
                paper_roll.roll_length = roll_length
            if roll_weight is not None:
                paper_roll.roll_weight = roll_weight
            if supplier is not None:
                paper_roll.supplier = supplier
            self.db.commit()
            self.db.refresh(paper_roll)
        return paper_roll

    def delete(self, paper_roll_id: uuid.UUID) -> bool:
        """Delete paper roll by ID"""
        paper_roll = self.get_by_id(paper_roll_id)
        if paper_roll:
            self.db.delete(paper_roll)
            self.db.commit()
            return True
        return False
