import { useState, useEffect, useCallback, createContext, useContext } from "react";

// ─── AUTUMN HARVEST PALETTE ──────────────────────────────────
const C = {
  granate:      "#8B1A1A",
  granateDark:  "#6B1313",
  granateLight: "#B52A2A",
  dorado:       "#C4A35A",
  doradoDark:   "#8B7340",
  doradoLight:  "#E8D5A0",
  espresso:     "#2C1810",
  espressoMid:  "#4A2C1C",
  terracota:    "#A0522D",
  terracotaLight:"#C4724D",
  crema:        "#F5E6C8",
  cremaDark:    "#E8D4A8",
  white:        "#FFFDF5",
  textDark:     "#1C0A04",
  textMid:      "#5C3D28",
  textLight:    "#9A7A5A",
  border:       "#D4B896",
  borderLight:  "#EAD9C0",
  bg:           "#FAF4EA",
  bgCard:       "#FFFDF5",
  // status colors kept standard for readability
  green:  "#16a34a", greenBg: "#f0fdf4", greenBorder: "#bbf7d0",
  yellow: "#b45309", yellowBg: "#fefce8", yellowBorder: "#fde68a",
  red:    "#dc2626", redBg:   "#fef2f2", redBorder:   "#fecaca",
  blue:   "#1d4ed8", blueBg:  "#eff6ff", blueBorder:  "#bfdbfe",
};

const API    = "http://localhost:3001/api";
const WS_URL = "ws://localhost:3001";
const FONTS  = `@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400;1,600&family=DM+Sans:wght@300;400;500;600&display=swap');`;

// ─── AUTH CONTEXT ─────────────────────────────────────────────
const AuthContext = createContext(null);
function AuthProvider({ children }) {
  const [token, setTok] = useState(() => localStorage.getItem("cafe_token") || "");
  const [role,  setRole] = useState(() => localStorage.getItem("cafe_role")  || "");
  const [user,  setUser] = useState(() => localStorage.getItem("cafe_user")  || "");

  function login(t, r, u) {
    localStorage.setItem("cafe_token", t);
    localStorage.setItem("cafe_role",  r);
    localStorage.setItem("cafe_user",  u);
    setTok(t); setRole(r); setUser(u);
  }
  function logout() {
    ["cafe_token","cafe_role","cafe_user"].forEach(k => localStorage.removeItem(k));
    setTok(""); setRole(""); setUser("");
  }
  const request = useCallback(async (method, path, body) => {
    const res = await fetch(`${API}${path}`, {
      method,
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (res.status === 401) { logout(); throw { error: "Sesión expirada" }; }
    if (!res.ok) throw await res.json();
    return res.json();
  }, [token]);

  return <AuthContext.Provider value={{ token, role, user, login, logout, request }}>{children}</AuthContext.Provider>;
}
function useAuth()    { return useContext(AuthContext); }
function useRequest() { return useContext(AuthContext).request; }

// ─── SHARED UI ────────────────────────────────────────────────
const F = { serif: "'Cormorant Garamond',serif", sans: "'DM Sans',sans-serif", mono: "monospace" };

function Stars({ value=0, size=14, interactive=false, onRate }) {
  const [hov, setHov] = useState(0);
  return (
    <span style={{ display:"inline-flex", gap:2 }}>
      {[1,2,3,4,5].map(s => (
        <span key={s} onClick={()=>interactive&&onRate?.(s)}
          onMouseEnter={()=>interactive&&setHov(s)} onMouseLeave={()=>interactive&&setHov(0)}
          style={{ fontSize:size, cursor:interactive?"pointer":"default",
            color: s<=(hov||Math.round(value))?C.dorado:C.borderLight,
            lineHeight:1, transition:"color 0.15s, transform 0.1s",
            transform: interactive&&hov===s?"scale(1.2)":"scale(1)", display:"inline-block" }}>★</span>
      ))}
    </span>
  );
}

function Tag({ children, color=C.crema, text=C.textMid, size=10 }) {
  return <span style={{ padding:"3px 10px", borderRadius:99, background:color, color:text,
    fontSize:size, fontWeight:600, letterSpacing:"0.07em", textTransform:"uppercase", fontFamily:F.sans }}>{children}</span>;
}

function StatusBadge({ status }) {
  const map = {
    pending:   { label:"En espera", bg:C.yellowBg,  text:C.yellow, border:C.yellowBorder, dot:"#f59e0b" },
    approved:  { label:"Aprobado",  bg:C.greenBg,   text:C.green,  border:C.greenBorder,  dot:"#22c55e" },
    rejected:  { label:"Negado",    bg:C.redBg,     text:C.red,    border:C.redBorder,    dot:"#ef4444" },
    delivered: { label:"Entregado", bg:C.blueBg,    text:C.blue,   border:C.blueBorder,   dot:"#3b82f6" },
  };
  const s = map[status] || map.pending;
  return (
    <span style={{ display:"inline-flex", alignItems:"center", gap:5, padding:"3px 10px",
      borderRadius:99, background:s.bg, border:`1px solid ${s.border}`, fontFamily:F.sans,
      fontSize:11, fontWeight:600, color:s.text }}>
      <span style={{ width:6, height:6, borderRadius:99, background:s.dot, display:"inline-block" }}/>
      {s.label}
    </span>
  );
}

function Pill({ children, active, onClick, color }) {
  const ac = color || C.espresso;
  return (
    <button onClick={onClick} style={{ padding:"7px 18px", borderRadius:99,
      border:`1.5px solid ${active ? ac : C.border}`,
      background: active ? ac : "transparent",
      color: active ? C.crema : C.textMid,
      fontSize:12, fontWeight:500, cursor:"pointer", transition:"all 0.2s",
      fontFamily:F.sans, letterSpacing:"0.04em", whiteSpace:"nowrap" }}>
      {children}
    </button>
  );
}

function Btn({ children, onClick, variant="primary", size="md", disabled=false, full=false }) {
  const styles = {
    primary:   { bg:C.espresso,  color:C.crema,   border:C.espresso },
    secondary: { bg:"transparent", color:C.textMid, border:C.border },
    danger:    { bg:"transparent", color:C.red,     border:C.redBorder },
    dorado:    { bg:C.dorado,    color:C.espresso, border:C.dorado },
    granate:   { bg:C.granate,   color:C.crema,   border:C.granate },
  };
  const sz = size==="sm" ? "6px 14px" : size==="lg" ? "12px 28px" : "9px 20px";
  const s = styles[variant] || styles.primary;
  return (
    <button onClick={onClick} disabled={disabled} style={{
      padding:sz, borderRadius:10, border:`1.5px solid ${s.border}`,
      background: disabled ? C.border : s.bg,
      color: disabled ? C.textLight : s.color,
      fontFamily:F.sans, fontSize:13, fontWeight:600, cursor:disabled?"not-allowed":"pointer",
      transition:"all 0.2s", width:full?"100%":"auto", letterSpacing:"0.04em",
    }}>{children}</button>
  );
}

function Card({ children, style={} }) {
  return <div style={{ background:C.bgCard, borderRadius:16, border:`1px solid ${C.borderLight}`,
    padding:"18px 20px", ...style }}>{children}</div>;
}

function SectionTitle({ children, sub }) {
  return (
    <div style={{ marginBottom:20 }}>
      <h2 style={{ margin:"0 0 4px", fontFamily:F.serif, fontWeight:700, fontSize:26, color:C.textDark, lineHeight:1 }}>{children}</h2>
      {sub && <p style={{ margin:0, fontFamily:F.sans, fontSize:12, color:C.textLight }}>{sub}</p>}
    </div>
  );
}

function Spinner() { return <div style={{ textAlign:"center", padding:"3rem", fontFamily:F.sans, color:C.textLight, fontSize:14 }}>Cargando...</div>; }
function ErrMsg({ msg }) {
  if (!msg) return null;
  return <div style={{ background:C.redBg, border:`1px solid ${C.redBorder}`, borderRadius:10,
    padding:"10px 14px", fontFamily:F.sans, fontSize:12, color:C.red, marginBottom:12 }}>{msg}</div>;
}

// ─── KITCHEN ORDERS VIEW ──────────────────────────────────────
function KitchenView({ orders, onUpdateStatus }) {
  const STATUS = {
    pending:   { bg:"#fffbf0", border:C.dorado,     label:"Pendiente",  icon:"⏳" },
    preparing: { bg:"#f0f4ff", border:"#6aabf0",    label:"Preparando", icon:"🔥" },
    ready:     { bg:"#f0fdf6", border:C.green,       label:"Listo",      icon:"✅" },
    delivered: { bg:C.bg,      border:C.borderLight, label:"Entregado",  icon:"📦" },
  };
  const active = orders.filter(o => o.status !== "delivered");
  return (
    <div>
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:24 }}>
        <span style={{ width:8, height:8, borderRadius:99, background:C.green, boxShadow:`0 0 0 3px ${C.greenBg}`, display:"inline-block" }}/>
        <span style={{ fontFamily:F.sans, fontSize:13, color:C.textLight, letterSpacing:"0.06em" }}>EN VIVO · {active.length} pedidos activos</span>
      </div>
      {active.length===0 && <div style={{ textAlign:"center", padding:"4rem", color:C.border }}>
        <div style={{ fontSize:48, marginBottom:8, opacity:0.5 }}>🍽️</div>
        <p style={{ margin:0, fontFamily:F.sans, fontSize:15 }}>Sin pedidos pendientes</p>
      </div>}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(290px,1fr))", gap:14 }}>
        {active.map(order => {
          const s = STATUS[order.status] || STATUS.pending;
          return (
            <div key={order.id} style={{ background:s.bg, borderRadius:16, padding:18, border:`2px solid ${s.border}`, transition:"all 0.3s" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
                <div>
                  <span style={{ fontFamily:F.serif, fontWeight:700, fontSize:20, color:C.textDark }}>Mesa #{order.table_number}</span>
                  <span style={{ fontFamily:F.sans, fontSize:11, color:C.textLight, marginLeft:8 }}>{order.created_at}</span>
                </div>
                <span style={{ fontFamily:F.sans, fontSize:12, fontWeight:600, color:C.textMid, background:"rgba(255,255,255,0.7)", padding:"3px 10px", borderRadius:99 }}>{s.icon} {s.label}</span>
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:5, marginBottom:14, paddingBottom:14, borderBottom:`1px solid ${s.border}60` }}>
                {(order.items||[]).map((item,i) => (
                  <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                    <span style={{ fontFamily:F.sans, fontSize:13, color:C.textDark, fontWeight:500 }}>{item.quantity}× {item.menu_item_name}</span>
                    {item.special_note && <span style={{ fontFamily:F.sans, fontSize:11, color:C.textLight, fontStyle:"italic" }}>"{item.special_note}"</span>}
                  </div>
                ))}
              </div>
              <div style={{ display:"flex", gap:8 }}>
                {order.status==="pending"   && <Btn onClick={()=>onUpdateStatus(order.id,"preparing")} variant="dorado" full>🔥 Iniciar preparación</Btn>}
                {order.status==="preparing" && <Btn onClick={()=>onUpdateStatus(order.id,"ready")}    full style={{ background:C.green, color:"#fff", border:C.green }}>✅ Marcar listo</Btn>}
                {order.status==="ready"     && <Btn onClick={()=>onUpdateStatus(order.id,"delivered")} variant="secondary" full>📦 Entregar</Btn>}
              </div>
            </div>
          );
        })}
      </div>
      {orders.filter(o=>o.status==="delivered").length>0 && (
        <div style={{ marginTop:28 }}>
          <p style={{ fontFamily:F.sans, fontSize:11, color:C.textLight, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.12em", marginBottom:10 }}>Entregados hoy</p>
          {orders.filter(o=>o.status==="delivered").map(o => (
            <div key={o.id} style={{ display:"flex", justifyContent:"space-between", padding:"8px 14px", background:C.crema, borderRadius:10, fontSize:13, color:C.textLight, marginBottom:4, fontFamily:F.sans }}>
              <span>Mesa #{o.table_number} · {(o.items||[]).map(i=>`${i.quantity}× ${i.menu_item_name}`).join(", ")}</span>
              <span style={{ fontWeight:600, color:C.textMid }}>${Number(o.total).toLocaleString("es-CO")}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── KITCHEN SUPPLY REQUESTS ──────────────────────────────────
const KITCHEN_UNITS = ["kg","g","lb","oz","litros","ml","unidades","cajas","paquetes","docenas"];

function KitchenSupplyPanel() {
  const request = useRequest();
  const { role } = useAuth();
  const isAdmin = ["superadmin","admin"].includes(role);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [note, setNote]         = useState("");
  const [items, setItems]       = useState([{ product_name:"", quantity:"", unit:"kg" }]);
  const [saving, setSaving]     = useState(false);
  const [err, setErr]           = useState("");

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try { setRequests(await request("GET", "/kitchen-requests")); }
    catch(e) { setErr(e.error||"Error"); }
    setLoading(false);
  }

  function addItem() { setItems(i => [...i, { product_name:"", quantity:"", unit:"kg" }]); }
  function removeItem(idx) { setItems(i => i.filter((_,j)=>j!==idx)); }
  function updateItem(idx, key, val) { setItems(i => i.map((x,j)=>j===idx?{...x,[key]:val}:x)); }

  async function submitRequest() {
    const valid = items.filter(i => i.product_name.trim() && i.quantity.trim());
    if (valid.length === 0) { setErr("Agrega al menos un producto con cantidad"); return; }
    setSaving(true); setErr("");
    try {
      await request("POST", "/kitchen-requests", { items: valid, note });
      setShowForm(false); setItems([{ product_name:"", quantity:"", unit:"kg" }]); setNote("");
      await load();
    } catch(e) { setErr(e.error||"Error enviando solicitud"); }
    setSaving(false);
  }

  async function updateStatus(id, status) {
    try { await request("PATCH", `/kitchen-requests/${id}/status`, { status }); await load(); }
    catch(e) { setErr(e.error||"Error"); }
  }

  const statusMap = {
    pending:   { label:"Pendiente",  color:C.yellow, bg:C.yellowBg },
    approved:  { label:"Aprobado",   color:C.green,  bg:C.greenBg },
    rejected:  { label:"Rechazado",  color:C.red,    bg:C.redBg },
    delivered: { label:"Entregado",  color:C.blue,   bg:C.blueBg },
  };

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
        <SectionTitle sub="Solicitudes de insumos y productos para cocina">Solicitudes de Cocina</SectionTitle>
        {!isAdmin && <Btn onClick={()=>setShowForm(!showForm)} variant="granate">+ Nueva solicitud</Btn>}
      </div>
      <ErrMsg msg={err} />

      {showForm && !isAdmin && (
        <Card style={{ marginBottom:20, border:`2px solid ${C.dorado}` }}>
          <p style={{ fontFamily:F.serif, fontWeight:700, fontSize:18, color:C.textDark, margin:"0 0 16px" }}>Nueva solicitud de insumos</p>
          <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:14 }}>
            {items.map((item,idx) => (
              <div key={idx} style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1fr auto", gap:8, alignItems:"center" }}>
                <input value={item.product_name} onChange={e=>updateItem(idx,"product_name",e.target.value)}
                  placeholder="Producto (ej: Café molido)"
                  style={{ padding:"8px 12px", borderRadius:9, border:`1.5px solid ${C.border}`, fontSize:13, fontFamily:F.sans, color:C.textDark, background:C.white }} />
                <input value={item.quantity} onChange={e=>updateItem(idx,"quantity",e.target.value)}
                  placeholder="Cantidad"
                  style={{ padding:"8px 12px", borderRadius:9, border:`1.5px solid ${C.border}`, fontSize:13, fontFamily:F.sans, color:C.textDark, background:C.white }} />
                <select value={item.unit} onChange={e=>updateItem(idx,"unit",e.target.value)}
                  style={{ padding:"8px 12px", borderRadius:9, border:`1.5px solid ${C.border}`, fontSize:13, fontFamily:F.sans, color:C.textDark, background:C.white }}>
                  {KITCHEN_UNITS.map(u => <option key={u}>{u}</option>)}
                </select>
                <button onClick={()=>removeItem(idx)} style={{ padding:"8px 10px", borderRadius:9, border:`1px solid ${C.redBorder}`, background:C.redBg, color:C.red, cursor:"pointer", fontSize:14 }}>✕</button>
              </div>
            ))}
          </div>
          <button onClick={addItem} style={{ fontFamily:F.sans, fontSize:12, color:C.doradoDark, background:"none", border:"none", cursor:"pointer", padding:0, marginBottom:12 }}>+ Agregar producto</button>
          <div>
            <label style={{ fontFamily:F.sans, fontSize:11, color:C.textLight, fontWeight:600, display:"block", marginBottom:4, textTransform:"uppercase", letterSpacing:"0.06em" }}>Nota adicional (opcional)</label>
            <textarea value={note} onChange={e=>setNote(e.target.value)} rows={2} placeholder="Ej: Urgente para el fin de semana..."
              style={{ width:"100%", padding:"9px 12px", borderRadius:9, border:`1.5px solid ${C.border}`, fontSize:13, fontFamily:F.sans, color:C.textDark, background:C.white, resize:"vertical", boxSizing:"border-box" }}/>
          </div>
          <div style={{ display:"flex", gap:8, marginTop:14 }}>
            <Btn onClick={submitRequest} disabled={saving} variant="granate">{saving?"Enviando...":"Enviar solicitud"}</Btn>
            <Btn onClick={()=>setShowForm(false)} variant="secondary">Cancelar</Btn>
          </div>
        </Card>
      )}

      {loading ? <Spinner /> : (
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          {requests.length===0 && <div style={{ textAlign:"center", padding:"3rem", color:C.border, fontFamily:F.sans }}>Sin solicitudes registradas aún</div>}
          {requests.map(req => {
            const s = statusMap[req.status] || statusMap.pending;
            return (
              <Card key={req.id}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:12 }}>
                  <div>
                    <span style={{ fontFamily:F.serif, fontWeight:700, fontSize:17, color:C.textDark }}>Solicitud #{req.id}</span>
                    <span style={{ fontFamily:F.sans, fontSize:11, color:C.textLight, marginLeft:10 }}>{req.created_at}</span>
                  </div>
                  <StatusBadge status={req.status} />
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))", gap:6, marginBottom:12 }}>
                  {(req.items||[]).map((item,i) => (
                    <div key={i} style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 12px", background:C.crema, borderRadius:9 }}>
                      <span style={{ fontFamily:F.sans, fontSize:13, color:C.textDark, fontWeight:500 }}>{item.product_name}</span>
                      <span style={{ fontFamily:F.serif, fontSize:14, fontWeight:700, color:C.granate, marginLeft:"auto" }}>{item.quantity} {item.unit}</span>
                    </div>
                  ))}
                </div>
                {req.note && <p style={{ fontFamily:F.sans, fontSize:12, color:C.textLight, fontStyle:"italic", margin:"0 0 12px", paddingLeft:10, borderLeft:`2px solid ${C.border}` }}>"{req.note}"</p>}
                {isAdmin && req.status==="pending" && (
                  <div style={{ display:"flex", gap:8 }}>
                    <Btn onClick={()=>updateStatus(req.id,"approved")} size="sm" style={{ background:C.greenBg, color:C.green, border:C.greenBorder }}>✓ Aprobar</Btn>
                    <Btn onClick={()=>updateStatus(req.id,"rejected")} size="sm" variant="danger">✕ Rechazar</Btn>
                    <Btn onClick={()=>updateStatus(req.id,"delivered")} size="sm" variant="secondary">📦 Entregado</Btn>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── LEAVE / PERMITS PANEL ────────────────────────────────────
const LEAVE_TYPES = ["Incapacidad médica","Permiso personal","Vacaciones","Calamidad doméstica","Permiso de maternidad/paternidad","Otro"];

function LeavePanel({ employeesList=[] }) {
  const request = useRequest();
  const { role } = useAuth();
  const isAdmin = ["superadmin","admin"].includes(role);
  const [leaves,   setLeaves]   = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form,     setForm]     = useState({ employee_id:"", employee_name:"", type:LEAVE_TYPES[0], reason:"", date_from:"", date_to:"" });
  const [saving,   setSaving]   = useState(false);
  const [err,      setErr]      = useState("");
  const [adminNote,setAdminNote]= useState({});

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try { setLeaves(await request("GET", "/leave-requests")); }
    catch(e) { setErr(e.error||"Error"); }
    setLoading(false);
  }

  async function submit() {
    if (!form.employee_name || !form.reason || !form.date_from || !form.date_to) { setErr("Completa todos los campos"); return; }
    setSaving(true); setErr("");
    try { await request("POST", "/leave-requests", form); setShowForm(false); setForm({ employee_id:"", employee_name:"", type:LEAVE_TYPES[0], reason:"", date_from:"", date_to:"" }); await load(); }
    catch(e) { setErr(e.error||"Error"); }
    setSaving(false);
  }

  async function updateStatus(id, status) {
    try { await request("PATCH", `/leave-requests/${id}/status`, { status, admin_note: adminNote[id]||"" }); await load(); }
    catch(e) { setErr(e.error||"Error"); }
  }

  const pending  = leaves.filter(l=>l.status==="pending");
  const resolved = leaves.filter(l=>l.status!=="pending");

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
        <SectionTitle sub="Solicitudes de incapacidades y permisos del personal">Incapacidades y Permisos</SectionTitle>
        <Btn onClick={()=>setShowForm(!showForm)} variant="granate">+ Nueva solicitud</Btn>
      </div>
      <ErrMsg msg={err} />

      {showForm && (
        <Card style={{ marginBottom:20, border:`2px solid ${C.dorado}` }}>
          <p style={{ fontFamily:F.serif, fontWeight:700, fontSize:18, color:C.textDark, margin:"0 0 16px" }}>Nueva solicitud</p>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            {isAdmin ? (
              <div style={{ gridColumn:"1/-1" }}>
                <label style={{ fontFamily:F.sans, fontSize:11, color:C.textLight, fontWeight:600, display:"block", marginBottom:4, textTransform:"uppercase", letterSpacing:"0.06em" }}>Empleado</label>
                <select value={form.employee_id} onChange={e=>{
                  const emp = employeesList.find(x=>x.id===Number(e.target.value));
                  setForm(f=>({...f, employee_id:e.target.value, employee_name:emp?.name||""}));
                }} style={{ width:"100%", padding:"9px 12px", borderRadius:9, border:`1.5px solid ${C.border}`, fontSize:13, fontFamily:F.sans, color:C.textDark, background:C.white }}>
                  <option value="">Seleccionar empleado...</option>
                  {employeesList.map(e=><option key={e.id} value={e.id}>{e.name} — {e.role}</option>)}
                </select>
              </div>
            ) : (
              <div style={{ gridColumn:"1/-1" }}>
                <label style={{ fontFamily:F.sans, fontSize:11, color:C.textLight, fontWeight:600, display:"block", marginBottom:4, textTransform:"uppercase", letterSpacing:"0.06em" }}>Tu nombre</label>
                <input value={form.employee_name} onChange={e=>setForm(f=>({...f,employee_name:e.target.value}))} placeholder="Nombre completo"
                  style={{ width:"100%", padding:"9px 12px", borderRadius:9, border:`1.5px solid ${C.border}`, fontSize:13, fontFamily:F.sans, color:C.textDark, background:C.white, boxSizing:"border-box" }} />
              </div>
            )}
            <div>
              <label style={{ fontFamily:F.sans, fontSize:11, color:C.textLight, fontWeight:600, display:"block", marginBottom:4, textTransform:"uppercase", letterSpacing:"0.06em" }}>Tipo</label>
              <select value={form.type} onChange={e=>setForm(f=>({...f,type:e.target.value}))}
                style={{ width:"100%", padding:"9px 12px", borderRadius:9, border:`1.5px solid ${C.border}`, fontSize:13, fontFamily:F.sans, color:C.textDark, background:C.white }}>
                {LEAVE_TYPES.map(t=><option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontFamily:F.sans, fontSize:11, color:C.textLight, fontWeight:600, display:"block", marginBottom:4, textTransform:"uppercase", letterSpacing:"0.06em" }}>Motivo</label>
              <input value={form.reason} onChange={e=>setForm(f=>({...f,reason:e.target.value}))} placeholder="Descripción breve"
                style={{ width:"100%", padding:"9px 12px", borderRadius:9, border:`1.5px solid ${C.border}`, fontSize:13, fontFamily:F.sans, color:C.textDark, background:C.white, boxSizing:"border-box" }} />
            </div>
            <div>
              <label style={{ fontFamily:F.sans, fontSize:11, color:C.textLight, fontWeight:600, display:"block", marginBottom:4, textTransform:"uppercase", letterSpacing:"0.06em" }}>Fecha desde</label>
              <input type="date" value={form.date_from} onChange={e=>setForm(f=>({...f,date_from:e.target.value}))}
                style={{ width:"100%", padding:"9px 12px", borderRadius:9, border:`1.5px solid ${C.border}`, fontSize:13, fontFamily:F.sans, color:C.textDark, background:C.white, boxSizing:"border-box" }} />
            </div>
            <div>
              <label style={{ fontFamily:F.sans, fontSize:11, color:C.textLight, fontWeight:600, display:"block", marginBottom:4, textTransform:"uppercase", letterSpacing:"0.06em" }}>Fecha hasta</label>
              <input type="date" value={form.date_to} onChange={e=>setForm(f=>({...f,date_to:e.target.value}))}
                style={{ width:"100%", padding:"9px 12px", borderRadius:9, border:`1.5px solid ${C.border}`, fontSize:13, fontFamily:F.sans, color:C.textDark, background:C.white, boxSizing:"border-box" }} />
            </div>
          </div>
          <div style={{ display:"flex", gap:8, marginTop:16 }}>
            <Btn onClick={submit} disabled={saving} variant="granate">{saving?"Enviando...":"Enviar solicitud"}</Btn>
            <Btn onClick={()=>setShowForm(false)} variant="secondary">Cancelar</Btn>
          </div>
        </Card>
      )}

      {loading ? <Spinner /> : (
        <div>
          {pending.length>0 && (
            <div style={{ marginBottom:24 }}>
              <p style={{ fontFamily:F.sans, fontSize:11, color:C.yellow, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:10 }}>⏳ En espera ({pending.length})</p>
              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                {pending.map(leave => (
                  <Card key={leave.id} style={{ border:`1.5px solid ${C.yellowBorder}` }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
                      <div>
                        <p style={{ margin:0, fontFamily:F.serif, fontWeight:700, fontSize:17, color:C.textDark }}>{leave.employee_name}</p>
                        <Tag color={C.crema} text={C.textMid}>{leave.type}</Tag>
                      </div>
                      <StatusBadge status={leave.status} />
                    </div>
                    <p style={{ fontFamily:F.sans, fontSize:13, color:C.textMid, margin:"0 0 8px" }}>{leave.reason}</p>
                    <p style={{ fontFamily:F.sans, fontSize:12, color:C.textLight, margin:"0 0 12px" }}>📅 {leave.date_from} → {leave.date_to}</p>
                    {isAdmin && (
                      <div>
                        <input value={adminNote[leave.id]||""} onChange={e=>setAdminNote(n=>({...n,[leave.id]:e.target.value}))}
                          placeholder="Nota del administrador (opcional)"
                          style={{ width:"100%", padding:"8px 12px", borderRadius:9, border:`1.5px solid ${C.border}`, fontSize:12, fontFamily:F.sans, color:C.textDark, background:C.white, boxSizing:"border-box", marginBottom:8 }} />
                        <div style={{ display:"flex", gap:8 }}>
                          <Btn onClick={()=>updateStatus(leave.id,"approved")} size="sm" style={{ background:C.greenBg, color:C.green, border:`1px solid ${C.greenBorder}` }}>✓ Aprobar</Btn>
                          <Btn onClick={()=>updateStatus(leave.id,"rejected")} size="sm" variant="danger">✕ Negar</Btn>
                        </div>
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            </div>
          )}
          {resolved.length>0 && (
            <div>
              <p style={{ fontFamily:F.sans, fontSize:11, color:C.textLight, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:10 }}>Historial</p>
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {resolved.map(leave => (
                  <Card key={leave.id} style={{ opacity:0.85 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                      <div>
                        <p style={{ margin:"0 0 2px", fontFamily:F.sans, fontSize:13, fontWeight:600, color:C.textDark }}>{leave.employee_name}</p>
                        <p style={{ margin:0, fontFamily:F.sans, fontSize:12, color:C.textLight }}>{leave.type} · {leave.date_from} → {leave.date_to}</p>
                      </div>
                      <StatusBadge status={leave.status} />
                    </div>
                    {leave.admin_note && <p style={{ margin:"8px 0 0", fontFamily:F.sans, fontSize:12, color:C.textLight, fontStyle:"italic" }}>Nota admin: "{leave.admin_note}"</p>}
                  </Card>
                ))}
              </div>
            </div>
          )}
          {leaves.length===0 && <div style={{ textAlign:"center", padding:"3rem", color:C.border, fontFamily:F.sans }}>Sin solicitudes registradas</div>}
        </div>
      )}
    </div>
  );
}

// ─── EMPLOYEES PANEL ──────────────────────────────────────────
const ROLES_LIST = ["Barista","Cajero","Cocinero","Mesero","Supervisor","Limpieza"];
const AV_COLORS  = [C.granate, C.doradoDark, C.green, "#9333ea", C.terracota, "#0891b2"];

function EmployeesPanel() {
  const request = useRequest();
  const { role } = useAuth();
  const canEdit      = ["superadmin","admin"].includes(role);
  const isSuperAdmin = role==="superadmin";

  const [staff,   setStaff]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter,  setFilter]  = useState("Todos");
  const [editing, setEditing] = useState(null);
  const [form,    setForm]    = useState({});
  const [saving,  setSaving]  = useState(false);
  const [err,     setErr]     = useState("");
  const [rModal,  setRModal]  = useState(null);
  const [rHov,    setRHov]    = useState(0);

  useEffect(()=>{ load(); },[]);
  async function load() {
    setLoading(true);
    try { setStaff(await request("GET","/employees/all")); }
    catch(e){ setErr(e.error||"Error"); }
    setLoading(false);
  }
  async function save() {
    setSaving(true); setErr("");
    try {
      if(editing==="new") await request("POST","/employees",form);
      else                await request("PUT",`/employees/${editing}`,form);
      setEditing(null); await load();
    } catch(e){ setErr(e.errors?.join(", ")||e.error||"Error"); }
    setSaving(false);
  }
  async function toggle(id){ try{ await request("PUT",`/employees/${id}/toggle`); await load(); }catch(e){ setErr(e.error||"Error"); } }
  async function del(id){ if(!confirm("¿Eliminar empleado?")) return; try{ await request("DELETE",`/employees/${id}`); await load(); }catch(e){ setErr(e.error||"Error"); } }
  async function rate(id,stars){
    try{ await fetch(`${API}/employees/${id}/rate`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({stars})}); await load(); }catch(e){}
    setRModal(null); setRHov(0);
  }

  const filtered = staff.filter(e=>filter==="Todos"||e.role===filter);
  const roleCount = ROLES_LIST.reduce((a,r)=>({...a,[r]:staff.filter(e=>e.role===r).length}),{});
  const avgRating = staff.length?(staff.reduce((s,e)=>s+(Number(e.avg_rating)||0),0)/staff.length).toFixed(1):"—";

  if(loading) return <Spinner />;
  return (
    <div>
      <ErrMsg msg={err} />
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))", gap:12, marginBottom:24 }}>
        {[
          { label:"Total",         value:staff.length,                        accent:C.granate },
          { label:"Activos",       value:staff.filter(e=>e.active).length,    accent:C.green },
          { label:"Rating prom.",  value:avgRating+" ★",                      accent:C.dorado },
          { label:"Roles",         value:Object.values(roleCount).filter(v=>v>0).length, accent:C.terracota },
        ].map(s=>(
          <div key={s.label} style={{ background:C.bgCard, borderRadius:14, padding:"16px 18px", borderLeft:`3px solid ${s.accent}`, border:`1px solid ${C.borderLight}`, borderLeftWidth:3, borderLeftColor:s.accent, borderLeftStyle:"solid" }}>
            <p style={{ margin:"0 0 4px", fontFamily:F.sans, fontSize:10, color:C.textLight, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.08em" }}>{s.label}</p>
            <p style={{ margin:0, fontFamily:F.serif, fontSize:24, fontWeight:700, color:C.textDark }}>{s.value}</p>
          </div>
        ))}
      </div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16, flexWrap:"wrap", gap:10 }}>
        <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
          {["Todos",...ROLES_LIST].map(r=>(
            <Pill key={r} active={filter===r} onClick={()=>setFilter(r)}>
              {r}{r!=="Todos"&&roleCount[r]>0?` (${roleCount[r]})` : ""}
            </Pill>
          ))}
        </div>
        {canEdit && <Btn onClick={()=>{ setEditing("new"); setForm({name:"",role:"Barista",since:"",notes:"",active:true}); }} variant="granate">+ Agregar</Btn>}
      </div>

      {editing&&canEdit&&(
        <Card style={{ marginBottom:18, border:`2px solid ${C.dorado}` }}>
          <p style={{ margin:"0 0 16px", fontFamily:F.serif, fontWeight:700, fontSize:18, color:C.textDark }}>{editing==="new"?"Nuevo empleado":"Editar empleado"}</p>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            {[["name","Nombre completo"],["since","Desde (YYYY-MM)"],["notes","Notas"]].map(([k,l])=>(
              <div key={k} style={{ gridColumn:k==="notes"?"1/-1":"auto" }}>
                <label style={{ fontFamily:F.sans, fontSize:11, color:C.textLight, fontWeight:600, display:"block", marginBottom:4, textTransform:"uppercase", letterSpacing:"0.06em" }}>{l}</label>
                <input value={form[k]||""} onChange={e=>setForm(f=>({...f,[k]:e.target.value}))}
                  style={{ width:"100%", padding:"9px 12px", borderRadius:9, border:`1.5px solid ${C.border}`, fontSize:13, fontFamily:F.sans, color:C.textDark, background:C.white, boxSizing:"border-box" }} />
              </div>
            ))}
            <div>
              <label style={{ fontFamily:F.sans, fontSize:11, color:C.textLight, fontWeight:600, display:"block", marginBottom:4, textTransform:"uppercase", letterSpacing:"0.06em" }}>Rol</label>
              <select value={form.role||"Barista"} onChange={e=>setForm(f=>({...f,role:e.target.value}))}
                style={{ width:"100%", padding:"9px 12px", borderRadius:9, border:`1.5px solid ${C.border}`, fontSize:13, fontFamily:F.sans, color:C.textDark, background:C.white }}>
                {ROLES_LIST.map(r=><option key={r}>{r}</option>)}
              </select>
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:8, paddingTop:18 }}>
              <input type="checkbox" id="empAct" checked={form.active!==false} onChange={e=>setForm(f=>({...f,active:e.target.checked}))} style={{ width:16,height:16,accentColor:C.granate,cursor:"pointer" }} />
              <label htmlFor="empAct" style={{ fontFamily:F.sans, fontSize:13, color:C.textMid, cursor:"pointer" }}>Activo</label>
            </div>
          </div>
          <div style={{ display:"flex", gap:8, marginTop:16 }}>
            <Btn onClick={save} disabled={saving} variant="granate">{saving?"Guardando...":"Guardar"}</Btn>
            <Btn onClick={()=>setEditing(null)} variant="secondary">Cancelar</Btn>
          </div>
        </Card>
      )}

      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))", gap:14 }}>
        {filtered.map((emp,idx)=>(
          <div key={emp.id} style={{ background:C.bgCard, borderRadius:16, padding:"18px 20px", border:`1px solid ${C.borderLight}`, opacity:emp.active?1:0.55, transition:"all 0.2s", position:"relative" }}
            onMouseEnter={e=>e.currentTarget.style.boxShadow=`0 4px 20px ${C.dorado}22`}
            onMouseLeave={e=>e.currentTarget.style.boxShadow="none"}>
            {!emp.active&&<div style={{ position:"absolute",top:12,right:12 }}><Tag color={C.redBg} text={C.red}>Inactivo</Tag></div>}
            <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:14 }}>
              <div style={{ width:48,height:48,borderRadius:14,background:AV_COLORS[idx%AV_COLORS.length]+"22",border:`2px solid ${AV_COLORS[idx%AV_COLORS.length]}44`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
                <span style={{ fontFamily:F.sans,fontWeight:700,fontSize:15,color:AV_COLORS[idx%AV_COLORS.length] }}>{emp.avatar||emp.name?.slice(0,2).toUpperCase()}</span>
              </div>
              <div style={{ flex:1,minWidth:0 }}>
                <p style={{ margin:0,fontFamily:F.serif,fontWeight:700,fontSize:18,color:C.textDark,lineHeight:1.1,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>{emp.name}</p>
                <div style={{ display:"flex",alignItems:"center",gap:7,marginTop:4 }}>
                  <Tag color={AV_COLORS[idx%AV_COLORS.length]+"18"} text={AV_COLORS[idx%AV_COLORS.length]}>{emp.role}</Tag>
                  {emp.since&&<span style={{ fontFamily:F.sans,fontSize:11,color:C.textLight }}>desde {emp.since}</span>}
                </div>
              </div>
            </div>
            <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:10 }}>
              <Stars value={emp.avg_rating||0} size={15} />
              <span style={{ fontFamily:F.serif,fontSize:16,fontWeight:700,color:C.textDark }}>{emp.avg_rating>0?Number(emp.avg_rating).toFixed(1):"Sin rating"}</span>
              <span style={{ fontFamily:F.sans,fontSize:11,color:C.textLight }}>({emp.rating_count||0})</span>
              {canEdit&&<button onClick={()=>setRModal(emp)} style={{ marginLeft:"auto",fontFamily:F.sans,fontSize:11,color:C.doradoDark,background:C.doradoLight+"44",border:`1px solid ${C.dorado}44`,borderRadius:99,padding:"3px 10px",cursor:"pointer",fontWeight:600 }}>Calificar</button>}
            </div>
            {emp.notes&&<p style={{ margin:"0 0 14px",fontFamily:F.sans,fontSize:12,color:C.textLight,lineHeight:1.5,fontStyle:"italic",paddingLeft:10,borderLeft:`2px solid ${C.border}` }}>"{emp.notes}"</p>}
            {canEdit&&(
              <div style={{ display:"flex",gap:6,borderTop:`1px solid ${C.borderLight}`,paddingTop:12 }}>
                <button onClick={()=>{ setEditing(emp.id); setForm({...emp}); }} style={{ flex:1,padding:"7px",borderRadius:8,border:`1px solid ${C.border}`,background:C.crema,fontSize:12,cursor:"pointer",fontFamily:F.sans,color:C.textMid,fontWeight:500 }}>✏️ Editar</button>
                <button onClick={()=>toggle(emp.id)} style={{ flex:1,padding:"7px",borderRadius:8,border:`1px solid ${emp.active?C.redBorder:C.greenBorder}`,background:emp.active?C.redBg:C.greenBg,fontSize:12,cursor:"pointer",fontFamily:F.sans,color:emp.active?C.red:C.green,fontWeight:500 }}>{emp.active?"⏸ Desactivar":"▶ Activar"}</button>
                {isSuperAdmin&&<button onClick={()=>del(emp.id)} style={{ padding:"7px 10px",borderRadius:8,border:`1px solid ${C.redBorder}`,background:C.bgCard,fontSize:12,cursor:"pointer",color:C.red }}>🗑️</button>}
              </div>
            )}
          </div>
        ))}
      </div>

      {rModal&&(
        <div onClick={()=>setRModal(null)} style={{ position:"fixed",inset:0,background:"rgba(28,10,4,0.55)",zIndex:300,display:"flex",alignItems:"center",justifyContent:"center",padding:20,backdropFilter:"blur(4px)" }}>
          <div onClick={e=>e.stopPropagation()} style={{ background:C.white,borderRadius:20,padding:"2rem",maxWidth:360,width:"100%",textAlign:"center" }}>
            <div style={{ width:56,height:56,borderRadius:14,background:C.crema,border:`2px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 12px" }}>
              <span style={{ fontFamily:F.sans,fontWeight:700,fontSize:18,color:C.doradoDark }}>{rModal.avatar}</span>
            </div>
            <h3 style={{ margin:"0 0 4px",fontFamily:F.serif,fontWeight:700,fontSize:22,color:C.textDark }}>{rModal.name}</h3>
            <p style={{ margin:"0 0 20px",fontFamily:F.sans,fontSize:12,color:C.textLight }}>{rModal.role}</p>
            <div style={{ display:"flex",justifyContent:"center",gap:8,marginBottom:8 }}>
              {[1,2,3,4,5].map(s=>(
                <span key={s} onMouseEnter={()=>setRHov(s)} onMouseLeave={()=>setRHov(0)} onClick={()=>rate(rModal.id,s)}
                  style={{ fontSize:36,cursor:"pointer",color:s<=(rHov||Math.round(rModal.avg_rating||0))?C.dorado:C.borderLight,transition:"all 0.15s",transform:rHov===s?"scale(1.2)":"scale(1)",display:"inline-block" }}>★</span>
              ))}
            </div>
            {rHov>0&&<p style={{ margin:"0 0 16px",fontFamily:F.sans,fontSize:13,color:C.doradoDark,fontWeight:600 }}>{["","Muy malo","Regular","Bueno","Muy bueno","Excelente"][rHov]}</p>}
            {!rHov&&<div style={{ height:32 }}/>}
            <button onClick={()=>setRModal(null)} style={{ width:"100%",padding:"10px",borderRadius:10,border:`1.5px solid ${C.border}`,background:C.white,fontFamily:F.sans,fontSize:13,cursor:"pointer",color:C.textMid }}>Cancelar</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── SALES DASHBOARD ──────────────────────────────────────────
function BarChart({ data, period }) {
  const [tip, setTip] = useState(null);
  if(!data||data.length===0) return <div style={{ height:180,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:F.sans,fontSize:13,color:C.border }}>Sin ventas registradas aún</div>;
  const W=680,H=190,PAD={top:12,right:20,bottom:34,left:66};
  const cW=W-PAD.left-PAD.right,cH=H-PAD.top-PAD.bottom;
  const maxR=Math.max(...data.map(d=>Number(d.revenue)||0),1);
  const maxO=Math.max(...data.map(d=>Number(d.orders)||0),1);
  const barW=Math.max(4,Math.floor(cW/data.length)-4);
  const gap=(cW-barW*data.length)/(data.length+1);
  const yR=v=>PAD.top+cH-(v/maxR)*cH;
  const yO=v=>PAD.top+cH-(v/maxO)*cH;
  const xB=i=>PAD.left+gap+i*(barW+gap)+barW/2;
  const fmtL=s=>period==="day"?String(s).slice(5):period==="month"?String(s).slice(2,7):String(s);
  const fmtM=v=>v>=1000000?`$${(v/1000000).toFixed(1)}M`:v>=1000?`$${(v/1000).toFixed(0)}k`:`$${v}`;
  const skip=data.length>20?5:data.length>10?2:1;
  return (
    <div style={{ width:"100%", overflowX:"auto" }}>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display:"block" }}>
        {[0,0.25,0.5,0.75,1].map((f,i)=>(
          <g key={i}>
            <line x1={PAD.left} y1={yR(maxR*f)} x2={W-PAD.right} y2={yR(maxR*f)} stroke={C.borderLight} strokeWidth="0.5" strokeDasharray={i===0?"none":"4 3"} />
            <text x={PAD.left-6} y={yR(maxR*f)+4} textAnchor="end" style={{ fontFamily:F.sans,fontSize:9,fill:C.textLight }}>{fmtM(maxR*f)}</text>
          </g>
        ))}
        {[0,0.5,1].map((f,i)=>(
          <text key={i} x={W-PAD.right+5} y={yO(maxO*f)+4} textAnchor="start" style={{ fontFamily:F.sans,fontSize:9,fill:C.terracota,opacity:0.7 }}>{Math.round(maxO*f)}</text>
        ))}
        {data.map((d,i)=>{
          const rev=Number(d.revenue)||0;
          const bH=Math.max(2,(rev/maxR)*cH);
          const y=PAD.top+cH-bH;
          const hov=tip?.i===i;
          return <rect key={i} x={xB(i)-barW/2} y={y} width={barW} height={bH} rx="3" fill={hov?C.granate:C.dorado} opacity={hov?1:0.85} style={{ cursor:"pointer",transition:"fill 0.15s" }} onMouseEnter={()=>setTip({i,d})} onMouseLeave={()=>setTip(null)} />;
        })}
        <polyline points={data.map((d,i)=>`${xB(i)},${yO(Number(d.orders)||0)}`).join(" ")} fill="none" stroke={C.terracota} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" opacity="0.8" />
        {data.map((d,i)=>(
          <circle key={i} cx={xB(i)} cy={yO(Number(d.orders)||0)} r="3" fill={C.terracota} opacity="0.9"
            onMouseEnter={()=>setTip({i,d})} onMouseLeave={()=>setTip(null)} style={{ cursor:"pointer" }} />
        ))}
        {data.map((d,i)=>i%skip===0&&(
          <text key={i} x={xB(i)} y={H-PAD.bottom+14} textAnchor="middle" style={{ fontFamily:F.sans,fontSize:9,fill:C.textLight }}>{fmtL(d.period)}</text>
        ))}
        <line x1={PAD.left} y1={PAD.top+cH} x2={W-PAD.right} y2={PAD.top+cH} stroke={C.border} strokeWidth="1" />
        <line x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={PAD.top+cH} stroke={C.border} strokeWidth="1" />
        {tip&&(()=>{
          const tx=Math.min(xB(tip.i),W-130), ty=Math.max(PAD.top,yR(Number(tip.d.revenue)||0)-60);
          return <g><rect x={tx-2} y={ty} width={130} height={50} rx="6" fill={C.espresso} opacity="0.92" />
            <text x={tx+10} y={ty+15} style={{ fontFamily:F.sans,fontSize:10,fill:C.dorado,fontWeight:"bold" }}>{fmtL(tip.d.period)}</text>
            <text x={tx+10} y={ty+29} style={{ fontFamily:F.sans,fontSize:10,fill:C.crema }}>Ingresos: {fmtM(Number(tip.d.revenue)||0)}</text>
            <text x={tx+10} y={ty+43} style={{ fontFamily:F.sans,fontSize:10,fill:C.terracotaLight }}>Pedidos: {tip.d.orders}</text>
          </g>;
        })()}
      </svg>
      <div style={{ display:"flex",gap:16,justifyContent:"flex-end",marginTop:4,paddingRight:8 }}>
        <div style={{ display:"flex",alignItems:"center",gap:5 }}><div style={{ width:12,height:12,borderRadius:3,background:C.dorado }}/><span style={{ fontFamily:F.sans,fontSize:11,color:C.textLight }}>Ingresos</span></div>
        <div style={{ display:"flex",alignItems:"center",gap:5 }}><div style={{ width:12,height:4,borderRadius:2,background:C.terracota }}/><span style={{ fontFamily:F.sans,fontSize:11,color:C.textLight }}>Pedidos</span></div>
      </div>
    </div>
  );
}

function HBar({ data, valueKey, labelKey, fmt }) {
  if(!data||data.length===0) return <div style={{ fontFamily:F.sans,fontSize:12,color:C.border,textAlign:"center",padding:"20px 0" }}>Sin datos</div>;
  const COLS=[C.granate,C.doradoDark,C.terracota,C.espressoMid,"#9333ea","#0891b2"];
  const maxV=Math.max(...data.map(d=>Number(d[valueKey])||0),1);
  return (
    <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
      {data.map((d,i)=>{
        const v=Number(d[valueKey])||0;
        return (
          <div key={i} style={{ display:"flex",alignItems:"center",gap:10 }}>
            <div style={{ width:22,height:22,borderRadius:6,background:i<3?C.doradoLight:C.crema,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
              <span style={{ fontFamily:F.sans,fontWeight:700,fontSize:10,color:i<3?C.doradoDark:C.textLight }}>{i+1}</span>
            </div>
            <div style={{ flex:1,minWidth:0 }}>
              <div style={{ display:"flex",justifyContent:"space-between",marginBottom:3 }}>
                <span style={{ fontFamily:F.sans,fontSize:12,color:C.textDark,fontWeight:500,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",maxWidth:"60%" }}>
                  {d.emoji?`${d.emoji} `:""}{d[labelKey]}
                </span>
                <span style={{ fontFamily:F.serif,fontSize:13,color:C.textDark,fontWeight:700,whiteSpace:"nowrap" }}>{fmt?fmt(v):v}</span>
              </div>
              <div style={{ height:8,background:C.crema,borderRadius:99,overflow:"hidden" }}>
                <div style={{ height:"100%",width:`${(v/maxV)*100}%`,background:COLS[i%COLS.length],borderRadius:99,transition:"width 0.7s ease" }} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SalesDashboard({ analytics }) {
  const request = useRequest();
  const [period, setPeriod] = useState("day");
  const [sales,  setSales]  = useState(null);
  const [loading,setLoading]= useState(true);
  const [err,    setErr]    = useState("");

  useEffect(()=>{ load(); },[period]);
  async function load() {
    setLoading(true); setErr("");
    try { setSales(await request("GET",`/analytics/sales?period=${period}`)); }
    catch(e){ setErr(e.error||"Error cargando datos"); }
    setLoading(false);
  }

  const fmtK=v=>{ const n=Number(v||0); return n>=1000000?`$${(n/1000000).toFixed(1)}M`:n>=1000?`$${(n/1000).toFixed(0)}k`:`$${n}`; };
  const kpis=sales?.kpis||{};
  const rev=sales?.revenueOverTime||[];
  const PERIOD_LABELS={day:"Últimos 30 días",month:"Últimos 12 meses",year:"Por año"};

  function KpiCard({label,value,sub,accent,icon}){
    return (
      <div style={{ background:C.bgCard,borderRadius:14,padding:"16px 18px",border:`1px solid ${C.borderLight}`,borderTop:`3px solid ${accent}`,position:"relative",overflow:"hidden" }}>
        <div style={{ position:"absolute",top:10,right:14,fontSize:20,opacity:0.1 }}>{icon}</div>
        <p style={{ margin:"0 0 3px",fontFamily:F.sans,fontSize:10,color:C.textLight,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.1em" }}>{label}</p>
        <p style={{ margin:"0 0 4px",fontFamily:F.serif,fontSize:24,fontWeight:700,color:C.textDark,lineHeight:1 }}>{value}</p>
        {sub&&<span style={{ fontFamily:F.sans,fontSize:10,color:C.textLight }}>{sub}</span>}
      </div>
    );
  }

  function ChCard({title,sub,children,full}){
    return (
      <Card style={{ gridColumn:full?"1/-1":"auto" }}>
        <div style={{ marginBottom:14 }}>
          <p style={{ margin:"0 0 2px",fontFamily:F.sans,fontSize:13,fontWeight:600,color:C.textDark }}>{title}</p>
          {sub&&<p style={{ margin:0,fontFamily:F.sans,fontSize:11,color:C.textLight }}>{sub}</p>}
        </div>
        {children}
      </Card>
    );
  }

  return (
    <div>
      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20,flexWrap:"wrap",gap:10 }}>
        <SectionTitle sub={PERIOD_LABELS[period]+" · actualizado en tiempo real"}>Balance de Ventas</SectionTitle>
        <div style={{ display:"flex",gap:4,background:C.crema,borderRadius:10,padding:3 }}>
          {[["day","Diario"],["month","Mensual"],["year","Anual"]].map(([p,l])=>(
            <button key={p} onClick={()=>setPeriod(p)} style={{ padding:"7px 18px",borderRadius:8,border:"none",background:period===p?C.espresso:"transparent",color:period===p?C.crema:C.textMid,fontFamily:F.sans,fontSize:12,fontWeight:period===p?600:400,cursor:"pointer",transition:"all 0.2s" }}>{l}</button>
          ))}
        </div>
      </div>
      <ErrMsg msg={err} />
      {loading?<Spinner/>:(
        <div style={{ display:"flex",flexDirection:"column",gap:14 }}>
          <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(170px,1fr))",gap:12 }}>
            <KpiCard label="Ventas hoy"      value={fmtK(kpis.today)}     sub={`${kpis.ordersToday||0} pedidos`}   accent={C.dorado}    icon="☕" />
            <KpiCard label="Este mes"         value={fmtK(kpis.thisMonth)} sub={`${kpis.ordersMonth||0} pedidos`}   accent={C.granate}   icon="📅" />
            <KpiCard label="Este año"         value={fmtK(kpis.thisYear)}                                            accent={C.green}     icon="📈" />
            <KpiCard label="Ticket promedio"  value={fmtK(kpis.avgTicket)} sub={`Hoy: ${fmtK(kpis.avgTicketToday)}`} accent={C.terracota} icon="🧾" />
            <KpiCard label="Histórico"        value={fmtK(kpis.allTime)}   sub="total acumulado"                    accent={C.espressoMid} icon="💰" />
          </div>
          <div style={{ display:"grid",gridTemplateColumns:"1fr",gap:14 }}>
            <ChCard title={period==="day"?"Ingresos por día":period==="month"?"Ingresos por mes":"Ingresos por año"} sub={`${rev.length} períodos · barras = ingresos (dorado) · línea = pedidos (terracota)`} full>
              <BarChart data={rev} period={period} />
            </ChCard>
          </div>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:14 }}>
            <ChCard title="Ingresos por categoría" sub="Por monto generado">
              <HBar data={sales?.byCategory||[]} valueKey="revenue" labelKey="category" fmt={v=>{ const n=Number(v||0); return n>=1000?`$${(n/1000).toFixed(0)}k`:`$${n}`; }} />
            </ChCard>
            <ChCard title="Productos más vendidos" sub="Por ingresos">
              <HBar data={sales?.topProducts||[]} valueKey="revenue" labelKey="name" fmt={v=>{ const n=Number(v||0); return n>=1000?`$${(n/1000).toFixed(0)}k`:`$${n}`; }} />
            </ChCard>
          </div>
          <ChCard title="Empleados mejor valorados" sub="Por rating de clientes" full>
            <HBar data={(analytics?.top_employees||[]).map(e=>({...e,revenue:e.avg_rating||0}))} valueKey="revenue" labelKey="name" fmt={v=>Number(v).toFixed(1)+" ★"} />
          </ChCard>
          <ChCard title="Ranking de productos por rating" sub="Valoraciones de clientes" full>
            <HBar data={(analytics?.top_items||[]).map(i=>({...i,revenue:i.avg_rating||0}))} valueKey="revenue" labelKey="name" fmt={v=>Number(v).toFixed(1)+" ★"} />
          </ChCard>
        </div>
      )}
    </div>
  );
}

// ─── ADMIN DASHBOARD ──────────────────────────────────────────
function AdminDashboard({ orders, onUpdateStatus }) {
  const request  = useRequest();
  const { role } = useAuth();
  const canEdit    = ["superadmin","admin"].includes(role);
  const isSuperAdmin = role==="superadmin";

  const [tab,       setTab]      = useState("analytics");
  const [menu,      setMenu]     = useState([]);
  const [services,  setServices] = useState([]);
  const [analytics, setAnalytics]= useState(null);
  const [empList,   setEmpList]  = useState([]);
  const [editing,   setEditing]  = useState(null);
  const [form,      setForm]     = useState({});
  const [editSvc,   setEditSvc]  = useState(null);
  const [svcForm,   setSvcForm]  = useState({});
  const [saving,    setSaving]   = useState(false);
  const [err,       setErr]      = useState("");

  useEffect(()=>{ loadAll(); },[]);
  async function loadAll() {
    setErr("");
    try {
      const [m,s,a,e] = await Promise.all([
        request("GET","/menu/all"),
        request("GET","/services"),
        request("GET","/analytics/summary"),
        request("GET","/employees/all"),
      ]);
      setMenu(m); setServices(s); setAnalytics(a); setEmpList(e);
    } catch(e){ setErr(e.error||"Error cargando"); }
  }
  async function saveItem() {
    setSaving(true); setErr("");
    try {
      if(editing==="new") await request("POST","/menu",{...form,category_id:form.category_id||1});
      else                await request("PUT",`/menu/${editing}`,form);
      setEditing(null); await loadAll();
    } catch(e){ setErr(e.errors?.join(", ")||e.error||"Error"); }
    setSaving(false);
  }
  async function toggleItem(id){ try{ await request("PUT",`/menu/${id}/toggle`); await loadAll(); }catch(e){ setErr(e.error||"Error"); } }
  async function delItem(id){ if(!confirm("¿Eliminar?")) return; try{ await request("DELETE",`/menu/${id}`); await loadAll(); }catch(e){ setErr(e.error||"Sin permiso"); } }
  async function saveSvc() {
    setSaving(true); setErr("");
    try {
      if(editSvc==="new") await request("POST","/services",svcForm);
      else                await request("PUT",`/services/${editSvc}`,svcForm);
      setEditSvc(null); await loadAll();
    } catch(e){ setErr(e.errors?.join(", ")||e.error||"Error"); }
    setSaving(false);
  }

  const tabs = [
    {id:"analytics",label:"Analytics",  icon:"📊"},
    {id:"menu",     label:"Menú",        icon:"🍽️"},
    {id:"services", label:"Servicios",   icon:"⚙️"},
    {id:"employees",label:"Empleados",   icon:"👥"},
    {id:"leaves",   label:"Permisos",    icon:"📋"},
    {id:"kitchen",  label:"Cocina",      icon:"👨‍🍳"},
    {id:"supply",   label:"Insumos",     icon:"📦"},
  ];

  return (
    <div>
      <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:16 }}>
        <Tag color={role==="superadmin"?C.doradoLight:C.crema} text={role==="superadmin"?C.doradoDark:C.textMid}>{role}</Tag>
        <span style={{ fontFamily:F.sans,fontSize:11,color:C.textLight }}>
          {role==="superadmin"?"Acceso total":role==="admin"?"Crear y editar":"Solo lectura"}
        </span>
      </div>
      <ErrMsg msg={err} />

      <div style={{ display:"flex",gap:4,marginBottom:24,background:C.crema,borderRadius:12,padding:4,overflowX:"auto" }}>
        {tabs.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{ flex:1,padding:"9px 12px",borderRadius:9,border:"none",background:tab===t.id?C.espresso:"transparent",color:tab===t.id?C.crema:C.textMid,fontSize:12,fontWeight:tab===t.id?600:400,cursor:"pointer",transition:"all 0.2s",fontFamily:F.sans,boxShadow:tab===t.id?`0 1px 4px ${C.espresso}44`:"none",display:"flex",alignItems:"center",justifyContent:"center",gap:5,whiteSpace:"nowrap" }}>
            <span style={{ fontSize:13 }}>{t.icon}</span>{t.label}
          </button>
        ))}
      </div>

      {tab==="analytics"  && <SalesDashboard analytics={analytics} />}
      {tab==="employees"  && <EmployeesPanel />}
      {tab==="leaves"     && <LeavePanel employeesList={empList} />}
      {tab==="kitchen"    && <KitchenView orders={orders} onUpdateStatus={onUpdateStatus} />}
      {tab==="supply"     && <KitchenSupplyPanel />}

      {tab==="menu" && (
        <div>
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18 }}>
            <p style={{ margin:0,fontFamily:F.sans,fontSize:13,color:C.textLight }}>{menu.length} productos</p>
            {canEdit&&<Btn onClick={()=>{ setEditing("new"); setForm({category_id:1,name:"",description:"",price:0,emoji:"☕",available:true,prep_time:5,ingredients:[]}); }} variant="granate">+ Agregar</Btn>}
          </div>
          {editing&&canEdit&&(
            <Card style={{ marginBottom:18,border:`2px solid ${C.dorado}` }}>
              <p style={{ margin:"0 0 16px",fontFamily:F.serif,fontWeight:700,fontSize:18,color:C.textDark }}>{editing==="new"?"Nuevo producto":"Editar producto"}</p>
              <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12 }}>
                {[["name","Nombre"],["emoji","Emoji"],["description","Descripción"],["price","Precio (COP)"],["prep_time","Tiempo (min)"]].map(([k,l])=>(
                  <div key={k} style={{ gridColumn:k==="description"?"1/-1":"auto" }}>
                    <label style={{ fontFamily:F.sans,fontSize:11,color:C.textLight,fontWeight:600,display:"block",marginBottom:4,textTransform:"uppercase",letterSpacing:"0.06em" }}>{l}</label>
                    <input value={form[k]||""} onChange={e=>setForm(f=>({...f,[k]:["price","prep_time"].includes(k)?Number(e.target.value):e.target.value}))}
                      style={{ width:"100%",padding:"9px 12px",borderRadius:9,border:`1.5px solid ${C.border}`,fontSize:13,fontFamily:F.sans,color:C.textDark,background:C.white,boxSizing:"border-box" }} />
                  </div>
                ))}
                <div>
                  <label style={{ fontFamily:F.sans,fontSize:11,color:C.textLight,fontWeight:600,display:"block",marginBottom:4,textTransform:"uppercase",letterSpacing:"0.06em" }}>Categoría</label>
                  <select value={form.category_id||1} onChange={e=>setForm(f=>({...f,category_id:Number(e.target.value)}))}
                    style={{ width:"100%",padding:"9px 12px",borderRadius:9,border:`1.5px solid ${C.border}`,fontSize:13,fontFamily:F.sans,color:C.textDark,background:C.white }}>
                    <option value={1}>Cafés</option><option value={2}>Alimentos</option><option value={3}>Especiales</option><option value={4}>No Cafés</option>
                  </select>
                </div>
                <div style={{ display:"flex",alignItems:"center",gap:8,paddingTop:18 }}>
                  <input type="checkbox" id="avail" checked={form.available||false} onChange={e=>setForm(f=>({...f,available:e.target.checked}))} style={{ width:16,height:16,accentColor:C.granate,cursor:"pointer" }} />
                  <label htmlFor="avail" style={{ fontFamily:F.sans,fontSize:13,color:C.textMid,cursor:"pointer" }}>Disponible</label>
                </div>
              </div>
              <div style={{ display:"flex",gap:8,marginTop:16 }}>
                <Btn onClick={saveItem} disabled={saving} variant="granate">{saving?"Guardando...":"Guardar"}</Btn>
                <Btn onClick={()=>setEditing(null)} variant="secondary">Cancelar</Btn>
              </div>
            </Card>
          )}
          <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
            {menu.map(item=>(
              <div key={item.id} style={{ display:"flex",alignItems:"center",gap:14,padding:"12px 16px",background:C.bgCard,borderRadius:12,border:`1px solid ${C.borderLight}`,opacity:item.available?1:0.5 }}>
                <span style={{ fontSize:22 }}>{item.emoji}</span>
                <div style={{ flex:1 }}>
                  <p style={{ margin:0,fontFamily:F.sans,fontSize:13,fontWeight:600,color:C.textDark }}>{item.name} <span style={{ fontSize:11,color:C.textLight,fontWeight:400 }}>· {item.category}</span></p>
                  <div style={{ display:"flex",alignItems:"center",gap:8,marginTop:3 }}>
                    <Stars value={item.avg_rating||0} size={12} />
                    <span style={{ fontFamily:F.sans,fontSize:11,color:C.textLight }}>{Number(item.avg_rating||0).toFixed(1)} ({item.rating_count})</span>
                    <span style={{ fontFamily:F.serif,fontSize:14,fontWeight:600,color:C.granate }}>${Number(item.price).toLocaleString("es-CO")}</span>
                  </div>
                </div>
                {canEdit&&<>
                  <button onClick={()=>toggleItem(item.id)} style={{ padding:"5px 12px",borderRadius:99,border:`1.5px solid ${item.available?C.greenBorder:C.border}`,background:item.available?C.greenBg:C.crema,color:item.available?C.green:C.textLight,fontSize:11,cursor:"pointer",fontFamily:F.sans,fontWeight:600 }}>{item.available?"Activo":"Inactivo"}</button>
                  <button onClick={()=>{ setEditing(item.id); setForm({...item}); }} style={{ padding:"6px 12px",borderRadius:9,border:`1px solid ${C.border}`,background:C.crema,fontSize:13,cursor:"pointer",color:C.textMid }}>✏️</button>
                  {isSuperAdmin&&<button onClick={()=>delItem(item.id)} style={{ padding:"6px 12px",borderRadius:9,border:`1px solid ${C.redBorder}`,background:C.bgCard,fontSize:13,cursor:"pointer",color:C.red }}>🗑️</button>}
                </>}
              </div>
            ))}
          </div>
        </div>
      )}

      {tab==="services"&&(
        <div>
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18 }}>
            <p style={{ margin:0,fontFamily:F.sans,fontSize:13,color:C.textLight }}>{services.length} servicios</p>
            {canEdit&&<Btn onClick={()=>{ setEditSvc("new"); setSvcForm({icon:"✨",title:"",description:""}); }} variant="granate">+ Agregar</Btn>}
          </div>
          {editSvc&&canEdit&&(
            <Card style={{ marginBottom:16,border:`2px solid ${C.dorado}` }}>
              <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10 }}>
                {[["icon","Icono"],["title","Título"],["description","Descripción"]].map(([k,l])=>(
                  <div key={k} style={{ gridColumn:k==="description"?"1/-1":"auto" }}>
                    <label style={{ fontFamily:F.sans,fontSize:11,color:C.textLight,fontWeight:600,display:"block",marginBottom:4,textTransform:"uppercase",letterSpacing:"0.06em" }}>{l}</label>
                    <input value={svcForm[k]||""} onChange={e=>setSvcForm(f=>({...f,[k]:e.target.value}))}
                      style={{ width:"100%",padding:"9px 12px",borderRadius:9,border:`1.5px solid ${C.border}`,fontSize:13,fontFamily:F.sans,color:C.textDark,background:C.white,boxSizing:"border-box" }} />
                  </div>
                ))}
              </div>
              <div style={{ display:"flex",gap:8,marginTop:14 }}>
                <Btn onClick={saveSvc} disabled={saving} variant="granate">{saving?"Guardando...":"Guardar"}</Btn>
                <Btn onClick={()=>setEditSvc(null)} variant="secondary">Cancelar</Btn>
              </div>
            </Card>
          )}
          <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(250px,1fr))",gap:12 }}>
            {services.map(svc=>(
              <Card key={svc.id}>
                <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start" }}>
                  <span style={{ fontSize:28 }}>{svc.icon}</span>
                  {canEdit&&<div style={{ display:"flex",gap:4 }}>
                    <button onClick={()=>{ setEditSvc(svc.id); setSvcForm({...svc}); }} style={{ padding:"4px 10px",borderRadius:7,border:`1px solid ${C.border}`,background:C.crema,fontSize:12,cursor:"pointer" }}>✏️</button>
                    {isSuperAdmin&&<button onClick={async()=>{ await request("DELETE",`/services/${svc.id}`); await loadAll(); }} style={{ padding:"4px 10px",borderRadius:7,border:`1px solid ${C.redBorder}`,background:C.bgCard,fontSize:12,cursor:"pointer",color:C.red }}>🗑️</button>}
                  </div>}
                </div>
                <p style={{ margin:"10px 0 5px",fontFamily:F.sans,fontWeight:600,fontSize:14,color:C.textDark }}>{svc.title}</p>
                <p style={{ margin:0,fontFamily:F.sans,fontSize:12,color:C.textLight,lineHeight:1.6 }}>{svc.description}</p>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── KITCHEN DASHBOARD ────────────────────────────────────────
function KitchenDashboard({ orders, onUpdateStatus }) {
  const [tab, setTab] = useState("orders");
  const tabs = [
    {id:"orders", label:"Pedidos",   icon:"🍽️"},
    {id:"supply", label:"Insumos",   icon:"📦"},
    {id:"leaves", label:"Permisos",  icon:"📋"},
  ];
  return (
    <div>
      <div style={{ display:"flex",gap:4,marginBottom:24,background:C.crema,borderRadius:12,padding:4,overflowX:"auto" }}>
        {tabs.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{ flex:1,padding:"9px 14px",borderRadius:9,border:"none",background:tab===t.id?C.espresso:"transparent",color:tab===t.id?C.crema:C.textMid,fontSize:13,fontWeight:tab===t.id?600:400,cursor:"pointer",transition:"all 0.2s",fontFamily:F.sans,display:"flex",alignItems:"center",justifyContent:"center",gap:6,whiteSpace:"nowrap" }}>
            <span>{t.icon}</span>{t.label}
          </button>
        ))}
      </div>
      {tab==="orders" && <KitchenView orders={orders} onUpdateStatus={onUpdateStatus} />}
      {tab==="supply" && <KitchenSupplyPanel />}
      {tab==="leaves" && <LeavePanel />}
    </div>
  );
}

// ─── CUSTOMER VIEW ────────────────────────────────────────────
function CustomerView({ onPlaceOrder }) {
  const [menu,     setMenu]     = useState([]);
  const [services, setServices] = useState([]);
  const [staff,    setStaff]    = useState([]);
  const [cat,      setCat]      = useState("Todos");
  const [cart,     setCart]     = useState([]);
  const [tableNum, setTableNum] = useState("");
  const [view,     setView]     = useState("menu");
  const [detail,   setDetail]   = useState(null);
  const [notes,    setNotes]    = useState({});
  const [noteFor,  setNoteFor]  = useState(null);
  const [search,   setSearch]   = useState("");
  const [ordered,  setOrdered]  = useState(false);
  const [loading,  setLoading]  = useState(true);
  const [sRModal,  setSRModal]  = useState(null);
  const [sRDone,   setSRDone]   = useState({});
  const [sRHov,    setSRHov]    = useState(0);

  useEffect(()=>{
    Promise.all([
      fetch(`${API}/menu`).then(r=>r.json()),
      fetch(`${API}/services`).then(r=>r.json()),
      fetch(`${API}/employees`).then(r=>r.json()),
    ]).then(([m,s,e])=>{ setMenu(m); setServices(s); setStaff(e); setLoading(false); })
      .catch(()=>setLoading(false));
  },[]);

  const categories=["Todos",...new Set(menu.map(i=>i.category).filter(Boolean))];
  const filtered=menu.filter(i=>cat==="Todos"||i.category===cat).filter(i=>i.name.toLowerCase().includes(search.toLowerCase()));
  const cartTotal=cart.reduce((s,c)=>s+(menu.find(m=>m.id===c.id)?.price||0)*c.qty,0);
  const cartCount=cart.reduce((s,c)=>s+c.qty,0);

  function addToCart(id){ setCart(c=>{ const ex=c.find(x=>x.id===id); return ex?c.map(x=>x.id===id?{...x,qty:x.qty+1}:x):[...c,{id,qty:1}]; }); }
  function removeFromCart(id){ setCart(c=>c.map(x=>x.id===id?{...x,qty:x.qty-1}:x).filter(x=>x.qty>0)); }

  async function submitOrder() {
    if(!tableNum) return;
    const items=cart.map(c=>({ id:c.id,name:menu.find(m=>m.id===c.id)?.name,qty:c.qty,note:notes[c.id]||"",price:menu.find(m=>m.id===c.id)?.price||0 }));
    await onPlaceOrder({ table_number:tableNum, items });
    setOrdered(true); setCart([]);
  }

  async function rateItem(id,stars) {
    await fetch(`${API}/menu/${id}/rate`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({stars})});
    const upd=await fetch(`${API}/menu`).then(r=>r.json());
    setMenu(upd); if(detail?.id===id) setDetail(upd.find(i=>i.id===id));
  }

  async function rateEmployee(id,stars) {
    await fetch(`${API}/employees/${id}/rate`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({stars})});
    const upd=await fetch(`${API}/employees`).then(r=>r.json());
    setStaff(upd); setSRDone(d=>({...d,[id]:true})); setSRModal(null); setSRHov(0);
  }

  if(loading) return <Spinner />;

  if(ordered) return (
    <div style={{ textAlign:"center",padding:"4rem 1rem" }}>
      <div style={{ fontSize:60,marginBottom:16 }}>🎉</div>
      <h2 style={{ margin:"0 0 10px",fontFamily:F.serif,fontSize:32,color:C.textDark,fontWeight:700 }}>¡Pedido enviado!</h2>
      <p style={{ fontFamily:F.sans,color:C.textLight,fontSize:15,marginBottom:8 }}>Tu pedido llegó directamente a la cocina.</p>
      <p style={{ fontFamily:F.sans,color:C.border,fontSize:13,marginBottom:28 }}>Mesa #{tableNum} · El equipo lo está preparando</p>
      <Btn onClick={()=>{ setOrdered(false); setView("menu"); setTableNum(""); }} variant="granate" size="lg">Hacer otro pedido</Btn>
    </div>
  );

  return (
    <div>
      <div style={{ display:"flex",gap:6,marginBottom:20,overflowX:"auto",paddingBottom:2 }}>
        {[{id:"menu",label:"🍽️  Menú"},{id:"equipo",label:"⭐  Nuestro Equipo"},{id:"services",label:"✨  Servicios"},{id:"cart",label:`🛒  Carrito${cartCount>0?` (${cartCount})`:""}`}].map(t=>(
          <Pill key={t.id} active={view===t.id} onClick={()=>setView(t.id)} color={C.granate}>{t.label}</Pill>
        ))}
      </div>

      {view==="menu" && (
        <div>
          <div style={{ position:"relative",marginBottom:16 }}>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar en el menú..."
              style={{ width:"100%",padding:"11px 16px 11px 42px",borderRadius:12,border:`1.5px solid ${C.border}`,fontSize:14,boxSizing:"border-box",fontFamily:F.sans,background:C.white,color:C.textDark,outline:"none" }} />
            <span style={{ position:"absolute",left:14,top:"50%",transform:"translateY(-50%)",fontSize:16,opacity:0.4 }}>🔍</span>
          </div>
          <div style={{ display:"flex",gap:6,marginBottom:20,overflowX:"auto",paddingBottom:4 }}>
            {categories.map(c=><Pill key={c} active={cat===c} onClick={()=>setCat(c)} color={C.granate}>{c}</Pill>)}
          </div>
          <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(270px,1fr))",gap:14 }}>
            {filtered.map(item=>{
              const inCart=cart.find(c=>c.id===item.id);
              return (
                <div key={item.id} style={{ background:C.bgCard,borderRadius:16,border:`1px solid ${C.borderLight}`,overflow:"hidden",transition:"box-shadow 0.2s" }}
                  onMouseEnter={e=>e.currentTarget.style.boxShadow=`0 4px 20px ${C.dorado}33`}
                  onMouseLeave={e=>e.currentTarget.style.boxShadow="none"}>
                  <div onClick={()=>setDetail(item)} style={{ padding:"18px 18px 0",cursor:"pointer" }}>
                    <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10 }}>
                      <span style={{ fontSize:36 }}>{item.emoji}</span>
                      <Tag color={C.crema} text={C.textMid}>{item.category}</Tag>
                    </div>
                    <p style={{ margin:"0 0 5px",fontFamily:F.serif,fontWeight:700,fontSize:18,color:C.textDark,lineHeight:1.2 }}>{item.name}</p>
                    <p style={{ margin:"0 0 10px",fontFamily:F.sans,fontSize:12,color:C.textLight,lineHeight:1.6 }}>{item.description}</p>
                    <div style={{ display:"flex",alignItems:"center",gap:6,marginBottom:14 }}>
                      <Stars value={item.avg_rating||0} size={13} />
                      <span style={{ fontFamily:F.sans,fontSize:11,color:C.textLight }}>{Number(item.avg_rating||0).toFixed(1)} · {item.rating_count} reseñas</span>
                      {item.prep_time>0&&<span style={{ fontFamily:F.sans,fontSize:11,color:C.border,marginLeft:"auto" }}>⏱ {item.prep_time} min</span>}
                    </div>
                  </div>
                  <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 18px",borderTop:`1px solid ${C.borderLight}` }}>
                    <span style={{ fontFamily:F.serif,fontWeight:700,fontSize:20,color:C.granate }}>${Number(item.price).toLocaleString("es-CO")}</span>
                    {inCart ? (
                      <div style={{ display:"flex",alignItems:"center",gap:10 }}>
                        <button onClick={()=>removeFromCart(item.id)} style={{ width:30,height:30,borderRadius:99,border:`1.5px solid ${C.border}`,background:C.white,cursor:"pointer",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center",color:C.textMid }}>−</button>
                        <span style={{ fontFamily:F.sans,fontWeight:700,fontSize:14,minWidth:18,textAlign:"center",color:C.textDark }}>{inCart.qty}</span>
                        <button onClick={()=>addToCart(item.id)} style={{ width:30,height:30,borderRadius:99,border:"none",background:C.granate,color:C.crema,cursor:"pointer",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center" }}>+</button>
                      </div>
                    ) : (
                      <Btn onClick={()=>addToCart(item.id)} variant="granate" size="sm">Agregar</Btn>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {view==="equipo" && (
        <div>
          <SectionTitle sub="Conoce a las personas detrás de cada taza · Deja tu valoración">Nuestro Equipo</SectionTitle>
          <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:16 }}>
            {staff.map((emp,idx)=>{
              const color=AV_COLORS[idx%AV_COLORS.length];
              const done=sRDone[emp.id];
              return (
                <div key={emp.id} style={{ background:C.bgCard,borderRadius:18,border:`1px solid ${C.borderLight}`,overflow:"hidden",transition:"box-shadow 0.2s" }}
                  onMouseEnter={e=>e.currentTarget.style.boxShadow=`0 6px 24px ${C.dorado}22`}
                  onMouseLeave={e=>e.currentTarget.style.boxShadow="none"}>
                  <div style={{ height:6,background:color+"60" }}/>
                  <div style={{ padding:"20px 20px 0" }}>
                    <div style={{ display:"flex",alignItems:"center",gap:14,marginBottom:14 }}>
                      <div style={{ width:54,height:54,borderRadius:16,background:color+"18",border:`2px solid ${color}40`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
                        <span style={{ fontFamily:F.sans,fontWeight:700,fontSize:18,color }}>{emp.avatar||emp.name?.slice(0,2).toUpperCase()}</span>
                      </div>
                      <div style={{ flex:1,minWidth:0 }}>
                        <p style={{ margin:0,fontFamily:F.serif,fontWeight:700,fontSize:19,color:C.textDark,lineHeight:1.1 }}>{emp.name}</p>
                        <Tag color={color+"18"} text={color}>{emp.role}</Tag>
                      </div>
                    </div>
                    <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:12 }}>
                      <Stars value={emp.avg_rating||0} size={15} />
                      <span style={{ fontFamily:F.serif,fontSize:17,fontWeight:700,color:C.textDark }}>{emp.avg_rating>0?Number(emp.avg_rating).toFixed(1):"Sin valoraciones"}</span>
                      <span style={{ fontFamily:F.sans,fontSize:11,color:C.textLight }}>({emp.rating_count||0})</span>
                    </div>
                    {emp.notes&&<p style={{ margin:"0 0 16px",fontFamily:F.sans,fontSize:12,color:C.textLight,lineHeight:1.6,fontStyle:"italic",paddingLeft:10,borderLeft:`2px solid ${C.border}` }}>"{emp.notes}"</p>}
                  </div>
                  <div style={{ padding:"0 20px 18px" }}>
                    {done ? (
                      <div style={{ display:"flex",alignItems:"center",gap:8,padding:"10px 14px",background:C.greenBg,borderRadius:10,border:`1px solid ${C.greenBorder}` }}>
                        <span style={{ fontSize:14 }}>✅</span>
                        <span style={{ fontFamily:F.sans,fontSize:12,color:C.green,fontWeight:600 }}>¡Gracias! Valoración registrada</span>
                      </div>
                    ) : (
                      <button onClick={()=>{ setSRModal(emp); setSRHov(0); }}
                        style={{ width:"100%",padding:"10px",borderRadius:10,border:`1.5px solid ${color}40`,background:color+"0d",color,fontFamily:F.sans,fontSize:13,fontWeight:600,cursor:"pointer",letterSpacing:"0.04em",transition:"all 0.2s",display:"flex",alignItems:"center",justifyContent:"center",gap:7 }}>
                        ★ Valorar a {emp.name.split(" ")[0]}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {sRModal&&(
            <div onClick={()=>setSRModal(null)} style={{ position:"fixed",inset:0,background:"rgba(28,10,4,0.55)",zIndex:300,display:"flex",alignItems:"center",justifyContent:"center",padding:20,backdropFilter:"blur(6px)" }}>
              <div onClick={e=>e.stopPropagation()} style={{ background:C.white,borderRadius:22,padding:"2.5rem",maxWidth:380,width:"100%",textAlign:"center" }}>
                {(()=>{ const idx=staff.findIndex(e=>e.id===sRModal.id); const color=AV_COLORS[idx%AV_COLORS.length]; return (
                  <div style={{ width:70,height:70,borderRadius:20,background:color+"18",border:`2px solid ${color}40`,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 14px" }}>
                    <span style={{ fontFamily:F.sans,fontWeight:700,fontSize:22,color }}>{sRModal.avatar}</span>
                  </div>
                );})()}
                <h3 style={{ margin:"0 0 4px",fontFamily:F.serif,fontWeight:700,fontSize:26,color:C.textDark }}>{sRModal.name}</h3>
                <p style={{ margin:"0 0 6px",fontFamily:F.sans,fontSize:12,color:C.textLight }}>{sRModal.role}</p>
                <div style={{ height:1,background:C.borderLight,margin:"16px 0" }}/>
                <p style={{ margin:"0 0 14px",fontFamily:F.sans,fontSize:13,color:C.textMid,fontWeight:500 }}>¿Cómo fue tu experiencia con {sRModal.name.split(" ")[0]}?</p>
                <div style={{ display:"flex",justifyContent:"center",gap:8,marginBottom:10 }}>
                  {[1,2,3,4,5].map(s=>(
                    <span key={s} onMouseEnter={()=>setSRHov(s)} onMouseLeave={()=>setSRHov(0)} onClick={()=>rateEmployee(sRModal.id,s)}
                      style={{ fontSize:40,cursor:"pointer",color:s<=(sRHov||Math.round(sRModal.avg_rating||0))?C.dorado:C.borderLight,transition:"all 0.15s",transform:sRHov===s?"scale(1.2)":"scale(1)",display:"inline-block" }}>★</span>
                  ))}
                </div>
                {sRHov>0&&<p style={{ margin:"0 0 16px",fontFamily:F.sans,fontSize:13,color:C.doradoDark,fontWeight:600 }}>{["","Muy malo 😕","Regular 😐","Bueno 🙂","Muy bueno 😊","Excelente ⭐"][sRHov]}</p>}
                {!sRHov&&<div style={{ height:36 }}/>}
                <button onClick={()=>setSRModal(null)} style={{ width:"100%",padding:"11px",borderRadius:11,border:`1.5px solid ${C.border}`,background:C.white,fontFamily:F.sans,fontSize:13,cursor:"pointer",color:C.textMid }}>Cancelar</button>
              </div>
            </div>
          )}
        </div>
      )}

      {view==="services" && (
        <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(250px,1fr))",gap:14 }}>
          {services.map(svc=>(
            <Card key={svc.id} style={{ textAlign:"center" }}>
              <div style={{ fontSize:38,marginBottom:12 }}>{svc.icon}</div>
              <p style={{ margin:"0 0 8px",fontFamily:F.serif,fontWeight:700,fontSize:18,color:C.textDark }}>{svc.title}</p>
              <p style={{ margin:0,fontFamily:F.sans,fontSize:13,color:C.textLight,lineHeight:1.6 }}>{svc.description}</p>
            </Card>
          ))}
        </div>
      )}

      {view==="cart" && (
        <div>
          {cart.length===0 ? (
            <div style={{ textAlign:"center",padding:"4rem 2rem",color:C.border }}>
              <div style={{ fontSize:52,marginBottom:12,opacity:0.5 }}>🛒</div>
              <p style={{ margin:"0 0 16px",fontFamily:F.serif,fontSize:22,color:C.textLight }}>Tu carrito está vacío</p>
              <Btn onClick={()=>setView("menu")} variant="secondary">Ver menú</Btn>
            </div>
          ) : (
            <div style={{ display:"grid",gridTemplateColumns:"1fr 300px",gap:20,alignItems:"start" }}>
              <div>
                <p style={{ fontFamily:F.serif,fontWeight:700,fontSize:22,color:C.textDark,margin:"0 0 16px" }}>Tu pedido</p>
                {cart.map(c=>{ const item=menu.find(m=>m.id===c.id); if(!item) return null; return (
                  <Card key={c.id} style={{ marginBottom:10 }}>
                    <div style={{ display:"flex",alignItems:"center",gap:12 }}>
                      <span style={{ fontSize:22 }}>{item.emoji}</span>
                      <div style={{ flex:1 }}>
                        <p style={{ margin:0,fontFamily:F.sans,fontSize:14,fontWeight:600,color:C.textDark }}>{item.name}</p>
                        <p style={{ margin:0,fontFamily:F.serif,fontSize:15,color:C.granate }}>${(item.price*c.qty).toLocaleString("es-CO")}</p>
                      </div>
                      <div style={{ display:"flex",alignItems:"center",gap:8 }}>
                        <button onClick={()=>removeFromCart(c.id)} style={{ width:28,height:28,borderRadius:99,border:`1.5px solid ${C.border}`,background:C.white,cursor:"pointer",fontSize:15,display:"flex",alignItems:"center",justifyContent:"center",color:C.textMid }}>−</button>
                        <span style={{ fontFamily:F.sans,fontWeight:700,fontSize:14,minWidth:18,textAlign:"center",color:C.textDark }}>{c.qty}</span>
                        <button onClick={()=>addToCart(c.id)} style={{ width:28,height:28,borderRadius:99,border:"none",background:C.espresso,color:C.crema,cursor:"pointer",fontSize:15,display:"flex",alignItems:"center",justifyContent:"center" }}>+</button>
                      </div>
                    </div>
                    {noteFor===c.id ? (
                      <div style={{ marginTop:10 }}>
                        <input value={notes[c.id]||""} onChange={e=>setNotes(n=>({...n,[c.id]:e.target.value}))} placeholder="Ej: sin azúcar..." autoFocus
                          style={{ width:"100%",padding:"8px 12px",borderRadius:9,border:`1.5px solid ${C.border}`,fontSize:13,boxSizing:"border-box",fontFamily:F.sans,color:C.textDark,background:C.white }} />
                        <button onClick={()=>setNoteFor(null)} style={{ marginTop:5,fontFamily:F.sans,fontSize:12,color:C.textLight,background:"none",border:"none",cursor:"pointer" }}>✓ Guardar nota</button>
                      </div>
                    ) : (
                      <button onClick={()=>setNoteFor(c.id)} style={{ marginTop:6,fontFamily:F.sans,fontSize:12,color:C.textLight,background:"none",border:"none",cursor:"pointer",padding:0 }}>
                        {notes[c.id]?`📝 "${notes[c.id]}"`:"+  Nota especial"}
                      </button>
                    )}
                  </Card>
                );})}
              </div>
              <div style={{ position:"sticky",top:80 }}>
                <Card>
                  <p style={{ fontFamily:F.serif,fontWeight:700,fontSize:20,color:C.textDark,margin:"0 0 16px" }}>Resumen</p>
                  {cart.map(c=>{ const item=menu.find(m=>m.id===c.id); return item&&(<div key={c.id} style={{ display:"flex",justifyContent:"space-between",fontFamily:F.sans,fontSize:13,color:C.textLight,marginBottom:7 }}><span>{c.qty}× {item.name}</span><span>${(item.price*c.qty).toLocaleString("es-CO")}</span></div>); })}
                  <div style={{ borderTop:`1px solid ${C.borderLight}`,paddingTop:14,marginTop:10,display:"flex",justifyContent:"space-between",marginBottom:18 }}>
                    <span style={{ fontFamily:F.sans,fontWeight:600,fontSize:14,color:C.textDark }}>Total</span>
                    <span style={{ fontFamily:F.serif,fontWeight:700,fontSize:22,color:C.granate }}>${cartTotal.toLocaleString("es-CO")}</span>
                  </div>
                  <div style={{ marginBottom:14 }}>
                    <label style={{ fontFamily:F.sans,fontSize:11,color:C.textLight,fontWeight:600,display:"block",marginBottom:5,textTransform:"uppercase",letterSpacing:"0.06em" }}>Número de mesa *</label>
                    <input type="number" value={tableNum} onChange={e=>setTableNum(e.target.value)} placeholder="Ej: 5"
                      style={{ width:"100%",padding:"10px 14px",borderRadius:10,border:`1.5px solid ${!tableNum?C.red:C.border}`,fontSize:15,boxSizing:"border-box",fontFamily:F.sans,color:C.textDark,background:C.white }} />
                  </div>
                  <Btn onClick={submitOrder} disabled={!tableNum} variant="granate" full>Enviar a cocina 🚀</Btn>
                </Card>
              </div>
            </div>
          )}
        </div>
      )}

      {detail && (
        <div onClick={()=>setDetail(null)} style={{ position:"fixed",inset:0,background:"rgba(28,10,4,0.5)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:20,backdropFilter:"blur(4px)" }}>
          <div onClick={e=>e.stopPropagation()} style={{ background:C.white,borderRadius:22,padding:"1.75rem",maxWidth:460,width:"100%",maxHeight:"85vh",overflowY:"auto",animation:"slideIn 0.25s ease" }}>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14 }}>
              <div>
                <span style={{ fontSize:44 }}>{detail.emoji}</span>
                <h3 style={{ margin:"10px 0 6px",fontFamily:F.serif,fontSize:26,fontWeight:700,color:C.textDark,lineHeight:1.1 }}>{detail.name}</h3>
                <Tag color={C.crema} text={C.textMid}>{detail.category}</Tag>
              </div>
              <button onClick={()=>setDetail(null)} style={{ border:"none",background:C.crema,borderRadius:99,width:34,height:34,cursor:"pointer",fontSize:16,color:C.textMid,flexShrink:0 }}>✕</button>
            </div>
            <p style={{ fontFamily:F.sans,fontSize:14,color:C.textMid,lineHeight:1.7,marginBottom:16 }}>{detail.description}</p>
            {(detail.ingredients||[]).length>0&&(
              <div style={{ marginBottom:16 }}>
                <p style={{ fontFamily:F.sans,fontSize:11,fontWeight:600,color:C.textLight,textTransform:"uppercase",letterSpacing:"0.1em",margin:"0 0 8px" }}>Ingredientes</p>
                <div style={{ display:"flex",flexWrap:"wrap",gap:6 }}>{detail.ingredients.map((ing,i)=><Tag key={i} color={C.crema} text={C.textMid}>{ing}</Tag>)}</div>
              </div>
            )}
            <div style={{ display:"flex",alignItems:"center",gap:12,padding:"14px 0",borderTop:`1px solid ${C.borderLight}`,borderBottom:`1px solid ${C.borderLight}`,marginBottom:16 }}>
              <Stars value={detail.avg_rating||0} size={20} />
              <span style={{ fontFamily:F.serif,fontWeight:700,fontSize:22,color:C.textDark }}>{Number(detail.avg_rating||0).toFixed(1)}</span>
              <span style={{ fontFamily:F.sans,fontSize:12,color:C.textLight }}>{detail.rating_count} valoraciones</span>
            </div>
            <p style={{ fontFamily:F.sans,fontSize:11,fontWeight:600,color:C.textLight,textTransform:"uppercase",letterSpacing:"0.1em",margin:"0 0 10px" }}>Tu valoración</p>
            <Stars value={0} size={30} interactive onRate={r=>rateItem(detail.id,r)} />
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:20 }}>
              <span style={{ fontFamily:F.serif,fontWeight:700,fontSize:26,color:C.granate }}>${Number(detail.price).toLocaleString("es-CO")}</span>
              <Btn onClick={()=>{ addToCart(detail.id); setDetail(null); }} variant="granate">Agregar al carrito</Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── ROOT APP ─────────────────────────────────────────────────
function AppContent() {
  const { token, role, user, login, logout, request } = useAuth();
  const [orders,     setOrders]    = useState([]);
  const [appView,    setAppView]   = useState("customer");
  const [loginForm,  setLoginForm] = useState({ user:"", pass:"" });
  const [loginError, setLoginError]= useState("");

  useEffect(()=>{
    const ws = new WebSocket(WS_URL);
    ws.onmessage = e => {
      const { type, data } = JSON.parse(e.data);
      if(type==="NEW_ORDER")    setOrders(prev=>[data,...prev]);
      if(type==="ORDER_STATUS") setOrders(prev=>prev.map(o=>o.id===data.id?{...o,status:data.status}:o));
    };
    ws.onerror = ()=>{};
    return ()=>ws.close();
  },[]);

  useEffect(()=>{
    if((appView==="admin"||appView==="kitchen")&&token)
      request("GET","/orders").then(setOrders).catch(console.error);
  },[appView,token]);

  async function handleLogin() {
    setLoginError("");
    try {
      const res = await fetch(`${API}/auth/login`,{ method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ username:loginForm.user, password:loginForm.pass }) });
      if(!res.ok){ const err=await res.json(); throw err; }
      const { token:t, role:r, username:u } = await res.json();
      login(t, r, u);
      // Route based on role
      if(["superadmin","admin","cashier"].includes(r)) setAppView("admin");
      else setAppView("kitchen");
    } catch(e){ setLoginError(e.error||e.errors?.join(", ")||"Error — verifica que el backend esté corriendo"); }
  }

  async function handlePlaceOrder(orderData) {
    const res = await fetch(`${API}/orders`,{ method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(orderData) });
    if(!res.ok) throw await res.json();
    return res.json();
  }

  async function updateOrderStatus(orderId, newStatus) {
    await request("PATCH",`/orders/${orderId}/status`,{ status:newStatus });
    setOrders(prev=>prev.map(o=>o.id===orderId?{...o,status:newStatus}:o));
  }

  const pendingCount = orders.filter(o=>o.status==="pending").length;
  const isKitchen    = role==="kitchen";
  const isAdmin      = ["superadmin","admin","cashier"].includes(role);

  return (
    <div style={{ minHeight:"100vh", background:C.bg }}>
      <style>{FONTS}{`
        *{box-sizing:border-box;} body{margin:0;}
        @keyframes slideIn{from{opacity:0;transform:translateY(-10px) scale(0.98)}to{opacity:1;transform:translateY(0) scale(1)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
        ::-webkit-scrollbar{width:6px;height:6px;}
        ::-webkit-scrollbar-track{background:${C.crema};}
        ::-webkit-scrollbar-thumb{background:${C.border};border-radius:99px;}
        input:focus,select:focus,textarea:focus{border-color:${C.dorado}!important;box-shadow:0 0 0 3px ${C.dorado}22;outline:none;}
      `}</style>

      {/* NAVBAR */}
      <header style={{ background:C.espresso, position:"sticky", top:0, zIndex:100, borderBottom:`1px solid ${C.dorado}22` }}>
        <div style={{ padding:"0 2rem", display:"flex", justifyContent:"space-between", alignItems:"center", height:62 }}>
          <div style={{ display:"flex", alignItems:"center", gap:12, cursor:"pointer" }} onClick={()=>setAppView("customer")}>
            <div style={{ width:38,height:38,borderRadius:10,background:C.dorado+"22",border:`1px solid ${C.dorado}44`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20 }}>☕</div>
            <div>
              <div style={{ fontFamily:F.serif,fontWeight:700,fontSize:20,color:C.crema,letterSpacing:"0.02em",lineHeight:1.1 }}>Café Origen</div>
              <div style={{ fontFamily:F.sans,fontSize:8,color:C.dorado,letterSpacing:"0.25em",textTransform:"uppercase",lineHeight:1 }}>Specialty Coffee</div>
            </div>
          </div>
          <div style={{ display:"flex", gap:6, alignItems:"center" }}>
            {appView!=="customer"&&(
              <button onClick={()=>setAppView("customer")} style={{ padding:"7px 16px",borderRadius:99,border:`1px solid ${C.dorado}44`,background:"transparent",color:C.dorado,fontFamily:F.sans,fontSize:12,cursor:"pointer",letterSpacing:"0.04em" }}>← Cliente</button>
            )}
            {token ? (
              <>
                {isAdmin&&(
                  <button onClick={()=>setAppView("admin")} style={{ padding:"7px 16px",borderRadius:99,border:`1px solid ${appView==="admin"?C.dorado+"88":"rgba(255,255,255,0.15)"}`,background:appView==="admin"?C.dorado+"22":"transparent",color:appView==="admin"?C.dorado:"rgba(245,230,200,0.8)",fontFamily:F.sans,fontSize:12,cursor:"pointer",letterSpacing:"0.04em" }}>
                    📊 Admin
                  </button>
                )}
                <button onClick={()=>setAppView("kitchen")} style={{ padding:"7px 16px",borderRadius:99,border:`1px solid ${appView==="kitchen"?C.dorado+"88":"rgba(255,255,255,0.15)"}`,background:appView==="kitchen"?C.dorado+"22":"transparent",color:appView==="kitchen"?C.dorado:"rgba(245,230,200,0.8)",fontFamily:F.sans,fontSize:12,cursor:"pointer",display:"flex",alignItems:"center",gap:7,letterSpacing:"0.04em" }}>
                  👨‍🍳 Cocina
                  {pendingCount>0&&<span style={{ background:C.granate,color:C.crema,borderRadius:99,padding:"1px 7px",fontSize:10,fontWeight:700,animation:"pulse 1.5s infinite" }}>{pendingCount}</span>}
                </button>
                <button onClick={()=>{ logout(); setAppView("customer"); }} style={{ padding:"7px 16px",borderRadius:99,border:`1px solid ${C.dorado}44`,background:C.dorado+"15",color:C.dorado,fontFamily:F.sans,fontSize:12,cursor:"pointer",letterSpacing:"0.04em" }}>
                  🔓 Salir ({user})
                </button>
              </>
            ) : (
              <button onClick={()=>setAppView("login")} style={{ padding:"7px 20px",borderRadius:99,border:"none",background:C.dorado,color:C.espresso,fontFamily:F.sans,fontSize:12,fontWeight:700,cursor:"pointer",letterSpacing:"0.06em" }}>
                🔐 Ingresar
              </button>
            )}
          </div>
        </div>
        {pendingCount>0&&(
          <div style={{ background:C.granate+"18",borderTop:`1px solid ${C.granate}33`,padding:"5px 2rem",display:"flex",alignItems:"center",gap:10 }}>
            <span style={{ width:7,height:7,borderRadius:99,background:C.granate,display:"inline-block",animation:"pulse 1.2s infinite" }}/>
            <span style={{ fontFamily:F.sans,fontSize:11,color:C.granateLight,letterSpacing:"0.06em" }}>{pendingCount} pedido{pendingCount>1?"s":""} esperando en cocina</span>
            <button onClick={()=>setAppView("kitchen")} style={{ marginLeft:"auto",fontFamily:F.sans,fontSize:11,color:C.granateLight,background:"none",border:`1px solid ${C.granate}44`,borderRadius:99,padding:"3px 12px",cursor:"pointer" }}>Ver cocina →</button>
          </div>
        )}
      </header>

      <div style={{ maxWidth:1120, margin:"0 auto", padding:"2rem 1.5rem" }}>

        {/* LOGIN */}
        {appView==="login"&&(
          <div style={{ display:"flex",justifyContent:"center",alignItems:"center",minHeight:"65vh" }}>
            <div style={{ background:C.bgCard,borderRadius:22,padding:"2.5rem",width:"100%",maxWidth:420,border:`1px solid ${C.borderLight}`,animation:"slideIn 0.3s ease" }}>
              <div style={{ textAlign:"center",marginBottom:28 }}>
                <div style={{ fontFamily:F.serif,fontSize:48,marginBottom:8,color:C.dorado }}>☕</div>
                <h2 style={{ margin:"0 0 5px",fontFamily:F.serif,fontWeight:700,fontSize:28,color:C.textDark }}>Bienvenido</h2>
                <p style={{ margin:0,fontFamily:F.sans,fontSize:13,color:C.textLight }}>Café Origen · Sistema de gestión</p>
              </div>
              <div style={{ display:"flex",flexDirection:"column",gap:14 }}>
                {[["user","Usuario","admin","text"],["pass","Contraseña","••••••••","password"]].map(([key,label,ph,type])=>(
                  <div key={key}>
                    <label style={{ fontFamily:F.sans,fontSize:11,color:C.textLight,fontWeight:600,display:"block",marginBottom:5,textTransform:"uppercase",letterSpacing:"0.08em" }}>{label}</label>
                    <input type={type} value={loginForm[key]} onChange={e=>setLoginForm(f=>({...f,[key]:e.target.value}))} placeholder={ph}
                      onKeyDown={e=>e.key==="Enter"&&handleLogin()}
                      style={{ width:"100%",padding:"11px 14px",borderRadius:11,border:`1.5px solid ${C.border}`,fontSize:14,fontFamily:F.sans,color:C.textDark,background:C.white,boxSizing:"border-box" }} />
                  </div>
                ))}
                <ErrMsg msg={loginError} />
                <Btn onClick={handleLogin} variant="granate" full size="lg">Ingresar →</Btn>
                <div style={{ background:C.crema,borderRadius:10,padding:"10px 14px" }}>
                  <p style={{ fontFamily:F.sans,fontSize:10,color:C.textLight,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.08em",margin:"0 0 6px" }}>Credenciales de prueba</p>
                  {[["admin","cafe2024","superadmin"],["cocina","cocina2024","kitchen"],["cajero","cajero2024","cashier"]].map(([u,p,r])=>(
                    <div key={u} onClick={()=>setLoginForm({user:u,pass:p})} style={{ display:"flex",justifyContent:"space-between",padding:"4px 0",cursor:"pointer",borderBottom:`1px solid ${C.borderLight}` }}>
                      <span style={{ fontFamily:F.mono,fontSize:12,color:C.textMid }}>{u} / {p}</span>
                      <Tag color={C.doradoLight} text={C.doradoDark} size={9}>{r}</Tag>
                    </div>
                  ))}
                  <p style={{ fontFamily:F.sans,fontSize:10,color:C.textLight,margin:"6px 0 0",textAlign:"center" }}>Clic para autocompletar</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ADMIN DASHBOARD */}
        {appView==="admin"&&token&&(
          <div>
            <div style={{ marginBottom:24 }}>
              <h1 style={{ margin:"0 0 5px",fontFamily:F.serif,fontWeight:700,fontSize:34,color:C.textDark,lineHeight:1 }}>Panel de Administración</h1>
              <p style={{ margin:0,fontFamily:F.sans,fontSize:13,color:C.textLight }}>Gestión completa · datos en tiempo real</p>
            </div>
            <AdminDashboard orders={orders} onUpdateStatus={updateOrderStatus} />
          </div>
        )}

        {/* KITCHEN DASHBOARD */}
        {appView==="kitchen"&&(
          <div>
            <div style={{ marginBottom:24 }}>
              <h1 style={{ margin:"0 0 5px",fontFamily:F.serif,fontWeight:700,fontSize:34,color:C.textDark,lineHeight:1 }}>Dashboard de Cocina</h1>
              <p style={{ margin:0,fontFamily:F.sans,fontSize:13,color:C.textLight }}>Pedidos · Solicitudes de insumos · Permisos</p>
            </div>
            <KitchenDashboard orders={orders} onUpdateStatus={updateOrderStatus} />
          </div>
        )}

        {/* CUSTOMER VIEW */}
        {appView==="customer"&&(
          <div>
            <div style={{ background:C.espresso,borderRadius:22,padding:"2.5rem",marginBottom:28,position:"relative",overflow:"hidden" }}>
              <div style={{ position:"absolute",top:-40,right:-40,width:200,height:200,borderRadius:99,background:C.dorado+"08" }}/>
              <div style={{ position:"absolute",bottom:-30,left:60,width:100,height:100,borderRadius:99,background:C.granate+"08" }}/>
              <div style={{ position:"relative" }}>
                <p style={{ margin:"0 0 8px",fontFamily:F.sans,fontSize:11,color:C.dorado,letterSpacing:"0.2em",textTransform:"uppercase" }}>Bienvenido a</p>
                <h1 style={{ margin:"0 0 10px",fontFamily:F.serif,fontWeight:700,fontSize:46,color:C.crema,lineHeight:1 }}>Café Origen</h1>
                <p style={{ margin:"0 0 24px",fontFamily:F.serif,fontStyle:"italic",fontSize:18,color:C.cremaDark+"99",maxWidth:420,lineHeight:1.5 }}>Specialty coffee del corazón de Colombia. Cada taza, una historia.</p>
                <div style={{ display:"flex",gap:24 }}>
                  {[["☕","Ver menú"],["⭐","4.8 rating"],["🕐","7am – 9pm"]].map(([ic,lbl])=>(
                    <div key={lbl} style={{ display:"flex",alignItems:"center",gap:7 }}>
                      <span style={{ fontSize:14 }}>{ic}</span>
                      <span style={{ fontFamily:F.sans,fontSize:13,color:C.cremaDark+"aa" }}>{lbl}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <CustomerView onPlaceOrder={handlePlaceOrder} />
          </div>
        )}
      </div>
    </div>
  );
}

export default function App() {
  return <AuthProvider><AppContent /></AuthProvider>;
}