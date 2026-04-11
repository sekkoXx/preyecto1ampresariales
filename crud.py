from sqlalchemy.orm import Session
import modelos


# ---------------- PRODUCTOS ----------------

def crear_producto(db: Session, producto):
    nuevo = modelos.Producto(**producto.dict())
    db.add(nuevo)
    db.commit()
    db.refresh(nuevo)
    return nuevo


def obtener_productos(db: Session):
    return db.query(modelos.Producto).all()


def obtener_producto(db: Session, producto_id: int):
    return db.query(modelos.Producto).filter(modelos.Producto.id == producto_id).first()


def actualizar_producto(db: Session, producto_id: int, datos):
    producto = obtener_producto(db, producto_id)
    if producto:
        producto.nombre = datos.nombre
        producto.precio = datos.precio
        producto.stock = datos.stock
        db.commit()
        db.refresh(producto)
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

    venta = modelos.Venta(total=total)
    db.add(venta)
    db.commit()
    db.refresh(venta)

    for d in detalles:
        d.venta_id = venta.id
        db.add(d)

    db.commit()

    return venta