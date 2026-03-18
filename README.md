# ☕ Café Origen — Sistema de Gestión

Sistema integral para cafetería de especialidad construido con React + Node.js.

## Stack
- **Frontend**: React 18 + Vite + Cormorant Garamond / DM Sans
- **Backend**: Node.js + Express + sql.js (SQLite) + WebSockets
- **Auth**: JWT + bcrypt con sistema de roles
- **Docs**: Swagger UI en `/api/docs`

## Funcionalidades
- Menú digital con carrito, valoraciones y filtros por categoría
- Pedidos en tiempo real a cocina vía WebSocket
- Panel admin con analytics de ventas (gráficas de barras SVG)
- Gestión de empleados con sistema de valoración de clientes
- Segregación de roles: superadmin · admin · cashier · kitchen

## Credenciales de prueba
| Usuario | Contraseña | Rol |
|---|---|---|
| admin | cafe2024 | superadmin |
| cocina | cocina2024 | kitchen |
| cajero | cajero2024 | cashier |

## Instalación
```bash
# Backend
cd backend && npm install && node server.js

# Frontend
cd frontend && npm install && npm run dev
```

- Frontend: http://localhost:5173
- API: http://localhost:3001/api/health
- Swagger: http://localhost:3001/api/docs