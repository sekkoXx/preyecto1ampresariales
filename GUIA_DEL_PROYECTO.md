# Guia del proyecto NexPOS V2

## Descripcion general

NexPOS V2 es una aplicacion web de punto de venta con backend en FastAPI y frontend en JavaScript puro. La aplicacion permite manejar usuarios con distintos roles, catalogo de productos, ventas, historial de compras y metricas basicas para seguimiento del negocio.

Los roles disponibles son:

- Buyer: consulta productos, realiza compras y revisa su historial.
- Seller: administra sus productos y revisa ventas y metricas.
- Admin: aprueba vendedores, administra productos y revisa informacion general del sistema.

Al iniciar por primera vez, el backend crea automaticamente la base de datos local SQLite y un usuario administrador de prueba.

## Instalacion y configuracion

### Requisitos

- Python 3.13 o una version compatible.
- VS Code o una terminal de Windows.
- Un entorno virtual activo para el proyecto.

### Dependencias del backend

Si el proyecto ya trae un entorno virtual, activalo. Si no, crea uno desde la raiz del proyecto.

Luego instala las dependencias necesarias para FastAPI y la autenticacion:

```powershell
python -m pip install fastapi uvicorn sqlalchemy passlib[bcrypt] python-jose[cryptography] python-multipart
```

### Base de datos

La aplicacion usa SQLite y crea automaticamente el archivo de base de datos al arrancar por primera vez. No necesitas configurar un servidor de base de datos externo.

### Arranque del backend

Desde la carpeta backend ejecuta:

```powershell
python -m uvicorn app.main:app --host 127.0.0.1 --port 8001
```

Si usas el Python del entorno virtual del proyecto, tambien puedes ejecutarlo con ese interprete para evitar desajustes de paquetes.

La API debe quedar disponible en:

http://127.0.0.1:8001

### Arranque del frontend

El frontend no debe abrirse como archivo local. Debe servirse desde un servidor estatico.

Opcion 1: Live Server en VS Code.

Opcion 2: servidor simple con Python desde la raiz del proyecto:

```powershell
python -m http.server 5500
```

Despues abre:

http://127.0.0.1:5500/index.html

### Credenciales iniciales

Al iniciar por primera vez, se crea un usuario de prueba:

- Usuario: admin
- Contrasena: admin123

## Instrucciones de uso

1. Levanta primero el backend y verifica que responda en la raiz de la API.
2. Levanta despues el frontend desde un servidor estatico.
3. Inicia sesion con un usuario existente o registra una cuenta nueva.
4. Si creas una cuenta seller, el administrador debe aprobarla antes de que pueda iniciar sesion.
5. Usa el menu segun tu rol:

- Buyer: ver productos, comprar y revisar historial de compras.
- Seller: administrar productos propios, revisar ventas y metricas.
- Admin: aprobar usuarios vendedores, ver usuarios y administrar informacion general.

## Funciones principales

- Autenticacion con token.
- Registro de buyers y sellers.
- Aprobacion de vendedores por parte del admin.
- Alta, edicion y eliminacion de productos.
- Registro de ventas.
- Historial de compras para compradores.
- Panel de metricas y exportacion de reporte PDF.

## Nota tecnica

Si cambias el puerto o la direccion del backend, actualiza la variable API_BASE en scripts/app.js para que el frontend siga apuntando a la API correcta.