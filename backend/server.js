// ╔══════════════════════════════════════════════════════════════════╗
// ║  CAFE ORIGEN — Backend MVC                                       ║
// ║  Express + sql.js + JWT roles + Joi validation + Swagger         ║
// ╚══════════════════════════════════════════════════════════════════╝

const express  = require("express");
const cors     = require("cors");
const jwt      = require("jsonwebtoken");
const bcrypt   = require("bcryptjs");
const { WebSocketServer } = require("ws");
const http     = require("http");
const fs       = require("fs");
const path     = require("path");
const swaggerUi = require("swagger-ui-express");

const PORT       = process.env.PORT       || 3001;
const JWT_SECRET = process.env.JWT_SECRET || "cafe-origen-secret-2024";
const DB_PATH    = path.join(__dirname, "cafe.db");

// ─────────────────────────────────────────────────────────────────
// DATABASE LAYER
// ─────────────────────────────────────────────────────────────────
let db;

async function initDB() {
  const initSqlJs = require("sql.js");
  const SQL = await initSqlJs();
  db = fs.existsSync(DB_PATH)
    ? new SQL.Database(fs.readFileSync(DB_PATH))
    : new SQL.Database();
  db._save = function () {
    fs.writeFileSync(DB_PATH, Buffer.from(this.export()));
  };
  createTables();
  seedData();
  console.log("✅ Base de datos lista.");
}

function run(sql, params = [])  { db.run(sql, params); db._save(); }
function get(sql, params = [])  {
  const s = db.prepare(sql); s.bind(params);
  const r = s.step() ? s.getAsObject() : null; s.free(); return r;
}
function all(sql, params = [])  {
  const s = db.prepare(sql); s.bind(params);
  const rows = []; while (s.step()) rows.push(s.getAsObject()); s.free(); return rows;
}
function lastId() { return get("SELECT last_insert_rowid() as id").id; }

function createTables() {
  try { db.run("ALTER TABLE admins ADD COLUMN role TEXT NOT NULL DEFAULT 'superadmin'"); } catch(e) {}

  const stmts = [
    `CREATE TABLE IF NOT EXISTS admins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'superadmin'
    )`,
    `CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      sort_order INTEGER DEFAULT 0
    )`,
    `CREATE TABLE IF NOT EXISTS menu_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id INTEGER,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      price INTEGER NOT NULL,
      emoji TEXT DEFAULT '☕',
      prep_time INTEGER DEFAULT 5,
      available INTEGER DEFAULT 1,
      ingredients TEXT DEFAULT '[]'
    )`,
    `CREATE TABLE IF NOT EXISTS ratings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      menu_item_id INTEGER,
      stars INTEGER CHECK(stars BETWEEN 1 AND 5),
      created_at TEXT DEFAULT (datetime('now','localtime'))
    )`,
    `CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      table_number INTEGER NOT NULL,
      status TEXT DEFAULT 'pending',
      total INTEGER NOT NULL,
      note TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now','localtime'))
    )`,
    `CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER,
      menu_item_id INTEGER,
      menu_item_name TEXT NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      unit_price INTEGER NOT NULL,
      special_note TEXT DEFAULT ''
    )`,
    `CREATE TABLE IF NOT EXISTS services (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      icon TEXT DEFAULT '✨',
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      active INTEGER DEFAULT 1
    )`,
    `CREATE TABLE IF NOT EXISTS employees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      since TEXT DEFAULT '',
      notes TEXT DEFAULT '',
      avatar TEXT DEFAULT '',
      active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now','localtime'))
    )`,
    `CREATE TABLE IF NOT EXISTS employee_ratings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER,
      stars INTEGER CHECK(stars BETWEEN 1 AND 5),
      created_at TEXT DEFAULT (datetime('now','localtime'))
    )`,
    `CREATE TABLE IF NOT EXISTS kitchen_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      status TEXT DEFAULT 'pending',
      note TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now','localtime')),
      updated_at TEXT DEFAULT (datetime('now','localtime'))
    )`,
    `CREATE TABLE IF NOT EXISTS kitchen_request_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      request_id INTEGER,
      product_name TEXT NOT NULL,
      quantity TEXT NOT NULL,
      unit TEXT DEFAULT 'unidades'
    )`,
    `CREATE TABLE IF NOT EXISTS leave_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER,
      employee_name TEXT NOT NULL,
      type TEXT NOT NULL,
      reason TEXT NOT NULL,
      date_from TEXT NOT NULL,
      date_to TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      admin_note TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now','localtime')),
      updated_at TEXT DEFAULT (datetime('now','localtime'))
    )`,
  ];
  stmts.forEach(s => db.run(s));
  db._save();
}

function seedData() {
  const existingAdmin = get("SELECT id FROM admins WHERE username='admin'");
  if (existingAdmin) {
    run("UPDATE admins SET role='superadmin' WHERE username='admin'");
    console.log("✅ Rol de admin verificado: superadmin");
    return;
  }

  db.run("INSERT INTO admins(username,password_hash,role) VALUES(?,?,?)",
    ["admin",    bcrypt.hashSync("cafe2024", 10), "superadmin"]);
  db.run("INSERT INTO admins(username,password_hash,role) VALUES(?,?,?)",
    ["cocina",   bcrypt.hashSync("cocina2024", 10), "kitchen"]);
  db.run("INSERT INTO admins(username,password_hash,role) VALUES(?,?,?)",
    ["cajero",   bcrypt.hashSync("cajero2024", 10), "cashier"]);

  ["Cafes","Alimentos","Especiales","No Cafes"].forEach((n,i) =>
    db.run("INSERT INTO categories(name,sort_order) VALUES(?,?)",[n,i]));

  const c = name => get("SELECT id FROM categories WHERE name=?", [name]).id;
  const items = [
    [c("Cafes"), "Espresso Clasico",     "100% arabica de Huila, Colombia. Tueste medio-oscuro con notas de chocolate y frutos secos.", 4500,  "☕", 3, '["Cafe arabica","Agua filtrada"]',         [5,5,4,5,5,4,5,5,4]],
    [c("Cafes"), "Cappuccino Artesanal", "Espresso doble con leche texturizada al vapor y arte latte. Cremoso y equilibrado.",           7800,  "🍵", 5, '["Espresso","Leche entera","Espuma de leche"]',[5,4,5,5,4,5,4]],
    [c("Cafes"), "Cold Brew 24h",        "Extraccion en frio durante 24 horas. Suave, sin acidez, con notas de caramelo.",               8500,  "🧊", 0, '["Cafe molido grueso","Agua fria filtrada"]',[5,5,5,4,5,5]],
    [c("Cafes"), "Latte de Temporada",   "Sirope artesanal de canela y vainilla de Madagascar con leche texturizada.",                   9200,  "🥛", 5, '["Espresso","Leche","Sirope canela","Vainilla"]',[4,5,4,4,5,4]],
    [c("Cafes"), "Flat White",           "Doble ristretto con poca leche texturizada. Para quien ama el cafe intenso.",                  8000,  "☕", 4, '["Doble ristretto","Leche entera"]',          [5,5,4,5,5]],
    [c("Cafes"), "Americano Negro",      "Espresso largo con agua caliente. Limpio, directo y sin aditivos.",                            4000,  "🖤", 2, '["Espresso","Agua caliente"]',                [4,4,5,4]],
    [c("Alimentos"), "Croissant Almendra",   "Hojaldrado artesanal con relleno de crema de almendras y azucar glass.",              6500,  "🥐", 2, '["Harina de fuerza","Mantequilla","Almendras","Huevo"]',  [5,4,5,5,4,5]],
    [c("Alimentos"), "Tostada Aguacate",     "Pan de masa madre, aguacate Hass, tomate cherry, aceite de oliva y sal marina.",      12000, "🥑", 7, '["Pan masa madre","Aguacate Hass","Tomate cherry","EVOO","Flor de sal"]',[5,5,4,5,5]],
    [c("Alimentos"), "Bowl Acai",            "Base de acai puro con granola artesanal, banano, fresas y miel de abeja.",             14500, "🫐", 5, '["Acai congelado","Granola artesanal","Banano","Fresas","Miel"]',[5,4,5,5,5,4]],
    [c("Alimentos"), "Waffle Belga",         "Waffle crujiente con maple syrup, mantequilla y frutas del bosque frescas.",           13000, "🧇", 8, '["Harina","Huevo","Leche","Mantequilla","Maple syrup","Frutas"]',[4,5,4,5,4]],
    [c("Alimentos"), "Sandwich Pollo",       "Pan artesanal, pechuga a la plancha, lechuga romana, tomate y mayo de albahaca.",      15000, "🥪", 10,'["Pan artesanal","Pechuga","Lechuga","Tomate","Mayo albahaca"]', [5,4,5,4,5,5]],
    [c("Alimentos"), "Ensalada Caesar",      "Lechuga romana, crutones, parmesano, aderezo Caesar y pollo opcional.",               14000, "🥗", 8, '["Lechuga romana","Crutones","Parmesano","Aderezo Caesar"]',   [4,4,5,4]],
    [c("Especiales"), "Matcha Latte",    "Matcha ceremonial grado A de Kyoto con leche de avena y miel organica.",               10500, "🍃", 5, '["Matcha ceremonial","Leche de avena","Miel organica"]',      [5,5,5,4,5,5,5]],
    [c("Especiales"), "Golden Milk",     "Curcuma, jengibre fresco, leche de coco, pimienta negra y cardamomo.",                  9800,  "✨", 4, '["Curcuma","Jengibre fresco","Leche coco","Pimienta negra"]',  [4,5,4,5,4]],
    [c("Especiales"), "Chai Latte",      "Mezcla de especias indias, te negro y leche texturizada. Especiado y reconfortante.",   9200,  "🌶️", 5, '["Te negro","Canela","Cardamomo","Clavo","Jengibre","Leche"]', [5,5,4,5,4,5]],
    [c("Especiales"), "Dirty Matcha",    "Matcha ceremonial sobre espresso. La fusion perfecta para amantes de ambos mundos.",    11500, "💚", 5, '["Matcha","Espresso","Leche avena"]',                         [5,5,5,4,5]],
    [c("No Cafes"), "Limonada Coco",     "Limon tahiti fresco, crema de coco artesanal y agua con gas. Refrescante.",             8000,  "🍋", 3, '["Limon tahiti","Crema de coco","Agua con gas","Menta"]',     [5,5,4,5,5,4,5]],
    [c("No Cafes"), "Jugo Verde",        "Espinaca, apio, manzana verde, pepino y jengibre. Energizante y natural.",              9500,  "🥬", 5, '["Espinaca","Apio","Manzana verde","Pepino","Jengibre"]',     [4,5,4,4,5]],
    [c("No Cafes"), "Smoothie Tropical", "Mango, maracuya, banano, leche de coco y hielo. Explosion de sabor caribeno.",          10000, "🥭", 4, '["Mango","Maracuya","Banano","Leche de coco"]',              [5,5,5,4,5,5]],
    [c("No Cafes"), "Agua de Panela",    "Panela organica colombiana con limon y hielo. Bebida tradicional de alta montana.",     5000,  "🍯", 2, '["Panela organica","Limon","Agua","Hielo"]',                  [4,4,5,4,4]],
  ];
  items.forEach(([cat,name,desc,price,emoji,prep,ing,stars]) => {
    db.run("INSERT INTO menu_items(category_id,name,description,price,emoji,prep_time,ingredients) VALUES(?,?,?,?,?,?,?)",
      [cat,name,desc,price,emoji,prep,ing]);
    const id = lastId();
    stars.forEach(s => db.run("INSERT INTO ratings(menu_item_id,stars) VALUES(?,?)",[id,s]));
  });

  ["📶 WiFi Gratuito|Conexion de alta velocidad",
   "🔌 Puntos Carga|Cargadores en todas las mesas",
   "🎵 Musica en Vivo|Viernes y sabados 6pm-9pm",
   "💻 Espacio Cowork|Ambiente ideal para trabajar",
   "🌿 Opciones Veganas|Leches vegetales en el menu",
  ].forEach(s => {
    const [raw, desc] = s.split("|");
    const [icon, ...rest] = raw.split(" ");
    db.run("INSERT INTO services(icon,title,description) VALUES(?,?,?)",[icon, rest.join(" "), desc]);
  });

  const employees = [
    ["Valentina Rios",  "Barista",    "2022-03","Especialista en latte art.","VR"],
    ["Carlos Mendez",   "Cocinero",   "2021-08","Experto en bolleria artesanal.","CM"],
    ["Sofia Gutierrez", "Cajero",     "2023-01","Rapidez y precision en caja.","SG"],
    ["Andres Torres",   "Mesero",     "2022-11","Excelente atencion al cliente.","AT"],
    ["Lucia Vargas",    "Supervisor", "2020-05","Lidera el equipo de manana.","LV"],
  ];
  employees.forEach(([name,role,since,notes,avatar]) => {
    db.run("INSERT INTO employees(name,role,since,notes,avatar,active) VALUES(?,?,?,?,?,1)",[name,role,since,notes,avatar]);
    const id = lastId();
    [4,5,5,4,5].forEach(s => db.run("INSERT INTO employee_ratings(employee_id,stars) VALUES(?,?)",[id,s]));
  });

  const menuIds = all("SELECT id, price, name FROM menu_items");
  if (menuIds.length > 0) {
    const pick = (i) => menuIds[i % menuIds.length];
    const pastOrders = [
      { table:2, days:0, h:9,  combos:[[0,2],[2,1]],     status:"delivered" },
      { table:5, days:0, h:10, combos:[[1,1],[4,2]],     status:"delivered" },
      { table:3, days:0, h:11, combos:[[7,1],[6,1]],     status:"preparing" },
      { table:1, days:0, h:12, combos:[[0,1],[8,1],[3,1]],status:"pending"  },
      { table:4, days:1, h:9,  combos:[[2,2],[5,1]],     status:"delivered" },
      { table:6, days:1, h:10, combos:[[13,1],[9,2]],    status:"delivered" },
      { table:2, days:1, h:14, combos:[[0,3],[1,1]],     status:"delivered" },
      { table:7, days:2, h:8,  combos:[[7,2],[14,1]],    status:"delivered" },
      { table:3, days:2, h:11, combos:[[4,1],[10,1],[3,1]],status:"delivered"},
      { table:1, days:2, h:15, combos:[[15,1],[16,1]],   status:"delivered" },
      { table:5, days:3, h:9,  combos:[[0,2],[8,2]],     status:"delivered" },
      { table:8, days:3, h:13, combos:[[12,1],[6,2],[1,1]],status:"delivered"},
      { table:2, days:4, h:10, combos:[[0,1],[2,1],[9,1]],status:"delivered" },
      { table:4, days:4, h:11, combos:[[7,1],[13,1]],    status:"delivered" },
      { table:6, days:5, h:9,  combos:[[3,2],[11,1]],    status:"delivered" },
      { table:1, days:5, h:16, combos:[[0,2],[4,1],[8,1]],status:"delivered" },
      { table:3, days:6, h:10, combos:[[15,2],[16,1],[17,1]],status:"delivered"},
      { table:9, days:6, h:14, combos:[[5,1],[6,1],[18,1]],status:"delivered"},
      { table:2, days:7, h:9,  combos:[[0,2],[1,1]],     status:"delivered" },
      { table:5, days:7, h:12, combos:[[8,1],[9,1],[3,1]],status:"delivered" },
    ];
    pastOrders.forEach(o => {
      const total = o.combos.reduce((s,[idx,qty]) => s + Number(pick(idx).price)*qty, 0);
      db.run(
        `INSERT INTO orders(table_number,total,status,created_at) VALUES(?,?,?,datetime('now','-${o.days} days','localtime'))`,
        [o.table, total, o.status]
      );
      const orderId = lastId();
      o.combos.forEach(([idx,qty]) => {
        const m = pick(idx);
        db.run("INSERT INTO order_items(order_id,menu_item_id,menu_item_name,quantity,unit_price) VALUES(?,?,?,?,?)",
          [orderId, m.id, m.name, qty, m.price]);
      });
    });

    const leaveData = [
      [1,"Valentina Rios","Incapacidad medica","Gripa con formula medica del ISS","2024-11-15","2024-11-17","approved","Aprobado. Pronta recuperacion."],
      [4,"Andres Torres","Permiso personal","Cita medica con especialista","2024-12-02","2024-12-02","approved","Aprobado medio dia."],
      [6,"Miguel Herrera","Vacaciones","Vacaciones anuales programadas","2024-12-20","2024-12-27","pending",""],
      [10,"Juan Pablo Ruiz","Permiso personal","Tramite de documentos urgentes","2024-12-10","2024-12-10","rejected","No es posible ese dia por rotacion minima."],
      [3,"Sofia Gutierrez","Calamidad domestica","Inundacion en vivienda por lluvias","2024-11-28","2024-11-29","approved","Aprobado. Esperamos que todo mejore."],
    ];
    leaveData.forEach(l => db.run(
      "INSERT INTO leave_requests(employee_id,employee_name,type,reason,date_from,date_to,status,admin_note) VALUES(?,?,?,?,?,?,?,?)", l
    ));

    db.run("INSERT INTO kitchen_requests(status,note) VALUES('delivered','Pedido semanal de insumos')");
    const kr1 = lastId();
    [["Cafe arabica molido","5","kg"],["Leche entera","20","litros"],["Azucar organica","3","kg"],["Harina de trigo","10","kg"]]
      .forEach(([p,q,u]) => db.run("INSERT INTO kitchen_request_items(request_id,product_name,quantity,unit) VALUES(?,?,?,?)",[kr1,p,q,u]));

    db.run("INSERT INTO kitchen_requests(status,note) VALUES('approved','Urgente para el fin de semana')");
    const kr2 = lastId();
    [["Aguacate Hass","30","unidades"],["Tomate cherry","5","kg"],["Pan masa madre","15","unidades"]]
      .forEach(([p,q,u]) => db.run("INSERT INTO kitchen_request_items(request_id,product_name,quantity,unit) VALUES(?,?,?,?)",[kr2,p,q,u]));

    db.run("INSERT INTO kitchen_requests(status,note) VALUES('pending','Reposicion stock bebidas')");
    const kr3 = lastId();
    [["Matcha ceremonial","500","g"],["Leche de avena","12","litros"],["Miel organica","3","kg"]]
      .forEach(([p,q,u]) => db.run("INSERT INTO kitchen_request_items(request_id,product_name,quantity,unit) VALUES(?,?,?,?)",[kr3,p,q,u]));
  }

  db._save();
  console.log("✅ Datos iniciales insertados.");
  console.log("   admin/cafe2024 (superadmin) | cocina/cocina2024 (kitchen) | cajero/cajero2024 (cashier)");
}

// ─────────────────────────────────────────────────────────────────
// VALIDATION
// ─────────────────────────────────────────────────────────────────
function validate(schema) {
  return (req, res, next) => {
    const errors = [];
    for (const [field, rules] of Object.entries(schema)) {
      const val = req.body[field];
      if (rules.required && (val === undefined || val === null || val === "")) {
        errors.push(`${field} es requerido`); continue;
      }
      if (val === undefined || val === null) continue;
      if (rules.type === "string"  && typeof val !== "string")  errors.push(`${field} debe ser texto`);
      if (rules.type === "number"  && typeof val !== "number")  errors.push(`${field} debe ser numero`);
      if (rules.type === "boolean" && typeof val !== "boolean") errors.push(`${field} debe ser booleano`);
      if (rules.min  !== undefined && val < rules.min)  errors.push(`${field} minimo ${rules.min}`);
      if (rules.max  !== undefined && val > rules.max)  errors.push(`${field} maximo ${rules.max}`);
      if (rules.minLen !== undefined && String(val).length < rules.minLen)
        errors.push(`${field} minimo ${rules.minLen} caracteres`);
      if (rules.maxLen !== undefined && String(val).length > rules.maxLen)
        errors.push(`${field} maximo ${rules.maxLen} caracteres`);
      if (rules.enum && !rules.enum.includes(val))
        errors.push(`${field} debe ser uno de: ${rules.enum.join(", ")}`);
    }
    if (errors.length) return res.status(400).json({ errors });
    next();
  };
}

const schemas = {
  login:    { username:{required:true,type:"string"}, password:{required:true,type:"string",minLen:4} },
  menuItem: { name:{required:true,type:"string",minLen:2,maxLen:80}, price:{required:true,type:"number",min:100}, category_id:{required:true,type:"number",min:1} },
  // FIX: table_number acepta number o string numérico, items solo requiere existir
  order:    { table_number:{required:true}, items:{required:true} },
  rating:   { stars:{required:true,type:"number",min:1,max:5} },
  employee: { name:{required:true,type:"string",minLen:2,maxLen:60}, role:{required:true,type:"string",enum:["Barista","Cajero","Cocinero","Mesero","Supervisor","Limpieza"]} },
  service:  { title:{required:true,type:"string",minLen:2,maxLen:60} },
  status:   { status:{required:true,type:"string",enum:["pending","preparing","ready","delivered","cancelled"]} },
};

// ─────────────────────────────────────────────────────────────────
// AUTH MIDDLEWARE
// ─────────────────────────────────────────────────────────────────
function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Token requerido" });
  try { req.user = jwt.verify(token, JWT_SECRET); next(); }
  catch { res.status(401).json({ error: "Token invalido o expirado" }); }
}

const ROLE_LEVEL = { superadmin:100, admin:50, cashier:20, kitchen:10 };

function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user?.role))
      return res.status(403).json({ error: `Acceso denegado. Requiere rol: ${roles.join(" o ")}` });
    next();
  };
}

function requireMinRole(minRole) {
  return (req, res, next) => {
    const userLevel = ROLE_LEVEL[req.user?.role] || 0;
    const minLevel  = ROLE_LEVEL[minRole] || 0;
    if (userLevel < minLevel)
      return res.status(403).json({ error: `Acceso denegado. Requiere nivel ${minRole} o superior` });
    next();
  };
}

// ─────────────────────────────────────────────────────────────────
// WEBSOCKET
// ─────────────────────────────────────────────────────────────────
const app    = express();
const server = http.createServer(app);
const wss    = new WebSocketServer({ server });
const clients = new Set();

wss.on("connection", ws => {
  clients.add(ws);
  ws.on("close", () => clients.delete(ws));
  // FIX: ping/pong para detectar clientes caídos
  ws.isAlive = true;
  ws.on("pong", () => { ws.isAlive = true; });
});

// FIX: heartbeat para limpiar conexiones muertas
const heartbeat = setInterval(() => {
  clients.forEach(ws => {
    if (!ws.isAlive) { clients.delete(ws); return ws.terminate(); }
    ws.isAlive = false;
    ws.ping();
  });
}, 30000);

wss.on("close", () => clearInterval(heartbeat));

function broadcast(type, data) {
  const msg = JSON.stringify({ type, data, ts: Date.now() });
  clients.forEach(ws => { if (ws.readyState === 1) ws.send(msg); });
}

app.use(cors({ origin: "*" }));
app.use(express.json());

// ─────────────────────────────────────────────────────────────────
// SWAGGER DOCS — Café Origen API v2.1
// ─────────────────────────────────────────────────────────────────
const swaggerDoc = {
  openapi: "3.0.0",
  info: {
    title: "Café Origen API",
    version: "2.1.0",
    description: `
## ☕ Bienvenido a la API de Café Origen

Sistema de gestión integral para cafeterías de specialty coffee. Maneja pedidos en tiempo real, menú, empleados, insumos y más.

---

### 🔐 Autenticación
Usa **Bearer JWT**. Obtén tu token en \`POST /api/auth/login\` e inclúyelo en el header:
\`\`\`
Authorization: Bearer <tu_token>
\`\`\`

### 👥 Roles y permisos
| Rol | Nivel | Acceso |
|-----|-------|--------|
| \`superadmin\` | 100 | Todo, incluyendo eliminar |
| \`admin\` | 50 | Crear, editar, ver todo |
| \`cashier\` | 20 | Ver pedidos y caja |
| \`kitchen\` | 10 | Pedidos y cocina |

### 🔴 WebSocket
Conéctate a \`ws://localhost:3001\` para eventos en tiempo real:
- \`NEW_ORDER\` — Nuevo pedido creado
- \`ORDER_STATUS\` — Estado de pedido actualizado
- \`MENU_UPDATED\` — Cambio en el menú
- \`RATING_UPDATE\` — Nueva calificación

### 🧪 Credenciales de prueba
| Usuario | Contraseña | Rol |
|---------|-----------|-----|
| admin | cafe2024 | superadmin |
| cocina | cocina2024 | kitchen |
| cajero | cajero2024 | cashier |
    `,
    contact: {
      name: "Café Origen Dev Team",
      email: "dev@cafenorigen.co",
    },
    license: {
      name: "MIT",
      url: "https://opensource.org/licenses/MIT",
    },
  },
  servers: [
    { url: `http://localhost:${PORT}/api`, description: "🖥️ Desarrollo local" },
    { url: "https://api.cafenorigen.co/api", description: "🚀 Producción" },
  ],
  tags: [
    { name: "Auth",             description: "Autenticación y sesión de usuario" },
    { name: "Menu",             description: "Gestión del menú y productos" },
    { name: "Categories",       description: "Categorías del menú" },
    { name: "Orders",           description: "Pedidos de mesas en tiempo real" },
    { name: "Employees",        description: "Gestión del personal" },
    { name: "Services",         description: "Servicios ofrecidos por el café" },
    { name: "Analytics",        description: "Reportes de ventas y estadísticas" },
    { name: "Kitchen Requests", description: "Solicitudes de insumos a cocina" },
    { name: "Leave Requests",   description: "Permisos e incapacidades del personal" },
    { name: "System",           description: "Estado del sistema" },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "Token JWT obtenido en `POST /auth/login`. Expira en 8 horas.",
      },
    },
    schemas: {
      // ── Auth ──────────────────────────────────────────────
      LoginBody: {
        type: "object",
        required: ["username", "password"],
        properties: {
          username: { type: "string", example: "admin",    description: "Nombre de usuario" },
          password: { type: "string", example: "cafe2024", description: "Contraseña (mín. 4 caracteres)", minLength: 4 },
        },
      },
      LoginResponse: {
        type: "object",
        properties: {
          token:    { type: "string", example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...", description: "JWT válido por 8h" },
          username: { type: "string", example: "admin" },
          role:     { type: "string", example: "superadmin", enum: ["superadmin","admin","cashier","kitchen"] },
        },
      },
      // ── Menu ──────────────────────────────────────────────
      MenuItem: {
        type: "object",
        properties: {
          id:           { type: "integer", example: 1 },
          name:         { type: "string",  example: "Espresso Clásico" },
          description:  { type: "string",  example: "100% arábica de Huila, Colombia." },
          price:        { type: "integer", example: 4500, description: "Precio en COP" },
          emoji:        { type: "string",  example: "☕" },
          prep_time:    { type: "integer", example: 3, description: "Minutos de preparación" },
          available:    { type: "integer", example: 1, enum: [0, 1] },
          ingredients:  { type: "array",  items: { type: "string" }, example: ["Café arábica","Agua filtrada"] },
          category:     { type: "string",  example: "Cafés" },
          avg_rating:   { type: "number",  example: 4.8 },
          rating_count: { type: "integer", example: 24 },
        },
      },
      MenuItemBody: {
        type: "object",
        required: ["name", "price", "category_id"],
        properties: {
          name:        { type: "string",  example: "Flat White",      minLength: 2, maxLength: 80 },
          description: { type: "string",  example: "Doble ristretto con leche texturizada." },
          price:       { type: "integer", example: 8000,              minimum: 100 },
          emoji:       { type: "string",  example: "☕",              default: "☕" },
          prep_time:   { type: "integer", example: 4,                 default: 5 },
          available:   { type: "boolean", example: true,              default: true },
          category_id: { type: "integer", example: 1,                 minimum: 1 },
          ingredients: { type: "array",   items: { type: "string" },  example: ["Doble ristretto","Leche entera"] },
        },
      },
      // ── Orders ────────────────────────────────────────────
      Order: {
        type: "object",
        properties: {
          id:           { type: "integer", example: 42 },
          table_number: { type: "integer", example: 5 },
          status:       { type: "string",  example: "pending", enum: ["pending","preparing","ready","delivered","cancelled"] },
          total:        { type: "integer", example: 22300, description: "Total en COP" },
          note:         { type: "string",  example: "Sin azúcar por favor" },
          created_at:   { type: "string",  example: "2024-12-15 14:32:00" },
          items:        { type: "array",   items: { $ref: "#/components/schemas/OrderItem" } },
        },
      },
      OrderItem: {
        type: "object",
        properties: {
          id:             { type: "integer", example: 1 },
          menu_item_name: { type: "string",  example: "Espresso Clásico" },
          quantity:       { type: "integer", example: 2 },
          unit_price:     { type: "integer", example: 4500 },
          special_note:   { type: "string",  example: "Extra caliente" },
        },
      },
      OrderBody: {
        type: "object",
        required: ["table_number", "items"],
        properties: {
          table_number: { type: "integer", example: 5, minimum: 1, description: "Número de mesa (1-50)" },
          note:         { type: "string",  example: "Leche de almendras en el latte" },
          items: {
            type: "array",
            minItems: 1,
            items: {
              type: "object",
              required: ["name", "qty", "price"],
              properties: {
                id:    { type: "integer", example: 1 },
                name:  { type: "string",  example: "Espresso Clásico" },
                qty:   { type: "integer", example: 2, minimum: 1 },
                price: { type: "integer", example: 4500 },
                note:  { type: "string",  example: "Extra shot" },
              },
            },
          },
        },
      },
      StatusBody: {
        type: "object",
        required: ["status"],
        properties: {
          status: { type: "string", enum: ["pending","preparing","ready","delivered","cancelled"], example: "preparing" },
        },
      },
      // ── Employees ─────────────────────────────────────────
      Employee: {
        type: "object",
        properties: {
          id:           { type: "integer", example: 1 },
          name:         { type: "string",  example: "Valentina Ríos" },
          role:         { type: "string",  example: "Barista", enum: ["Barista","Cajero","Cocinero","Mesero","Supervisor","Limpieza"] },
          since:        { type: "string",  example: "2022-03" },
          notes:        { type: "string",  example: "Especialista en latte art." },
          avatar:       { type: "string",  example: "VR" },
          active:       { type: "integer", example: 1, enum: [0, 1] },
          avg_rating:   { type: "number",  example: 4.6 },
          rating_count: { type: "integer", example: 18 },
        },
      },
      EmployeeBody: {
        type: "object",
        required: ["name", "role"],
        properties: {
          name:   { type: "string",  example: "Carlos Mendez", minLength: 2, maxLength: 60 },
          role:   { type: "string",  example: "Barista", enum: ["Barista","Cajero","Cocinero","Mesero","Supervisor","Limpieza"] },
          since:  { type: "string",  example: "2024-01" },
          notes:  { type: "string",  example: "Especialista en café de filtro." },
          active: { type: "boolean", example: true },
        },
      },
      // ── Analytics ─────────────────────────────────────────
      AnalyticsSummary: {
        type: "object",
        properties: {
          revenue_total:  { type: "integer", example: 1850000 },
          orders_total:   { type: "integer", example: 120 },
          orders_pending: { type: "integer", example: 3 },
          avg_rating:     { type: "number",  example: 4.7 },
          top_items:      { type: "array",   items: { $ref: "#/components/schemas/MenuItem" } },
          top_employees:  { type: "array",   items: { $ref: "#/components/schemas/Employee" } },
        },
      },
      // ── Kitchen Requests ──────────────────────────────────
      KitchenRequest: {
        type: "object",
        properties: {
          id:         { type: "integer", example: 1 },
          status:     { type: "string",  example: "pending", enum: ["pending","approved","rejected","delivered"] },
          note:       { type: "string",  example: "Urgente para el fin de semana" },
          created_at: { type: "string",  example: "2024-12-15 10:00:00" },
          items: {
            type: "array",
            items: {
              type: "object",
              properties: {
                product_name: { type: "string",  example: "Café arábica molido" },
                quantity:     { type: "string",  example: "5" },
                unit:         { type: "string",  example: "kg" },
              },
            },
          },
        },
      },
      // ── Leave Requests ────────────────────────────────────
      LeaveRequest: {
        type: "object",
        properties: {
          id:            { type: "integer", example: 1 },
          employee_name: { type: "string",  example: "Valentina Ríos" },
          type:          { type: "string",  example: "Incapacidad médica" },
          reason:        { type: "string",  example: "Gripa con fórmula médica" },
          date_from:     { type: "string",  example: "2024-12-20" },
          date_to:       { type: "string",  example: "2024-12-22" },
          status:        { type: "string",  example: "pending", enum: ["pending","approved","rejected"] },
          admin_note:    { type: "string",  example: "Aprobado. Pronta recuperación." },
        },
      },
      // ── Errors ────────────────────────────────────────────
      Error: {
        type: "object",
        properties: {
          error: { type: "string", example: "Token inválido o expirado" },
        },
      },
      ValidationError: {
        type: "object",
        properties: {
          errors: { type: "array", items: { type: "string" }, example: ["name es requerido", "price mínimo 100"] },
        },
      },
    },
    responses: {
      Unauthorized: {
        description: "Token inválido, expirado o ausente",
        content: { "application/json": { schema: { $ref: "#/components/schemas/Error" }, example: { error: "Token requerido" } } },
      },
      Forbidden: {
        description: "Rol insuficiente para esta operación",
        content: { "application/json": { schema: { $ref: "#/components/schemas/Error" }, example: { error: "Acceso denegado. Requiere rol: superadmin" } } },
      },
      NotFound: {
        description: "Recurso no encontrado",
        content: { "application/json": { schema: { $ref: "#/components/schemas/Error" }, example: { error: "Item no encontrado" } } },
      },
      ValidationError: {
        description: "Error de validación en los campos enviados",
        content: { "application/json": { schema: { $ref: "#/components/schemas/ValidationError" } } },
      },
    },
  },
  security: [{ bearerAuth: [] }],
  paths: {
    // ── AUTH ──────────────────────────────────────────────────
    "/auth/login": {
      post: {
        tags: ["Auth"],
        summary: "Iniciar sesión",
        description: "Retorna un JWT válido por **8 horas**. Úsalo en el header `Authorization: Bearer <token>`.",
        security: [],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/LoginBody" } } },
        },
        responses: {
          200: { description: "Login exitoso", content: { "application/json": { schema: { $ref: "#/components/schemas/LoginResponse" } } } },
          400: { $ref: "#/components/responses/ValidationError" },
          401: { description: "Credenciales incorrectas", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" }, example: { error: "Credenciales incorrectas" } } } },
        },
      },
    },
    "/auth/me": {
      get: {
        tags: ["Auth"],
        summary: "Información del usuario autenticado",
        description: "Retorna los datos del usuario dueño del token.",
        responses: {
          200: { description: "Datos del usuario", content: { "application/json": { schema: { type: "object", properties: { id: { type: "integer" }, username: { type: "string" }, role: { type: "string" } } } } } },
          401: { $ref: "#/components/responses/Unauthorized" },
        },
      },
    },
    // ── MENU ──────────────────────────────────────────────────
    "/menu": {
      get: {
        tags: ["Menu"],
        summary: "Listado público del menú",
        description: "Retorna todos los productos **disponibles** (available=1). No requiere autenticación.",
        security: [],
        responses: {
          200: { description: "Lista de productos disponibles", content: { "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/MenuItem" } } } } },
        },
      },
      post: {
        tags: ["Menu"],
        summary: "Crear producto 🔒 admin+",
        description: "Crea un nuevo ítem en el menú. Requiere rol `admin` o superior.",
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/MenuItemBody" } } },
        },
        responses: {
          201: { description: "Producto creado exitosamente" },
          400: { $ref: "#/components/responses/ValidationError" },
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { $ref: "#/components/responses/Forbidden" },
        },
      },
    },
    "/menu/all": {
      get: {
        tags: ["Menu"],
        summary: "Todos los productos (incl. inactivos) 🔒 kitchen+",
        description: "Retorna todos los productos incluyendo los no disponibles. Requiere autenticación.",
        responses: {
          200: { description: "Lista completa de productos", content: { "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/MenuItem" } } } } },
          401: { $ref: "#/components/responses/Unauthorized" },
        },
      },
    },
    "/menu/{id}": {
      put: {
        tags: ["Menu"],
        summary: "Actualizar producto 🔒 admin+",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" }, example: 1 }],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/MenuItemBody" } } } },
        responses: {
          200: { description: "Producto actualizado" },
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { $ref: "#/components/responses/Forbidden" },
          404: { $ref: "#/components/responses/NotFound" },
        },
      },
      delete: {
        tags: ["Menu"],
        summary: "Eliminar producto 🔒 superadmin",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" }, example: 1 }],
        responses: {
          200: { description: "Producto eliminado" },
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { $ref: "#/components/responses/Forbidden" },
          404: { $ref: "#/components/responses/NotFound" },
        },
      },
    },
    "/menu/{id}/toggle": {
      put: {
        tags: ["Menu"],
        summary: "Activar / desactivar producto 🔒 admin+",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: {
          200: { description: "Estado cambiado", content: { "application/json": { schema: { type: "object", properties: { success: { type: "boolean" }, available: { type: "boolean" } } } } } },
          401: { $ref: "#/components/responses/Unauthorized" },
          404: { $ref: "#/components/responses/NotFound" },
        },
      },
    },
    "/menu/{id}/rate": {
      post: {
        tags: ["Menu"],
        summary: "Calificar producto (público)",
        description: "Agrega una calificación de 1 a 5 estrellas. No requiere autenticación.",
        security: [],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { type: "object", required: ["stars"], properties: { stars: { type: "integer", minimum: 1, maximum: 5, example: 5 } } } } },
        },
        responses: {
          200: { description: "Rating registrado", content: { "application/json": { schema: { type: "object", properties: { avg_rating: { type: "number" }, rating_count: { type: "integer" } } } } } },
          404: { $ref: "#/components/responses/NotFound" },
        },
      },
    },
    // ── CATEGORIES ────────────────────────────────────────────
    "/categories": {
      get: {
        tags: ["Categories"],
        summary: "Listar categorías",
        security: [],
        responses: {
          200: { description: "Lista de categorías ordenadas", content: { "application/json": { schema: { type: "array", items: { type: "object", properties: { id: { type: "integer" }, name: { type: "string" }, sort_order: { type: "integer" } } } } } } },
        },
      },
    },
    // ── ORDERS ────────────────────────────────────────────────
    "/orders": {
      get: {
        tags: ["Orders"],
        summary: "Listar pedidos 🔒 kitchen+",
        description: "Retorna los últimos 100 pedidos ordenados por ID descendente.",
        parameters: [{ name: "status", in: "query", required: false, schema: { type: "string", enum: ["pending","preparing","ready","delivered","cancelled"] }, description: "Filtrar por estado" }],
        responses: {
          200: { description: "Lista de pedidos con sus items", content: { "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/Order" } } } } },
          401: { $ref: "#/components/responses/Unauthorized" },
        },
      },
      post: {
        tags: ["Orders"],
        summary: "Crear pedido (público)",
        description: "Crea un nuevo pedido para una mesa. **No requiere autenticación** — los clientes pueden pedir directamente. Emite evento WS `NEW_ORDER`.",
        security: [],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/OrderBody" } } },
        },
        responses: {
          201: { description: "Pedido creado y enviado a cocina", content: { "application/json": { schema: { $ref: "#/components/schemas/Order" } } } },
          400: { $ref: "#/components/responses/ValidationError" },
        },
      },
    },
    "/orders/{id}/status": {
      patch: {
        tags: ["Orders"],
        summary: "Actualizar estado del pedido 🔒 kitchen+",
        description: "Cambia el estado de un pedido. Emite evento WS `ORDER_STATUS`.\n\nFlujo normal: `pending` → `preparing` → `ready` → `delivered`",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" }, example: 42 }],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/StatusBody" } } } },
        responses: {
          200: { description: "Estado actualizado" },
          401: { $ref: "#/components/responses/Unauthorized" },
          404: { $ref: "#/components/responses/NotFound" },
        },
      },
    },
    // ── EMPLOYEES ─────────────────────────────────────────────
    "/employees": {
      get: {
        tags: ["Employees"],
        summary: "Listado público de empleados activos",
        security: [],
        responses: {
          200: { description: "Empleados activos con su rating", content: { "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/Employee" } } } } },
        },
      },
      post: {
        tags: ["Employees"],
        summary: "Crear empleado 🔒 admin+",
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/EmployeeBody" } } } },
        responses: {
          201: { description: "Empleado creado" },
          400: { $ref: "#/components/responses/ValidationError" },
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { $ref: "#/components/responses/Forbidden" },
        },
      },
    },
    "/employees/all": {
      get: {
        tags: ["Employees"],
        summary: "Todos los empleados (incl. inactivos) 🔒 admin+",
        responses: {
          200: { description: "Lista completa del personal", content: { "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/Employee" } } } } },
          401: { $ref: "#/components/responses/Unauthorized" },
        },
      },
    },
    "/employees/{id}": {
      put: {
        tags: ["Employees"],
        summary: "Actualizar empleado 🔒 admin+",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/EmployeeBody" } } } },
        responses: { 200: { description: "Empleado actualizado" }, 404: { $ref: "#/components/responses/NotFound" } },
      },
      delete: {
        tags: ["Employees"],
        summary: "Eliminar empleado 🔒 superadmin",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: { 200: { description: "Empleado eliminado" }, 404: { $ref: "#/components/responses/NotFound" } },
      },
    },
    "/employees/{id}/toggle": {
      put: {
        tags: ["Employees"],
        summary: "Activar / desactivar empleado 🔒 admin+",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: { 200: { description: "Estado del empleado cambiado" } },
      },
    },
    "/employees/{id}/rate": {
      post: {
        tags: ["Employees"],
        summary: "Calificar empleado (público)",
        security: [],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { type: "object", required: ["stars"], properties: { stars: { type: "integer", minimum: 1, maximum: 5, example: 4 } } } } },
        },
        responses: { 200: { description: "Rating registrado" }, 404: { $ref: "#/components/responses/NotFound" } },
      },
    },
    // ── SERVICES ──────────────────────────────────────────────
    "/services": {
      get: {
        tags: ["Services"],
        summary: "Listar servicios activos (público)",
        security: [],
        responses: { 200: { description: "Servicios ofrecidos por el café" } },
      },
      post: {
        tags: ["Services"],
        summary: "Crear servicio 🔒 admin+",
        requestBody: {
          required: true,
          content: { "application/json": { schema: { type: "object", required: ["title"], properties: { icon: { type: "string", example: "📶" }, title: { type: "string", example: "WiFi Gratuito" }, description: { type: "string", example: "Conexión de alta velocidad" } } } } },
        },
        responses: { 201: { description: "Servicio creado" }, 401: { $ref: "#/components/responses/Unauthorized" } },
      },
    },
    // ── ANALYTICS ─────────────────────────────────────────────
    "/analytics/summary": {
      get: {
        tags: ["Analytics"],
        summary: "Resumen general 🔒 kitchen+",
        description: "KPIs globales, top productos y top empleados.",
        responses: {
          200: { description: "Resumen del negocio", content: { "application/json": { schema: { $ref: "#/components/schemas/AnalyticsSummary" } } } },
          401: { $ref: "#/components/responses/Unauthorized" },
        },
      },
    },
    "/analytics/sales": {
      get: {
        tags: ["Analytics"],
        summary: "Dashboard de ventas 🔒 kitchen+",
        description: "Ventas por período con desglose por categoría, producto y hora.",
        parameters: [{ name: "period", in: "query", schema: { type: "string", enum: ["day","month","year"], default: "day" }, description: "Agrupación temporal" }],
        responses: {
          200: { description: "Datos de ventas estructurados para gráficas" },
          401: { $ref: "#/components/responses/Unauthorized" },
        },
      },
    },
    // ── KITCHEN REQUESTS ──────────────────────────────────────
    "/kitchen-requests": {
      get: {
        tags: ["Kitchen Requests"],
        summary: "Listar solicitudes de insumos 🔒 kitchen+",
        responses: {
          200: { description: "Solicitudes de insumos con sus items", content: { "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/KitchenRequest" } } } } },
        },
      },
      post: {
        tags: ["Kitchen Requests"],
        summary: "Crear solicitud de insumos 🔒 kitchen+",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["items"],
                properties: {
                  note:  { type: "string", example: "Urgente para el fin de semana" },
                  items: { type: "array", items: { type: "object", properties: { product_name: { type: "string", example: "Café arábica" }, quantity: { type: "string", example: "5" }, unit: { type: "string", example: "kg" } } } },
                },
              },
            },
          },
        },
        responses: { 201: { description: "Solicitud creada" }, 401: { $ref: "#/components/responses/Unauthorized" } },
      },
    },
    "/kitchen-requests/{id}/status": {
      patch: {
        tags: ["Kitchen Requests"],
        summary: "Actualizar estado de solicitud 🔒 admin+",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { type: "object", properties: { status: { type: "string", enum: ["pending","approved","rejected","delivered"] } } } } },
        },
        responses: { 200: { description: "Estado actualizado" }, 401: { $ref: "#/components/responses/Unauthorized" } },
      },
    },
    // ── LEAVE REQUESTS ────────────────────────────────────────
    "/leave-requests": {
      get: {
        tags: ["Leave Requests"],
        summary: "Listar permisos e incapacidades 🔒 kitchen+",
        responses: {
          200: { description: "Todas las solicitudes de permiso", content: { "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/LeaveRequest" } } } } },
        },
      },
      post: {
        tags: ["Leave Requests"],
        summary: "Crear solicitud de permiso 🔒 kitchen+",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["employee_name","type","reason","date_from","date_to"],
                properties: {
                  employee_id:   { type: "integer", example: 1 },
                  employee_name: { type: "string",  example: "Valentina Ríos" },
                  type:          { type: "string",  example: "Incapacidad médica" },
                  reason:        { type: "string",  example: "Gripa con fórmula médica" },
                  date_from:     { type: "string",  example: "2024-12-20" },
                  date_to:       { type: "string",  example: "2024-12-22" },
                },
              },
            },
          },
        },
        responses: { 201: { description: "Solicitud creada" }, 401: { $ref: "#/components/responses/Unauthorized" } },
      },
    },
    "/leave-requests/{id}/status": {
      patch: {
        tags: ["Leave Requests"],
        summary: "Aprobar o rechazar permiso 🔒 admin+",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { type: "object", properties: { status: { type: "string", enum: ["pending","approved","rejected"] }, admin_note: { type: "string", example: "Aprobado. Pronta recuperación." } } } } },
        },
        responses: { 200: { description: "Estado actualizado" } },
      },
    },
    // ── SYSTEM ────────────────────────────────────────────────
    "/health": {
      get: {
        tags: ["System"],
        summary: "Health check del servidor",
        description: "Verifica que el servidor y WebSocket estén operativos.",
        security: [],
        responses: {
          200: {
            description: "Sistema operativo",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    status:     { type: "string", example: "ok" },
                    ts:         { type: "integer", example: 1734280320000 },
                    ws_clients: { type: "integer", example: 3, description: "Clientes WS conectados" },
                    roles:      { type: "array", items: { type: "string" } },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
};

// ── CSS personalizado tema Café Origen ────────────────────────
const swaggerCustomCss = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700&family=Cormorant+Garamond:wght@300;400;600&display=swap');

  body { background: #F7F2EA !important; }

  .swagger-ui { font-family: 'Syne', sans-serif !important; }

  /* Topbar */
  .swagger-ui .topbar {
    background: #1A0A00 !important;
    padding: 12px 0 !important;
    border-bottom: 2px solid #B8892A !important;
  }
  .swagger-ui .topbar-wrapper { padding: 0 2rem !important; }
  .swagger-ui .topbar-wrapper a span { display: none !important; }
  .swagger-ui .topbar-wrapper::before {
    content: '☕  CAFÉ ORIGEN  ·  API v2.1';
    font-family: 'Cormorant Garamond', serif !important;
    font-size: 1.4rem !important;
    letter-spacing: 4px !important;
    color: #E8C97A !important;
    font-weight: 300 !important;
  }
  .swagger-ui .topbar .download-url-wrapper { display: none !important; }

  /* Info block */
  .swagger-ui .info {
    background: #2C1A0A !important;
    padding: 2.5rem 3rem !important;
    margin: 0 !important;
    border-bottom: 1px solid rgba(184,137,42,.3) !important;
  }
  .swagger-ui .info .title {
    font-family: 'Cormorant Garamond', serif !important;
    font-size: 2.8rem !important;
    font-weight: 300 !important;
    color: #E8C97A !important;
    letter-spacing: 2px !important;
  }
  .swagger-ui .info .description p,
  .swagger-ui .info .description li,
  .swagger-ui .info .description td,
  .swagger-ui .info .description th {
    color: rgba(240,232,213,.8) !important;
    font-family: 'Syne', sans-serif !important;
    font-size: .85rem !important;
    line-height: 1.7 !important;
  }
  .swagger-ui .info .description h2,
  .swagger-ui .info .description h3 {
    color: #E8C97A !important;
    font-family: 'Cormorant Garamond', serif !important;
    font-weight: 400 !important;
    margin-top: 1.5rem !important;
  }
  .swagger-ui .info .description table {
    border-collapse: collapse !important;
    width: 100% !important;
  }
  .swagger-ui .info .description table th {
    background: rgba(184,137,42,.2) !important;
    padding: 8px 14px !important;
    text-align: left !important;
    font-size: .75rem !important;
    letter-spacing: 1.5px !important;
    text-transform: uppercase !important;
    color: #E8C97A !important;
  }
  .swagger-ui .info .description table td {
    padding: 8px 14px !important;
    border-bottom: 1px solid rgba(255,255,255,.07) !important;
    font-family: monospace !important;
    font-size: .82rem !important;
  }
  .swagger-ui .info .description code {
    background: rgba(184,137,42,.15) !important;
    color: #E8C97A !important;
    padding: 2px 8px !important;
    font-size: .82rem !important;
  }
  .swagger-ui .info .description pre code {
    display: block !important;
    padding: 12px !important;
    background: rgba(0,0,0,.3) !important;
    color: #B8E8A0 !important;
  }

  /* Main wrapper */
  .swagger-ui .wrapper { max-width: 1100px !important; padding: 0 2rem !important; }

  /* Tags / secciones */
  .swagger-ui .opblock-tag {
    font-family: 'Cormorant Garamond', serif !important;
    font-size: 1.3rem !important;
    font-weight: 400 !important;
    color: #2C1A0A !important;
    border-bottom: 1px solid rgba(184,137,42,.3) !important;
    padding: 12px 0 !important;
    letter-spacing: 1px !important;
  }
  .swagger-ui .opblock-tag:hover { background: rgba(184,137,42,.04) !important; }
  .swagger-ui .opblock-tag small {
    font-family: 'Syne', sans-serif !important;
    font-size: .72rem !important;
    color: #8A7F72 !important;
    letter-spacing: 1px !important;
  }

  /* Bloques de operación */
  .swagger-ui .opblock {
    border-radius: 0 !important;
    border: 1px solid rgba(0,0,0,.08) !important;
    box-shadow: none !important;
    margin-bottom: 4px !important;
    background: #FFFCF5 !important;
  }
  .swagger-ui .opblock:hover { border-color: rgba(184,137,42,.3) !important; }
  .swagger-ui .opblock.is-open { border-color: rgba(184,137,42,.4) !important; }

  .swagger-ui .opblock-summary {
    padding: 10px 16px !important;
    align-items: center !important;
  }
  .swagger-ui .opblock-summary-method {
    font-family: 'Syne', sans-serif !important;
    font-size: .65rem !important;
    font-weight: 700 !important;
    letter-spacing: 1.5px !important;
    min-width: 68px !important;
    text-align: center !important;
    padding: 5px 10px !important;
    border-radius: 2px !important;
  }
  .swagger-ui .opblock-summary-path {
    font-family: monospace !important;
    font-size: .88rem !important;
    color: #1C0A04 !important;
    font-weight: 600 !important;
  }
  .swagger-ui .opblock-summary-description {
    font-family: 'Syne', sans-serif !important;
    font-size: .78rem !important;
    color: #8A7F72 !important;
  }

  /* Colores por método */
  .swagger-ui .opblock-get    { border-left: 3px solid #1d4ed8 !important; }
  .swagger-ui .opblock-post   { border-left: 3px solid #16a34a !important; }
  .swagger-ui .opblock-put    { border-left: 3px solid #b45309 !important; }
  .swagger-ui .opblock-patch  { border-left: 3px solid #7c3aed !important; }
  .swagger-ui .opblock-delete { border-left: 3px solid #dc2626 !important; }

  .swagger-ui .opblock-get    .opblock-summary-method { background: #eff6ff !important; color: #1d4ed8 !important; }
  .swagger-ui .opblock-post   .opblock-summary-method { background: #f0fdf4 !important; color: #16a34a !important; }
  .swagger-ui .opblock-put    .opblock-summary-method { background: #fefce8 !important; color: #b45309 !important; }
  .swagger-ui .opblock-patch  .opblock-summary-method { background: #f5f3ff !important; color: #7c3aed !important; }
  .swagger-ui .opblock-delete .opblock-summary-method { background: #fef2f2 !important; color: #dc2626 !important; }

  /* Cuerpo del bloque expandido */
  .swagger-ui .opblock-body { background: #FFFDF5 !important; border-top: 1px solid rgba(0,0,0,.06) !important; }
  .swagger-ui .opblock-description-wrapper p,
  .swagger-ui .opblock-external-docs-wrapper p,
  .swagger-ui .opblock-section-header label {
    font-family: 'Syne', sans-serif !important;
    font-size: .78rem !important;
    color: #5C3D28 !important;
  }
  .swagger-ui .opblock-section-header {
    background: rgba(184,137,42,.06) !important;
    border-bottom: 1px solid rgba(184,137,42,.15) !important;
    padding: 8px 20px !important;
  }
  .swagger-ui .opblock-section-header h4 {
    font-family: 'Syne', sans-serif !important;
    font-size: .65rem !important;
    letter-spacing: 2px !important;
    text-transform: uppercase !important;
    color: #B8892A !important;
    font-weight: 700 !important;
  }

  /* Parámetros y tablas */
  .swagger-ui table thead tr th,
  .swagger-ui table thead tr td {
    font-family: 'Syne', sans-serif !important;
    font-size: .65rem !important;
    letter-spacing: 1.5px !important;
    text-transform: uppercase !important;
    color: #9A7A5A !important;
    border-bottom: 1px solid #EAD9C0 !important;
    padding: 10px 12px !important;
    background: transparent !important;
  }
  .swagger-ui table tbody tr td {
    font-family: 'Syne', sans-serif !important;
    font-size: .82rem !important;
    padding: 10px 12px !important;
    color: #1C0A04 !important;
    border-bottom: 1px solid rgba(0,0,0,.05) !important;
  }
  .swagger-ui .parameter__name { font-family: monospace !important; color: #2C1A0A !important; font-weight: 700 !important; }
  .swagger-ui .parameter__type { color: #B8892A !important; font-family: monospace !important; font-size: .78rem !important; }
  .swagger-ui .parameter__in   { color: #8A7F72 !important; font-size: .68rem !important; }

  /* Inputs */
  .swagger-ui input[type=text],
  .swagger-ui input[type=password],
  .swagger-ui textarea,
  .swagger-ui select {
    font-family: 'Syne', sans-serif !important;
    border: 1px solid #D4B896 !important;
    border-radius: 0 !important;
    background: #FFFCF5 !important;
    color: #1C0A04 !important;
    padding: 8px 12px !important;
    font-size: .82rem !important;
  }
  .swagger-ui input[type=text]:focus,
  .swagger-ui textarea:focus {
    border-color: #B8892A !important;
    outline: none !important;
    box-shadow: 0 0 0 2px rgba(184,137,42,.15) !important;
  }

  /* Botones */
  .swagger-ui .btn {
    font-family: 'Syne', sans-serif !important;
    font-size: .68rem !important;
    letter-spacing: 1.5px !important;
    text-transform: uppercase !important;
    border-radius: 0 !important;
    padding: 8px 20px !important;
    font-weight: 700 !important;
  }
  .swagger-ui .btn.execute {
    background: #2C1A0A !important;
    border-color: #2C1A0A !important;
    color: #E8C97A !important;
  }
  .swagger-ui .btn.execute:hover { background: #B8892A !important; border-color: #B8892A !important; color: #2C1A0A !important; }
  .swagger-ui .btn.authorize {
    background: transparent !important;
    border: 1px solid #B8892A !important;
    color: #B8892A !important;
  }
  .swagger-ui .btn.authorize:hover { background: rgba(184,137,42,.1) !important; }
  .swagger-ui .btn.authorize svg { fill: #B8892A !important; }
  .swagger-ui .btn.authorize.locked { border-color: #16a34a !important; color: #16a34a !important; }
  .swagger-ui .btn.authorize.locked svg { fill: #16a34a !important; }
  .swagger-ui .btn.cancel { border-color: #EAD9C0 !important; color: #8A7F72 !important; }

  /* Responses */
  .swagger-ui .responses-inner h4,
  .swagger-ui .responses-inner h5 {
    font-family: 'Syne', sans-serif !important;
    font-size: .65rem !important;
    letter-spacing: 2px !important;
    text-transform: uppercase !important;
    color: #9A7A5A !important;
  }
  .swagger-ui .response-col_status { font-family: monospace !important; font-weight: 700 !important; }
  .swagger-ui .response-col_description { font-family: 'Syne', sans-serif !important; font-size: .82rem !important; }

  /* Código / JSON */
  .swagger-ui .microlight,
  .swagger-ui pre.microlight {
    background: #1A0A00 !important;
    color: #E8C97A !important;
    font-size: .8rem !important;
    padding: 16px !important;
    border-radius: 0 !important;
    line-height: 1.6 !important;
  }

  /* Modelos / Schemas */
  .swagger-ui section.models { background: #FFFCF5 !important; border: 1px solid #EAD9C0 !important; }
  .swagger-ui section.models h4 {
    font-family: 'Cormorant Garamond', serif !important;
    font-size: 1rem !important;
    color: #2C1A0A !important;
    font-weight: 400 !important;
  }
  .swagger-ui .model-title {
    font-family: 'Cormorant Garamond', serif !important;
    font-size: 1.1rem !important;
    font-weight: 400 !important;
    color: #2C1A0A !important;
  }
  .swagger-ui .model { font-family: monospace !important; font-size: .82rem !important; color: #1C0A04 !important; }
  .swagger-ui .prop-type { color: #B8892A !important; font-style: normal !important; }
  .swagger-ui .prop-format { color: #8A7F72 !important; }

  /* Auth modal */
  .swagger-ui .dialog-ux .modal-ux {
    border-radius: 0 !important;
    border: 1px solid #B8892A !important;
  }
  .swagger-ui .dialog-ux .modal-ux-header {
    background: #2C1A0A !important;
    border-bottom: 1px solid rgba(184,137,42,.3) !important;
    padding: 1.5rem 2rem !important;
  }
  .swagger-ui .dialog-ux .modal-ux-header h3 {
    font-family: 'Cormorant Garamond', serif !important;
    font-size: 1.5rem !important;
    font-weight: 300 !important;
    color: #E8C97A !important;
    letter-spacing: 2px !important;
  }
  .swagger-ui .dialog-ux .modal-ux-content { padding: 2rem !important; background: #FFFCF5 !important; }
  .swagger-ui .dialog-ux .modal-ux-content p,
  .swagger-ui .dialog-ux .modal-ux-content label {
    font-family: 'Syne', sans-serif !important;
    font-size: .78rem !important;
    color: #5C3D28 !important;
    letter-spacing: .5px !important;
  }

  /* Scrollbar */
  ::-webkit-scrollbar { width: 6px; height: 6px; }
  ::-webkit-scrollbar-track { background: #F0E8D5; }
  ::-webkit-scrollbar-thumb { background: #D4B896; }
  ::-webkit-scrollbar-thumb:hover { background: #B8892A; }

  /* Lock icon */
  .swagger-ui .authorization__btn { opacity: .6; transition: opacity .2s; }
  .swagger-ui .authorization__btn:hover { opacity: 1; }
  .swagger-ui .locked .authorization__btn { opacity: 1; }
`;

const swaggerOptions = {
  customSiteTitle: "Café Origen — API Docs",
  customCss: swaggerCustomCss,
  customfavIcon: "https://fav.farm/☕",
  swaggerOptions: {
    persistAuthorization: true,      // mantiene el token entre recargas
    displayRequestDuration: true,    // muestra el tiempo de cada request
    filter: true,                    // barra de búsqueda de endpoints
    tryItOutEnabled: true,           // "Try it out" abierto por defecto
    defaultModelsExpandDepth: 1,     // expande 1 nivel de schemas
    defaultModelExpandDepth: 2,
    docExpansion: "list",            // muestra la lista colapsada al inicio
    tagsSorter: "alpha",
    operationsSorter: "alpha",
    syntaxHighlight: { theme: "monokai" },
  },
};

app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerDoc, swaggerOptions));
// ─────────────────────────────────────────────────────────────────
// CONTROLLERS
// ─────────────────────────────────────────────────────────────────

const AuthController = {
  login(req, res) {
    const { username, password } = req.body;
    const user = get("SELECT * FROM admins WHERE username=?", [username]);
    if (!user || !bcrypt.compareSync(password, user.password_hash))
      return res.status(401).json({ error: "Credenciales incorrectas" });
    const token = jwt.sign({ id:user.id, username:user.username, role:user.role }, JWT_SECRET, { expiresIn:"8h" });
    res.json({ token, username: user.username, role: user.role });
  },
  me(req, res) {
    res.json({ id:req.user.id, username:req.user.username, role:req.user.role });
  },
};

function menuWithRatings(onlyAvailable = false) {
  const where = onlyAvailable ? "WHERE m.available=1" : "";
  return all(`
    SELECT m.*, c.name as category,
      ROUND((SELECT AVG(stars) FROM ratings WHERE menu_item_id=m.id),2) as avg_rating,
      (SELECT COUNT(*) FROM ratings WHERE menu_item_id=m.id) as rating_count
    FROM menu_items m LEFT JOIN categories c ON m.category_id=c.id
    ${where} ORDER BY c.sort_order, m.name
  `).map(i => ({ ...i, ingredients: JSON.parse(i.ingredients||"[]") }));
}

const MenuController = {
  listPublic(req, res)  { res.json(menuWithRatings(true)); },
  listAll(req, res)     { res.json(menuWithRatings(false)); },
  create(req, res) {
    const { name, description="", price, emoji="☕", prep_time=5, available=true, ingredients=[], category_id } = req.body;
    run("INSERT INTO menu_items(name,description,price,emoji,prep_time,available,ingredients,category_id) VALUES(?,?,?,?,?,?,?,?)",
      [name, description, price, emoji, prep_time, available?1:0, JSON.stringify(ingredients), category_id]);
    broadcast("MENU_UPDATED", { action:"add" });
    res.status(201).json({ id:lastId(), name, price });
  },
  update(req, res) {
    const item = get("SELECT id FROM menu_items WHERE id=?", [req.params.id]);
    if (!item) return res.status(404).json({ error:"Item no encontrado" });
    const { name, description="", price, emoji="☕", prep_time=5, available=true, ingredients=[], category_id } = req.body;
    run("UPDATE menu_items SET name=?,description=?,price=?,emoji=?,prep_time=?,available=?,ingredients=?,category_id=? WHERE id=?",
      [name, description, price, emoji, prep_time, available?1:0, JSON.stringify(ingredients), category_id, req.params.id]);
    broadcast("MENU_UPDATED", { action:"update", id:req.params.id });
    res.json({ success:true });
  },
  toggle(req, res) {
    const item = get("SELECT available FROM menu_items WHERE id=?", [req.params.id]);
    if (!item) return res.status(404).json({ error:"Item no encontrado" });
    run("UPDATE menu_items SET available=? WHERE id=?", [item.available?0:1, req.params.id]);
    broadcast("MENU_UPDATED", { action:"toggle", id:req.params.id });
    res.json({ success:true, available:!item.available });
  },
  delete(req, res) {
    const item = get("SELECT id FROM menu_items WHERE id=?", [req.params.id]);
    if (!item) return res.status(404).json({ error:"Item no encontrado" });
    run("DELETE FROM menu_items WHERE id=?", [req.params.id]);
    broadcast("MENU_UPDATED", { action:"delete", id:req.params.id });
    res.json({ success:true });
  },
  rate(req, res) {
    const { stars } = req.body;
    const item = get("SELECT id FROM menu_items WHERE id=?", [req.params.id]);
    if (!item) return res.status(404).json({ error:"Item no encontrado" });
    run("INSERT INTO ratings(menu_item_id,stars) VALUES(?,?)", [req.params.id, stars]);
    const stats = get("SELECT ROUND(AVG(stars),2) as avg_rating, COUNT(*) as rating_count FROM ratings WHERE menu_item_id=?", [req.params.id]);
    broadcast("RATING_UPDATE", { item_id:Number(req.params.id), ...stats });
    res.json(stats);
  },
};

const OrdersController = {
  list(req, res) {
    const { status } = req.query;
    const orders = status
      ? all("SELECT * FROM orders WHERE status=? ORDER BY id DESC LIMIT 100", [status])
      : all("SELECT * FROM orders ORDER BY id DESC LIMIT 100");
    res.json(orders.map(o => ({ ...o, items: all("SELECT * FROM order_items WHERE order_id=?", [o.id]) })));
  },
  create(req, res) {
    let { table_number, items, note = "" } = req.body;

    // FIX: normalizar table_number — acepta string o number
    table_number = parseInt(table_number, 10);
    if (isNaN(table_number) || table_number < 1)
      return res.status(400).json({ error: "table_number debe ser un número mayor a 0" });

    if (!Array.isArray(items) || items.length === 0)
      return res.status(400).json({ error: "items debe ser un array no vacío" });

    const total = Math.round(
      items.reduce((s, i) => s + (parseFloat(i.price) || 0) * (parseInt(i.qty, 10) || 1), 0)
    );

    run("INSERT INTO orders(table_number,total,status,note) VALUES(?,?,'pending',?)", [table_number, total, note]);
    const orderId = lastId();

    items.forEach(item =>
      run(
        "INSERT INTO order_items(order_id,menu_item_id,menu_item_name,quantity,unit_price,special_note) VALUES(?,?,?,?,?,?)",
        [orderId, item.id || 0, item.name || "", item.qty || 1, item.price || 0, item.note || ""]
      )
    );

    const fullOrder = {
      id: orderId,
      table_number,
      status: "pending",
      total,
      note,
      items: all("SELECT * FROM order_items WHERE order_id=?", [orderId]),
      created_at: new Date().toLocaleTimeString("es-CO", { hour:"2-digit", minute:"2-digit" }),
    };

    broadcast("NEW_ORDER", fullOrder);
    res.status(201).json(fullOrder);
  },
  updateStatus(req, res) {
    const { status } = req.body;
    const order = get("SELECT id FROM orders WHERE id=?", [req.params.id]);
    if (!order) return res.status(404).json({ error:"Pedido no encontrado" });
    run("UPDATE orders SET status=? WHERE id=?", [status, req.params.id]);
    broadcast("ORDER_STATUS", { id:Number(req.params.id), status });
    res.json({ success:true });
  },
};

function employeesWithRating(onlyActive = false) {
  const where = onlyActive ? "WHERE e.active=1" : "";
  return all(`
    SELECT e.*,
      ROUND((SELECT AVG(stars) FROM employee_ratings WHERE employee_id=e.id),2) as avg_rating,
      (SELECT COUNT(*) FROM employee_ratings WHERE employee_id=e.id) as rating_count
    FROM employees e ${where} ORDER BY e.name
  `);
}

const EmployeesController = {
  listPublic(req, res) { res.json(employeesWithRating(true)); },
  listAll(req, res)    { res.json(employeesWithRating(false)); },
  create(req, res) {
    const { name, role, since="", notes="", active=true } = req.body;
    const avatar = name.split(" ").map(w=>w[0]).join("").toUpperCase().slice(0,2);
    run("INSERT INTO employees(name,role,since,notes,avatar,active) VALUES(?,?,?,?,?,?)",
      [name, role, since, notes, avatar, active?1:0]);
    res.status(201).json({ id:lastId(), name, role, avatar });
  },
  update(req, res) {
    const emp = get("SELECT id FROM employees WHERE id=?", [req.params.id]);
    if (!emp) return res.status(404).json({ error:"Empleado no encontrado" });
    const { name, role, since="", notes="", active=true } = req.body;
    const avatar = name.split(" ").map(w=>w[0]).join("").toUpperCase().slice(0,2);
    run("UPDATE employees SET name=?,role=?,since=?,notes=?,avatar=?,active=? WHERE id=?",
      [name, role, since, notes, avatar, active?1:0, req.params.id]);
    res.json({ success:true });
  },
  toggle(req, res) {
    const emp = get("SELECT active FROM employees WHERE id=?", [req.params.id]);
    if (!emp) return res.status(404).json({ error:"Empleado no encontrado" });
    run("UPDATE employees SET active=? WHERE id=?", [emp.active?0:1, req.params.id]);
    res.json({ success:true, active:!emp.active });
  },
  delete(req, res) {
    const emp = get("SELECT id FROM employees WHERE id=?", [req.params.id]);
    if (!emp) return res.status(404).json({ error:"Empleado no encontrado" });
    run("DELETE FROM employees WHERE id=?", [req.params.id]);
    res.json({ success:true });
  },
  rate(req, res) {
    const { stars } = req.body;
    const emp = get("SELECT id FROM employees WHERE id=?", [req.params.id]);
    if (!emp) return res.status(404).json({ error:"Empleado no encontrado" });
    run("INSERT INTO employee_ratings(employee_id,stars) VALUES(?,?)", [req.params.id, stars]);
    const stats = get("SELECT ROUND(AVG(stars),2) as avg_rating, COUNT(*) as rating_count FROM employee_ratings WHERE employee_id=?", [req.params.id]);
    broadcast("EMPLOYEE_RATED", { employee_id:Number(req.params.id), ...stats });
    res.json(stats);
  },
};

const ServicesController = {
  list(req, res)   { res.json(all("SELECT * FROM services WHERE active=1 ORDER BY id")); },
  create(req, res) {
    const { icon="✨", title, description="" } = req.body;
    run("INSERT INTO services(icon,title,description) VALUES(?,?,?)", [icon, title, description]);
    res.status(201).json({ id:lastId(), icon, title, description });
  },
  update(req, res) {
    const svc = get("SELECT id FROM services WHERE id=?", [req.params.id]);
    if (!svc) return res.status(404).json({ error:"Servicio no encontrado" });
    const { icon="✨", title, description="", active=true } = req.body;
    run("UPDATE services SET icon=?,title=?,description=?,active=? WHERE id=?",
      [icon, title, description, active?1:0, req.params.id]);
    res.json({ success:true });
  },
  delete(req, res) {
    const svc = get("SELECT id FROM services WHERE id=?", [req.params.id]);
    if (!svc) return res.status(404).json({ error:"Servicio no encontrado" });
    run("DELETE FROM services WHERE id=?", [req.params.id]);
    res.json({ success:true });
  },
};

const AnalyticsController = {
  summary(req, res) {
    res.json({
      revenue_total:  get("SELECT COALESCE(SUM(total),0) as v FROM orders WHERE status='delivered'").v,
      orders_total:   get("SELECT COUNT(*) as v FROM orders").v,
      orders_pending: get("SELECT COUNT(*) as v FROM orders WHERE status IN ('pending','preparing')").v,
      avg_rating:     get("SELECT ROUND(AVG(stars),2) as v FROM ratings").v,
      top_items: all(`SELECT m.name, m.emoji,
        ROUND(AVG(r.stars),2) as avg_rating, COUNT(r.id) as rating_count
        FROM menu_items m LEFT JOIN ratings r ON r.menu_item_id=m.id
        GROUP BY m.id ORDER BY avg_rating DESC, rating_count DESC LIMIT 10`),
      top_employees: all(`SELECT e.name, e.avatar, e.role,
        ROUND(AVG(er.stars),2) as avg_rating, COUNT(er.id) as rating_count
        FROM employees e LEFT JOIN employee_ratings er ON er.employee_id=e.id
        WHERE e.active=1 GROUP BY e.id ORDER BY avg_rating DESC, rating_count DESC LIMIT 5`),
    });
  },
  sales(req, res) {
    const { period="day" } = req.query;
    const grp   = period==="year" ? "strftime('%Y',created_at)" : period==="month" ? "strftime('%Y-%m',created_at)" : "DATE(created_at)";
    const limit = period==="year" ? 5 : 12;
    const today     = new Date().toISOString().split("T")[0];
    const thisMonth = today.slice(0,7);
    const thisYear  = today.slice(0,4);

    res.json({
      revenueOverTime: all(`SELECT ${grp} as period, COALESCE(SUM(total),0) as revenue, COUNT(*) as orders FROM orders WHERE status='delivered' GROUP BY period ORDER BY period DESC LIMIT ${limit}`).reverse(),
      byCategory: all(`SELECT c.name as category, COALESCE(SUM(oi.unit_price*oi.quantity),0) as revenue, SUM(oi.quantity) as units FROM order_items oi JOIN menu_items m ON oi.menu_item_id=m.id JOIN categories c ON m.category_id=c.id JOIN orders o ON oi.order_id=o.id WHERE o.status='delivered' GROUP BY c.id ORDER BY revenue DESC`),
      topProducts: all(`SELECT oi.menu_item_name as name, SUM(oi.quantity) as units, SUM(oi.unit_price*oi.quantity) as revenue FROM order_items oi JOIN orders o ON oi.order_id=o.id WHERE o.status='delivered' GROUP BY oi.menu_item_name ORDER BY revenue DESC LIMIT 8`),
      byHour: all(`SELECT CAST(strftime('%H',created_at) AS INTEGER) as hour, COUNT(*) as orders, COALESCE(SUM(total),0) as revenue FROM orders WHERE status='delivered' GROUP BY hour ORDER BY hour`),
      kpis: {
        today:          get("SELECT COALESCE(SUM(total),0) as v FROM orders WHERE status='delivered' AND DATE(created_at)=?",[today]).v,
        thisMonth:      get("SELECT COALESCE(SUM(total),0) as v FROM orders WHERE status='delivered' AND strftime('%Y-%m',created_at)=?",[thisMonth]).v,
        thisYear:       get("SELECT COALESCE(SUM(total),0) as v FROM orders WHERE status='delivered' AND strftime('%Y',created_at)=?",[thisYear]).v,
        allTime:        get("SELECT COALESCE(SUM(total),0) as v FROM orders WHERE status='delivered'").v,
        ordersToday:    get("SELECT COUNT(*) as v FROM orders WHERE DATE(created_at)=?",[today]).v,
        ordersMonth:    get("SELECT COUNT(*) as v FROM orders WHERE strftime('%Y-%m',created_at)=?",[thisMonth]).v,
        avgTicket:      get("SELECT ROUND(AVG(total),0) as v FROM orders WHERE status='delivered'").v||0,
        avgTicketToday: get("SELECT ROUND(AVG(total),0) as v FROM orders WHERE status='delivered' AND DATE(created_at)=?",[today]).v||0,
      },
    });
  },
};

const KitchenRequestsController = {
  list(req, res) {
    const requests = all("SELECT * FROM kitchen_requests ORDER BY id DESC LIMIT 50");
    res.json(requests.map(r => ({
      ...r,
      items: all("SELECT * FROM kitchen_request_items WHERE request_id=?", [r.id])
    })));
  },
  create(req, res) {
    const { items, note = "" } = req.body;
    if (!Array.isArray(items) || items.length === 0)
      return res.status(400).json({ error: "items requerido" });
    run("INSERT INTO kitchen_requests (note, status) VALUES (?, 'pending')", [note]);
    const reqId = lastId();
    items.forEach(item =>
      run("INSERT INTO kitchen_request_items (request_id, product_name, quantity, unit) VALUES (?,?,?,?)",
        [reqId, item.product_name, item.quantity, item.unit || "unidades"])
    );
    const full = {
      id: reqId, status: "pending", note,
      items: all("SELECT * FROM kitchen_request_items WHERE request_id=?", [reqId]),
      created_at: new Date().toLocaleString("es-CO"),
    };
    broadcast("KITCHEN_REQUEST", full);
    res.status(201).json(full);
  },
  updateStatus(req, res) {
    const { status } = req.body;
    const valid = ["pending", "approved", "rejected", "delivered"];
    if (!valid.includes(status)) return res.status(400).json({ error: "Estado invalido" });
    run("UPDATE kitchen_requests SET status=?, updated_at=datetime('now','localtime') WHERE id=?", [status, req.params.id]);
    broadcast("KITCHEN_REQUEST_STATUS", { id: Number(req.params.id), status });
    res.json({ success: true });
  },
};

const LeaveController = {
  list(req, res) {
    res.json(all("SELECT * FROM leave_requests ORDER BY id DESC LIMIT 100"));
  },
  myRequests(req, res) {
    const { employee_id } = req.query;
    if (!employee_id) return res.status(400).json({ error: "employee_id requerido" });
    res.json(all("SELECT * FROM leave_requests WHERE employee_id=? ORDER BY id DESC", [employee_id]));
  },
  create(req, res) {
    const { employee_id, employee_name, type, reason, date_from, date_to } = req.body;
    if (!employee_name || !type || !reason || !date_from || !date_to)
      return res.status(400).json({ error: "Todos los campos son requeridos" });
    run(
      "INSERT INTO leave_requests (employee_id, employee_name, type, reason, date_from, date_to, status) VALUES (?,?,?,?,?,?,'pending')",
      [employee_id || 0, employee_name, type, reason, date_from, date_to]
    );
    const newReq = get("SELECT * FROM leave_requests WHERE id=?", [lastId()]);
    broadcast("LEAVE_REQUEST", newReq);
    res.status(201).json(newReq);
  },
  updateStatus(req, res) {
    const { status, admin_note = "" } = req.body;
    const valid = ["pending", "approved", "rejected"];
    if (!valid.includes(status)) return res.status(400).json({ error: "Estado invalido" });
    run(
      "UPDATE leave_requests SET status=?, admin_note=?, updated_at=datetime('now','localtime') WHERE id=?",
      [status, admin_note, req.params.id]
    );
    broadcast("LEAVE_STATUS", { id: Number(req.params.id), status, admin_note });
    res.json({ success: true });
  },
};

// ─────────────────────────────────────────────────────────────────
// ROUTES
// ─────────────────────────────────────────────────────────────────
const router = express.Router();

router.post("/auth/login", validate(schemas.login), AuthController.login);
router.get ("/auth/me",    authMiddleware, AuthController.me);

router.get ("/menu",        MenuController.listPublic);
router.get ("/menu/all",    authMiddleware, requireMinRole("kitchen"), MenuController.listAll);
router.post("/menu",        authMiddleware, requireMinRole("admin"),   validate(schemas.menuItem), MenuController.create);
router.put ("/menu/:id",    authMiddleware, requireMinRole("admin"),   validate(schemas.menuItem), MenuController.update);
router.put ("/menu/:id/toggle", authMiddleware, requireMinRole("admin"), MenuController.toggle);
router.delete("/menu/:id", authMiddleware, requireRole("superadmin"), MenuController.delete);
router.post("/menu/:id/rate", validate(schemas.rating), MenuController.rate);

router.get("/categories", (req,res) => res.json(all("SELECT * FROM categories ORDER BY sort_order")));

// FIX: POST /orders es público — sin authMiddleware para que clientes puedan pedir
router.get ("/orders",            authMiddleware, requireMinRole("kitchen"), OrdersController.list);
router.post("/orders",            OrdersController.create);
router.patch("/orders/:id/status",authMiddleware, requireMinRole("kitchen"), validate(schemas.status), OrdersController.updateStatus);

router.get ("/employees",         EmployeesController.listPublic);
router.get ("/employees/all",     authMiddleware, requireMinRole("admin"), EmployeesController.listAll);
router.post("/employees",         authMiddleware, requireMinRole("admin"), validate(schemas.employee), EmployeesController.create);
router.put ("/employees/:id",     authMiddleware, requireMinRole("admin"), validate(schemas.employee), EmployeesController.update);
router.put ("/employees/:id/toggle", authMiddleware, requireMinRole("admin"), EmployeesController.toggle);
router.delete("/employees/:id",   authMiddleware, requireRole("superadmin"), EmployeesController.delete);
router.post("/employees/:id/rate",validate(schemas.rating), EmployeesController.rate);

router.get   ("/services",        ServicesController.list);
router.post  ("/services",        authMiddleware, requireMinRole("admin"), validate(schemas.service), ServicesController.create);
router.put   ("/services/:id",    authMiddleware, requireMinRole("admin"), validate(schemas.service), ServicesController.update);
router.delete("/services/:id",    authMiddleware, requireRole("superadmin"), ServicesController.delete);

router.get("/analytics/summary", authMiddleware, requireMinRole("kitchen"), AnalyticsController.summary);
router.get("/analytics/sales",   authMiddleware, requireMinRole("kitchen"), AnalyticsController.sales);

router.get ("/kitchen-requests",             authMiddleware, requireMinRole("kitchen"), KitchenRequestsController.list);
router.post("/kitchen-requests",             authMiddleware, requireMinRole("kitchen"), KitchenRequestsController.create);
router.patch("/kitchen-requests/:id/status", authMiddleware, requireMinRole("admin"),   KitchenRequestsController.updateStatus);

router.get ("/leave-requests",               authMiddleware, requireMinRole("kitchen"), LeaveController.list);
router.get ("/leave-requests/mine",          authMiddleware, requireMinRole("kitchen"), LeaveController.myRequests);
router.post("/leave-requests",               authMiddleware, requireMinRole("kitchen"), LeaveController.create);
router.patch("/leave-requests/:id/status",   authMiddleware, requireMinRole("admin"),   LeaveController.updateStatus);

router.get("/health", (req,res) => res.json({ status:"ok", ts:Date.now(), ws_clients:clients.size, roles:["superadmin","admin","cashier","kitchen"] }));

app.use("/api", router);

app.use((req,res) => res.status(404).json({ error:`Ruta ${req.method} ${req.path} no encontrada` }));
app.use((err,req,res,next) => {
  console.error("Error:", err.message);
  res.status(500).json({ error:"Error interno del servidor" });
});

// ─────────────────────────────────────────────────────────────────
// START
// ─────────────────────────────────────────────────────────────────
initDB().then(() => {
  server.listen(PORT, () => {
    console.log(`
╔══════════════════════════════════════════════════════╗
║  CAFE ORIGEN — Backend MVC v2.1 (corregido)          ║
║  API    → http://localhost:${PORT}/api                  ║
║  Swagger→ http://localhost:${PORT}/api/docs             ║
║  WS     → ws://localhost:${PORT}                        ║
╠══════════════════════════════════════════════════════╣
║  Roles:  superadmin · admin · cashier · kitchen      ║
║  Creds:  admin/cafe2024  |  cocina/cocina2024         ║
╚══════════════════════════════════════════════════════╝
    `);
  });
}).catch(err => { console.error("Error iniciando:", err); process.exit(1); });