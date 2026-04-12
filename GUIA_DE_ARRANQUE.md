# Guia de arranque del proyecto

Este archivo explica como levantar el servidor y que debe hacer tu companero para ver la pagina funcionando en Windows.

## 1. Requisitos

- Tener instalado Python 3.13 o compatible.
- Abrir el proyecto en VS Code o en una terminal de Windows.
- Usar el entorno virtual del proyecto que esta en `.venv`.

## 2. Levantar el backend

1. Abre una terminal en la carpeta raiz del proyecto.
2. Entra a la carpeta `backend`.
3. Ejecuta el servidor con el Python del entorno virtual:

```powershell
c:\Users\sebas\OneDrive\Escritorio\preyecto1ampresariales\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

4. Deja esa terminal abierta mientras uses la aplicacion.
5. Verifica que la API responda abriendo en el navegador:

```text
http://127.0.0.1:8000/
```

Si todo esta bien, debe aparecer un mensaje como:

```json
{"message":"NexPOS V2 API activa"}
```

## 3. Levantar el frontend

Tu companero no debe abrir `index.html` directamente como archivo. Debe servirlo desde un servidor estatico.

### Opcion A: Live Server en VS Code

1. Abre `index.html` en VS Code.
2. Instala la extension Live Server si no la tiene.
3. Haz clic en "Go Live".
4. Se abrira una URL local en el navegador.

### Opcion B: Servidor simple con Python

1. Abre una terminal en la carpeta raiz del proyecto.
2. Ejecuta:

```powershell
c:\Users\sebas\OneDrive\Escritorio\preyecto1ampresariales\.venv\Scripts\python.exe -m http.server 5500
```

3. Abre en el navegador:

```text
http://127.0.0.1:5500/index.html
```

## 4. Que debe hacer tu companero para ver la pagina

1. Abrir el backend primero.
2. Abrir el frontend en un servidor estatico.
3. Confirmar que la pagina cargue sin errores de red.
4. Iniciar sesion con estas credenciales de prueba:
   - Usuario: `admin`
   - Contrasena: `admin123`

## 5. Si aparece "Failed to fetch"

Eso normalmente significa una de estas cosas:

- El backend no esta corriendo.
- El frontend se abrio como archivo local en vez de servidor estatico.
- La URL de la API no coincide con el puerto correcto.

## 6. Orden recomendado para probar

1. Levantar backend.
2. Probar `http://127.0.0.1:8000/`.
3. Levantar frontend.
4. Probar login con `admin`.
5. Revisar compradores y vendedores desde la aplicacion.

## 7. Nota tecnica

El frontend usa esta base de API:

```javascript
http://127.0.0.1:8000
```

Si cambias el puerto del backend, tambien debes actualizar esa URL en `scripts/app.js`.
