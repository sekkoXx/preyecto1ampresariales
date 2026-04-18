from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
from datetime import datetime
import json

from . import models, schemas


# =========================
# USERS
# =========================

def get_user_by_username(db: Session, username: str):
    return db.query(models.Usuario).filter(models.Usuario.username == username).first()


def get_user_by_id(db: Session, user_id: int):
    return db.query(models.Usuario).filter(models.Usuario.id == user_id).first()


def create_user(db: Session, user: schemas.UsuarioCreate, hashed_password: str):
    try:
        # Evitar duplicados
        existing = get_user_by_username(db, user.username)
        if existing:
            raise ValueError("El usuario ya existe")

        is_app = True if user.rol == "buyer" else False

        db_user = models.Usuario(
            username=user.username,
            hashed_password=hashed_password,
            rol=user.rol,
            is_approved=is_app
        )

        db.add(db_user)
        db.commit()
        db.refresh(db_user)

        return db_user

    except SQLAlchemyError:
        db.rollback()
        raise


def update_user_approval(db: Session, user_id: int, is_approved: bool):
    try:
        db_user = get_user_by_id(db, user_id)

        if not db_user:
            raise ValueError("Usuario no encontrado")

        db_user.is_approved = is_approved
        db.commit()
        db.refresh(db_user)

        return db_user

    except SQLAlchemyError:
        db.rollback()
        raise


# =========================
# PRODUCTS
# =========================

def get_products(db: Session):
    return db.query(models.Producto).all()


def create_product(db: Session, product: schemas.ProductoCreate, seller_id: int = None):
    try:
        db_item = models.Producto(
            nombre=product.nombre,
            categoria=product.categoria,
            precio=product.precio,
            stock=product.stock,
            imagenes=json.dumps(product.imagenes),
            seller_id=seller_id
        )

        db.add(db_item)
        db.commit()
        db.refresh(db_item)

        return db_item

    except SQLAlchemyError:
        db.rollback()
        raise


def update_product(db: Session, product_id: int, data: schemas.ProductoCreate):
    try:
        db_item = db.query(models.Producto).filter(models.Producto.id == product_id).first()

        if not db_item:
            raise ValueError("Producto no encontrado")

        db_item.nombre = data.nombre
        db_item.categoria = data.categoria
        db_item.precio = data.precio
        db_item.stock = data.stock
        db_item.imagenes = json.dumps(data.imagenes)

        db.commit()
        db.refresh(db_item)

        return db_item

    except SQLAlchemyError:
        db.rollback()
        raise


def delete_product(db: Session, product_id: int):
    try:
        db_item = db.query(models.Producto).filter(models.Producto.id == product_id).first()

        if not db_item:
            raise ValueError("Producto no encontrado")

        db.delete(db_item)
        db.commit()

        return True

    except SQLAlchemyError:
        db.rollback()
        raise


# =========================
# SALES
# =========================

def get_sales(db: Session):
    return db.query(models.Venta).all()


def create_sale(db: Session, sale: schemas.VentaCreate, buyer_id: int | None = None):
    try:
        total = 0.0

        # Validación previa
        productos_db = {}

        for det in sale.productos:
            prod = db.query(models.Producto).filter(models.Producto.id == det.producto_id).first()

            if not prod:
                raise ValueError(f"Producto {det.producto_id} no existe")

            if prod.stock < det.cantidad:
                raise ValueError(f"Stock insuficiente para {prod.nombre}")

            productos_db[det.producto_id] = prod

        # Descontar stock y calcular total
        for det in sale.productos:
            prod = productos_db[det.producto_id]
            prod.stock -= det.cantidad
            total += prod.precio * det.cantidad

        # Crear venta
        db_venta = models.Venta(
            total=total,
            fecha=datetime.now().isoformat()
        )

        db.add(db_venta)
        db.commit()
        db.refresh(db_venta)

        # Detalles
        for det in sale.productos:
            db_det = models.DetalleVenta(
                venta_id=db_venta.id,
                producto_id=det.producto_id,
                cantidad=det.cantidad
            )
            db.add(db_det)

        # Historial (compra)
        if buyer_id is not None:
            db_compra = models.Compra(
                usuario_id=buyer_id,
                venta_id=db_venta.id,
                fecha=db_venta.fecha,
            )
            db.add(db_compra)

        db.commit()
        db.refresh(db_venta)

        return db_venta

    except SQLAlchemyError:
        db.rollback()
        raise


# =========================
# PURCHASE HISTORY
# =========================

def get_purchase_history(db: Session, user_id: int):
    try:
        compras = (
            db.query(models.Compra)
            .filter(models.Compra.usuario_id == user_id)
            .order_by(models.Compra.id.desc())
            .all()
        )

        history = []

        for compra in compras:
            venta = compra.venta

            if not venta:
                continue

            productos = []

            for detalle in venta.detalles:
                producto = db.query(models.Producto).filter(
                    models.Producto.id == detalle.producto_id
                ).first()

                productos.append({
                    "producto_id": detalle.producto_id,
                    "nombre": producto.nombre if producto else f"Producto {detalle.producto_id}",
                    "cantidad": detalle.cantidad,
                    "precio": producto.precio if producto else 0.0,
                })

            history.append({
                "id": compra.id,
                "total": venta.total,
                "fecha": compra.fecha or venta.fecha,
                "productos": productos,
            })

        return history

    except SQLAlchemyError:
        raise