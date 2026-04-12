from sqlalchemy import Column, Integer, String, Float, ForeignKey, Text, Boolean
from sqlalchemy.orm import relationship
from .database import Base

class Producto(Base):
    __tablename__ = "productos"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String, index=True)
    categoria = Column(String, default="General")
    precio = Column(Float)
    stock = Column(Integer)
    imagenes = Column(Text, default="[]")
    seller_id = Column(Integer, ForeignKey("usuarios.id"), nullable=True)

    seller = relationship("Usuario", back_populates="productos")

    @property
    def seller_username(self):
        return self.seller.username if self.seller else None


class Venta(Base):
    __tablename__ = "ventas"

    id = Column(Integer, primary_key=True, index=True)
    total = Column(Float)
    fecha = Column(String)

    detalles = relationship("DetalleVenta", back_populates="venta")


class DetalleVenta(Base):
    __tablename__ = "detalle_ventas"

    id = Column(Integer, primary_key=True, index=True)
    venta_id = Column(Integer, ForeignKey("ventas.id"))
    producto_id = Column(Integer, ForeignKey("productos.id"))
    cantidad = Column(Integer)

    venta = relationship("Venta", back_populates="detalles")


class Usuario(Base):
    __tablename__ = "usuarios"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    rol = Column(String, default="buyer")      # buyer, seller, admin
    is_approved = Column(Boolean, default=True) # Buyers are true by default, sellers require admin approval

    productos = relationship("Producto", back_populates="seller")
