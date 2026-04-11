from sqlalchemy.orm import Session
from datetime import datetime, timezone
import json
import modelos


# ---------------- PRODUCTOS ----------------

def crear_producto(db: Session, producto):
    data = producto.dict()
    data["imagenes"] = json.dumps(data.get("imagenes", []))
    nuevo = modelos.Producto(**data)
    db.add(nuevo)
    db.commit()
    db.refresh(nuevo)
    nuevo.imagenes = json.loads(nuevo.imagenes or "[]")
    return nuevo


def obtener_productos(db: Session):
    productos = db.query(modelos.Producto).all()
    for producto in productos:
        producto.imagenes = json.loads(producto.imagenes or "[]")
    return productos


def obtener_producto(db: Session, producto_id: int):
    producto = db.query(modelos.Producto).filter(modelos.Producto.id == producto_id).first()
    if producto:
        producto.imagenes = json.loads(producto.imagenes or "[]")
    return producto


def actualizar_producto(db: Session, producto_id: int, datos):
    producto = obtener_producto(db, producto_id)
    if producto:
        producto.nombre = datos.nombre
        producto.categoria = datos.categoria
        producto.precio = datos.precio
        producto.stock = datos.stock
        producto.imagenes = json.dumps(datos.imagenes)
        db.commit()
        db.refresh(producto)
        producto.imagenes = json.loads(producto.imagenes or "[]")
    return producto


def eliminar_producto(db: Session, producto_id: int):
    producto = obtener_producto(db, producto_id)
    if producto:
        db.delete(producto)
        db.commit()
    return producto


# ---------------- VENTAS ----------------

def crear_venta(db: Session, venta_data):
    total = 0
    detalles = []

    for item in venta_data.productos:
        producto = obtener_producto(db, item.producto_id)

        if not producto or producto.stock < item.cantidad:
            raise Exception(f"Stock insuficiente para producto {item.producto_id}")

        subtotal = producto.precio * item.cantidad
        total += subtotal

        producto.stock -= item.cantidad

        detalle = modelos.DetalleVenta(
            producto_id=producto.id,
            cantidad=item.cantidad
        )
        detalles.append(detalle)

    venta = modelos.Venta(total=total, fecha=datetime.now(timezone.utc).isoformat())
    db.add(venta)
    db.commit()
    db.refresh(venta)

    for d in detalles:
        d.venta_id = venta.id
        db.add(d)

    db.commit()
    db.refresh(venta)
    return venta


def obtener_ventas(db: Session):
    return db.query(modelos.Venta).all()


def obtener_usuario_por_username(db: Session, username: str):
    return db.query(modelos.Usuario).filter(modelos.Usuario.username == username).first()


def crear_usuario(db: Session, username: str, hashed_password: str, rol: str = "admin"):
    usuario = modelos.Usuario(username=username, hashed_password=hashed_password, rol=rol)
    db.add(usuario)
    db.commit()
    db.refresh(usuario)
    return usuario