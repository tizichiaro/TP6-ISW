# Frontend - Compra de Entradas (simulada)

Esta carpeta contiene una página estática que consume el backend del TP para comprar entradas.

Requisitos:
- Backend corriendo en http://localhost:3000 (ver `backend/src/server.js`).

Archivos:
- `index.html` - UI principal (Bootstrap).
- `app.js` - lógica de cliente: obtiene usuarios, lista tickets y permite crear compras.
- `styles.css` - estilos mínimos.

Cómo probar:
1. Arrancar el backend desde `backend/`:

```powershell
cd backend; npm install; node src/server.js
```

2. Abrir `frontend/index.html` en el navegador (doble click) o servirlo con un servidor estático.
3. Usar el botón "Iniciar sesión (simulado)" para seleccionar un usuario y luego completar el formulario.

Notas:
- La redirección a Mercado Pago está simulada abriendo la página de Mercado Pago.
- Validaciones básicas se realizan tanto en el frontend como en el backend.
