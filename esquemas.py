from pydantic import BaseModel
from typing import List


class ProductoBase(BaseModel):
    nombre: str
    precio: float
    stock: int


class ProductoCreate(ProductoBase):
    pass


class Producto(ProductoBase):
    id: int

    class Config:
        orm_mode = True


# ------------------------

class DetalleVentaBase(BaseModel):
    producto_id: int
    cantidad: int


class VentaCreate(BaseModel):
    productos: List[DetalleVentaBase]


class Venta(BaseModel):
    id: int
    total: float

    class Config:
        orm_mode = True