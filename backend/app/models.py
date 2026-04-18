from sqlalchemy import Column, Integer, String, Float, ForeignKey, Text, Boolean, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from .database import Base


# =========================
# PRODUCTO
# =========================
class Producto(Base):
    __tablename__ = "productos"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String, index=True, nullable=False)
    categoria = Column(String, default="General", nullable=False)
    precio = Column(Float, nullable=False)
    stock = Column(Integer, default=0, nullable=False)
    imagenes = Column(Text, default="[]")

    seller_id = Column(
        Integer,
        ForeignKey("usuarios.id", ondelete="SET NULL"),
        nullable=True
    )

    seller = relationship(
        "Usuario",
        back_populates="productos",
        passive_deletes=True
    )

    detalles = relationship(
        "DetalleVenta",
        back_populates="producto",
        cascade="all, delete"
    )

    @property
    def seller_username(self):
        return self.seller.username if self.seller else None


# =========================
# VENTA
# =========================
class Venta(Base):
    __tablename__ = "ventas"

    id = Column(Integer, primary_key=True, index=True)
    total = Column(Float, nullable=False)

    fecha = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )

    detalles = relationship(
        "DetalleVenta",
        back_populates="venta",
        cascade="all, delete-orphan"
    )

    compra = relationship(
        "Compra",
        back_populates="venta",
        uselist=False,
        cascade="all, delete-orphan"
    )


# =========================
# DETALLE VENTA
# =========================
class DetalleVenta(Base):
    __tablename__ = "detalle_ventas"

    id = Column(Integer, primary_key=True, index=True)

    venta_id = Column(
        Integer,
        ForeignKey("ventas.id", ondelete="CASCADE"),
        nullable=False
    )

    producto_id = Column(
        Integer,
        ForeignKey("productos.id", ondelete="SET NULL"),
        nullable=True
    )

    cantidad = Column(Integer, nullable=False)

    venta = relationship("Venta", back_populates="detalles")
    producto = relationship("Producto", back_populates="detalles")


# =========================
# COMPRA (historial)
# =========================
class Compra(Base):
    __tablename__ = "compras"

    id = Column(Integer, primary_key=True, index=True)

    usuario_id = Column(
        Integer,
        ForeignKey("usuarios.id", ondelete="CASCADE"),
        nullable=False
    )

    venta_id = Column(
        Integer,
        ForeignKey("ventas.id", ondelete="CASCADE"),
        nullable=False,
        unique=True
    )

    fecha = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )

    usuario = relationship("Usuario", back_populates="compras")
    venta = relationship("Venta", back_populates="compra")


# =========================
# USUARIO
# =========================
class Usuario(Base):
    __tablename__ = "usuarios"

    id = Column(Integer, primary_key=True, index=True)

    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)

    rol = Column(String, default="buyer", nullable=False)
    is_approved = Column(Boolean, default=True)

    nickname = Column(String, nullable=True)
    profile_image = Column(Text, nullable=True)

    productos = relationship(
        "Producto",
        back_populates="seller",
        passive_deletes=True
    )

    compras = relationship(
        "Compra",
        back_populates="usuario",
        cascade="all, delete-orphan"
    )