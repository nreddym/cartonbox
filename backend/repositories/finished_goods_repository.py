from sqlalchemy.orm import Session
from typing import Optional, List
import uuid

from models.finished_goods import FinishedGoods


class FinishedGoodsRepository:
    """Repository for FinishedGoods master entity.

    Validates: Requirements 7.1
    """

    def __init__(self, db: Session):
        self.db = db

    def create(
        self,
        box_type: str,
        box_length: float,
        box_width: float,
        box_height: float,
        ply_type: str,
        specification: Optional[str] = None,
    ) -> FinishedGoods:
        fg = FinishedGoods(
            box_type=box_type,
            box_length=box_length,
            box_width=box_width,
            box_height=box_height,
            ply_type=ply_type,
            specification=specification,
        )
        self.db.add(fg)
        self.db.commit()
        self.db.refresh(fg)
        return fg

    def get_by_id(self, fg_id: uuid.UUID) -> Optional[FinishedGoods]:
        return self.db.query(FinishedGoods).filter(FinishedGoods.id == fg_id).first()

    def find_matching(
        self,
        box_type: str,
        box_length: float,
        box_width: float,
        box_height: float,
        ply_type: str,
    ) -> Optional[FinishedGoods]:
        return (
            self.db.query(FinishedGoods)
            .filter(
                FinishedGoods.box_type == box_type,
                FinishedGoods.box_length == box_length,
                FinishedGoods.box_width == box_width,
                FinishedGoods.box_height == box_height,
                FinishedGoods.ply_type == ply_type,
            )
            .first()
        )

    def get_or_create(
        self,
        box_type: str,
        box_length: float,
        box_width: float,
        box_height: float,
        ply_type: str,
        specification: Optional[str] = None,
    ) -> FinishedGoods:
        existing = self.find_matching(
            box_type, box_length, box_width, box_height, ply_type
        )
        if existing is not None:
            return existing
        return self.create(
            box_type=box_type,
            box_length=box_length,
            box_width=box_width,
            box_height=box_height,
            ply_type=ply_type,
            specification=specification,
        )

    def list(self, skip: int = 0, limit: int = 100) -> List[FinishedGoods]:
        return self.db.query(FinishedGoods).offset(skip).limit(limit).all()
