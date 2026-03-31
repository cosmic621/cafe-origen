#  Café Origen — Sistema de Gestión Integral

Sistema completo para cafetería de especialidad construido con React + Node.js. Incluye menú digital, pedidos en tiempo real, panel multi-rol, gestión de empleados, solicitudes de insumos, dashboard de ventas y módulo de permisos/incapacidades.

---

## Funcionalidades principales

| Módulo | Descripción |
|---|---|
| **Menú digital** | Catálogo con carrito, búsqueda, filtros, ingredientes y valoración con estrellas |
| **Pedidos en tiempo real** | WebSocket — los pedidos llegan a cocina instantáneamente |
| **Panel Admin** | Analytics de ventas, CRUD de menú, empleados, servicios |
| **Dashboard Cajero** | Resumen de caja, estado de pedidos, actividad por mesa |
| **Dashboard Cocina** | Pedidos activos, solicitudes de insumos al admin |
| **Empleados** | Gestión completa + valoración pública de clientes |
| **Permisos / Incapacidades** | Solicitudes con estados: En espera / Aprobado / Negado |
| **Solicitudes de insumos** | Cocina solicita productos al admin con cantidades y unidades |
| **Swagger UI** | Documentación interactiva de la API en `/api/docs` |

---

## Instalación rápida

### Requisitos
- Node.js v18 o superior
- npm

### Backend
```bash
cd backend
npm install
node server.js
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

> **Importante:** Borra `backend/cafe.db` antes de iniciar por primera vez o si quieres reiniciar los datos demo.

---

##  URLs

| URL | Descripción |
|---|---|
| `http://localhost:5173` | Aplicación frontend |
| `http://localhost:3001/api/health` | Estado del backend |
| `http://localhost:3001/api/docs` | Swagger UI — documentación interactiva |

---

## Credenciales

| Usuario | Contraseña | Rol | Dashboard |
|---|---|---|---|
| `admin` | `cafe2024` | superadmin | Analytics + gestión completa |
| `cajero` | `cajero2024` | cashier | Dashboard de caja y pedidos |
| `cocina` | `cocina2024` | kitchen | Pedidos + insumos + permisos |

---

## Stack tecnológico

**Frontend**
- React 18 + Vite
- Paleta Autumn Harvest (granate, dorado, espresso, terracota, crema)
- Fuentes: Cormorant Garamond + DM Sans
- SVG puro para gráficas (sin librerías externas)

**Backend**
- Node.js + Express (arquitectura MVC)
- sql.js — SQLite compilado a WebAssembly (sin compilación nativa)
- JWT + bcrypt para autenticación
- WebSockets (ws) para tiempo real
- swagger-ui-express para documentación

**Base de datos — 11 tablas**
```
admins · categories · menu_items · ratings
orders · order_items · services
employees · employee_ratings
kitchen_requests · kitchen_request_items · leave_requests
```

---

## 📡 API — Endpoints principales

```
POST   /api/auth/login                  Login → JWT + role
GET    /api/menu                        Menú público
POST   /api/orders                      Crear pedido (broadcast WS)
PATCH  /api/orders/:id/status           Cambiar estado (broadcast WS)
GET    /api/employees                   Empleados públicos
POST   /api/employees/:id/rate         Valorar empleado
POST   /api/kitchen-requests           Solicitud de insumos (cocina)
POST   /api/leave-requests             Solicitud de permiso/incapacidad
GET    /api/analytics/sales?period=day  Dashboard de ventas
```

---

## Roles y permisos

```
superadmin (100) → Todo incluyendo eliminar
admin      (50)  → Crear y editar, sin eliminar
cashier    (20)  → Ver analytics y pedidos
kitchen    (10)  → Ver pedidos, cambiar estados, solicitar insumos
```

---

## Datos demo incluidos

Al iniciar con BD nueva se crean automáticamente:
- **20 productos** en el menú (cafés, alimentos, especiales, no cafés)
- **10 empleados** con notas y ratings históricos
- **20 pedidos** históricos de los últimos 7 días para el dashboard
- **5 solicitudes de permisos** en distintos estados
- **3 solicitudes de insumos** de cocina
- **5 servicios** del café
  
