cat > README.md << 'EOF'
# ☕ Café Origen — Sistema de Gestión

Sistema integral para cafeterías de specialty coffee. Incluye gestión de pedidos en tiempo real, menú, empleados, insumos y analytics.

---

## 🚀 Tech Stack

| Capa | Tecnología |
|------|-----------|
| Backend | Node.js · Express · sql.js · JWT · WebSocket |
| Frontend | React · Vite · CSS-in-JS |
| API Docs | Swagger UI (OpenAPI 3.0) |
| Base de datos | SQLite (sql.js, sin instalación) |

---

## ⚡ Inicio rápido

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

### URLs
- 🌐 Frontend → http://localhost:5173
- 🔌 API → http://localhost:3001/api
- 📖 Swagger → http://localhost:3001/api/docs
- 🔴 WebSocket → ws://localhost:3001

---

## 🔐 Credenciales de prueba

| Usuario | Contraseña | Rol | Acceso |
|---------|-----------|-----|--------|
| `admin` | `cafe2024` | superadmin | Todo |
| `cocina` | `cocina2024` | kitchen | Cocina e insumos |
| `cajero` | `cajero2024` | cashier | Caja y pedidos |

---

## 📡 WebSocket — Eventos en tiempo real

| Evento | Descripción |
|--------|-------------|
| `NEW_ORDER` | Nuevo pedido creado desde el frontend |
| `ORDER_STATUS` | Estado de pedido actualizado |
| `MENU_UPDATED` | Cambio en el menú |
| `RATING_UPDATE` | Nueva calificación registrada |
| `KITCHEN_REQUEST` | Nueva solicitud de insumos |
| `LEAVE_REQUEST` | Nueva solicitud de permiso |

---

## 🗂️ Estructura del proyecto

cafe-origen/
├── backend/
│   ├── server.js        # API REST + WebSocket
│   └── package.json
├── frontend/
│   ├── src/
│   │   └── App.jsx      # React SPA completa
│   ├── index.html
│   └── package.json
└── README.md

---

## 👥 Roles y permisos

superadmin (100) → Acceso total, puede eliminar
admin      (50)  → Crear y editar todo
cashier    (20)  → Ver pedidos y caja
kitchen    (10)  → Pedidos, insumos y permisos

---

## 📖 Documentación API

La documentación completa está disponible en Swagger UI una vez iniciado el backend:

http://localhost:3001/api/docs

---

## 📝 Licencia

MIT © Café Origen 2024
EOF