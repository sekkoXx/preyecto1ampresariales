from pydantic import BaseModel
from typing import List


class ProductoBase(BaseModel):
    nombre: str
    categoria: str = "General"
    precio: float
    stock: int
    imagenes: List[str] = []


class ProductoCreate(ProductoBase):
    pass


class Producto(ProductoBase):
    id: int

    class Config:
        from_attributes = True


# ------------------------

class DetalleVentaBase(BaseModel):
    producto_id: int
    cantidad: int


class DetalleVentaResponse(BaseModel):
    producto_id: int
    cantidad: int


class VentaCreate(BaseModel):
    productos: List[DetalleVentaBase]


class Venta(BaseModel):
    id: int
    total: float
    fecha: str
    detalles: List[DetalleVentaResponse]

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str


class LoginRequest(BaseModel):
    username: str
    password: str


class UsuarioPublico(BaseModel):
    id: int
    username: str
    rol: str

    class Config:
        from_attributes = True