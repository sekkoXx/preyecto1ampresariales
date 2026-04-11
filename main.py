import tkinter as tk
from tkinter import messagebox, ttk

# ---------------- BASE DE DATOS EN MEMORIA ----------------

productos = []
ventas = []


# ---------------- FUNCIONES ----------------

def agregar_producto():
    nombre = entry_nombre.get()
    precio = entry_precio.get()
    stock = entry_stock.get()

    if not nombre or not precio or not stock:
        messagebox.showerror("Error", "Completa todos los campos")
        return

    producto = {
        "id": len(productos) + 1,
        "nombre": nombre,
        "precio": float(precio),
        "stock": int(stock)
    }

    productos.append(producto)
    actualizar_tabla()
    limpiar_campos()


def eliminar_producto():
    seleccionado = tabla.selection()
    if not seleccionado:
        return

    item = tabla.item(seleccionado)
    producto_id = item["values"][0]

    global productos
    productos = [p for p in productos if p["id"] != producto_id]

    actualizar_tabla()


def actualizar_tabla():
    for fila in tabla.get_children():
        tabla.delete(fila)

    for p in productos:
        tabla.insert("", "end", values=(p["id"], p["nombre"], p["precio"], p["stock"]))


def limpiar_campos():
    entry_nombre.delete(0, tk.END)
    entry_precio.delete(0, tk.END)
    entry_stock.delete(0, tk.END)


def vender_producto():
    seleccionado = tabla.selection()
    if not seleccionado:
        messagebox.showerror("Error", "Selecciona un producto")
        return

    cantidad = entry_cantidad.get()

    if not cantidad:
        messagebox.showerror("Error", "Ingresa cantidad")
        return

    cantidad = int(cantidad)

    item = tabla.item(seleccionado)
    producto_id = item["values"][0]

    for p in productos:
        if p["id"] == producto_id:
            if p["stock"] >= cantidad:
                p["stock"] -= cantidad

                venta = {
                    "producto": p["nombre"],
                    "cantidad": cantidad,
                    "total": cantidad * p["precio"]
                }

                ventas.append(venta)
                messagebox.showinfo("Venta", "Venta realizada")
            else:
                messagebox.showerror("Error", "Stock insuficiente")

    actualizar_tabla()


def ver_ventas():
    ventana = tk.Toplevel(root)
    ventana.title("Ventas")

    tree = ttk.Treeview(ventana, columns=("Producto", "Cantidad", "Total"), show="headings")

    tree.heading("Producto", text="Producto")
    tree.heading("Cantidad", text="Cantidad")
    tree.heading("Total", text="Total")

    tree.pack(fill="both", expand=True)

    for v in ventas:
        tree.insert("", "end", values=(v["producto"], v["cantidad"], v["total"]))


# ---------------- INTERFAZ ----------------

root = tk.Tk()
root.title("Sistema de Ventas")
root.geometry("700x500")

# Entradas
frame = tk.Frame(root)
frame.pack(pady=10)

tk.Label(frame, text="Nombre").grid(row=0, column=0)
entry_nombre = tk.Entry(frame)
entry_nombre.grid(row=0, column=1)

tk.Label(frame, text="Precio").grid(row=1, column=0)
entry_precio = tk.Entry(frame)
entry_precio.grid(row=1, column=1)

tk.Label(frame, text="Stock").grid(row=2, column=0)
entry_stock = tk.Entry(frame)
entry_stock.grid(row=2, column=1)

# Botones
tk.Button(frame, text="Agregar", command=agregar_producto).grid(row=3, column=0, pady=5)
tk.Button(frame, text="Eliminar", command=eliminar_producto).grid(row=3, column=1)

# Tabla
tabla = ttk.Treeview(root, columns=("ID", "Nombre", "Precio", "Stock"), show="headings")

tabla.heading("ID", text="ID")
tabla.heading("Nombre", text="Nombre")
tabla.heading("Precio", text="Precio")
tabla.heading("Stock", text="Stock")

tabla.pack(fill="both", expand=True, pady=10)

# Venta
frame_venta = tk.Frame(root)
frame_venta.pack()

tk.Label(frame_venta, text="Cantidad").grid(row=0, column=0)
entry_cantidad = tk.Entry(frame_venta)
entry_cantidad.grid(row=0, column=1)

tk.Button(frame_venta, text="Vender", command=vender_producto).grid(row=0, column=2, padx=10)
tk.Button(frame_venta, text="Ver Ventas", command=ver_ventas).grid(row=0, column=3)

root.mainloop()