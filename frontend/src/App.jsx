import { useState, useEffect, useCallback, createContext, useContext } from "react";

// ─── CONFIG ───────────────────────────────────────────────────
const API    = "http://localhost:3001/api";
const WS_URL = "ws://localhost:3001";

const FONTS = `@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400;1,600&family=DM+Sans:wght@300;400;500;600&display=swap');`;

// ─── AUTH CONTEXT ─────────────────────────────────────────────
// Centraliza token + role para que TODOS los componentes lo usen
const AuthContext = createContext(null);

function AuthProvider({ children }) {
  const [token, setTokenState] = useState(() => localStorage.getItem("cafe_token") || "");
  const [role,  setRole]       = useState(() => localStorage.getItem("cafe_role")  || "");

  function login(t, r) {
    localStorage.setItem("cafe_token", t);
    localStorage.setItem("cafe_role",  r);
    setTokenState(t); setRole(r);
  }
  function logout() {
    localStorage.removeItem("cafe_token");
    localStorage.removeItem("cafe_role");
    setTokenState(""); setRole("");
  }

  // Llama a la API con el token correcto
  const request = useCallback(async (method, path, body) => {
    const res = await fetch(`${API}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (res.status === 401) { logout(); throw { error: "Sesión expirada" }; }
    if (!res.ok) throw await res.json();
    return res.json();
  }, [token]);

  return (
    <AuthContext.Provider value={{ token, role, login, logout, request }}>
      {children}
    </AuthContext.Provider>
  );
}

function useAuth()      { return useContext(AuthContext); }
function useRequest()   { return useContext(AuthContext).request; }

// ─── HELPERS ──────────────────────────────────────────────────
function Stars({ value = 0, size = 14, interactive = false, onRate }) {
  const [hover, setHover] = useState(0);
  return (
    <span style={{ display: "inline-flex", gap: 2 }}>
      {[1,2,3,4,5].map(s => (
        <span key={s}
          onClick={() => interactive && onRate?.(s)}
          onMouseEnter={() => interactive && setHover(s)}
          onMouseLeave={() => interactive && setHover(0)}
          style={{ fontSize: size, cursor: interactive ? "pointer" : "default",
            color: s <= (hover || Math.round(value)) ? "#c8972a" : "#e2d9c8",
            lineHeight: 1, transition: "color 0.15s, transform 0.1s",
            transform: interactive && hover === s ? "scale(1.2)" : "scale(1)", display:"inline-block" }}>★</span>
      ))}
    </span>
  );
}

function Tag({ children, color = "#f5f0e8", text = "#6b5c3e" }) {
  return <span style={{ padding: "3px 10px", borderRadius: 99, background: color, color: text,
    fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase",
    fontFamily: "'DM Sans',sans-serif" }}>{children}</span>;
}

function Pill({ children, active, onClick }) {
  return (
    <button onClick={onClick} style={{ padding: "7px 18px", borderRadius: 99,
      border: `1.5px solid ${active ? "#3d1a00" : "#e2d9c8"}`,
      background: active ? "#3d1a00" : "transparent",
      color: active ? "#f5f0e8" : "#8a7560",
      fontSize: 12, fontWeight: 500, cursor: "pointer", transition: "all 0.2s",
      fontFamily: "'DM Sans',sans-serif", letterSpacing: "0.04em", whiteSpace: "nowrap" }}>
      {children}
    </button>
  );
}

function Spinner() {
  return <div style={{ textAlign:"center", padding:"3rem", fontFamily:"'DM Sans',sans-serif", color:"#a09080", fontSize:14 }}>Cargando...</div>;
}

function ErrorMsg({ msg }) {
  if (!msg) return null;
  return <div style={{ background:"#fef2f2", border:"1px solid #fecaca", borderRadius:10, padding:"10px 14px",
    fontFamily:"'DM Sans',sans-serif", fontSize:12, color:"#dc2626", marginBottom:12 }}>{msg}</div>;
}

// ─── KITCHEN VIEW ─────────────────────────────────────────────
function KitchenView({ orders, onUpdateStatus }) {
  const STATUS = {
    pending:   { bg:"#fffbf0", border:"#f0c060", label:"Pendiente",  icon:"⏳" },
    preparing: { bg:"#f0f7ff", border:"#6aabf0", label:"Preparando", icon:"🔥" },
    ready:     { bg:"#f0fdf6", border:"#50c878", label:"Listo",      icon:"✅" },
    delivered: { bg:"#f8f8f8", border:"#d0d0d0", label:"Entregado",  icon:"📦" },
  };
  const active = orders.filter(o => o.status !== "delivered");
  return (
    <div>
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:24 }}>
        <span style={{ width:8, height:8, borderRadius:99, background:"#50c878",
          boxShadow:"0 0 0 3px #d0f5e0", display:"inline-block" }} />
        <span style={{ fontFamily:"'DM Sans',sans-serif", fontSize:13, color:"#8a7560", letterSpacing:"0.06em" }}>
          EN VIVO · {active.length} pedidos activos
        </span>
      </div>
      {active.length === 0 && (
        <div style={{ textAlign:"center", padding:"4rem", color:"#c4b89a" }}>
          <div style={{ fontSize:48, marginBottom:8, opacity:0.5 }}>🍽️</div>
          <p style={{ margin:0, fontFamily:"'DM Sans',sans-serif", fontSize:15 }}>Sin pedidos pendientes</p>
        </div>
      )}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(290px,1fr))", gap:14 }}>
        {active.map(order => {
          const s = STATUS[order.status] || STATUS.pending;
          return (
            <div key={order.id} style={{ background:s.bg, borderRadius:16, padding:18,
              border:`2px solid ${s.border}`, transition:"all 0.3s" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
                <div>
                  <span style={{ fontFamily:"'Cormorant Garamond',serif", fontWeight:700, fontSize:20, color:"#1a0a00" }}>
                    Mesa #{order.table_number}
                  </span>
                  <span style={{ fontFamily:"'DM Sans',sans-serif", fontSize:11, color:"#a09078", marginLeft:8 }}>
                    {order.created_at}
                  </span>
                </div>
                <span style={{ fontFamily:"'DM Sans',sans-serif", fontSize:12, fontWeight:600, color:"#5a4a30",
                  background:"rgba(255,255,255,0.7)", padding:"3px 10px", borderRadius:99 }}>
                  {s.icon} {s.label}
                </span>
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:5, marginBottom:14,
                paddingBottom:14, borderBottom:`1px solid ${s.border}60` }}>
                {(order.items||[]).map((item,i) => (
                  <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                    <span style={{ fontFamily:"'DM Sans',sans-serif", fontSize:13, color:"#3d2a10", fontWeight:500 }}>
                      {item.quantity}× {item.menu_item_name}
                    </span>
                    {item.special_note && (
                      <span style={{ fontFamily:"'DM Sans',sans-serif", fontSize:11, color:"#8a7560", fontStyle:"italic" }}>
                        "{item.special_note}"
                      </span>
                    )}
                  </div>
                ))}
              </div>
              <div style={{ display:"flex", gap:8 }}>
                {order.status==="pending"   && <button onClick={()=>onUpdateStatus(order.id,"preparing")} style={{ flex:1, padding:"9px", borderRadius:10, border:"none", background:"#3b82f6", color:"#fff", fontWeight:600, fontSize:12, cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>🔥 Iniciar preparación</button>}
                {order.status==="preparing" && <button onClick={()=>onUpdateStatus(order.id,"ready")}    style={{ flex:1, padding:"9px", borderRadius:10, border:"none", background:"#16a34a", color:"#fff", fontWeight:600, fontSize:12, cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>✅ Marcar como listo</button>}
                {order.status==="ready"     && <button onClick={()=>onUpdateStatus(order.id,"delivered")} style={{ flex:1, padding:"9px", borderRadius:10, border:"none", background:"#6b7280", color:"#fff", fontWeight:600, fontSize:12, cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>📦 Entregar</button>}
              </div>
            </div>
          );
        })}
      </div>
      {orders.filter(o=>o.status==="delivered").length > 0 && (
        <div style={{ marginTop:28 }}>
          <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:11, color:"#b0a090", fontWeight:600,
            textTransform:"uppercase", letterSpacing:"0.12em", marginBottom:10 }}>Entregados hoy</p>
          {orders.filter(o=>o.status==="delivered").map(o=>(
            <div key={o.id} style={{ display:"flex", justifyContent:"space-between", padding:"8px 14px",
              background:"#faf8f5", borderRadius:10, fontSize:13, color:"#a09080", marginBottom:4,
              fontFamily:"'DM Sans',sans-serif" }}>
              <span>Mesa #{o.table_number} · {(o.items||[]).map(i=>`${i.quantity}× ${i.menu_item_name}`).join(", ")}</span>
              <span style={{ fontWeight:600, color:"#6b5c3e" }}>${Number(o.total).toLocaleString("es-CO")}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── EMPLOYEES PANEL (admin) ──────────────────────────────────
const ROLES = ["Barista","Cajero","Cocinero","Mesero","Supervisor","Limpieza"];
const AVATAR_COLORS = ["#c8972a","#3b82f6","#16a34a","#9333ea","#e07040","#0891b2"];

function EmployeesPanel() {
  const request = useRequest();
  const { role } = useAuth();
  const isSuperAdmin = role === "superadmin";
  const canEdit      = ["superadmin","admin"].includes(role);

  const [staff,   setStaff]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");
  const [filter,  setFilter]  = useState("Todos");
  const [editing, setEditing] = useState(null);
  const [form,    setForm]    = useState({});
  const [saving,  setSaving]  = useState(false);
  const [ratingModal, setRatingModal] = useState(null);
  const [ratingHover, setRatingHover] = useState(0);

  useEffect(() => { loadStaff(); }, []);

  async function loadStaff() {
    setLoading(true); setError("");
    try { setStaff(await request("GET", "/employees/all")); }
    catch(e) { setError(e.error || "Error cargando empleados"); }
    setLoading(false);
  }

  async function saveEmployee() {
    setSaving(true); setError("");
    try {
      if (editing === "new") await request("POST", "/employees", form);
      else                   await request("PUT",  `/employees/${editing}`, form);
      setEditing(null); await loadStaff();
    } catch(e) { setError(e.errors?.join(", ") || e.error || "Error guardando"); }
    setSaving(false);
  }

  async function toggleActive(id) {
    try { await request("PUT", `/employees/${id}/toggle`); await loadStaff(); }
    catch(e) { setError(e.error || "Error"); }
  }

  async function deleteEmployee(id) {
    if (!confirm("¿Eliminar empleado? Esta acción no se puede deshacer.")) return;
    try { await request("DELETE", `/employees/${id}`); await loadStaff(); }
    catch(e) { setError(e.error || "Error eliminando"); }
  }

  async function submitRating(employeeId, stars) {
    try {
      await fetch(`${API}/employees/${employeeId}/rate`, {
        method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ stars }),
      });
      setRatingModal(null); setRatingHover(0); await loadStaff();
    } catch(e) { console.error(e); }
  }

  const filtered = staff.filter(e => filter === "Todos" || e.role === filter);
  const avgRating = staff.length ? (staff.reduce((s,e)=>s+(Number(e.avg_rating)||0),0)/staff.length).toFixed(1) : "—";
  const roleCount = ROLES.reduce((acc,r) => ({...acc,[r]:staff.filter(e=>e.role===r).length}),{});

  if (loading) return <Spinner />;

  return (
    <div>
      <ErrorMsg msg={error} />

      {/* Stats */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))", gap:12, marginBottom:24 }}>
        {[
          { label:"Total empleados",  value:staff.length,                           bg:"#fdf8ee", accent:"#c8972a" },
          { label:"Activos",          value:staff.filter(e=>e.active).length,       bg:"#f0fdf4", accent:"#16a34a" },
          { label:"Rating promedio",  value:avgRating+" ★",                         bg:"#f5f3ff", accent:"#9333ea" },
          { label:"Roles distintos",  value:Object.values(roleCount).filter(v=>v>0).length, bg:"#eff6ff", accent:"#3b82f6" },
        ].map(s=>(
          <div key={s.label} style={{ background:s.bg, borderRadius:14, padding:"16px 18px", borderLeft:`3px solid ${s.accent}` }}>
            <p style={{ margin:"0 0 4px", fontFamily:"'DM Sans',sans-serif", fontSize:10, color:"#a09080", fontWeight:600, textTransform:"uppercase", letterSpacing:"0.08em" }}>{s.label}</p>
            <p style={{ margin:0, fontFamily:"'Cormorant Garamond',serif", fontSize:24, fontWeight:700, color:"#1a0a00" }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16, flexWrap:"wrap", gap:10 }}>
        <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
          {["Todos",...ROLES].map(r=>(
            <button key={r} onClick={()=>setFilter(r)} style={{ padding:"6px 14px", borderRadius:99, border:"1.5px solid",
              borderColor:filter===r?"#1a0a00":"#e2d9c8", background:filter===r?"#1a0a00":"transparent",
              color:filter===r?"#f5f0e8":"#8a7560", fontFamily:"'DM Sans',sans-serif", fontSize:11, fontWeight:500, cursor:"pointer", transition:"all 0.2s" }}>
              {r}{r!=="Todos"&&roleCount[r]>0?` (${roleCount[r]})` : ""}
            </button>
          ))}
        </div>
        {canEdit && (
          <button onClick={()=>{ setEditing("new"); setForm({ name:"", role:"Barista", since:"", notes:"", active:true }); }}
            style={{ padding:"9px 20px", borderRadius:10, border:"none", background:"#1a0a00", color:"#f5f0e8",
              fontFamily:"'DM Sans',sans-serif", fontSize:13, fontWeight:600, cursor:"pointer" }}>
            + Agregar empleado
          </button>
        )}
      </div>

      {/* Form */}
      {editing && canEdit && (
        <div style={{ background:"#fdfaf6", borderRadius:16, padding:"1.5rem", marginBottom:18, border:"2px solid #c8972a" }}>
          <p style={{ margin:"0 0 16px", fontFamily:"'Cormorant Garamond',serif", fontWeight:700, fontSize:20, color:"#1a0a00" }}>
            {editing==="new" ? "Nuevo empleado" : "Editar empleado"}
          </p>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            {[["name","Nombre completo"],["since","Desde (YYYY-MM)"],["notes","Notas"]].map(([key,label])=>(
              <div key={key} style={{ gridColumn:key==="notes"?"1/-1":"auto" }}>
                <label style={{ fontFamily:"'DM Sans',sans-serif", fontSize:11, color:"#8a7560", fontWeight:600, display:"block", marginBottom:4, textTransform:"uppercase", letterSpacing:"0.06em" }}>{label}</label>
                <input value={form[key]||""} onChange={e=>setForm(f=>({...f,[key]:e.target.value}))}
                  style={{ width:"100%", padding:"9px 12px", borderRadius:9, border:"1.5px solid #e2d9c8", fontSize:14, boxSizing:"border-box", fontFamily:"'DM Sans',sans-serif", color:"#1a0a00", background:"#fff" }} />
              </div>
            ))}
            <div>
              <label style={{ fontFamily:"'DM Sans',sans-serif", fontSize:11, color:"#8a7560", fontWeight:600, display:"block", marginBottom:4, textTransform:"uppercase", letterSpacing:"0.06em" }}>Rol</label>
              <select value={form.role||"Barista"} onChange={e=>setForm(f=>({...f,role:e.target.value}))}
                style={{ width:"100%", padding:"9px 12px", borderRadius:9, border:"1.5px solid #e2d9c8", fontSize:13, fontFamily:"'DM Sans',sans-serif", background:"#fff", color:"#1a0a00" }}>
                {ROLES.map(r=><option key={r}>{r}</option>)}
              </select>
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:8, paddingTop:18 }}>
              <input type="checkbox" id="empActive" checked={form.active!==false} onChange={e=>setForm(f=>({...f,active:e.target.checked}))} style={{ width:16,height:16,accentColor:"#c8972a",cursor:"pointer" }} />
              <label htmlFor="empActive" style={{ fontFamily:"'DM Sans',sans-serif", fontSize:13, color:"#5a4a30", cursor:"pointer" }}>Activo</label>
            </div>
          </div>
          <div style={{ display:"flex", gap:8, marginTop:16 }}>
            <button onClick={saveEmployee} disabled={saving} style={{ padding:"10px 22px", borderRadius:9, border:"none", background:"#1a0a00", color:"#f5f0e8", fontWeight:600, fontSize:13, cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>
              {saving ? "Guardando..." : "Guardar"}
            </button>
            <button onClick={()=>setEditing(null)} style={{ padding:"10px 22px", borderRadius:9, border:"1.5px solid #e2d9c8", background:"#fff", color:"#8a7560", fontSize:13, cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>Cancelar</button>
          </div>
        </div>
      )}

      {/* Cards */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))", gap:14 }}>
        {filtered.map((emp,idx)=>(
          <div key={emp.id} style={{ background:"#fff", borderRadius:16, padding:"18px 20px", border:"1px solid #ede8e0", opacity:emp.active?1:0.55, transition:"all 0.2s", position:"relative" }}
            onMouseEnter={e=>e.currentTarget.style.boxShadow="0 4px 20px rgba(61,26,0,0.08)"}
            onMouseLeave={e=>e.currentTarget.style.boxShadow="none"}>
            {!emp.active && <div style={{ position:"absolute",top:12,right:12 }}><Tag color="#fee2e2" text="#991b1b">Inactivo</Tag></div>}
            <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:14 }}>
              <div style={{ width:48,height:48,borderRadius:14,background:AVATAR_COLORS[idx%AVATAR_COLORS.length]+"22",border:"2px solid "+AVATAR_COLORS[idx%AVATAR_COLORS.length]+"44",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
                <span style={{ fontFamily:"'DM Sans',sans-serif",fontWeight:700,fontSize:15,color:AVATAR_COLORS[idx%AVATAR_COLORS.length] }}>{emp.avatar||emp.name?.slice(0,2).toUpperCase()}</span>
              </div>
              <div style={{ flex:1,minWidth:0 }}>
                <p style={{ margin:0,fontFamily:"'Cormorant Garamond',serif",fontWeight:700,fontSize:18,color:"#1a0a00",lineHeight:1.1,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>{emp.name}</p>
                <div style={{ display:"flex",alignItems:"center",gap:7,marginTop:4 }}>
                  <Tag color={AVATAR_COLORS[idx%AVATAR_COLORS.length]+"18"} text={AVATAR_COLORS[idx%AVATAR_COLORS.length]}>{emp.role}</Tag>
                  {emp.since && <span style={{ fontFamily:"'DM Sans',sans-serif",fontSize:11,color:"#b0a090" }}>desde {emp.since}</span>}
                </div>
              </div>
            </div>
            <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:10 }}>
              <Stars value={emp.avg_rating||0} size={15} />
              <span style={{ fontFamily:"'Cormorant Garamond',serif",fontSize:16,fontWeight:700,color:"#1a0a00" }}>
                {emp.avg_rating>0 ? Number(emp.avg_rating).toFixed(1) : "Sin rating"}
              </span>
              <span style={{ fontFamily:"'DM Sans',sans-serif",fontSize:11,color:"#b0a090" }}>({emp.rating_count||0})</span>
              {canEdit && (
                <button onClick={()=>{ setRatingModal(emp); setRatingHover(0); }}
                  style={{ marginLeft:"auto",fontFamily:"'DM Sans',sans-serif",fontSize:11,color:"#c8972a",background:"rgba(200,151,42,0.08)",border:"1px solid rgba(200,151,42,0.25)",borderRadius:99,padding:"3px 10px",cursor:"pointer",fontWeight:600 }}>
                  Calificar
                </button>
              )}
            </div>
            {emp.notes && (
              <p style={{ margin:"0 0 14px",fontFamily:"'DM Sans',sans-serif",fontSize:12,color:"#8a7560",lineHeight:1.5,fontStyle:"italic",paddingLeft:10,borderLeft:"2px solid #e2d9c8" }}>
                "{emp.notes}"
              </p>
            )}
            {canEdit && (
              <div style={{ display:"flex",gap:6,borderTop:"1px solid #f5f0e8",paddingTop:12 }}>
                <button onClick={()=>{ setEditing(emp.id); setForm({...emp}); }}
                  style={{ flex:1,padding:"7px",borderRadius:8,border:"1px solid #e2d9c8",background:"#faf8f5",fontSize:12,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",color:"#5a4a30",fontWeight:500 }}>✏️ Editar</button>
                <button onClick={()=>toggleActive(emp.id)}
                  style={{ flex:1,padding:"7px",borderRadius:8,border:`1px solid ${emp.active?"#fecaca":"#bbf7d0"}`,background:emp.active?"#fff5f5":"#f0fdf4",fontSize:12,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",color:emp.active?"#dc2626":"#16a34a",fontWeight:500 }}>
                  {emp.active ? "⏸ Desactivar" : "▶ Activar"}
                </button>
                {isSuperAdmin && (
                  <button onClick={()=>deleteEmployee(emp.id)}
                    style={{ padding:"7px 10px",borderRadius:8,border:"1px solid #fecaca",background:"#fff",fontSize:12,cursor:"pointer",color:"#dc2626" }}>🗑️</button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Rating modal */}
      {ratingModal && (
        <div onClick={()=>setRatingModal(null)} style={{ position:"fixed",inset:0,background:"rgba(26,10,0,0.55)",zIndex:300,display:"flex",alignItems:"center",justifyContent:"center",padding:20,backdropFilter:"blur(4px)" }}>
          <div onClick={e=>e.stopPropagation()} style={{ background:"#fff",borderRadius:20,padding:"2rem",maxWidth:360,width:"100%",textAlign:"center",animation:"slideIn 0.25s ease" }}>
            <div style={{ width:56,height:56,borderRadius:14,background:"#fdf8ee",border:"2px solid #e2d9c8",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 12px" }}>
              <span style={{ fontFamily:"'DM Sans',sans-serif",fontWeight:700,fontSize:18,color:"#c8972a" }}>{ratingModal.avatar}</span>
            </div>
            <h3 style={{ margin:"0 0 4px",fontFamily:"'Cormorant Garamond',serif",fontWeight:700,fontSize:22,color:"#1a0a00" }}>{ratingModal.name}</h3>
            <p style={{ margin:"0 0 20px",fontFamily:"'DM Sans',sans-serif",fontSize:12,color:"#a09080" }}>{ratingModal.role}</p>
            <div style={{ display:"flex",justifyContent:"center",gap:8,marginBottom:8 }}>
              {[1,2,3,4,5].map(s=>(
                <span key={s} onMouseEnter={()=>setRatingHover(s)} onMouseLeave={()=>setRatingHover(0)}
                  onClick={()=>submitRating(ratingModal.id, s)}
                  style={{ fontSize:36,cursor:"pointer",color:s<=(ratingHover||Math.round(ratingModal.avg_rating||0))?"#c8972a":"#e2d9c8",
                    transition:"all 0.15s",transform:ratingHover===s?"scale(1.2)":"scale(1)",display:"inline-block" }}>★</span>
              ))}
            </div>
            {ratingHover>0 && <p style={{ margin:"0 0 16px",fontFamily:"'DM Sans',sans-serif",fontSize:13,color:"#c8972a",fontWeight:600 }}>
              {["","Muy malo","Regular","Bueno","Muy bueno","Excelente"][ratingHover]}
            </p>}
            <button onClick={()=>setRatingModal(null)} style={{ width:"100%",padding:"10px",borderRadius:10,border:"1.5px solid #e2d9c8",background:"#fff",fontFamily:"'DM Sans',sans-serif",fontSize:13,cursor:"pointer",color:"#8a7560",marginTop:8 }}>Cancelar</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── SALES DASHBOARD ──────────────────────────────────────────
function BarChart({ data, period }) {
  const [tooltip, setTooltip] = useState(null);
  if (!data||data.length===0) return (
    <div style={{ height:200,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'DM Sans',sans-serif",fontSize:13,color:"#c4b89a" }}>
      Sin datos aún — los pedidos entregados aparecerán aquí
    </div>
  );
  const W=680,H=200,PAD={top:14,right:20,bottom:36,left:68};
  const cW=W-PAD.left-PAD.right, cH=H-PAD.top-PAD.bottom;
  const maxRev=Math.max(...data.map(d=>Number(d.revenue)||0),1);
  const maxOrd=Math.max(...data.map(d=>Number(d.orders)||0),1);
  const barW=Math.max(4,Math.floor(cW/data.length)-4);
  const gap=(cW-barW*data.length)/(data.length+1);
  const yR=v=>PAD.top+cH-(v/maxRev)*cH;
  const yO=v=>PAD.top+cH-(v/maxOrd)*cH;
  const xB=i=>PAD.left+gap+i*(barW+gap)+barW/2;
  const ticks=[0,0.25,0.5,0.75,1];
  const fmtL=s=>period==="day"?String(s).slice(5):period==="month"?String(s).slice(2,7):String(s);
  const fmtM=v=>v>=1000000?`$${(v/1000000).toFixed(1)}M`:v>=1000?`$${(v/1000).toFixed(0)}k`:`$${v}`;
  const skipN=data.length>20?5:data.length>10?2:1;
  return (
    <div style={{ width:"100%", overflowX:"auto" }}>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display:"block" }}>
        {ticks.map((f,i)=>(
          <g key={i}>
            <line x1={PAD.left} y1={yR(maxRev*f)} x2={W-PAD.right} y2={yR(maxRev*f)} stroke="#ede8e0" strokeWidth="0.5" strokeDasharray={i===0?"none":"4 3"} />
            <text x={PAD.left-6} y={yR(maxRev*f)+4} textAnchor="end" style={{ fontFamily:"'DM Sans',sans-serif",fontSize:9,fill:"#b0a090" }}>{fmtM(maxRev*f)}</text>
          </g>
        ))}
        {[0,0.5,1].map((f,i)=>(
          <text key={i} x={W-PAD.right+5} y={yO(maxOrd*f)+4} textAnchor="start" style={{ fontFamily:"'DM Sans',sans-serif",fontSize:9,fill:"#3b82f6",opacity:0.7 }}>{Math.round(maxOrd*f)}</text>
        ))}
        {data.map((d,i)=>{
          const rev=Number(d.revenue)||0;
          const bH=Math.max(2,(rev/maxRev)*cH);
          const y=PAD.top+cH-bH;
          const hov=tooltip?.i===i;
          return <rect key={i} x={xB(i)-barW/2} y={y} width={barW} height={bH} rx="3" fill={hov?"#a07020":"#c8972a"} opacity={hov?1:0.82} style={{ cursor:"pointer",transition:"fill 0.15s" }} onMouseEnter={()=>setTooltip({i,d})} onMouseLeave={()=>setTooltip(null)} />;
        })}
        <polyline points={data.map((d,i)=>`${xB(i)},${yO(Number(d.orders)||0)}`).join(" ")} fill="none" stroke="#3b82f6" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" opacity="0.7" />
        {data.map((d,i)=>(
          <circle key={i} cx={xB(i)} cy={yO(Number(d.orders)||0)} r="3" fill="#3b82f6" opacity="0.8"
            onMouseEnter={()=>setTooltip({i,d})} onMouseLeave={()=>setTooltip(null)} style={{ cursor:"pointer" }} />
        ))}
        {data.map((d,i)=>i%skipN===0&&(
          <text key={i} x={xB(i)} y={H-PAD.bottom+14} textAnchor="middle" style={{ fontFamily:"'DM Sans',sans-serif",fontSize:9,fill:"#b0a090" }}>{fmtL(d.period)}</text>
        ))}
        <line x1={PAD.left} y1={PAD.top+cH} x2={W-PAD.right} y2={PAD.top+cH} stroke="#e2d9c8" strokeWidth="1" />
        <line x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={PAD.top+cH} stroke="#e2d9c8" strokeWidth="1" />
        {tooltip&&(()=>{
          const tx=Math.min(xB(tooltip.i),W-130), ty=Math.max(PAD.top,yR(Number(tooltip.d.revenue)||0)-60);
          return (
            <g>
              <rect x={tx-2} y={ty} width={128} height={50} rx="6" fill="#1a0a00" opacity="0.92" />
              <text x={tx+10} y={ty+15} style={{ fontFamily:"'DM Sans',sans-serif",fontSize:10,fill:"#c8972a",fontWeight:"bold" }}>{fmtL(tooltip.d.period)}</text>
              <text x={tx+10} y={ty+29} style={{ fontFamily:"'DM Sans',sans-serif",fontSize:10,fill:"#f5f0e8" }}>Ingresos: {fmtM(Number(tooltip.d.revenue)||0)}</text>
              <text x={tx+10} y={ty+43} style={{ fontFamily:"'DM Sans',sans-serif",fontSize:10,fill:"#93c5fd" }}>Pedidos: {tooltip.d.orders}</text>
            </g>
          );
        })()}
      </svg>
      <div style={{ display:"flex",gap:16,justifyContent:"flex-end",marginTop:4,paddingRight:8 }}>
        <div style={{ display:"flex",alignItems:"center",gap:5 }}><div style={{ width:12,height:12,borderRadius:3,background:"#c8972a" }}/><span style={{ fontFamily:"'DM Sans',sans-serif",fontSize:11,color:"#8a7560" }}>Ingresos</span></div>
        <div style={{ display:"flex",alignItems:"center",gap:5 }}><div style={{ width:12,height:4,borderRadius:2,background:"#3b82f6" }}/><span style={{ fontFamily:"'DM Sans',sans-serif",fontSize:11,color:"#8a7560" }}>Pedidos</span></div>
      </div>
    </div>
  );
}

function HBarChart({ data, valueKey, labelKey, fmt }) {
  if (!data||data.length===0) return <div style={{ fontFamily:"'DM Sans',sans-serif",fontSize:12,color:"#c4b89a",textAlign:"center",padding:"20px 0" }}>Sin datos aún</div>;
  const COLORS=["#c8972a","#3b82f6","#16a34a","#e07040","#9333ea","#0891b2","#e2d9c8"];
  const maxV=Math.max(...data.map(d=>Number(d[valueKey])||0),1);
  return (
    <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
      {data.map((d,i)=>{
        const v=Number(d[valueKey])||0;
        return (
          <div key={i} style={{ display:"flex",alignItems:"center",gap:10 }}>
            <div style={{ width:22,height:22,borderRadius:6,background:i<3?"#fdf8ee":"#f5f0e8",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
              <span style={{ fontFamily:"'DM Sans',sans-serif",fontWeight:700,fontSize:10,color:i<3?"#c8972a":"#a09080" }}>{i+1}</span>
            </div>
            <div style={{ flex:1,minWidth:0 }}>
              <div style={{ display:"flex",justifyContent:"space-between",marginBottom:3 }}>
                <span style={{ fontFamily:"'DM Sans',sans-serif",fontSize:12,color:"#1a0a00",fontWeight:500,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",maxWidth:"60%" }}>
                  {d.emoji?`${d.emoji} `:""}{d[labelKey]}
                </span>
                <span style={{ fontFamily:"'Cormorant Garamond',serif",fontSize:13,color:"#1a0a00",fontWeight:700,whiteSpace:"nowrap" }}>{fmt?fmt(v):v}</span>
              </div>
              <div style={{ height:8,background:"#f5f0e8",borderRadius:99,overflow:"hidden" }}>
                <div style={{ height:"100%",width:`${(v/maxV)*100}%`,background:COLORS[i%COLORS.length],borderRadius:99,transition:"width 0.7s cubic-bezier(0.16,1,0.3,1)" }} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function HourBarChart({ data }) {
  const [hov, setHov] = useState(null);
  const map={};
  (data||[]).forEach(d=>{ map[Number(d.hour)]={orders:Number(d.orders)||0,revenue:Number(d.revenue)||0}; });
  const maxO=Math.max(...Array.from({length:24},(_,i)=>map[i]?.orders||0),1);
  const SLOTS=[{range:[0,6],color:"#3b82f6",label:"Madrugada"},{range:[6,12],color:"#c8972a",label:"Mañana"},{range:[12,18],color:"#e07040",label:"Tarde"},{range:[18,24],color:"#9333ea",label:"Noche"}];
  return (
    <div>
      <div style={{ display:"flex",alignItems:"flex-end",gap:3,height:80,marginBottom:4 }}>
        {Array.from({length:24},(_,h)=>{
          const slot=SLOTS.find(s=>h>=s.range[0]&&h<s.range[1]);
          const v=map[h]?.orders||0;
          const bH=Math.max(2,(v/maxO)*68);
          return (
            <div key={h} style={{ flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:2,height:"100%",justifyContent:"flex-end" }}
              onMouseEnter={()=>setHov(h)} onMouseLeave={()=>setHov(null)}>
              {hov===h&&v>0&&(
                <div style={{ background:"#1a0a00",color:"#f5f0e8",borderRadius:5,padding:"2px 6px",fontSize:9,fontFamily:"'DM Sans',sans-serif",whiteSpace:"nowrap",marginBottom:2 }}>
                  {h}:00 · {v}p
                </div>
              )}
              <div style={{ width:"100%",height:`${bH}px`,background:hov===h?slot?.color+"cc":slot?.color+"88",borderRadius:"3px 3px 0 0",transition:"all 0.15s",cursor:"default" }} />
              {h%3===0&&<span style={{ fontFamily:"'DM Sans',sans-serif",fontSize:8,color:"#c4b89a" }}>{h}h</span>}
            </div>
          );
        })}
      </div>
      <div style={{ display:"flex",gap:12,marginTop:4 }}>
        {SLOTS.map(s=>(
          <div key={s.label} style={{ display:"flex",alignItems:"center",gap:5 }}>
            <div style={{ width:8,height:8,borderRadius:2,background:s.color }} />
            <span style={{ fontFamily:"'DM Sans',sans-serif",fontSize:10,color:"#a09080" }}>{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SalesDashboard({ analytics }) {
  const request = useRequest();
  const [period, setPeriod] = useState("day");
  const [sales,  setSales]  = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]  = useState("");

  useEffect(()=>{ loadSales(); },[period]);

  async function loadSales() {
    setLoading(true); setError("");
    try { setSales(await request("GET",`/analytics/sales?period=${period}`)); }
    catch(e){ setError(e.error||"Error cargando datos"); }
    setLoading(false);
  }

  const fmtK=v=>{ const n=Number(v||0); return n>=1000000?`$${(n/1000000).toFixed(1)}M`:n>=1000?`$${(n/1000).toFixed(0)}k`:`$${n}`; };
  const kpis=sales?.kpis||{};
  const rev=sales?.revenueOverTime||[];
  const prevRev=Number(rev[rev.length-2]?.revenue||0);
  const currRev=Number(rev[rev.length-1]?.revenue||0);
  const trendPct=prevRev>0?Math.round(((currRev-prevRev)/prevRev)*100):null;
  const PERIOD_LABELS={day:"Últimos 30 días",month:"Últimos 12 meses",year:"Por año"};

  function KpiCard({label,value,sub,accent,icon,trend}){
    return (
      <div style={{ background:"#fff",borderRadius:14,padding:"16px 18px",border:"1px solid #ede8e0",borderTop:`3px solid ${accent}`,position:"relative",overflow:"hidden" }}>
        <div style={{ position:"absolute",top:10,right:14,fontSize:20,opacity:0.1 }}>{icon}</div>
        <p style={{ margin:"0 0 3px",fontFamily:"'DM Sans',sans-serif",fontSize:10,color:"#a09080",fontWeight:600,textTransform:"uppercase",letterSpacing:"0.1em" }}>{label}</p>
        <p style={{ margin:"0 0 4px",fontFamily:"'Cormorant Garamond',serif",fontSize:24,fontWeight:700,color:"#1a0a00",lineHeight:1 }}>{value}</p>
        <div style={{ display:"flex",alignItems:"center",gap:6 }}>
          {trend!=null&&<span style={{ fontFamily:"'DM Sans',sans-serif",fontSize:10,fontWeight:700,color:trend>=0?"#16a34a":"#dc2626",background:trend>=0?"#f0fdf4":"#fef2f2",padding:"2px 6px",borderRadius:99 }}>{trend>=0?"↑":"↓"} {Math.abs(trend)}%</span>}
          {sub&&<span style={{ fontFamily:"'DM Sans',sans-serif",fontSize:10,color:"#b0a090" }}>{sub}</span>}
        </div>
      </div>
    );
  }

  function Card({title,sub,children,full}){
    return (
      <div style={{ background:"#fff",borderRadius:14,padding:"18px 20px",border:"1px solid #ede8e0",gridColumn:full?"1/-1":"auto" }}>
        <div style={{ marginBottom:14 }}>
          <p style={{ margin:"0 0 2px",fontFamily:"'DM Sans',sans-serif",fontSize:13,fontWeight:600,color:"#1a0a00" }}>{title}</p>
          {sub&&<p style={{ margin:0,fontFamily:"'DM Sans',sans-serif",fontSize:11,color:"#a09080" }}>{sub}</p>}
        </div>
        {children}
      </div>
    );
  }

  return (
    <div>
      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20,flexWrap:"wrap",gap:10 }}>
        <div>
          <h2 style={{ margin:"0 0 3px",fontFamily:"'Cormorant Garamond',serif",fontWeight:700,fontSize:28,color:"#1a0a00" }}>Balance de Ventas</h2>
          <p style={{ margin:0,fontFamily:"'DM Sans',sans-serif",fontSize:12,color:"#a09080" }}>{PERIOD_LABELS[period]}</p>
        </div>
        <div style={{ display:"flex",gap:4,background:"#f5f0e8",borderRadius:10,padding:3 }}>
          {[["day","Diario"],["month","Mensual"],["year","Anual"]].map(([p,l])=>(
            <button key={p} onClick={()=>setPeriod(p)} style={{ padding:"7px 18px",borderRadius:8,border:"none",background:period===p?"#1a0a00":"transparent",color:period===p?"#f5f0e8":"#8a7560",fontFamily:"'DM Sans',sans-serif",fontSize:12,fontWeight:period===p?600:400,cursor:"pointer",transition:"all 0.2s" }}>{l}</button>
          ))}
        </div>
      </div>
      <ErrorMsg msg={error} />
      {loading ? <Spinner /> : (
        <div style={{ display:"flex",flexDirection:"column",gap:14 }}>
          <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(170px,1fr))",gap:12 }}>
            <KpiCard label="Ventas hoy"         value={fmtK(kpis.today)}     sub={`${kpis.ordersToday||0} pedidos`}    accent="#c8972a" icon="☕" />
            <KpiCard label="Este mes"            value={fmtK(kpis.thisMonth)} sub={`${kpis.ordersMonth||0} pedidos`}    accent="#3b82f6" icon="📅" />
            <KpiCard label="Este año"            value={fmtK(kpis.thisYear)}                                             accent="#16a34a" icon="📈" />
            <KpiCard label="Ticket promedio"     value={fmtK(kpis.avgTicket)} sub={`Hoy: ${fmtK(kpis.avgTicketToday)}`} accent="#9333ea" icon="🧾" />
            <KpiCard label="Histórico"           value={fmtK(kpis.allTime)}   sub="total acumulado"                      accent="#e07040" icon="💰" trend={trendPct} />
          </div>
          <Card title={period==="day"?"Ingresos por día":period==="month"?"Ingresos por mes":"Ingresos por año"} sub={`${rev.length} períodos · barras = ingresos · línea = pedidos`} full>
            <BarChart data={rev} period={period} />
          </Card>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:14 }}>
            <Card title="Ingresos por categoría" sub="Barras horizontales por monto">
              <HBarChart data={sales?.byCategory||[]} valueKey="revenue" labelKey="category" fmt={v=>{ const n=Number(v||0); return n>=1000000?`$${(n/1000000).toFixed(1)}M`:n>=1000?`$${(n/1000).toFixed(0)}k`:`$${n}`; }} />
            </Card>
            <Card title="Productos más vendidos" sub="Por ingresos generados">
              <HBarChart data={sales?.topProducts||[]} valueKey="revenue" labelKey="name" fmt={v=>{ const n=Number(v||0); return n>=1000?`$${(n/1000).toFixed(0)}k`:`$${n}`; }} />
            </Card>
          </div>
          <div style={{ display:"grid",gridTemplateColumns:"1.5fr 1fr",gap:14 }}>
            <Card title="Pedidos por hora" sub="Volumen de actividad por franja horaria">
              <HourBarChart data={sales?.byHour||[]} />
            </Card>
            <Card title="Empleados mejor valorados" sub="Por rating de clientes">
              <div style={{ display:"flex",flexDirection:"column",gap:10 }}>
                {(analytics?.top_employees||[]).length>0 ? analytics.top_employees.map((e,i)=>(
                  <div key={i} style={{ display:"flex",alignItems:"center",gap:10 }}>
                    <div style={{ width:32,height:32,borderRadius:10,background:i===0?"#fef3c7":"#f5f0e8",border:`2px solid ${i===0?"#c8972a":"#e2d9c8"}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
                      <span style={{ fontFamily:"'DM Sans',sans-serif",fontWeight:700,fontSize:11,color:i===0?"#c8972a":"#8a7560" }}>{e.avatar}</span>
                    </div>
                    <div style={{ flex:1 }}>
                      <p style={{ margin:0,fontFamily:"'DM Sans',sans-serif",fontSize:12,fontWeight:600,color:"#1a0a00" }}>{e.name}</p>
                      <div style={{ display:"flex",alignItems:"center",gap:6,marginTop:2 }}>
                        <Stars value={e.avg_rating||0} size={11} />
                        <span style={{ fontFamily:"'DM Sans',sans-serif",fontSize:10,color:"#a09080" }}>{e.role} · {e.rating_count} reseñas</span>
                      </div>
                    </div>
                    <span style={{ fontFamily:"'Cormorant Garamond',serif",fontSize:18,fontWeight:700,color:"#1a0a00" }}>{Number(e.avg_rating||0).toFixed(1)}</span>
                  </div>
                )) : <div style={{ color:"#c4b89a",fontFamily:"'DM Sans',sans-serif",fontSize:12,textAlign:"center",padding:"20px 0" }}>Sin valoraciones aún</div>}
              </div>
            </Card>
          </div>
          <Card title="Ranking de productos por rating" sub="Valoraciones de clientes" full>
            <HBarChart data={(analytics?.top_items||[]).map(i=>({...i,revenue:i.avg_rating||0}))} valueKey="revenue" labelKey="name" fmt={v=>Number(v).toFixed(1)+" ★"} />
          </Card>
        </div>
      )}
    </div>
  );
}

// ─── ADMIN PANEL ──────────────────────────────────────────────
function AdminPanel({ orders, onUpdateStatus }) {
  const request  = useRequest();
  const { role } = useAuth();
  const canEdit  = ["superadmin","admin"].includes(role);
  const isSuperAdmin = role === "superadmin";

  const [tab,      setTab]      = useState("analytics");
  const [menu,     setMenu]     = useState([]);
  const [services, setServices] = useState([]);
  const [analytics,setAnalytics]= useState(null);
  const [editing,  setEditing]  = useState(null);
  const [form,     setForm]     = useState({});
  const [editSvc,  setEditSvc]  = useState(null);
  const [svcForm,  setSvcForm]  = useState({});
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState("");

  useEffect(()=>{ loadAll(); },[]);

  async function loadAll() {
    setError("");
    try {
      const [m,s,a] = await Promise.all([
        request("GET","/menu/all"),
        request("GET","/services"),
        request("GET","/analytics/summary"),
      ]);
      setMenu(m); setServices(s); setAnalytics(a);
    } catch(e){ setError(e.error||"Error cargando datos"); }
  }

  async function saveItem() {
    setSaving(true); setError("");
    try {
      if(editing==="new") await request("POST","/menu",{...form,category_id:form.category_id||1});
      else                await request("PUT",`/menu/${editing}`,form);
      setEditing(null); await loadAll();
    } catch(e){ setError(e.errors?.join(", ")||e.error||"Error guardando"); }
    setSaving(false);
  }

  async function deleteItem(id) {
    if(!confirm("¿Eliminar producto?")) return;
    try { await request("DELETE",`/menu/${id}`); await loadAll(); }
    catch(e){ setError(e.error||"Sin permiso para eliminar"); }
  }

  async function toggleItem(id) {
    try { await request("PUT",`/menu/${id}/toggle`); await loadAll(); }
    catch(e){ setError(e.error||"Error"); }
  }

  async function saveSvc() {
    setSaving(true); setError("");
    try {
      if(editSvc==="new") await request("POST","/services",svcForm);
      else                await request("PUT",`/services/${editSvc}`,svcForm);
      setEditSvc(null); await loadAll();
    } catch(e){ setError(e.errors?.join(", ")||e.error||"Error guardando"); }
    setSaving(false);
  }

  const tabs=[
    {id:"analytics",label:"Analytics",    icon:"📊"},
    {id:"menu",     label:"Menú",          icon:"🍽️"},
    {id:"services", label:"Servicios",     icon:"⚙️"},
    {id:"employees",label:"Empleados",     icon:"👥"},
    {id:"kitchen",  label:"Cocina",        icon:"👨‍🍳"},
  ];

  return (
    <div>
      {/* Role badge */}
      <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:16 }}>
        <Tag color={role==="superadmin"?"#fef3c7":role==="admin"?"#eff6ff":"#f0fdf4"}
             text={role==="superadmin"?"#92400e":role==="admin"?"#1e40af":"#166534"}>
          {role}
        </Tag>
        <span style={{ fontFamily:"'DM Sans',sans-serif",fontSize:11,color:"#a09080" }}>
          {role==="superadmin"?"Acceso total · puede eliminar":role==="admin"?"Puede crear y editar":"Solo lectura y estados"}
        </span>
      </div>

      <ErrorMsg msg={error} />

      {/* Tabs */}
      <div style={{ display:"flex",gap:4,marginBottom:24,background:"#f5f0e8",borderRadius:12,padding:4,overflowX:"auto" }}>
        {tabs.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{ flex:1,padding:"9px 14px",borderRadius:9,border:"none",background:tab===t.id?"#fff":"transparent",color:tab===t.id?"#1a0a00":"#8a7560",fontSize:12,fontWeight:tab===t.id?600:400,cursor:"pointer",transition:"all 0.2s",fontFamily:"'DM Sans',sans-serif",boxShadow:tab===t.id?"0 1px 4px rgba(0,0,0,0.08)":"none",display:"flex",alignItems:"center",justifyContent:"center",gap:5,whiteSpace:"nowrap" }}>
            <span style={{ fontSize:13 }}>{t.icon}</span>{t.label}
          </button>
        ))}
      </div>

      {tab==="analytics"  && <SalesDashboard analytics={analytics} />}
      {tab==="employees"  && <EmployeesPanel />}
      {tab==="kitchen"    && <KitchenView orders={orders} onUpdateStatus={onUpdateStatus} />}

      {tab==="menu" && (
        <div>
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18 }}>
            <p style={{ margin:0,fontFamily:"'DM Sans',sans-serif",fontSize:13,color:"#8a7560" }}>{menu.length} productos</p>
            {canEdit && (
              <button onClick={()=>{ setEditing("new"); setForm({category_id:1,name:"",description:"",price:0,emoji:"☕",available:true,prep_time:5,ingredients:[]}); }}
                style={{ padding:"9px 20px",borderRadius:10,border:"none",background:"#1a0a00",color:"#f5f0e8",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"'DM Sans',sans-serif" }}>
                + Agregar producto
              </button>
            )}
          </div>
          {editing && canEdit && (
            <div style={{ background:"#fdfaf6",borderRadius:16,padding:"1.5rem",marginBottom:18,border:"2px solid #c8972a" }}>
              <p style={{ margin:"0 0 16px",fontFamily:"'Cormorant Garamond',serif",fontWeight:700,fontSize:20,color:"#1a0a00" }}>{editing==="new"?"Nuevo producto":"Editar producto"}</p>
              <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12 }}>
                {[["name","Nombre"],["emoji","Emoji"],["description","Descripción"],["price","Precio (COP)"],["prep_time","Tiempo (min)"]].map(([key,label])=>(
                  <div key={key} style={{ gridColumn:key==="description"?"1/-1":"auto" }}>
                    <label style={{ fontFamily:"'DM Sans',sans-serif",fontSize:11,color:"#8a7560",fontWeight:600,display:"block",marginBottom:4,textTransform:"uppercase",letterSpacing:"0.06em" }}>{label}</label>
                    <input value={form[key]||""} onChange={e=>setForm(f=>({...f,[key]:["price","prep_time"].includes(key)?Number(e.target.value):e.target.value}))}
                      style={{ width:"100%",padding:"9px 12px",borderRadius:9,border:"1.5px solid #e2d9c8",fontSize:14,boxSizing:"border-box",fontFamily:"'DM Sans',sans-serif",color:"#1a0a00",background:"#fff" }} />
                  </div>
                ))}
                <div>
                  <label style={{ fontFamily:"'DM Sans',sans-serif",fontSize:11,color:"#8a7560",fontWeight:600,display:"block",marginBottom:4,textTransform:"uppercase",letterSpacing:"0.06em" }}>Categoría</label>
                  <select value={form.category_id||1} onChange={e=>setForm(f=>({...f,category_id:Number(e.target.value)}))}
                    style={{ width:"100%",padding:"9px 12px",borderRadius:9,border:"1.5px solid #e2d9c8",fontSize:13,fontFamily:"'DM Sans',sans-serif",background:"#fff",color:"#1a0a00" }}>
                    <option value={1}>Cafés</option><option value={2}>Alimentos</option><option value={3}>Especiales</option><option value={4}>No Cafés</option>
                  </select>
                </div>
                <div style={{ display:"flex",alignItems:"center",gap:8,paddingTop:18 }}>
                  <input type="checkbox" id="avail" checked={form.available||false} onChange={e=>setForm(f=>({...f,available:e.target.checked}))} style={{ width:16,height:16,accentColor:"#c8972a",cursor:"pointer" }} />
                  <label htmlFor="avail" style={{ fontFamily:"'DM Sans',sans-serif",fontSize:13,color:"#5a4a30",cursor:"pointer" }}>Disponible</label>
                </div>
              </div>
              <div style={{ display:"flex",gap:8,marginTop:16 }}>
                <button onClick={saveItem} disabled={saving} style={{ padding:"10px 22px",borderRadius:9,border:"none",background:"#1a0a00",color:"#f5f0e8",fontWeight:600,fontSize:13,cursor:"pointer",fontFamily:"'DM Sans',sans-serif" }}>{saving?"Guardando...":"Guardar"}</button>
                <button onClick={()=>setEditing(null)} style={{ padding:"10px 22px",borderRadius:9,border:"1.5px solid #e2d9c8",background:"#fff",color:"#8a7560",fontSize:13,cursor:"pointer",fontFamily:"'DM Sans',sans-serif" }}>Cancelar</button>
              </div>
            </div>
          )}
          <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
            {menu.map(item=>(
              <div key={item.id} style={{ display:"flex",alignItems:"center",gap:14,padding:"12px 16px",background:"#fff",borderRadius:12,border:"1px solid #ede8e0",opacity:item.available?1:0.5,transition:"opacity 0.2s" }}>
                <span style={{ fontSize:22 }}>{item.emoji}</span>
                <div style={{ flex:1 }}>
                  <p style={{ margin:0,fontFamily:"'DM Sans',sans-serif",fontSize:13,fontWeight:600,color:"#1a0a00" }}>{item.name} <span style={{ fontSize:11,color:"#a09080",fontWeight:400 }}>· {item.category}</span></p>
                  <div style={{ display:"flex",alignItems:"center",gap:8,marginTop:3 }}>
                    <Stars value={item.avg_rating||0} size={12} />
                    <span style={{ fontFamily:"'DM Sans',sans-serif",fontSize:11,color:"#a09080" }}>{Number(item.avg_rating||0).toFixed(1)} ({item.rating_count})</span>
                    <span style={{ fontFamily:"'Cormorant Garamond',serif",fontSize:14,fontWeight:600,color:"#3d2a10" }}>${Number(item.price).toLocaleString("es-CO")}</span>
                  </div>
                </div>
                {canEdit && <>
                  <button onClick={()=>toggleItem(item.id)} style={{ padding:"5px 12px",borderRadius:99,border:`1.5px solid ${item.available?"#50c878":"#e2d9c8"}`,background:item.available?"#f0fdf4":"#faf8f5",color:item.available?"#16a34a":"#a09080",fontSize:11,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",fontWeight:600,transition:"all 0.2s" }}>
                    {item.available?"Activo":"Inactivo"}
                  </button>
                  <button onClick={()=>{ setEditing(item.id); setForm({...item}); }} style={{ padding:"6px 12px",borderRadius:9,border:"1px solid #e2d9c8",background:"#faf8f5",fontSize:13,cursor:"pointer",color:"#5a4a30" }}>✏️</button>
                  {isSuperAdmin && <button onClick={()=>deleteItem(item.id)} style={{ padding:"6px 12px",borderRadius:9,border:"1px solid #fecaca",background:"#fff",fontSize:13,cursor:"pointer",color:"#dc2626" }}>🗑️</button>}
                </>}
              </div>
            ))}
          </div>
        </div>
      )}

      {tab==="services" && (
        <div>
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18 }}>
            <p style={{ margin:0,fontFamily:"'DM Sans',sans-serif",fontSize:13,color:"#8a7560" }}>{services.length} servicios</p>
            {canEdit && (
              <button onClick={()=>{ setEditSvc("new"); setSvcForm({icon:"✨",title:"",description:""}); }}
                style={{ padding:"9px 20px",borderRadius:10,border:"none",background:"#1a0a00",color:"#f5f0e8",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"'DM Sans',sans-serif" }}>
                + Agregar servicio
              </button>
            )}
          </div>
          {editSvc && canEdit && (
            <div style={{ background:"#fdfaf6",borderRadius:16,padding:"1.25rem",marginBottom:16,border:"2px solid #c8972a" }}>
              <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10 }}>
                {[["icon","Icono (emoji)"],["title","Título"],["description","Descripción"]].map(([key,label])=>(
                  <div key={key} style={{ gridColumn:key==="description"?"1/-1":"auto" }}>
                    <label style={{ fontFamily:"'DM Sans',sans-serif",fontSize:11,color:"#8a7560",fontWeight:600,display:"block",marginBottom:4,textTransform:"uppercase",letterSpacing:"0.06em" }}>{label}</label>
                    <input value={svcForm[key]||""} onChange={e=>setSvcForm(f=>({...f,[key]:e.target.value}))}
                      style={{ width:"100%",padding:"9px 12px",borderRadius:9,border:"1.5px solid #e2d9c8",fontSize:14,boxSizing:"border-box",fontFamily:"'DM Sans',sans-serif",background:"#fff",color:"#1a0a00" }} />
                  </div>
                ))}
              </div>
              <div style={{ display:"flex",gap:8,marginTop:14 }}>
                <button onClick={saveSvc} disabled={saving} style={{ padding:"9px 20px",borderRadius:9,border:"none",background:"#1a0a00",color:"#f5f0e8",fontWeight:600,fontSize:13,cursor:"pointer",fontFamily:"'DM Sans',sans-serif" }}>{saving?"Guardando...":"Guardar"}</button>
                <button onClick={()=>setEditSvc(null)} style={{ padding:"9px 20px",borderRadius:9,border:"1.5px solid #e2d9c8",background:"#fff",color:"#8a7560",fontSize:13,cursor:"pointer",fontFamily:"'DM Sans',sans-serif" }}>Cancelar</button>
              </div>
            </div>
          )}
          <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(250px,1fr))",gap:12 }}>
            {services.map(svc=>(
              <div key={svc.id} style={{ background:"#fff",borderRadius:14,padding:18,border:"1px solid #ede8e0" }}>
                <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start" }}>
                  <span style={{ fontSize:28 }}>{svc.icon}</span>
                  {canEdit && (
                    <div style={{ display:"flex",gap:4 }}>
                      <button onClick={()=>{ setEditSvc(svc.id); setSvcForm({...svc}); }} style={{ padding:"4px 10px",borderRadius:7,border:"1px solid #e2d9c8",background:"#faf8f5",fontSize:12,cursor:"pointer" }}>✏️</button>
                      {isSuperAdmin && <button onClick={async()=>{ await request("DELETE",`/services/${svc.id}`); await loadAll(); }} style={{ padding:"4px 10px",borderRadius:7,border:"1px solid #fecaca",background:"#fff",fontSize:12,cursor:"pointer",color:"#dc2626" }}>🗑️</button>}
                    </div>
                  )}
                </div>
                <p style={{ margin:"10px 0 5px",fontFamily:"'DM Sans',sans-serif",fontWeight:600,fontSize:14,color:"#1a0a00" }}>{svc.title}</p>
                <p style={{ margin:0,fontFamily:"'DM Sans',sans-serif",fontSize:12,color:"#8a7560",lineHeight:1.6 }}>{svc.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}
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
  const [staffRatingModal,   setStaffRatingModal]   = useState(null);
  const [staffRatingDone,    setStaffRatingDone]    = useState({});
  const [staffRatingHover,   setStaffRatingHover]   = useState(0);

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
    const items=cart.map(c=>({ id:c.id, name:menu.find(m=>m.id===c.id)?.name, qty:c.qty, note:notes[c.id]||"", price:menu.find(m=>m.id===c.id)?.price||0 }));
    await onPlaceOrder({ table_number:tableNum, items });
    setOrdered(true); setCart([]);
  }

  async function rateItem(id,stars) {
    await fetch(`${API}/menu/${id}/rate`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({stars})});
    const updated=await fetch(`${API}/menu`).then(r=>r.json());
    setMenu(updated);
    if(detail?.id===id) setDetail(updated.find(i=>i.id===id));
  }

  async function rateEmployee(employeeId, stars) {
    await fetch(`${API}/employees/${employeeId}/rate`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({stars})});
    const updated=await fetch(`${API}/employees`).then(r=>r.json());
    setStaff(updated);
    setStaffRatingDone(d=>({...d,[employeeId]:true}));
    setStaffRatingModal(null); setStaffRatingHover(0);
  }

  if(loading) return <Spinner />;

  if(ordered) return (
    <div style={{ textAlign:"center",padding:"4rem 1rem" }}>
      <div style={{ fontSize:60,marginBottom:16 }}>🎉</div>
      <h2 style={{ margin:"0 0 10px",fontFamily:"'Cormorant Garamond',serif",fontSize:32,color:"#1a0a00",fontWeight:700 }}>¡Pedido enviado!</h2>
      <p style={{ fontFamily:"'DM Sans',sans-serif",color:"#8a7560",fontSize:15,marginBottom:8 }}>Tu pedido llegó directamente a la cocina.</p>
      <p style={{ fontFamily:"'DM Sans',sans-serif",color:"#b0a090",fontSize:13,marginBottom:28 }}>Mesa #{tableNum} · El equipo lo está preparando</p>
      <button onClick={()=>{ setOrdered(false); setView("menu"); setTableNum(""); }}
        style={{ padding:"12px 32px",borderRadius:99,background:"#1a0a00",color:"#f5f0e8",border:"none",fontFamily:"'DM Sans',sans-serif",fontSize:14,fontWeight:600,cursor:"pointer" }}>
        Hacer otro pedido
      </button>
    </div>
  );

  return (
    <div>
      {/* Nav tabs */}
      <div style={{ display:"flex",gap:6,marginBottom:20,overflowX:"auto",paddingBottom:2 }}>
        {[{id:"menu",label:"🍽️  Menú"},{id:"equipo",label:"⭐  Nuestro Equipo"},{id:"services",label:"✨  Servicios"},{id:"cart",label:`🛒  Carrito${cartCount>0?` (${cartCount})`:""}`}].map(t=>(
          <Pill key={t.id} active={view===t.id} onClick={()=>setView(t.id)}>{t.label}</Pill>
        ))}
      </div>

      {/* MENU */}
      {view==="menu" && (
        <div>
          <div style={{ position:"relative",marginBottom:16 }}>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar en el menú..."
              style={{ width:"100%",padding:"11px 16px 11px 42px",borderRadius:12,border:"1.5px solid #e2d9c8",fontSize:14,boxSizing:"border-box",fontFamily:"'DM Sans',sans-serif",background:"#fff",color:"#1a0a00",outline:"none" }} />
            <span style={{ position:"absolute",left:14,top:"50%",transform:"translateY(-50%)",fontSize:16,opacity:0.4 }}>🔍</span>
          </div>
          <div style={{ display:"flex",gap:6,marginBottom:20,overflowX:"auto",paddingBottom:4 }}>
            {categories.map(c=><Pill key={c} active={cat===c} onClick={()=>setCat(c)}>{c}</Pill>)}
          </div>
          <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(270px,1fr))",gap:14 }}>
            {filtered.map(item=>{
              const inCart=cart.find(c=>c.id===item.id);
              return (
                <div key={item.id} style={{ background:"#fff",borderRadius:16,border:"1px solid #ede8e0",overflow:"hidden",transition:"box-shadow 0.2s" }}
                  onMouseEnter={e=>e.currentTarget.style.boxShadow="0 4px 20px rgba(61,26,0,0.08)"}
                  onMouseLeave={e=>e.currentTarget.style.boxShadow="none"}>
                  <div onClick={()=>setDetail(item)} style={{ padding:"18px 18px 0",cursor:"pointer" }}>
                    <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10 }}>
                      <span style={{ fontSize:36 }}>{item.emoji}</span>
                      <Tag>{item.category}</Tag>
                    </div>
                    <p style={{ margin:"0 0 5px",fontFamily:"'Cormorant Garamond',serif",fontWeight:700,fontSize:18,color:"#1a0a00",lineHeight:1.2 }}>{item.name}</p>
                    <p style={{ margin:"0 0 10px",fontFamily:"'DM Sans',sans-serif",fontSize:12,color:"#8a7560",lineHeight:1.6 }}>{item.description}</p>
                    <div style={{ display:"flex",alignItems:"center",gap:6,marginBottom:14 }}>
                      <Stars value={item.avg_rating||0} size={13} />
                      <span style={{ fontFamily:"'DM Sans',sans-serif",fontSize:11,color:"#a09080" }}>{Number(item.avg_rating||0).toFixed(1)} · {item.rating_count} reseñas</span>
                      {item.prep_time>0&&<span style={{ fontFamily:"'DM Sans',sans-serif",fontSize:11,color:"#c4b89a",marginLeft:"auto" }}>⏱ {item.prep_time} min</span>}
                    </div>
                  </div>
                  <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 18px",borderTop:"1px solid #f5f0e8" }}>
                    <span style={{ fontFamily:"'Cormorant Garamond',serif",fontWeight:700,fontSize:20,color:"#1a0a00" }}>${Number(item.price).toLocaleString("es-CO")}</span>
                    {inCart ? (
                      <div style={{ display:"flex",alignItems:"center",gap:10 }}>
                        <button onClick={()=>removeFromCart(item.id)} style={{ width:30,height:30,borderRadius:99,border:"1.5px solid #e2d9c8",background:"#fff",cursor:"pointer",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center",color:"#5a4a30" }}>−</button>
                        <span style={{ fontFamily:"'DM Sans',sans-serif",fontWeight:700,fontSize:14,minWidth:18,textAlign:"center",color:"#1a0a00" }}>{inCart.qty}</span>
                        <button onClick={()=>addToCart(item.id)} style={{ width:30,height:30,borderRadius:99,border:"none",background:"#3d1a00",color:"#f5f0e8",cursor:"pointer",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center" }}>+</button>
                      </div>
                    ) : (
                      <button onClick={()=>addToCart(item.id)} style={{ padding:"8px 20px",borderRadius:99,border:"none",background:"#1a0a00",color:"#f5f0e8",fontFamily:"'DM Sans',sans-serif",fontSize:12,fontWeight:600,cursor:"pointer",letterSpacing:"0.04em" }}>Agregar</button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* EQUIPO */}
      {view==="equipo" && (
        <div>
          <div style={{ marginBottom:24 }}>
            <h2 style={{ margin:"0 0 6px",fontFamily:"'Cormorant Garamond',serif",fontWeight:700,fontSize:28,color:"#1a0a00" }}>Nuestro Equipo</h2>
            <p style={{ margin:0,fontFamily:"'DM Sans',sans-serif",fontSize:13,color:"#8a7560" }}>Conoce a las personas detrás de cada taza · Deja tu valoración</p>
          </div>
          <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:16 }}>
            {staff.map((emp,idx)=>{
              const color=AVATAR_COLORS[idx%AVATAR_COLORS.length];
              const alreadyRated=staffRatingDone[emp.id];
              return (
                <div key={emp.id} style={{ background:"#fff",borderRadius:18,border:"1px solid #ede8e0",overflow:"hidden",transition:"box-shadow 0.2s" }}
                  onMouseEnter={e=>e.currentTarget.style.boxShadow="0 6px 24px rgba(61,26,0,0.09)"}
                  onMouseLeave={e=>e.currentTarget.style.boxShadow="none"}>
                  <div style={{ height:6,background:color+"60" }} />
                  <div style={{ padding:"20px 20px 0" }}>
                    <div style={{ display:"flex",alignItems:"center",gap:14,marginBottom:14 }}>
                      <div style={{ width:54,height:54,borderRadius:16,background:color+"18",border:"2px solid "+color+"40",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
                        <span style={{ fontFamily:"'DM Sans',sans-serif",fontWeight:700,fontSize:18,color }}>{emp.avatar||emp.name?.slice(0,2).toUpperCase()}</span>
                      </div>
                      <div style={{ flex:1,minWidth:0 }}>
                        <p style={{ margin:0,fontFamily:"'Cormorant Garamond',serif",fontWeight:700,fontSize:19,color:"#1a0a00",lineHeight:1.1 }}>{emp.name}</p>
                        <Tag color={color+"18"} text={color}>{emp.role}</Tag>
                      </div>
                    </div>
                    <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:12 }}>
                      <Stars value={emp.avg_rating||0} size={15} />
                      <span style={{ fontFamily:"'Cormorant Garamond',serif",fontSize:17,fontWeight:700,color:"#1a0a00" }}>
                        {emp.avg_rating>0?Number(emp.avg_rating).toFixed(1):"Sin valoraciones"}
                      </span>
                      <span style={{ fontFamily:"'DM Sans',sans-serif",fontSize:11,color:"#b0a090" }}>({emp.rating_count||0})</span>
                    </div>
                    {emp.notes&&<p style={{ margin:"0 0 16px",fontFamily:"'DM Sans',sans-serif",fontSize:12,color:"#8a7560",lineHeight:1.6,fontStyle:"italic",paddingLeft:10,borderLeft:"2px solid #e2d9c8" }}>"{emp.notes}"</p>}
                  </div>
                  <div style={{ padding:"0 20px 18px" }}>
                    {alreadyRated ? (
                      <div style={{ display:"flex",alignItems:"center",gap:8,padding:"10px 14px",background:"#f0fdf4",borderRadius:10,border:"1px solid #bbf7d0" }}>
                        <span style={{ fontSize:14 }}>✅</span>
                        <span style={{ fontFamily:"'DM Sans',sans-serif",fontSize:12,color:"#16a34a",fontWeight:600 }}>¡Gracias! Tu valoración fue registrada</span>
                      </div>
                    ) : (
                      <button onClick={()=>{ setStaffRatingModal(emp); setStaffRatingHover(0); }}
                        style={{ width:"100%",padding:"10px",borderRadius:10,border:`1.5px solid ${color}40`,background:color+"0d",color,fontFamily:"'DM Sans',sans-serif",fontSize:13,fontWeight:600,cursor:"pointer",letterSpacing:"0.04em",transition:"all 0.2s",display:"flex",alignItems:"center",justifyContent:"center",gap:7 }}>
                        ★ Valorar a {emp.name.split(" ")[0]}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {/* Staff rating modal */}
          {staffRatingModal && (
            <div onClick={()=>setStaffRatingModal(null)} style={{ position:"fixed",inset:0,background:"rgba(26,10,0,0.55)",zIndex:300,display:"flex",alignItems:"center",justifyContent:"center",padding:20,backdropFilter:"blur(6px)" }}>
              <div onClick={e=>e.stopPropagation()} style={{ background:"#fff",borderRadius:22,padding:"2.5rem",maxWidth:380,width:"100%",textAlign:"center",animation:"slideIn 0.25s ease" }}>
                {(()=>{ const idx=staff.findIndex(e=>e.id===staffRatingModal.id); const color=AVATAR_COLORS[idx%AVATAR_COLORS.length]; return (
                  <div style={{ width:70,height:70,borderRadius:20,background:color+"18",border:"2px solid "+color+"40",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 14px" }}>
                    <span style={{ fontFamily:"'DM Sans',sans-serif",fontWeight:700,fontSize:22,color }}>{staffRatingModal.avatar}</span>
                  </div>
                );})()}
                <h3 style={{ margin:"0 0 4px",fontFamily:"'Cormorant Garamond',serif",fontWeight:700,fontSize:26,color:"#1a0a00" }}>{staffRatingModal.name}</h3>
                <p style={{ margin:"0 0 6px",fontFamily:"'DM Sans',sans-serif",fontSize:12,color:"#a09080" }}>{staffRatingModal.role}</p>
                <div style={{ height:1,background:"#f0ece4",margin:"16px 0" }} />
                <p style={{ margin:"0 0 14px",fontFamily:"'DM Sans',sans-serif",fontSize:13,color:"#6b5c3e",fontWeight:500 }}>¿Cómo fue tu experiencia con {staffRatingModal.name.split(" ")[0]}?</p>
                <div style={{ display:"flex",justifyContent:"center",gap:8,marginBottom:10 }}>
                  {[1,2,3,4,5].map(s=>(
                    <span key={s} onMouseEnter={()=>setStaffRatingHover(s)} onMouseLeave={()=>setStaffRatingHover(0)}
                      onClick={()=>rateEmployee(staffRatingModal.id,s)}
                      style={{ fontSize:40,cursor:"pointer",color:s<=(staffRatingHover||Math.round(staffRatingModal.avg_rating||0))?"#c8972a":"#e2d9c8",transition:"all 0.15s",transform:staffRatingHover===s?"scale(1.2)":"scale(1)",display:"inline-block" }}>★</span>
                  ))}
                </div>
                {staffRatingHover>0&&<p style={{ margin:"0 0 16px",fontFamily:"'DM Sans',sans-serif",fontSize:13,color:"#c8972a",fontWeight:600 }}>{["","Muy malo 😕","Regular 😐","Bueno 🙂","Muy bueno 😊","Excelente ⭐"][staffRatingHover]}</p>}
                {!staffRatingHover&&<div style={{ height:36 }}/>}
                <button onClick={()=>setStaffRatingModal(null)} style={{ width:"100%",padding:"11px",borderRadius:11,border:"1.5px solid #e2d9c8",background:"#fff",fontFamily:"'DM Sans',sans-serif",fontSize:13,cursor:"pointer",color:"#8a7560" }}>Cancelar</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SERVICES */}
      {view==="services" && (
        <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(250px,1fr))",gap:14 }}>
          {services.map(svc=>(
            <div key={svc.id} style={{ background:"#fff",borderRadius:16,padding:"22px 20px",border:"1px solid #ede8e0",textAlign:"center" }}>
              <div style={{ fontSize:38,marginBottom:12 }}>{svc.icon}</div>
              <p style={{ margin:"0 0 8px",fontFamily:"'Cormorant Garamond',serif",fontWeight:700,fontSize:18,color:"#1a0a00" }}>{svc.title}</p>
              <p style={{ margin:0,fontFamily:"'DM Sans',sans-serif",fontSize:13,color:"#8a7560",lineHeight:1.6 }}>{svc.description}</p>
            </div>
          ))}
        </div>
      )}

      {/* CART */}
      {view==="cart" && (
        <div>
          {cart.length===0 ? (
            <div style={{ textAlign:"center",padding:"4rem 2rem",color:"#c4b89a" }}>
              <div style={{ fontSize:52,marginBottom:12,opacity:0.5 }}>🛒</div>
              <p style={{ margin:"0 0 16px",fontFamily:"'Cormorant Garamond',serif",fontSize:22,color:"#8a7560" }}>Tu carrito está vacío</p>
              <button onClick={()=>setView("menu")} style={{ padding:"9px 24px",borderRadius:99,border:"1.5px solid #e2d9c8",background:"#fff",color:"#8a7560",cursor:"pointer",fontFamily:"'DM Sans',sans-serif",fontSize:13 }}>Ver menú</button>
            </div>
          ) : (
            <div style={{ display:"grid",gridTemplateColumns:"1fr 300px",gap:20,alignItems:"start" }}>
              <div>
                <p style={{ fontFamily:"'Cormorant Garamond',serif",fontWeight:700,fontSize:22,color:"#1a0a00",margin:"0 0 16px" }}>Tu pedido</p>
                {cart.map(c=>{ const item=menu.find(m=>m.id===c.id); if(!item) return null; return (
                  <div key={c.id} style={{ background:"#fff",borderRadius:14,padding:"14px 16px",border:"1px solid #ede8e0",marginBottom:10 }}>
                    <div style={{ display:"flex",alignItems:"center",gap:12 }}>
                      <span style={{ fontSize:22 }}>{item.emoji}</span>
                      <div style={{ flex:1 }}>
                        <p style={{ margin:0,fontFamily:"'DM Sans',sans-serif",fontSize:14,fontWeight:600,color:"#1a0a00" }}>{item.name}</p>
                        <p style={{ margin:0,fontFamily:"'Cormorant Garamond',serif",fontSize:15,color:"#8a7560" }}>${(item.price*c.qty).toLocaleString("es-CO")}</p>
                      </div>
                      <div style={{ display:"flex",alignItems:"center",gap:8 }}>
                        <button onClick={()=>removeFromCart(c.id)} style={{ width:28,height:28,borderRadius:99,border:"1.5px solid #e2d9c8",background:"#fff",cursor:"pointer",fontSize:15,display:"flex",alignItems:"center",justifyContent:"center",color:"#5a4a30" }}>−</button>
                        <span style={{ fontFamily:"'DM Sans',sans-serif",fontWeight:700,fontSize:14,minWidth:18,textAlign:"center",color:"#1a0a00" }}>{c.qty}</span>
                        <button onClick={()=>addToCart(c.id)} style={{ width:28,height:28,borderRadius:99,border:"none",background:"#1a0a00",color:"#f5f0e8",cursor:"pointer",fontSize:15,display:"flex",alignItems:"center",justifyContent:"center" }}>+</button>
                      </div>
                    </div>
                    {noteFor===c.id ? (
                      <div style={{ marginTop:10 }}>
                        <input value={notes[c.id]||""} onChange={e=>setNotes(n=>({...n,[c.id]:e.target.value}))} placeholder="Ej: sin azúcar, extra caliente..." autoFocus
                          style={{ width:"100%",padding:"8px 12px",borderRadius:9,border:"1.5px solid #e2d9c8",fontSize:13,boxSizing:"border-box",fontFamily:"'DM Sans',sans-serif" }} />
                        <button onClick={()=>setNoteFor(null)} style={{ marginTop:5,fontFamily:"'DM Sans',sans-serif",fontSize:12,color:"#8a7560",background:"none",border:"none",cursor:"pointer" }}>✓ Guardar nota</button>
                      </div>
                    ) : (
                      <button onClick={()=>setNoteFor(c.id)} style={{ marginTop:6,fontFamily:"'DM Sans',sans-serif",fontSize:12,color:"#a09080",background:"none",border:"none",cursor:"pointer",padding:0 }}>
                        {notes[c.id]?`📝 "${notes[c.id]}"` : "+ Nota especial"}
                      </button>
                    )}
                  </div>
                );})}
              </div>
              <div style={{ background:"#fff",borderRadius:16,padding:"1.5rem",border:"1px solid #ede8e0",position:"sticky",top:80 }}>
                <p style={{ fontFamily:"'Cormorant Garamond',serif",fontWeight:700,fontSize:20,color:"#1a0a00",margin:"0 0 16px" }}>Resumen</p>
                {cart.map(c=>{ const item=menu.find(m=>m.id===c.id); return item&&(<div key={c.id} style={{ display:"flex",justifyContent:"space-between",fontFamily:"'DM Sans',sans-serif",fontSize:13,color:"#8a7560",marginBottom:7 }}><span>{c.qty}× {item.name}</span><span>${(item.price*c.qty).toLocaleString("es-CO")}</span></div>); })}
                <div style={{ borderTop:"1px solid #ede8e0",paddingTop:14,marginTop:10,display:"flex",justifyContent:"space-between",marginBottom:18 }}>
                  <span style={{ fontFamily:"'DM Sans',sans-serif",fontWeight:600,fontSize:14,color:"#1a0a00" }}>Total</span>
                  <span style={{ fontFamily:"'Cormorant Garamond',serif",fontWeight:700,fontSize:22,color:"#1a0a00" }}>${cartTotal.toLocaleString("es-CO")}</span>
                </div>
                <div style={{ marginBottom:14 }}>
                  <label style={{ fontFamily:"'DM Sans',sans-serif",fontSize:11,color:"#8a7560",fontWeight:600,display:"block",marginBottom:5,textTransform:"uppercase",letterSpacing:"0.06em" }}>Número de mesa *</label>
                  <input type="number" value={tableNum} onChange={e=>setTableNum(e.target.value)} placeholder="Ej: 5"
                    style={{ width:"100%",padding:"10px 14px",borderRadius:10,border:`1.5px solid ${!tableNum?"#f0a0a0":"#e2d9c8"}`,fontSize:15,boxSizing:"border-box",fontFamily:"'DM Sans',sans-serif",color:"#1a0a00" }} />
                </div>
                <button onClick={submitOrder} disabled={!tableNum}
                  style={{ width:"100%",padding:"13px",borderRadius:11,border:"none",background:tableNum?"#1a0a00":"#e2d9c8",color:tableNum?"#f5f0e8":"#b0a090",fontFamily:"'DM Sans',sans-serif",fontWeight:700,fontSize:15,cursor:tableNum?"pointer":"not-allowed",transition:"all 0.2s" }}>
                  Enviar a cocina 🚀
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* DETAIL MODAL */}
      {detail && (
        <div onClick={()=>setDetail(null)} style={{ position:"fixed",inset:0,background:"rgba(26,10,0,0.5)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:20,backdropFilter:"blur(4px)" }}>
          <div onClick={e=>e.stopPropagation()} style={{ background:"#fff",borderRadius:22,padding:"1.75rem",maxWidth:460,width:"100%",maxHeight:"85vh",overflowY:"auto",animation:"slideIn 0.25s ease" }}>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14 }}>
              <div>
                <span style={{ fontSize:44 }}>{detail.emoji}</span>
                <h3 style={{ margin:"10px 0 6px",fontFamily:"'Cormorant Garamond',serif",fontSize:26,fontWeight:700,color:"#1a0a00",lineHeight:1.1 }}>{detail.name}</h3>
                <Tag>{detail.category}</Tag>
              </div>
              <button onClick={()=>setDetail(null)} style={{ border:"none",background:"#f5f0e8",borderRadius:99,width:34,height:34,cursor:"pointer",fontSize:16,color:"#5a4a30",flexShrink:0 }}>✕</button>
            </div>
            <p style={{ fontFamily:"'DM Sans',sans-serif",fontSize:14,color:"#6b5c3e",lineHeight:1.7,marginBottom:16 }}>{detail.description}</p>
            {(detail.ingredients||[]).length>0 && (
              <div style={{ marginBottom:16 }}>
                <p style={{ fontFamily:"'DM Sans',sans-serif",fontSize:11,fontWeight:600,color:"#a09080",textTransform:"uppercase",letterSpacing:"0.1em",margin:"0 0 8px" }}>Ingredientes</p>
                <div style={{ display:"flex",flexWrap:"wrap",gap:6 }}>
                  {detail.ingredients.map((ing,i)=><Tag key={i} color="#faf7f2" text="#6b5c3e">{ing}</Tag>)}
                </div>
              </div>
            )}
            <div style={{ display:"flex",alignItems:"center",gap:12,padding:"14px 0",borderTop:"1px solid #f5f0e8",borderBottom:"1px solid #f5f0e8",marginBottom:16 }}>
              <Stars value={detail.avg_rating||0} size={20} />
              <span style={{ fontFamily:"'Cormorant Garamond',serif",fontWeight:700,fontSize:22,color:"#1a0a00" }}>{Number(detail.avg_rating||0).toFixed(1)}</span>
              <span style={{ fontFamily:"'DM Sans',sans-serif",fontSize:12,color:"#a09080" }}>{detail.rating_count} valoraciones</span>
            </div>
            <p style={{ fontFamily:"'DM Sans',sans-serif",fontSize:11,fontWeight:600,color:"#a09080",textTransform:"uppercase",letterSpacing:"0.1em",margin:"0 0 10px" }}>Tu valoración</p>
            <Stars value={0} size={30} interactive onRate={r=>rateItem(detail.id,r)} />
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:20 }}>
              <span style={{ fontFamily:"'Cormorant Garamond',serif",fontWeight:700,fontSize:26,color:"#1a0a00" }}>${Number(detail.price).toLocaleString("es-CO")}</span>
              <button onClick={()=>{ addToCart(detail.id); setDetail(null); }}
                style={{ padding:"11px 26px",borderRadius:11,border:"none",background:"#1a0a00",color:"#f5f0e8",fontFamily:"'DM Sans',sans-serif",fontWeight:600,fontSize:14,cursor:"pointer" }}>
                Agregar al carrito
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── ROOT APP ─────────────────────────────────────────────────
function AppContent() {
  const { token, role, login, logout, request } = useAuth();
  const [orders,    setOrders]    = useState([]);
  const [appView,   setAppView]   = useState("customer");
  const [loginForm, setLoginForm] = useState({ user:"", pass:"" });

  useEffect(() => {
  localStorage.removeItem("cafe_token");
  localStorage.removeItem("cafe_role");
}, []);

  const [loginError,setLoginError]= useState("");

  // WebSocket — tiempo real
  useEffect(()=>{
    const ws = new WebSocket(WS_URL);
    ws.onmessage = e => {
      const { type, data } = JSON.parse(e.data);
      if(type==="NEW_ORDER")    setOrders(prev=>[data,...prev]);
      if(type==="ORDER_STATUS") setOrders(prev=>prev.map(o=>o.id===data.id?{...o,status:data.status}:o));
    };
    ws.onerror = ()=>{}; // silenciar error si backend no está
    return ()=>ws.close();
  },[]);

  // Cargar pedidos cuando admin/cocina
  useEffect(()=>{
    if((appView==="admin"||appView==="kitchen") && token) {
      request("GET","/orders").then(setOrders).catch(console.error);
    }
  },[appView,token]);

  // Si tiene token guardado, ir directo a admin
  useEffect(()=>{
    if(token && role && appView==="customer") {
      // no auto-redirigir — dejar que el usuario elija
    }
  },[]);

  async function handleLogin() {
    setLoginError("");
    try {
      const res = await fetch(`${API}/auth/login`,{
        method:"POST", headers:{"Content-Type":"application/json"},
        body:JSON.stringify({ username:loginForm.user, password:loginForm.pass }),
      });
      if(!res.ok){ const err=await res.json(); throw err; }
      const { token:t, role:r } = await res.json();
      login(t, r);
      setAppView("admin");
    } catch(e){ setLoginError(e.error||e.errors?.join(", ")||"Error — verifica que el backend esté corriendo"); }
  }

  async function handlePlaceOrder(orderData) {
    const res = await fetch(`${API}/orders`,{
      method:"POST", headers:{"Content-Type":"application/json"},
      body:JSON.stringify(orderData),
    });
    if(!res.ok) throw await res.json();
    return res.json();
  }

  async function updateOrderStatus(orderId, newStatus) {
    await request("PATCH",`/orders/${orderId}/status`,{ status:newStatus });
    setOrders(prev=>prev.map(o=>o.id===orderId?{...o,status:newStatus}:o));
  }

  const pendingCount = orders.filter(o=>o.status==="pending").length;

  return (
    <div style={{ minHeight:"100vh", background:"#faf8f5" }}>
      <style>{FONTS}{`
        *{box-sizing:border-box;} body{margin:0;}
        @keyframes slideIn{from{opacity:0;transform:translateY(-10px) scale(0.98)}to{opacity:1;transform:translateY(0) scale(1)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
        ::-webkit-scrollbar{width:6px;height:6px;}
        ::-webkit-scrollbar-track{background:#f5f0e8;}
        ::-webkit-scrollbar-thumb{background:#c8b89a;border-radius:99px;}
        input:focus,select:focus{border-color:#c8972a!important;box-shadow:0 0 0 3px rgba(200,151,42,0.12);outline:none;}
      `}</style>

      {/* NAVBAR */}
      <header style={{ background:"#1a0a00",position:"sticky",top:0,zIndex:100,borderBottom:"1px solid rgba(200,151,42,0.2)" }}>
        <div style={{ padding:"0 2rem",display:"flex",justifyContent:"space-between",alignItems:"center",height:62 }}>
          <div style={{ display:"flex",alignItems:"center",gap:12,cursor:"pointer" }} onClick={()=>setAppView("customer")}>
            <div style={{ width:38,height:38,borderRadius:10,background:"rgba(200,151,42,0.15)",border:"1px solid rgba(200,151,42,0.3)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20 }}>☕</div>
            <div>
              <div style={{ fontFamily:"'Cormorant Garamond',serif",fontWeight:700,fontSize:20,color:"#f5f0e8",letterSpacing:"0.02em",lineHeight:1.1 }}>Café Origen</div>
              <div style={{ fontFamily:"'DM Sans',sans-serif",fontSize:8,color:"#c8972a",letterSpacing:"0.25em",textTransform:"uppercase",lineHeight:1 }}>Specialty Coffee</div>
            </div>
          </div>
          <div style={{ display:"flex",gap:6,alignItems:"center" }}>
            {appView!=="customer" && (
              <button onClick={()=>setAppView("customer")} style={{ padding:"7px 16px",borderRadius:99,border:"1px solid rgba(200,151,42,0.35)",background:"transparent",color:"#c8972a",fontFamily:"'DM Sans',sans-serif",fontSize:12,cursor:"pointer",letterSpacing:"0.04em" }}>← Vista cliente</button>
            )}
            <button onClick={()=>setAppView(appView==="kitchen"?"customer":"kitchen")}
              style={{ padding:"7px 16px",borderRadius:99,border:`1px solid ${appView==="kitchen"?"rgba(200,151,42,0.5)":"rgba(255,255,255,0.12)"}`,background:appView==="kitchen"?"rgba(200,151,42,0.15)":"transparent",color:appView==="kitchen"?"#c8972a":"rgba(245,240,232,0.8)",fontFamily:"'DM Sans',sans-serif",fontSize:12,cursor:"pointer",display:"flex",alignItems:"center",gap:7,transition:"all 0.2s" }}>
              <span>👨‍🍳</span> Cocina
              {pendingCount>0&&<span style={{ background:"#e07040",color:"#fff",borderRadius:99,padding:"1px 7px",fontSize:10,fontWeight:700,animation:"pulse 1.5s infinite" }}>{pendingCount}</span>}
            </button>
            {token ? (
              <button onClick={()=>{ logout(); setAppView("customer"); }}
                style={{ padding:"7px 16px",borderRadius:99,border:"1px solid rgba(200,151,42,0.4)",background:"rgba(200,151,42,0.12)",color:"#c8972a",fontFamily:"'DM Sans',sans-serif",fontSize:12,cursor:"pointer",display:"flex",alignItems:"center",gap:6 }}>
                🔓 Salir
              </button>
            ) : (
              <button onClick={()=>setAppView("login")}
                style={{ padding:"7px 20px",borderRadius:99,border:"none",background:"#c8972a",color:"#1a0a00",fontFamily:"'DM Sans',sans-serif",fontSize:12,fontWeight:700,cursor:"pointer",letterSpacing:"0.06em",display:"flex",alignItems:"center",gap:6 }}>
                🔐 Admin
              </button>
            )}
          </div>
        </div>
        {pendingCount>0 && (
          <div style={{ background:"rgba(224,112,64,0.1)",borderTop:"1px solid rgba(224,112,64,0.2)",padding:"5px 2rem",display:"flex",alignItems:"center",gap:10 }}>
            <span style={{ width:7,height:7,borderRadius:99,background:"#e07040",display:"inline-block",animation:"pulse 1.2s infinite" }} />
            <span style={{ fontFamily:"'DM Sans',sans-serif",fontSize:11,color:"#e07040",letterSpacing:"0.06em" }}>{pendingCount} pedido{pendingCount>1?"s":""} esperando en cocina</span>
            <button onClick={()=>setAppView("kitchen")} style={{ marginLeft:"auto",fontFamily:"'DM Sans',sans-serif",fontSize:11,color:"#e07040",background:"none",border:"1px solid rgba(224,112,64,0.35)",borderRadius:99,padding:"3px 12px",cursor:"pointer" }}>Ver cocina →</button>
          </div>
        )}
      </header>

      <div style={{ maxWidth:1120,margin:"0 auto",padding:"2rem 1.5rem" }}>

        {/* LOGIN */}
        {appView==="login" && (
          <div style={{ display:"flex",justifyContent:"center",alignItems:"center",minHeight:"65vh" }}>
            <div style={{ background:"#fff",borderRadius:22,padding:"2.5rem",width:"100%",maxWidth:400,border:"1px solid #ede8e0",animation:"slideIn 0.3s ease" }}>
              <div style={{ textAlign:"center",marginBottom:28 }}>
                <div style={{ fontFamily:"'Cormorant Garamond',serif",fontSize:42,marginBottom:4 }}>☕</div>
                <h2 style={{ margin:"0 0 5px",fontFamily:"'Cormorant Garamond',serif",fontWeight:700,fontSize:28,color:"#1a0a00" }}>Panel Admin</h2>
                <p style={{ margin:0,fontFamily:"'DM Sans',sans-serif",fontSize:13,color:"#a09080" }}>Café Origen · Gestión</p>
              </div>
              <div style={{ display:"flex",flexDirection:"column",gap:14 }}>
                {[["user","Usuario","admin","text"],["pass","Contraseña","••••••••","password"]].map(([key,label,ph,type])=>(
                  <div key={key}>
                    <label style={{ fontFamily:"'DM Sans',sans-serif",fontSize:11,color:"#8a7560",fontWeight:600,display:"block",marginBottom:5,textTransform:"uppercase",letterSpacing:"0.08em" }}>{label}</label>
                    <input type={type} value={loginForm[key]} onChange={e=>setLoginForm(f=>({...f,[key]:e.target.value}))} placeholder={ph}
                      onKeyDown={e=>e.key==="Enter"&&handleLogin()}
                      style={{ width:"100%",padding:"11px 14px",borderRadius:11,border:`1.5px solid ${loginError&&key==="pass"?"#f0a0a0":"#e2d9c8"}`,fontSize:14,fontFamily:"'DM Sans',sans-serif",color:"#1a0a00",background:"#fdfaf6",boxSizing:"border-box" }} />
                  </div>
                ))}
                <ErrorMsg msg={loginError} />
                <button onClick={handleLogin} style={{ padding:"13px",borderRadius:11,border:"none",background:"#1a0a00",color:"#f5f0e8",fontFamily:"'DM Sans',sans-serif",fontWeight:700,fontSize:15,cursor:"pointer",letterSpacing:"0.06em",marginTop:4 }}>
                  Ingresar →
                </button>
                <div style={{ textAlign:"center",fontFamily:"'DM Sans',sans-serif",fontSize:11,color:"#c4b89a" }}>
                  <p style={{ margin:"0 0 2px" }}>admin / cafe2024 (superadmin)</p>
                  <p style={{ margin:"0 0 2px" }}>cocina / cocina2024 (kitchen)</p>
                  <p style={{ margin:0 }}>cajero / cajero2024 (cashier)</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ADMIN */}
        {appView==="admin" && token && (
          <div>
            <div style={{ marginBottom:24 }}>
              <h1 style={{ margin:"0 0 5px",fontFamily:"'Cormorant Garamond',serif",fontWeight:700,fontSize:34,color:"#1a0a00",lineHeight:1 }}>Panel de Administración</h1>
              <p style={{ margin:0,fontFamily:"'DM Sans',sans-serif",fontSize:13,color:"#a09080" }}>Gestión completa · datos en tiempo real</p>
            </div>
            <AdminPanel orders={orders} onUpdateStatus={updateOrderStatus} />
          </div>
        )}

        {/* KITCHEN */}
        {appView==="kitchen" && (
          <div>
            <div style={{ marginBottom:24 }}>
              <h1 style={{ margin:"0 0 5px",fontFamily:"'Cormorant Garamond',serif",fontWeight:700,fontSize:34,color:"#1a0a00",lineHeight:1 }}>Pantalla de Cocina</h1>
              <p style={{ margin:0,fontFamily:"'DM Sans',sans-serif",fontSize:13,color:"#a09080" }}>Pedidos en tiempo real</p>
            </div>
            <KitchenView orders={orders} onUpdateStatus={updateOrderStatus} />
          </div>
        )}

        {/* CUSTOMER */}
        {appView==="customer" && (
          <div>
            <div style={{ background:"#1a0a00",borderRadius:22,padding:"2.5rem",marginBottom:28,position:"relative",overflow:"hidden" }}>
              <div style={{ position:"absolute",top:-40,right:-40,width:200,height:200,borderRadius:99,background:"rgba(200,151,42,0.07)" }} />
              <div style={{ position:"relative" }}>
                <p style={{ margin:"0 0 8px",fontFamily:"'DM Sans',sans-serif",fontSize:11,color:"#c8972a",letterSpacing:"0.2em",textTransform:"uppercase" }}>Bienvenido a</p>
                <h1 style={{ margin:"0 0 10px",fontFamily:"'Cormorant Garamond',serif",fontWeight:700,fontSize:46,color:"#f5f0e8",lineHeight:1 }}>Café Origen</h1>
                <p style={{ margin:"0 0 24px",fontFamily:"'Cormorant Garamond',serif",fontStyle:"italic",fontSize:18,color:"rgba(245,240,232,0.6)",maxWidth:420,lineHeight:1.5 }}>
                  Specialty coffee del corazón de Colombia. Cada taza, una historia.
                </p>
                <div style={{ display:"flex",gap:24 }}>
                  {[["☕","Ver menú"],["⭐","4.8 rating"],["🕐","7am – 9pm"]].map(([ic,lbl])=>(
                    <div key={lbl} style={{ display:"flex",alignItems:"center",gap:7 }}>
                      <span style={{ fontSize:14 }}>{ic}</span>
                      <span style={{ fontFamily:"'DM Sans',sans-serif",fontSize:13,color:"rgba(245,240,232,0.7)" }}>{lbl}</span>
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
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}