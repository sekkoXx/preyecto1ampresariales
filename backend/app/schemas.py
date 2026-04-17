from pydantic import BaseModel, field_validator, Field
from typing import List, Optional
import json

class ProductoBase(BaseModel):
    nombre: str = Field(..., min_length=2, max_length=100)
    categoria: str = Field("General", max_length=50)
    precio: float = Field(..., ge=0.01)
    stock: int = Field(..., ge=0)
    imagenes: List[str] = []

    @field_validator('imagenes', mode='before')
    @classmethod
    def parse_imagenes(cls, v):
        if isinstance(v, str):
            try:
                return json.loads(v)
            except:
                return []
        return v

class ProductoCreate(ProductoBase):
    pass

class Producto(ProductoBase):
    id: int
    seller_id: Optional[int] = None
    seller_username: Optional[str] = None
    
    class Config:
        from_attributes = True

# ------------------------

class DetalleVentaBase(BaseModel):
    producto_id: int
    cantidad: int = Field(..., gt=0)

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


class ProductoComprado(BaseModel):
    producto_id: int
    nombre: str
    cantidad: int
    precio: float


class CompraResumen(BaseModel):
    id: int
    total: float
    fecha: str
    productos: List[ProductoComprado]

    class Config:
        from_attributes = True

# ------------------------

class Token(BaseModel):
    access_token: str
    token_type: str

class LoginRequest(BaseModel):
    username: str
    password: str

class UsuarioCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=6)
    rol: str = "buyer" # buyer, seller

class UsuarioPublico(BaseModel):
    id: int
    username: str
    rol: str
    is_approved: bool

    class Config:
        from_attributes = True
