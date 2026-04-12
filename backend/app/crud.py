from sqlalchemy.orm import Session
from datetime import datetime
import json

from . import models, schemas

def get_user_by_username(db: Session, username: str):
    return db.query(models.Usuario).filter(models.Usuario.username == username).first()

def get_user_by_id(db: Session, user_id: int):
    return db.query(models.Usuario).filter(models.Usuario.id == user_id).first()

def create_user(db: Session, user: schemas.UsuarioCreate, hashed_password: str):
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

def update_user_approval(db: Session, user_id: int, is_approved: bool):
    db_user = get_user_by_id(db, user_id)
    if db_user:
        db_user.is_approved = is_approved
        db.commit()
        db.refresh(db_user)
    return db_user

def get_products(db: Session):
    return db.query(models.Producto).all()

def create_product(db: Session, product: schemas.ProductoCreate):
    db_item = models.Producto(
        nombre=product.nombre,
        categoria=product.categoria,
        precio=product.precio,
        stock=product.stock,
        imagenes=json.dumps(product.imagenes)
    )
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item

def update_product(db: Session, product_id: int, data: schemas.ProductoCreate):
    db_item = db.query(models.Producto).filter(models.Producto.id == product_id).first()
    if db_item:
        db_item.nombre = data.nombre
        db_item.categoria = data.categoria
        db_item.precio = data.precio
        db_item.stock = data.stock
        db_item.imagenes = json.dumps(data.imagenes)
        db.commit()
        db.refresh(db_item)
    return db_item

def delete_product(db: Session, product_id: int):
    db_item = db.query(models.Producto).filter(models.Producto.id == product_id).first()
    if db_item:
        db.delete(db_item)
        db.commit()
        return True
    return False

def get_sales(db: Session):
    return db.query(models.Venta).all()

def create_sale(db: Session, sale: schemas.VentaCreate):
    total = 0.0
    for det in sale.productos:
        prod = db.query(models.Producto).filter(models.Producto.id == det.producto_id).first()
        if not prod:
            raise ValueError(f"Producto {det.producto_id} no existe")
        if prod.stock < det.cantidad:
            raise ValueError(f"Stock insuficiente para {prod.nombre}")
        prod.stock -= det.cantidad
        total += prod.precio * det.cantidad

    db_venta = models.Venta(
        total=total,
        fecha=datetime.now().isoformat()
    )
    db.add(db_venta)
    db.commit()
    db.refresh(db_venta)

    for det in sale.productos:
        db_det = models.DetalleVenta(
            venta_id=db_venta.id,
            producto_id=det.producto_id,
            cantidad=det.cantidad
        )
        db.add(db_det)
    
    db.commit()
    db.refresh(db_venta)
    return db_venta
