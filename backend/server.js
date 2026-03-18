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
  // Run migrations first — add columns that may not exist in older DBs
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
  ];
  stmts.forEach(s => db.run(s));
  db._save();
}

function seedData() {
  const existingAdmin = get("SELECT id FROM admins WHERE username='admin'");
  if (existingAdmin) {
    // Always ensure admin has superadmin role
    run("UPDATE admins SET role='superadmin' WHERE username='admin'");
    console.log("✅ Rol de admin verificado: superadmin");
    return;
  }

  // Admins: superadmin + kitchen role
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
    [c("Cafes"),     "Espresso Clasico",    "Origen Colombia, tueste medio oscuro.", 4500, "☕", 3, '["Cafe arabica","Agua"]'],
    [c("Cafes"),     "Cappuccino Artesanal","Espresso doble con leche texturizada.", 7800, "🍵", 5, '["Espresso","Leche","Espuma"]'],
    [c("Cafes"),     "Cold Brew 24h",       "Extraccion en frio por 24 horas.",       8500, "🧊", 0, '["Cafe molido","Agua fria"]'],
    [c("Cafes"),     "Latte de Temporada",  "Sirope de canela y vainilla.",           9200, "🥛", 5, '["Espresso","Leche","Canela"]'],
    [c("Alimentos"), "Croissant Almendra",  "Hojaldrado artesanal.",                  6500, "🥐", 2, '["Harina","Mantequilla","Almendras"]'],
    [c("Alimentos"), "Tostada Aguacate",    "Pan masa madre con aguacate.",          12000, "🥑", 7, '["Pan","Aguacate","Tomate"]'],
    [c("Alimentos"), "Bowl Acai",           "Base acai con granola artesanal.",      14500, "🫐", 5, '["Acai","Granola","Banano"]'],
    [c("Especiales"),"Matcha Latte",        "Matcha ceremonial con leche avena.",    10500, "🍃", 5, '["Matcha","Leche avena"]'],
    [c("Especiales"),"Golden Milk",         "Curcuma jengibre y leche coco.",         9800, "✨", 4, '["Curcuma","Jengibre","Coco"]'],
    [c("No Cafes"),  "Limonada Coco",       "Limon tahiti y crema de coco.",          8000, "🍋", 3, '["Limon","Coco","Menta"]'],
  ];
  items.forEach(item => {
    db.run("INSERT INTO menu_items(category_id,name,description,price,emoji,prep_time,ingredients) VALUES(?,?,?,?,?,?,?)", item);
    const id = lastId();
    [4,5,5,4,5,5,4,5].forEach(s => db.run("INSERT INTO ratings(menu_item_id,stars) VALUES(?,?)",[id,s]));
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

  db._save();
  console.log("✅ Datos iniciales insertados.");
  console.log("   admin/cafe2024 (superadmin) | cocina/cocina2024 (kitchen) | cajero/cajero2024 (cashier)");
}

// ─────────────────────────────────────────────────────────────────
// VALIDATION (sin Joi externo — validación propia ligera)
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

// Validation schemas
const schemas = {
  login:    { username:{required:true,type:"string"}, password:{required:true,type:"string",minLen:4} },
  menuItem: { name:{required:true,type:"string",minLen:2,maxLen:80}, price:{required:true,type:"number",min:100}, category_id:{required:true,type:"number",min:1} },
  order:    { table_number:{required:true,type:"number",min:1,max:50}, items:{required:true} },
  rating:   { stars:{required:true,type:"number",min:1,max:5} },
  employee: { name:{required:true,type:"string",minLen:2,maxLen:60}, role:{required:true,type:"string",enum:["Barista","Cajero","Cocinero","Mesero","Supervisor","Limpieza"]} },
  service:  { title:{required:true,type:"string",minLen:2,maxLen:60} },
  status:   { status:{required:true,type:"string",enum:["pending","preparing","ready","delivered","cancelled"]} },
};

// ─────────────────────────────────────────────────────────────────
// AUTH MIDDLEWARE & ROLE GUARDS
// ─────────────────────────────────────────────────────────────────
function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Token requerido" });
  try { req.user = jwt.verify(token, JWT_SECRET); next(); }
  catch { res.status(401).json({ error: "Token invalido o expirado" }); }
}

// Role hierarchy: superadmin > admin > cashier > kitchen
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
});

function broadcast(type, data) {
  const msg = JSON.stringify({ type, data, ts: Date.now() });
  clients.forEach(ws => { if (ws.readyState === 1) ws.send(msg); });
}

app.use(cors({ origin: "*" }));
app.use(express.json());

// ─────────────────────────────────────────────────────────────────
// SWAGGER DOCS
// ─────────────────────────────────────────────────────────────────
const swaggerDoc = {
  openapi: "3.0.0",
  info: { title: "Café Origen API", version: "2.0.0", description: "API REST para el sistema de gestión de Café Origen. Roles: superadmin · admin · cashier · kitchen" },
  servers: [{ url: `http://localhost:${PORT}`, description: "Servidor local" }],
  components: {
    securitySchemes: { bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" } },
    schemas: {
      LoginBody:    { type:"object", required:["username","password"], properties:{ username:{type:"string",example:"admin"}, password:{type:"string",example:"cafe2024"} } },
      MenuItem:     { type:"object", properties:{ id:{type:"integer"}, name:{type:"string"}, price:{type:"integer"}, category:{type:"string"}, avg_rating:{type:"number"}, available:{type:"integer"} } },
      Order:        { type:"object", properties:{ id:{type:"integer"}, table_number:{type:"integer"}, status:{type:"string",enum:["pending","preparing","ready","delivered","cancelled"]}, total:{type:"integer"} } },
      Employee:     { type:"object", properties:{ id:{type:"integer"}, name:{type:"string"}, role:{type:"string"}, avg_rating:{type:"number"}, active:{type:"integer"} } },
      Error:        { type:"object", properties:{ error:{type:"string"} } },
      ValidationError: { type:"object", properties:{ errors:{type:"array",items:{type:"string"}} } },
    },
  },
  security: [{ bearerAuth: [] }],
  paths: {
    "/api/auth/login": {
      post: {
        tags:["Auth"], summary:"Login", security:[],
        requestBody:{ required:true, content:{ "application/json":{ schema:{ $ref:"#/components/schemas/LoginBody" } } } },
        responses:{ 200:{description:"JWT token"}, 401:{description:"Credenciales incorrectas"} }
      }
    },
    "/api/auth/me": {
      get:{ tags:["Auth"], summary:"Info del usuario autenticado",
        responses:{ 200:{description:"Datos del usuario"}, 401:{description:"No autenticado"} } }
    },
    "/api/menu": {
      get:{ tags:["Menu"], summary:"Listar menu publico disponible", security:[],
        responses:{ 200:{description:"Lista de items disponibles", content:{"application/json":{schema:{type:"array",items:{$ref:"#/components/schemas/MenuItem"}}}}} } },
    },
    "/api/menu/all": {
      get:{ tags:["Menu"], summary:"Listar todo el menu (admin)",
        responses:{ 200:{description:"Lista completa incluyendo no disponibles"} } }
    },
    "/api/menu": {
      post:{ tags:["Menu"], summary:"Crear item del menu [admin+]",
        requestBody:{ required:true, content:{"application/json":{schema:{type:"object",required:["name","price","category_id"],properties:{name:{type:"string"},price:{type:"integer"},emoji:{type:"string"},description:{type:"string"},category_id:{type:"integer"},prep_time:{type:"integer"},available:{type:"boolean"},ingredients:{type:"array",items:{type:"string"}}}}}}},
        responses:{ 201:{description:"Item creado"}, 400:{description:"Validation error"} } }
    },
    "/api/menu/{id}": {
      put:{ tags:["Menu"], summary:"Actualizar item [admin+]",
        parameters:[{in:"path",name:"id",required:true,schema:{type:"integer"}}],
        responses:{ 200:{description:"Actualizado"}, 404:{description:"No encontrado"} } },
      delete:{ tags:["Menu"], summary:"Eliminar item [superadmin]",
        parameters:[{in:"path",name:"id",required:true,schema:{type:"integer"}}],
        responses:{ 200:{description:"Eliminado"} } }
    },
    "/api/menu/{id}/rate": {
      post:{ tags:["Menu"], summary:"Valorar item (publico)", security:[],
        parameters:[{in:"path",name:"id",required:true,schema:{type:"integer"}}],
        requestBody:{ required:true, content:{"application/json":{schema:{type:"object",required:["stars"],properties:{stars:{type:"integer",minimum:1,maximum:5}}}}}},
        responses:{ 200:{description:"Rating guardado"} } }
    },
    "/api/orders": {
      get:{ tags:["Orders"], summary:"Listar pedidos [kitchen+]",
        parameters:[{in:"query",name:"status",schema:{type:"string",enum:["pending","preparing","ready","delivered","cancelled"]}}],
        responses:{ 200:{description:"Lista de pedidos"} } },
      post:{ tags:["Orders"], summary:"Crear pedido (publico)", security:[],
        requestBody:{ required:true, content:{"application/json":{schema:{type:"object",required:["table_number","items"],properties:{table_number:{type:"integer",minimum:1},items:{type:"array"}}}}}},
        responses:{ 201:{description:"Pedido creado y enviado a cocina via WS"} } }
    },
    "/api/orders/{id}/status": {
      patch:{ tags:["Orders"], summary:"Actualizar estado del pedido [kitchen+]",
        parameters:[{in:"path",name:"id",required:true,schema:{type:"integer"}}],
        requestBody:{ required:true, content:{"application/json":{schema:{type:"object",required:["status"],properties:{status:{type:"string",enum:["pending","preparing","ready","delivered","cancelled"]}}}}}},
        responses:{ 200:{description:"Estado actualizado y broadcast via WS"} } }
    },
    "/api/employees": {
      get:{ tags:["Employees"], summary:"Listar empleados activos (publico)", security:[],
        responses:{ 200:{description:"Lista de empleados activos con ratings"} } },
      post:{ tags:["Employees"], summary:"Crear empleado [admin+]",
        requestBody:{ required:true, content:{"application/json":{schema:{type:"object",required:["name","role"],properties:{name:{type:"string"},role:{type:"string",enum:["Barista","Cajero","Cocinero","Mesero","Supervisor","Limpieza"]},since:{type:"string"},notes:{type:"string"}}}}}},
        responses:{ 201:{description:"Empleado creado"} } }
    },
    "/api/employees/all": {
      get:{ tags:["Employees"], summary:"Listar todos los empleados [admin+]",
        responses:{ 200:{description:"Lista completa incluyendo inactivos"} } }
    },
    "/api/employees/{id}": {
      put:{ tags:["Employees"], summary:"Actualizar empleado [admin+]",
        parameters:[{in:"path",name:"id",required:true,schema:{type:"integer"}}],
        responses:{ 200:{description:"Actualizado"} } },
      delete:{ tags:["Employees"], summary:"Eliminar empleado [superadmin]",
        parameters:[{in:"path",name:"id",required:true,schema:{type:"integer"}}],
        responses:{ 200:{description:"Eliminado"} } }
    },
    "/api/employees/{id}/rate": {
      post:{ tags:["Employees"], summary:"Valorar empleado (publico)", security:[],
        parameters:[{in:"path",name:"id",required:true,schema:{type:"integer"}}],
        requestBody:{ required:true, content:{"application/json":{schema:{type:"object",required:["stars"],properties:{stars:{type:"integer",minimum:1,maximum:5}}}}}},
        responses:{ 200:{description:"Rating guardado"} } }
    },
    "/api/services": {
      get:{ tags:["Services"], summary:"Listar servicios activos (publico)", security:[], responses:{ 200:{description:"Lista de servicios"} } },
      post:{ tags:["Services"], summary:"Crear servicio [admin+]", responses:{ 201:{description:"Creado"} } }
    },
    "/api/analytics/summary": {
      get:{ tags:["Analytics"], summary:"KPIs generales [cashier+]", responses:{ 200:{description:"Resumen de KPIs"} } }
    },
    "/api/analytics/sales": {
      get:{ tags:["Analytics"], summary:"Dashboard de ventas [cashier+]",
        parameters:[{in:"query",name:"period",schema:{type:"string",enum:["day","month","year"]},description:"Agrupacion temporal"}],
        responses:{ 200:{description:"Datos para el dashboard de barras"} } }
    },
    "/api/health": {
      get:{ tags:["System"], summary:"Health check", security:[], responses:{ 200:{description:"OK"} } }
    },
  },
};

app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerDoc, {
  customSiteTitle: "Café Origen API",
  customCss: ".swagger-ui .topbar { background: #1a0a00; } .swagger-ui .topbar-wrapper img { display:none; } .swagger-ui .info .title { color: #1a0a00; }",
}));

// ─────────────────────────────────────────────────────────────────
// CONTROLLERS
// ─────────────────────────────────────────────────────────────────

// ── AUTH CONTROLLER ──────────────────────────────────────────────
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

// ── MENU CONTROLLER ──────────────────────────────────────────────
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

// ── ORDERS CONTROLLER ────────────────────────────────────────────
const OrdersController = {
  list(req, res) {
    const { status } = req.query;
    const orders = status
      ? all("SELECT * FROM orders WHERE status=? ORDER BY id DESC LIMIT 100", [status])
      : all("SELECT * FROM orders ORDER BY id DESC LIMIT 100");
    res.json(orders.map(o => ({ ...o, items: all("SELECT * FROM order_items WHERE order_id=?", [o.id]) })));
  },
  create(req, res) {
    const { table_number, items } = req.body;
    if (!Array.isArray(items) || items.length === 0)
      return res.status(400).json({ error:"items debe ser un array no vacio" });
    const total = items.reduce((s,i) => s + (Number(i.price)||0) * (Number(i.qty)||1), 0);
    run("INSERT INTO orders(table_number,total,status) VALUES(?,?,'pending')", [table_number, total]);
    const orderId = lastId();
    items.forEach(item =>
      run("INSERT INTO order_items(order_id,menu_item_id,menu_item_name,quantity,unit_price,special_note) VALUES(?,?,?,?,?,?)",
        [orderId, item.id||0, item.name||"", item.qty||1, item.price||0, item.note||""]));
    const fullOrder = {
      id:orderId, table_number, status:"pending", total,
      items: all("SELECT * FROM order_items WHERE order_id=?", [orderId]),
      created_at: new Date().toLocaleTimeString("es-CO",{hour:"2-digit",minute:"2-digit"}),
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

// ── EMPLOYEES CONTROLLER ─────────────────────────────────────────
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

// ── SERVICES CONTROLLER ──────────────────────────────────────────
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

// ── ANALYTICS CONTROLLER ─────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────────
// ROUTES  (MVC: router → middleware → controller)
// ─────────────────────────────────────────────────────────────────
const router = express.Router();

// AUTH
router.post("/auth/login", validate(schemas.login), AuthController.login);
router.get ("/auth/me",    authMiddleware, AuthController.me);

// MENU — public read, role-protected write
router.get ("/menu",        MenuController.listPublic);
router.get ("/menu/all",    authMiddleware, requireMinRole("kitchen"), MenuController.listAll);
router.post("/menu",        authMiddleware, requireMinRole("admin"),   validate(schemas.menuItem), MenuController.create);
router.put ("/menu/:id",    authMiddleware, requireMinRole("admin"),   validate(schemas.menuItem), MenuController.update);
router.put ("/menu/:id/toggle", authMiddleware, requireMinRole("admin"), MenuController.toggle);
router.delete("/menu/:id", authMiddleware, requireRole("superadmin"), MenuController.delete);
router.post("/menu/:id/rate", validate(schemas.rating), MenuController.rate);

// CATEGORIES
router.get("/categories", (req,res) => res.json(all("SELECT * FROM categories ORDER BY sort_order")));

// ORDERS
router.get ("/orders",            authMiddleware, requireMinRole("kitchen"), OrdersController.list);
router.post("/orders",            validate(schemas.order), OrdersController.create);
router.patch("/orders/:id/status",authMiddleware, requireMinRole("kitchen"), validate(schemas.status), OrdersController.updateStatus);

// EMPLOYEES
router.get ("/employees",         EmployeesController.listPublic);
router.get ("/employees/all",     authMiddleware, requireMinRole("admin"), EmployeesController.listAll);
router.post("/employees",         authMiddleware, requireMinRole("admin"), validate(schemas.employee), EmployeesController.create);
router.put ("/employees/:id",     authMiddleware, requireMinRole("admin"), validate(schemas.employee), EmployeesController.update);
router.put ("/employees/:id/toggle", authMiddleware, requireMinRole("admin"), EmployeesController.toggle);
router.delete("/employees/:id",   authMiddleware, requireRole("superadmin"), EmployeesController.delete);
router.post("/employees/:id/rate",validate(schemas.rating), EmployeesController.rate);

// SERVICES
router.get   ("/services",        ServicesController.list);
router.post  ("/services",        authMiddleware, requireMinRole("admin"), validate(schemas.service), ServicesController.create);
router.put   ("/services/:id",    authMiddleware, requireMinRole("admin"), validate(schemas.service), ServicesController.update);
router.delete("/services/:id",    authMiddleware, requireRole("superadmin"), ServicesController.delete);

// ANALYTICS
router.get("/analytics/summary", authMiddleware, requireMinRole("kitchen"), AnalyticsController.summary);
router.get("/analytics/sales",   authMiddleware, requireMinRole("kitchen"), AnalyticsController.sales);

// HEALTH
router.get("/health", (req,res) => res.json({ status:"ok", ts:Date.now(), ws_clients:clients.size, roles:["superadmin","admin","cashier","kitchen"] }));

app.use("/api", router);

// 404 handler
app.use((req,res) => res.status(404).json({ error:`Ruta ${req.method} ${req.path} no encontrada` }));

// Global error handler
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
║  CAFE ORIGEN — Backend MVC v2.0                      ║
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