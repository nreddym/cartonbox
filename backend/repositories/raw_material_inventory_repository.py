from sqlalchemy.orm import Session
from typing import Optional, List
from models.raw_material_inventory import RawMaterialInventory
import uuid


class RawMaterialInventoryRepository:
    def __init__(self, db: Session):
        self.db = db

    def create(
        self,
        paper_roll_id: uuid.UUID,
        opening_stock: float,
        current_stock: float,
        unit: str
    ) -> RawMaterialInventory:
        """Create a new raw material inventory record"""
        inventory = RawMaterialInventory(
            paper_roll_id=paper_roll_id,
            opening_stock=opening_stock,
            current_stock=current_stock,
            unit=unit
        )
        self.db.add(inventory)
        self.db.commit()
        self.db.refresh(inventory)
        return inventory

    def get_by_id(self, inventory_id: uuid.UUID) -> Optional[RawMaterialInventory]:
        """Get inventory record by ID"""
        return self.db.query(RawMaterialInventory).filter(
            RawMaterialInventory.id == inventory_id
        ).first()

    def get_by_paper_roll_id(self, paper_roll_id: uuid.UUID) -> Optional[RawMaterialInventory]:
        """Get inventory record by paper roll ID"""
        return self.db.query(RawMaterialInventory).filter(
            RawMaterialInventory.paper_roll_id == paper_roll_id
        ).first()

    def get_all(self, skip: int = 0, limit: int = 100) -> List[RawMaterialInventory]:
        """Get all inventory records with pagination"""
        return self.db.query(RawMaterialInventory).offset(skip).limit(limit).all()

    def update_stock(
        self,
        paper_roll_id: uuid.UUID,
        new_stock: float
    ) -> Optional[RawMaterialInventory]:
        """Update current stock for a paper roll"""
        inventory = self.get_by_paper_roll_id(paper_roll_id)
        if inventory:
            inventory.current_stock = new_stock
            self.db.commit()
            self.db.refresh(inventory)
        return inventory

    def get_stock_level(self, paper_roll_id: uuid.UUID) -> Optional[float]:
        """Get current stock level for a paper roll"""
        inventory = self.get_by_paper_roll_id(paper_roll_id)
        return inventory.current_stock if inventory else None

    def get_low_stock_items(self, threshold: float) -> List[RawMaterialInventory]:
        """Get inventory items below the specified threshold"""
        return self.db.query(RawMaterialInventory).filter(
            RawMaterialInventory.current_stock < threshold
        ).all()
