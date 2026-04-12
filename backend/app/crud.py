from sqlalchemy.orm import Session
from datetime import datetime
import json

from . import modelos, esquemas

def get_user_by_username(db: Session, username: str):
    return db.query(modelos.Usuario).filter(modelos.Usuario.username == username).first()

def get_user_by_id(db: Session, user_id: int):
    return db.query(modelos.Usuario).filter(modelos.Usuario.id == user_id).first()

def create_user(db: Session, user: esquemas.UsuarioCreate, hashed_password: str):
    is_app = True if user.rol == "buyer" else False
    db_user = modelos.Usuario(
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
    return db.query(modelos.Producto).all()

def create_product(db: Session, product: esquemas.ProductoCreate):
    db_item = modelos.Producto(
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

def update_product(db: Session, product_id: int, data: esquemas.ProductoCreate):
    db_item = db.query(modelos.Producto).filter(modelos.Producto.id == product_id).first()
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
    db_item = db.query(modelos.Producto).filter(modelos.Producto.id == product_id).first()
    if db_item:
        db.delete(db_item)
        db.commit()
        return True
    return False

def get_sales(db: Session):
    return db.query(modelos.Venta).all()

def create_sale(db: Session, sale: esquemas.VentaCreate):
    total = 0.0
    for det in sale.productos:
        prod = db.query(modelos.Producto).filter(modelos.Producto.id == det.producto_id).first()
        if not prod:
            raise ValueError(f"Producto {det.producto_id} no existe")
        if prod.stock < det.cantidad:
            raise ValueError(f"Stock insuficiente para {prod.nombre}")
        prod.stock -= det.cantidad
        total += prod.precio * det.cantidad

    db_venta = modelos.Venta(
        total=total,
        fecha=datetime.now().isoformat()
    )
    db.add(db_venta)
    db.commit()
    db.refresh(db_venta)

    for det in sale.productos:
        db_det = modelos.DetalleVenta(
            venta_id=db_venta.id,
            producto_id=det.producto_id,
            cantidad=det.cantidad
        )
        db.add(db_det)
    
    db.commit()
    db.refresh(db_venta)
    return db_venta
