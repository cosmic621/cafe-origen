import { useState, useEffect, useRef, useCallback, createContext, useContext } from "react";

// ── FONTS & PALETTE ──────────────────────────────────────────
const FONTS = `@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=Syne:wght@400;500;700;800&display=swap');`;

const C = {
  ink:"#0D0A06", paper:"#F7F2EA", gold:"#B8892A", gold2:"#E8C97A",
  espresso:"#2C1A0A", cream:"#F0E8D5", smoke:"#8A7F72",
  surface:"#FFFCF5",
  granate:"#8B1A1A", dorado:"#C4A35A", doradoDark:"#8B7340", doradoLight:"#E8D5A0",
  terracota:"#A0522D",
  textDark:"#1C0A04", textMid:"#5C3D28", textLight:"#9A7A5A",
  border:"#D4B896", borderLight:"#EAD9C0", bg:"#FAF4EA", bgCard:"#FFFDF5",
  sGreen:"#16a34a", greenBg:"#f0fdf4", greenBorder:"#bbf7d0",
  sYellow:"#b45309", yellowBg:"#fefce8", yellowBorder:"#fde68a",
  sRed:"#dc2626", redBg:"#fef2f2", redBorder:"#fecaca",
  sBlue:"#1d4ed8", blueBg:"#eff6ff", blueBorder:"#bfdbfe",
};
const F = { serif:"'Cormorant Garamond',serif", sans:"'Syne',sans-serif", mono:"monospace" };
const API = "http://localhost:3001/api";
const WS_URL = "ws://localhost:3001";
const AV_COLORS = [C.granate, C.doradoDark, C.sGreen, "#9333ea", C.terracota, "#0891b2"];
const KITCHEN_UNITS = ["kg","g","lb","oz","litros","ml","unidades","cajas","paquetes","docenas"];
const LEAVE_TYPES = ["Incapacidad médica","Permiso personal","Vacaciones","Calamidad doméstica","Permiso de maternidad/paternidad","Otro"];
const ROLES_LIST = ["Barista","Cajero","Cocinero","Mesero","Supervisor","Limpieza"];

// ── CSS ───────────────────────────────────────────────────────
const CSS = `
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html{scroll-behavior:smooth}
body{font-family:'Syne',sans-serif;background:#F7F2EA;color:#0D0A06;overflow-x:hidden;min-height:100vh}
#cursor{position:fixed;width:12px;height:12px;background:#B8892A;border-radius:50%;pointer-events:none;z-index:9999;transform:translate(-50%,-50%);transition:transform .15s,width .2s,height .2s;mix-blend-mode:multiply}
#cursor.big{width:44px;height:44px;background:#E8C97A;opacity:.5}
#cursor.click{transform:translate(-50%,-50%) scale(.7)}
#loader{position:fixed;inset:0;background:#2C1A0A;z-index:8000;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:16px;transition:opacity .8s}
#loader.gone{opacity:0;pointer-events:none}
.loader-logo{font-family:'Cormorant Garamond',serif;font-size:3.5rem;color:#E8C97A;letter-spacing:6px;animation:ldpulse 1.5s ease-in-out infinite}
.loader-bar{width:160px;height:1px;background:rgba(255,255,255,.1);position:relative;overflow:hidden}
.loader-bar::after{content:'';position:absolute;top:0;left:-100%;width:100%;height:100%;background:#E8C97A;animation:ldload 1.4s ease forwards}
@keyframes ldload{to{left:0}}
@keyframes ldpulse{0%,100%{opacity:.6}50%{opacity:1}}

.ara-nav{position:fixed;top:0;left:0;right:0;z-index:500;height:72px;display:flex;align-items:center;justify-content:space-between;padding:0 3rem;transition:background .4s}
.ara-nav.scrolled{background:rgba(247,242,234,.92);backdrop-filter:blur(20px);border-bottom:1px solid rgba(184,137,42,.15)}
.nav-logo{font-family:'Cormorant Garamond',serif;font-size:1.6rem;color:#2C1A0A;letter-spacing:3px;text-transform:uppercase;font-weight:300;cursor:pointer;background:none;border:none}
.nav-logo span{color:#B8892A}
.nav-links{display:flex;align-items:center}
.nav-link{background:none;border:none;font-family:'Syne',sans-serif;font-size:.72rem;letter-spacing:2px;text-transform:uppercase;color:#8A7F72;padding:8px 16px;cursor:pointer;transition:color .2s;position:relative}
.nav-link::after{content:'';position:absolute;bottom:2px;left:50%;right:50%;height:1px;background:#B8892A;transition:left .3s,right .3s}
.nav-link:hover,.nav-link.active{color:#0D0A06}
.nav-link:hover::after,.nav-link.active::after{left:16px;right:16px}
.nav-cart{background:#2C1A0A;color:#E8C97A;border:none;font-family:'Syne',sans-serif;font-size:.72rem;letter-spacing:2px;text-transform:uppercase;padding:10px 24px;cursor:pointer;transition:background .2s;display:flex;align-items:center;gap:8px}
.nav-cart:hover{background:#B8892A;color:#2C1A0A}
.cart-dot{width:18px;height:18px;background:#B8892A;border-radius:50%;color:#2C1A0A;font-size:.65rem;font-weight:700;display:flex;align-items:center;justify-content:center}
.cart-dot.bump{animation:bump .3s ease}
@keyframes bump{0%{transform:scale(1)}50%{transform:scale(1.5)}100%{transform:scale(1)}}
.auth-btn{padding:7px 14px;border-radius:99px;font-family:'Syne',sans-serif;font-size:.68rem;letter-spacing:1.5px;text-transform:uppercase;cursor:pointer;transition:all .2s;border:1px solid rgba(184,137,42,.4);background:transparent;color:#B8892A}
.auth-btn:hover,.auth-btn.av{border-color:rgba(184,137,42,.8);background:rgba(184,137,42,.12)}
.auth-btn.primary{background:#B8892A;color:#2C1A0A;border-color:#B8892A;font-weight:700}
.auth-btn.primary:hover{background:#E8C97A}
.pending-bar{background:rgba(139,26,26,.1);border-top:1px solid rgba(139,26,26,.2);padding:5px 3rem;display:flex;align-items:center;gap:10px}
.pending-dot{width:7px;height:7px;border-radius:50%;background:#8B1A1A;display:inline-block;animation:blink 1.2s infinite}
@keyframes blink{0%,100%{opacity:1}50%{opacity:.3}}

.page{min-height:100vh;padding-top:72px;animation:pageIn .5s ease}
@keyframes pageIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}

.hero{height:calc(100vh - 72px);display:grid;grid-template-columns:1fr 1fr;position:relative;overflow:hidden}
.hero-left{display:flex;flex-direction:column;justify-content:center;padding:5rem 3rem 5rem 4rem}
.hero-eyebrow{font-size:.68rem;letter-spacing:4px;text-transform:uppercase;color:#B8892A;margin-bottom:2rem;display:flex;align-items:center;gap:12px}
.hero-eyebrow::before{content:'';display:inline-block;width:32px;height:1px;background:#B8892A}
.hero-headline{font-family:'Cormorant Garamond',serif;font-size:clamp(3.5rem,6vw,5.5rem);line-height:1.05;font-weight:300;margin-bottom:2rem;letter-spacing:-1px}
.hero-headline em{font-style:italic;color:#B8892A}
.hero-sub{font-size:.88rem;line-height:1.8;color:#8A7F72;max-width:420px;margin-bottom:3rem}
.hero-actions{display:flex;gap:1rem;align-items:center}
.btn-dark{background:#2C1A0A;color:#E8C97A;border:none;font-family:'Syne',sans-serif;font-size:.72rem;letter-spacing:2px;text-transform:uppercase;padding:16px 36px;cursor:pointer;transition:all .25s;position:relative;overflow:hidden}
.btn-dark::before{content:'';position:absolute;inset:0;background:#B8892A;transform:scaleX(0);transform-origin:left;transition:transform .3s ease;z-index:0}
.btn-dark:hover{color:#2C1A0A}.btn-dark:hover::before{transform:scaleX(1)}
.btn-dark span{position:relative;z-index:1}
.btn-ghost{background:transparent;border:1px solid #8A7F72;color:#8A7F72;font-family:'Syne',sans-serif;font-size:.72rem;letter-spacing:2px;text-transform:uppercase;padding:16px 36px;cursor:pointer;transition:all .25s}
.btn-ghost:hover{border-color:#0D0A06;color:#0D0A06}
.hero-right{position:relative;background:#F0E8D5;overflow:hidden;display:flex;align-items:center;justify-content:center}
.hero-bg-text{position:absolute;font-family:'Cormorant Garamond',serif;font-size:18vw;font-weight:300;color:rgba(0,0,0,.04);top:50%;transform:translateY(-50%);white-space:nowrap;pointer-events:none;letter-spacing:-4px}
.hero-card-float{position:relative;z-index:1;width:300px;background:#FFFCF5;border:1px solid rgba(184,137,42,.2);padding:2.5rem;text-align:center;animation:float 4s ease-in-out infinite;transition:opacity .5s}
@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-12px)}}
.hero-card-emoji{font-size:5rem;display:block;margin-bottom:1rem}
.hero-card-name{font-family:'Cormorant Garamond',serif;font-size:1.8rem;font-weight:400;margin-bottom:.5rem}
.hero-card-desc{font-size:.78rem;color:#8A7F72;line-height:1.6;margin-bottom:1.5rem}
.hero-card-price{font-family:'Cormorant Garamond',serif;font-size:1.4rem;color:#B8892A;letter-spacing:1px}
.scroll-hint{display:flex;flex-direction:column;align-items:center;gap:8px;color:#8A7F72;font-size:.65rem;letter-spacing:3px;text-transform:uppercase;padding:2rem 0;animation:bounce 2s infinite}
@keyframes bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(6px)}}
.scroll-line{width:1px;height:40px;background:linear-gradient(to bottom,#B8892A,transparent)}
.stats-bar{background:#2C1A0A;display:grid;grid-template-columns:repeat(4,1fr);border-top:1px solid rgba(184,137,42,.2)}
.stat-item{padding:2.5rem 2rem;text-align:center;border-right:1px solid rgba(255,255,255,.06)}
.stat-item:last-child{border-right:none}
.stat-val{font-family:'Cormorant Garamond',serif;font-size:2.5rem;color:#E8C97A;font-weight:300;display:block}
.stat-lbl{font-size:.65rem;letter-spacing:2px;text-transform:uppercase;color:rgba(255,255,255,.35);margin-top:4px;display:block}
.section{padding:6rem 4rem;max-width:1200px;margin:0 auto}
.sec-label{font-size:.65rem;letter-spacing:4px;text-transform:uppercase;color:#B8892A;margin-bottom:1.5rem;display:flex;align-items:center;gap:12px}
.sec-label::before{content:'';display:inline-block;width:24px;height:1px;background:#B8892A}
.sec-title{font-family:'Cormorant Garamond',serif;font-size:clamp(2rem,4vw,3.2rem);font-weight:300;line-height:1.1;margin-bottom:1rem}
.sec-sub{color:#8A7F72;font-size:.88rem;line-height:1.8;max-width:520px;margin-bottom:3rem}

.featured-strip{display:grid;grid-template-columns:repeat(3,1fr)}
.feat-card{border:1px solid rgba(0,0,0,.08);padding:2.5rem;position:relative;overflow:hidden;cursor:pointer;transition:background .3s}
.feat-card:hover{background:#F0E8D5}
.feat-card::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:#B8892A;transform:scaleX(0);transform-origin:left;transition:transform .4s}
.feat-card:hover::before{transform:scaleX(1)}
.feat-card-num{font-family:'Cormorant Garamond',serif;font-size:4rem;color:rgba(0,0,0,.05);position:absolute;top:1rem;right:1.5rem;line-height:1;font-weight:300;pointer-events:none}
.feat-card-emoji{font-size:2.8rem;display:block;margin-bottom:1.5rem;transition:transform .3s}
.feat-card:hover .feat-card-emoji{transform:scale(1.15) rotate(-5deg)}
.feat-card h3{font-family:'Cormorant Garamond',serif;font-size:1.5rem;font-weight:400;margin-bottom:.5rem}
.feat-card p{font-size:.8rem;color:#8A7F72;line-height:1.6;margin-bottom:1.5rem}
.feat-card-footer{display:flex;align-items:center;justify-content:space-between}
.feat-price{font-family:'Cormorant Garamond',serif;font-size:1.2rem;color:#B8892A}
.feat-add{width:36px;height:36px;background:#2C1A0A;border:none;color:#E8C97A;font-size:1.2rem;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background .2s}
.feat-add:hover{background:#B8892A}
.feat-tag{display:inline-block;font-size:.6rem;letter-spacing:1.5px;text-transform:uppercase;padding:3px 10px;margin-bottom:12px;background:#B8892A;color:#2C1A0A}

.menu-layout{display:grid;grid-template-columns:220px 1fr;gap:4rem;align-items:start}
.menu-sidebar{position:sticky;top:100px}
.filter-list{display:flex;flex-direction:column}
.filter-item{background:none;border:none;text-align:left;padding:12px 0;font-family:'Syne',sans-serif;font-size:.8rem;color:#8A7F72;cursor:pointer;border-bottom:1px solid rgba(0,0,0,.06);display:flex;justify-content:space-between;align-items:center;transition:color .2s}
.filter-item:hover,.filter-item.active{color:#0D0A06;font-weight:700}
.filter-count{font-size:.65rem;background:#B8892A;color:#2C1A0A;width:20px;height:20px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700}
.menu-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:1px;background:rgba(0,0,0,.08)}
.menu-card{background:#FFFCF5;padding:2rem;cursor:pointer;transition:background .25s}
.menu-card:hover{background:#F0E8D5}
.menu-card-top{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:1.5rem}
.menu-emoji{font-size:2.5rem;transition:transform .3s;display:block}
.menu-card:hover .menu-emoji{transform:translateY(-4px) scale(1.1)}
.menu-badge{font-size:.58rem;letter-spacing:1.5px;text-transform:uppercase;padding:4px 10px;display:inline-block}
.badge-hot{background:#1A0A00;color:#E8C97A}
.badge-new{background:#3D6B3A;color:#fff}
.badge-vegan{background:#E8F5E9;color:#3D6B3A}
.menu-name{font-family:'Cormorant Garamond',serif;font-size:1.3rem;font-weight:400;margin-bottom:.4rem;line-height:1.2}
.menu-desc{font-size:.78rem;color:#8A7F72;line-height:1.6;margin-bottom:1.5rem;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.menu-footer{display:flex;align-items:center;justify-content:space-between;border-top:1px solid rgba(0,0,0,.06);padding-top:1rem}
.menu-price{font-family:'Cormorant Garamond',serif;font-size:1.2rem;color:#B8892A}
.menu-btn{background:none;border:1px solid rgba(0,0,0,.12);color:#8A7F72;font-family:'Syne',sans-serif;font-size:.65rem;letter-spacing:1px;text-transform:uppercase;padding:6px 14px;cursor:pointer;transition:all .2s}
.menu-btn:hover{background:#2C1A0A;color:#E8C97A;border-color:#2C1A0A}

.drawer-overlay{position:fixed;inset:0;background:rgba(13,10,6,.6);z-index:600;opacity:0;pointer-events:none;transition:opacity .4s;backdrop-filter:blur(4px)}
.drawer-overlay.open{opacity:1;pointer-events:all}
.drawer{position:fixed;right:0;top:0;bottom:0;width:520px;background:#FFFCF5;z-index:700;transform:translateX(100%);transition:transform .5s cubic-bezier(.16,1,.3,1);overflow-y:auto;display:flex;flex-direction:column}
.drawer.open{transform:translateX(0)}
.drawer-hero{background:#F0E8D5;padding:3rem;position:relative;flex-shrink:0}
.drawer-close{position:absolute;top:1.5rem;right:1.5rem;background:none;border:1px solid rgba(0,0,0,.1);width:36px;height:36px;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:1rem;transition:background .2s}
.drawer-close:hover{background:#2C1A0A;color:#E8C97A}
.drawer-emoji{font-size:5rem;display:block;margin-bottom:1.5rem}
.drawer-name{font-family:'Cormorant Garamond',serif;font-size:2.5rem;font-weight:300;line-height:1.1;margin-bottom:.5rem}
.drawer-origin{font-size:.7rem;letter-spacing:2px;text-transform:uppercase;color:#B8892A;margin-bottom:1rem}
.drawer-price{font-family:'Cormorant Garamond',serif;font-size:1.8rem;color:#B8892A}
.drawer-body{padding:2.5rem;flex:1}
.dsec{font-size:.62rem;letter-spacing:3px;text-transform:uppercase;color:#B8892A;margin:2rem 0 1rem;display:flex;align-items:center;gap:10px}
.dsec::after{content:'';flex:1;height:1px;background:rgba(184,137,42,.2)}
.drawer-desc{font-size:.88rem;color:#8A7F72;line-height:1.8}
.ing-list{display:flex;flex-wrap:wrap;gap:8px}
.ing-pill{background:#F0E8D5;border:1px solid rgba(184,137,42,.2);font-size:.75rem;padding:6px 14px;color:#2C1A0A;display:flex;align-items:center;gap:6px}
.steps-ol{list-style:none;counter-reset:s;display:flex;flex-direction:column;gap:12px;padding:0}
.steps-ol li{counter-increment:s;display:flex;gap:14px;font-size:.85rem;color:#444;line-height:1.6}
.steps-ol li::before{content:counter(s);min-width:24px;height:24px;background:#2C1A0A;color:#E8C97A;font-size:.65rem;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:2px}
.video-btn{width:100%;background:#2C1A0A;border:none;color:#E8C97A;font-family:'Syne',sans-serif;font-size:.72rem;letter-spacing:2px;text-transform:uppercase;padding:18px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:12px;transition:background .2s;margin-top:1rem}
.video-btn:hover{background:#B8892A;color:#2C1A0A}
.play-icon{width:28px;height:28px;border:1px solid currentColor;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:.7rem}
.drawer-footer{padding:2rem 2.5rem;border-top:1px solid rgba(0,0,0,.06);background:#FFFCF5;display:flex;gap:12px;align-items:center;flex-shrink:0}
.qty-row{display:flex;align-items:center;border:1px solid rgba(0,0,0,.12)}
.qty-btn-d{background:none;border:none;width:40px;height:44px;font-size:1.2rem;cursor:pointer;color:#8A7F72;transition:background .2s;display:flex;align-items:center;justify-content:center}
.qty-btn-d:hover{background:#F0E8D5}
.qty-num{width:40px;text-align:center;font-family:'Cormorant Garamond',serif;font-size:1.2rem}
.add-main-btn{flex:1;background:#2C1A0A;border:none;color:#E8C97A;font-family:'Syne',sans-serif;font-size:.72rem;letter-spacing:2px;text-transform:uppercase;padding:14px;cursor:pointer;transition:background .2s}
.add-main-btn:hover{background:#B8892A;color:#2C1A0A}

.exp-grid{display:grid;grid-template-columns:1fr 1fr;gap:2px;background:rgba(0,0,0,.08)}
.exp-panel{background:#FFFCF5;padding:3rem;cursor:pointer;transition:background .2s;position:relative}
.exp-panel:hover{background:#F0E8D5}
.exp-panel-icon{font-size:2.5rem;display:block;margin-bottom:1.5rem;transition:transform .3s}
.exp-panel:hover .exp-panel-icon{transform:scale(1.2) rotate(-8deg)}
.exp-panel h3{font-family:'Cormorant Garamond',serif;font-size:1.6rem;font-weight:400;margin-bottom:.5rem}
.exp-panel p{font-size:.8rem;color:#8A7F72;line-height:1.7}
.exp-arrow{position:absolute;bottom:2rem;right:2rem;font-size:1.2rem;color:#B8892A;transition:transform .3s,opacity .3s;opacity:0}
.exp-panel:hover .exp-arrow{opacity:1;transform:translateX(4px)}
.exp-modal-bg{position:fixed;inset:0;background:rgba(13,10,6,.7);z-index:800;display:flex;align-items:center;justify-content:center;padding:2rem;backdrop-filter:blur(8px);animation:fadeIn .3s}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
.exp-modal{background:#FFFCF5;max-width:680px;width:100%;max-height:90vh;overflow-y:auto;position:relative}
.exp-modal-header{background:#2C1A0A;padding:2.5rem;color:#E8C97A;position:relative}
.exp-modal-header h2{font-family:'Cormorant Garamond',serif;font-size:2rem;font-weight:300;margin-bottom:.3rem}
.exp-modal-header p{font-size:.78rem;color:rgba(232,201,122,.6);letter-spacing:1px}
.exp-modal-body{padding:2.5rem}
.exp-close{position:absolute;top:1.2rem;right:1.2rem;background:none;border:1px solid rgba(255,255,255,.15);color:rgba(255,255,255,.6);width:32px;height:32px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .2s}
.exp-close:hover{background:rgba(255,255,255,.1);color:#fff}

.trivia-q{font-family:'Cormorant Garamond',serif;font-size:1.6rem;font-weight:300;margin-bottom:2rem;line-height:1.3}
.trivia-opts{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:1.5rem}
.t-opt{background:none;border:1px solid rgba(0,0,0,.1);padding:16px;text-align:left;font-family:'Syne',sans-serif;font-size:.8rem;cursor:pointer;transition:all .2s;color:#0D0A06;line-height:1.4;width:100%}
.t-opt:hover:not(:disabled){border-color:#B8892A;background:rgba(184,137,42,.05)}
.t-opt.correct{border-color:#3D6B3A;background:rgba(61,107,58,.08);color:#3D6B3A}
.t-opt.wrong{border-color:#c0392b;background:rgba(192,57,43,.06);color:#c0392b}
.t-opt:disabled{cursor:default}
.trivia-meta{display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;font-size:.72rem;letter-spacing:1px;text-transform:uppercase;color:#8A7F72}
.trivia-pts{color:#B8892A;font-weight:700}
.trivia-progress{height:2px;background:rgba(0,0,0,.06);margin-bottom:2rem}
.trivia-progress-bar{height:100%;background:#B8892A;transition:width .5s}
.trivia-feedback{font-size:.84rem;color:#8A7F72;line-height:1.6;min-height:2.5rem;font-style:italic;margin-bottom:1.5rem}
.trivia-next{background:#2C1A0A;border:none;color:#E8C97A;font-family:'Syne',sans-serif;font-size:.7rem;letter-spacing:2px;text-transform:uppercase;padding:14px 32px;cursor:pointer;transition:background .2s}
.trivia-next:hover{background:#B8892A;color:#2C1A0A}

.wheel-wrap{display:flex;flex-direction:column;align-items:center;gap:2rem}
.wheel-outer{position:relative;width:300px;height:300px}
.wheel-center{position:absolute;inset:0;display:flex;align-items:center;justify-content:center}
.wheel-spin-btn{width:64px;height:64px;background:#FFFCF5;border:3px solid #B8892A;border-radius:50%;font-family:'Syne',sans-serif;font-size:.55rem;letter-spacing:1.5px;font-weight:700;text-transform:uppercase;color:#2C1A0A;cursor:pointer;transition:transform .2s,background .2s}
.wheel-spin-btn:hover:not(:disabled){background:#B8892A;color:#2C1A0A;transform:scale(1.05)}
.wheel-result-text{font-family:'Cormorant Garamond',serif;font-size:1.6rem;color:#2C1A0A;text-align:center;min-height:2.4rem;font-weight:400}

.loyalty-card-v{background:#2C1A0A;padding:2.5rem;color:#E8C97A;max-width:380px;position:relative;overflow:hidden}
.loyalty-card-v::before{content:'ARABICA';position:absolute;font-family:'Cormorant Garamond',serif;font-size:7rem;font-weight:300;color:rgba(232,201,122,.06);bottom:-1rem;right:-1rem;line-height:1;pointer-events:none}
.l-pts-label{font-size:.6rem;letter-spacing:3px;text-transform:uppercase;color:rgba(232,201,122,.5);margin-bottom:4px}
.l-pts-val{font-family:'Cormorant Garamond',serif;font-size:4rem;font-weight:300;color:#E8C97A;line-height:1;margin-bottom:1.5rem}
.stamps-row{display:flex;gap:8px;flex-wrap:wrap}
.stamp{width:38px;height:38px;border:1px solid rgba(232,201,122,.25);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:1rem;color:rgba(232,201,122,.2);transition:all .3s}
.stamp.filled{border-color:#E8C97A;color:#E8C97A;background:rgba(232,201,122,.1)}

.contact-grid{display:grid;grid-template-columns:1fr 1fr;border:1px solid rgba(0,0,0,.08)}
.contact-left{background:#2C1A0A;padding:3rem;color:#E8C97A}
.contact-left h3{font-family:'Cormorant Garamond',serif;font-size:2rem;font-weight:300;margin-bottom:1rem}
.contact-left p{font-size:.82rem;color:rgba(232,201,122,.6);line-height:1.7;margin-bottom:2rem}
.contact-right{background:#FFFCF5;padding:3rem}
.fgroup{margin-bottom:1.5rem}
.fgroup label{display:block;font-size:.62rem;letter-spacing:2px;text-transform:uppercase;color:#8A7F72;margin-bottom:8px}
.fgroup input,.fgroup textarea,.fgroup select{width:100%;background:none;border:none;border-bottom:1px solid rgba(0,0,0,.12);padding:10px 0;font-family:'Syne',sans-serif;font-size:.88rem;color:#0D0A06;transition:border-color .2s;outline:none}
.fgroup input:focus,.fgroup textarea:focus,.fgroup select:focus{border-bottom-color:#B8892A}
.fgroup textarea{resize:vertical;min-height:80px}
.fgroup select{background:transparent;cursor:pointer}
.send-btn{background:#2C1A0A;border:none;color:#E8C97A;font-family:'Syne',sans-serif;font-size:.72rem;letter-spacing:2px;text-transform:uppercase;padding:16px 40px;cursor:pointer;transition:background .2s;width:100%}
.send-btn:hover{background:#B8892A;color:#2C1A0A}

.order-grid{display:grid;grid-template-columns:1fr 380px;gap:4rem;align-items:start}
.cart-item-row{display:flex;gap:1.5rem;padding:1.5rem 0;border-bottom:1px solid rgba(0,0,0,.06);align-items:center}
.ci-emoji{font-size:2.2rem;width:52px;text-align:center}
.ci-info{flex:1}
.ci-name{font-family:'Cormorant Garamond',serif;font-size:1.1rem;font-weight:400;margin-bottom:2px}
.ci-sub{font-size:.75rem;color:#8A7F72}
.ci-price{font-family:'Cormorant Garamond',serif;font-size:1.1rem;color:#B8892A}
.ci-rm{background:none;border:1px solid rgba(0,0,0,.08);width:28px;height:28px;cursor:pointer;font-size:.8rem;color:#8A7F72;display:flex;align-items:center;justify-content:center;transition:all .2s}
.ci-rm:hover{background:#2C1A0A;color:#E8C97A;border-color:#2C1A0A}
.order-summary-box{background:#2C1A0A;padding:2.5rem;position:sticky;top:100px}
.os-title{font-family:'Cormorant Garamond',serif;font-size:1.4rem;color:#E8C97A;font-weight:300;margin-bottom:2rem}
.os-row{display:flex;justify-content:space-between;font-size:.8rem;margin-bottom:12px;color:rgba(232,201,122,.6)}
.os-total{display:flex;justify-content:space-between;font-family:'Cormorant Garamond',serif;font-size:1.4rem;color:#E8C97A;border-top:1px solid rgba(232,201,122,.15);padding-top:1rem;margin-top:.5rem}
.checkout-main{width:100%;background:#B8892A;border:none;color:#2C1A0A;font-family:'Syne',sans-serif;font-size:.72rem;letter-spacing:2px;text-transform:uppercase;padding:18px;cursor:pointer;margin-top:1.5rem;transition:background .2s;font-weight:700}
.checkout-main:hover{background:#E8C97A}
.checkout-main:disabled{opacity:.5;cursor:not-allowed}
.barista-note{margin-top:1.5rem}
.barista-note label{font-size:.6rem;letter-spacing:2px;text-transform:uppercase;color:rgba(232,201,122,.5);display:block;margin-bottom:8px}
.barista-note textarea{width:100%;background:rgba(255,255,255,.04);border:1px solid rgba(232,201,122,.15);color:#E8C97A;font-family:'Syne',sans-serif;font-size:.82rem;padding:10px;resize:none;min-height:60px;outline:none}
.barista-note textarea::placeholder{color:rgba(232,201,122,.2)}

/* FIX: input de mesa */
.table-input-wrap{margin-top:1rem}
.table-input-wrap label{font-size:.6rem;letter-spacing:2px;text-transform:uppercase;color:rgba(232,201,122,.5);display:block;margin-bottom:8px}
.table-input-wrap input{width:100%;background:rgba(255,255,255,.06);border:1px solid rgba(232,201,122,.2);color:#E8C97A;font-family:'Cormorant Garamond',serif;font-size:1.2rem;padding:10px;outline:none;text-align:center}
.table-input-wrap input:focus{border-color:#B8892A}

.admin-tabs{display:flex;gap:0;border-bottom:1px solid rgba(0,0,0,.08);margin-bottom:2rem;overflow-x:auto}
.admin-tab{background:none;border:none;border-bottom:2px solid transparent;padding:12px 18px;font-family:'Syne',sans-serif;font-size:.68rem;letter-spacing:1.5px;text-transform:uppercase;color:#8A7F72;cursor:pointer;transition:all .2s;white-space:nowrap;margin-bottom:-1px}
.admin-tab:hover,.admin-tab.active{color:#2C1A0A;border-bottom-color:#B8892A}
.admin-tab.active{font-weight:700}

.ara-card{background:#FFFCF5;border:1px solid #EAD9C0;padding:1.25rem 1.5rem}
.ara-input{padding:9px 12px;border:1.5px solid #D4B896;font-family:'Syne',sans-serif;font-size:.82rem;color:#1C0A04;background:#FFFDF5;width:100%;outline:none;transition:border-color .2s}
.ara-input:focus{border-color:#B8892A}
.ara-select{padding:9px 12px;border:1.5px solid #D4B896;font-family:'Syne',sans-serif;font-size:.82rem;color:#1C0A04;background:#FFFDF5;width:100%;outline:none;cursor:pointer}
.ara-label{font-size:.62rem;letter-spacing:2px;text-transform:uppercase;color:#9A7A5A;display:block;margin-bottom:6px}
.ara-btn{border:none;font-family:'Syne',sans-serif;font-size:.68rem;letter-spacing:1.5px;text-transform:uppercase;padding:10px 22px;cursor:pointer;transition:all .2s;display:inline-flex;align-items:center;gap:6px}
.ara-btn.dark{background:#2C1A0A;color:#E8C97A}
.ara-btn.dark:hover{background:#B8892A;color:#2C1A0A}
.ara-btn.gold{background:#B8892A;color:#2C1A0A}
.ara-btn.gold:hover{background:#E8C97A}
.ara-btn.outline{background:transparent;color:#5C3D28;border:1.5px solid #D4B896}
.ara-btn.outline:hover{border-color:#2C1A0A;color:#2C1A0A}
.ara-btn.danger{background:transparent;color:#dc2626;border:1.5px solid #fecaca}
.ara-btn.danger:hover{background:#fef2f2}
.ara-btn:disabled{opacity:.5;cursor:not-allowed}
.ara-btn.full{width:100%;justify-content:center}
.s-pill{display:inline-flex;align-items:center;gap:5px;padding:3px 12px;font-family:'Syne',sans-serif;font-size:.6rem;letter-spacing:1px;text-transform:uppercase;font-weight:600;border:1px solid}
.staff-card{background:#FFFCF5;border:1px solid #EAD9C0;padding:1.5rem;transition:box-shadow .2s}
.staff-card:hover{box-shadow:0 4px 20px rgba(196,163,90,.15)}

.toast{position:fixed;bottom:2.5rem;left:50%;transform:translateX(-50%) translateY(100px);background:#2C1A0A;color:#E8C97A;padding:14px 28px;font-family:'Syne',sans-serif;font-size:.72rem;letter-spacing:2px;text-transform:uppercase;z-index:9000;transition:transform .4s cubic-bezier(.16,1,.3,1),opacity .4s;opacity:0;display:flex;align-items:center;gap:10px;white-space:nowrap;border-left:3px solid #B8892A;pointer-events:none}
.toast.show{transform:translateX(-50%) translateY(0);opacity:1}
.toast.error{border-left-color:#8B1A1A;background:#3D0A0A}

.login-box{background:#FFFCF5;border:1px solid #EAD9C0;padding:3rem;width:100%;max-width:440px;margin:auto}

@media(max-width:780px){
  .hero{grid-template-columns:1fr;height:auto;padding-bottom:3rem}
  .hero-right,.nav-links{display:none}
  .menu-layout,.order-grid,.contact-grid,.exp-grid{grid-template-columns:1fr}
  .menu-sidebar{position:static}
  .stats-bar,.featured-strip{grid-template-columns:repeat(2,1fr)}
  .drawer{width:100%}
  .section{padding:4rem 1.5rem}
  .ara-nav{padding:0 1.5rem}
}
`;

// ── STATIC DATA ───────────────────────────────────────────────
const PRODUCTS = [
  {id:1,name:"Espresso Clásico",cat:"Café",emoji:"☕",price:4500,tag:"hot",origin:"Huila, Colombia",desc:"Concentrado de café puro extraído a alta presión. Intenso, cremoso y con notas de chocolate amargo.",ingredients:[{e:"💧",n:"Agua filtrada"},{e:"🫘",n:"Grano arábica 100%"},{e:"🌡️",n:"90°C exactos"}],steps:["Precalienta la portafiltro y la taza 30 segundos.","Muele 18g de café a granulometría fina.","Extrae 25ml en 25-30 segundos a 9 bares.","Sirve inmediatamente para conservar la crema."],featured:true,video:"https://www.youtube.com/watch?v=ZgIVfpnpFpQ"},
  {id:2,name:"Cappuccino Artesanal",cat:"Café",emoji:"🫧",price:7800,tag:"hot",origin:"Nariño, Colombia",desc:"Equilibrio perfecto entre espresso, leche vaporizada y una espesa capa de espuma texturizada.",ingredients:[{e:"☕",n:"Double shot espresso"},{e:"🥛",n:"Leche entera 150ml"},{e:"🫧",n:"Espuma texturizada"},{e:"🍫",n:"Cacao opcional"}],steps:["Prepara un double shot de espresso.","Vaporiza la leche hasta 65°C.","Vierte con movimiento circular sobre el espresso.","Termina con 1cm de espuma densa."],featured:true,video:"https://www.youtube.com/watch?v=gvPSAa5esEA"},
  {id:3,name:"Cold Brew 24h",cat:"Frío",emoji:"🧊",price:9500,tag:"new",origin:"Tolima, Colombia",desc:"Extraído en frío durante 24 horas. Suave, dulce naturalmente, con baja acidez y notas de caramelo.",ingredients:[{e:"🫘",n:"Grano tostado medio"},{e:"💧",n:"Agua fría 4°C"},{e:"⏱️",n:"24 horas de infusión"},{e:"🧊",n:"Hielo artesanal"}],steps:["Muele 80g a granulometría gruesa.","Combina con 1L de agua fría hermético.","Refrigera 18-24 horas sin agitar.","Filtra con papel y sirve sobre hielo."],featured:false,video:"https://www.youtube.com/watch?v=8oCFxjrKGco"},
  {id:4,name:"Matcha Latte",cat:"Especiales",emoji:"🍵",price:8500,tag:"vegan",origin:"Kyoto, Japón",desc:"Matcha ceremonial de primera cosecha en leche de avena. Cremoso, umami, naturalmente dulce.",ingredients:[{e:"🍵",n:"Matcha ceremonial 3g"},{e:"🌾",n:"Leche de avena"},{e:"💧",n:"Agua 70°C"},{e:"🍯",n:"Agave opcional"}],steps:["Tamiza el matcha para evitar grumos.","Disuelve con 40ml de agua a 70°C.","Vaporiza la leche de avena hasta 60°C.","Vierte y decora con polvo de matcha."],featured:true,video:"https://www.youtube.com/watch?v=bkHMFbNudiA"},
  {id:5,name:"Affogato",cat:"Especiales",emoji:"🍨",price:9200,tag:"new",origin:"Italia / Huila",desc:"Bola de helado de vainilla bourbon bañada en espresso caliente.",ingredients:[{e:"🍦",n:"Helado vainilla bourbon"},{e:"☕",n:"Espresso 25ml"},{e:"🌰",n:"Avellana tostada"},{e:"🍫",n:"Chocolate"}],steps:["Prepara el espresso al momento.","Coloca 2 bolas de helado en vaso frío.","Vierte el espresso caliente sobre el helado.","Decora con avellana y sirve de inmediato."],featured:false,video:""},
  {id:6,name:"Tostada Artesanal",cat:"Comida",emoji:"🥐",price:6500,tag:null,origin:"Panadería local",desc:"Pan de masa madre tostado con mantequilla clarificada y mermelada de temporada.",ingredients:[{e:"🍞",n:"Pan masa madre"},{e:"🧈",n:"Mantequilla clarificada"},{e:"🍓",n:"Mermelada temporada"},{e:"🧂",n:"Sal en escamas"}],steps:["Tuesta el pan en parrilla 2 min por lado.","Aplica mantequilla clarificada en caliente.","Añade mermelada generosa.","Termina con sal en escamas."],featured:false,video:""},
  {id:7,name:"Pour Over V60",cat:"Café",emoji:"⚗️",price:11500,tag:"new",origin:"Cauca, Colombia",desc:"Método manual que resalta todos los matices del grano. Notas florales, cítricas y de frutos rojos.",ingredients:[{e:"🫘",n:"Café Cauca 20g"},{e:"💧",n:"Agua filtrada 300ml"},{e:"🌡️",n:"96°C constantes"},{e:"📄",n:"Filtro Hario"}],steps:["Pre-infunde 40ml por 30s (bloom).","Vierte en círculos en 3 adiciones.","Cada vertido 45-60s con flujo constante.","Tiempo total: 3:30 minutos."],featured:false,video:"https://www.youtube.com/watch?v=AG4bqA4YLOQ"},
  {id:8,name:"Smoothie de Mango",cat:"Frío",emoji:"🥭",price:8000,tag:"vegan",origin:"Tolima, Colombia",desc:"Mango Tommy fresco licuado con leche de coco y jengibre. Tropical, cremoso y refrescante.",ingredients:[{e:"🥭",n:"Mango Tommy fresco"},{e:"🥥",n:"Leche de coco"},{e:"🫚",n:"Jengibre fresco"},{e:"🍋",n:"Limón tahití"}],steps:["Congela los trozos de mango 2 horas.","Licúa con leche de coco fría y jengibre.","Añade el jugo de limón al gusto.","Sirve en vaso frío inmediatamente."],featured:false,video:""},
];
const TRIVIA = [
  {q:"¿A qué temperatura ideal se extrae un espresso?",opts:["75°C","90-96°C","100°C","60°C"],c:1,exp:"Entre 90 y 96°C se extraen los compuestos aromáticos sin quemarlos."},
  {q:"¿Cuál es el tiempo ideal de extracción de un espresso?",opts:["10 segundos","60 segundos","25-30 segundos","5 minutos"],c:2,exp:"Entre 25 y 30 segundos permite extraer aceites y azúcares sin exceso de amargor."},
  {q:"¿Qué significa \"bloom\" en café filtrado?",opts:["El color del café","La pre-infusión inicial","El tipo de molienda","El origen del grano"],c:1,exp:"El bloom libera el CO₂ acumulado en el grano."},
  {q:"¿Cuál es la diferencia principal entre Arábica y Robusta?",opts:["Solo el color","Arábica tiene más cafeína","Arábica es más suave y aromática","Son iguales"],c:2,exp:"Arábica tiene más azúcares y aromas complejos. Robusta tiene el doble de cafeína."},
  {q:"¿Qué es el cold brew?",opts:["Café helado normal","Extracción en frío por horas","Café con hielo seco","Café de Colombia"],c:1,exp:"El cold brew se extrae en agua fría 12-24 horas: suave y naturalmente dulce."},
];
const WHEEL_PRIZES = ["☕ Espresso gratis","🍫 Descuento 10%","🥐 Tostada gratis","⭐ Doble puntos","🎟️ Bebida del día","🫧 Upgrade a largo","🏆 Bebida gratis","😊 Mejor suerte"];
const WHEEL_COLS = ["#2C1A0A","#B8892A","#3D1F0A","#8B6020","#1A0D05","#C4773B","#4A2010","#A07030"];
const HERO_CARDS = [
  {e:"☕",n:"Espresso Clásico",d:"Extraído a 9 bares. Crema dorada, cuerpo intenso.",p:"$4.500"},
  {e:"🫧",n:"Cappuccino",d:"Leche vaporizada a 65°C. Arte latte incluido.",p:"$7.800"},
  {e:"🧊",n:"Cold Brew 24h",d:"Suave, dulce naturalmente. Sin acidez.",p:"$9.500"},
  {e:"🍵",n:"Matcha Latte",d:"Matcha ceremonial en leche de avena.",p:"$8.500"},
];
const TAG_MAP   = {hot:"Favorito",new:"Nuevo",vegan:"Vegano"};
const BADGE_CLS = {hot:"badge-hot",new:"badge-new",vegan:"badge-vegan"};

// ── UTILS ─────────────────────────────────────────────────────
function loadLS(k,d){try{return JSON.parse(localStorage.getItem(k)||"null")??d;}catch{return d;}}
function saveLS(k,v){try{localStorage.setItem(k,JSON.stringify(v));}catch{}}
function fmt$(v){const n=Number(v||0);return n>=1e6?`$${(n/1e6).toFixed(1)}M`:n>=1000?`$${(n/1000).toFixed(0)}k`:`$${n}`;}

// ── AUTH CONTEXT ──────────────────────────────────────────────
const AuthCtx = createContext(null);
function AuthProvider({children}){
  const [token,setToken]=useState(()=>localStorage.getItem("cafe_token")||"");
  const [role,setRole]=useState(()=>localStorage.getItem("cafe_role")||"");
  const [user,setUser]=useState(()=>localStorage.getItem("cafe_user")||"");
  function login(t,r,u){localStorage.setItem("cafe_token",t);localStorage.setItem("cafe_role",r);localStorage.setItem("cafe_user",u);setToken(t);setRole(r);setUser(u);}
  function logout(){["cafe_token","cafe_role","cafe_user"].forEach(k=>localStorage.removeItem(k));setToken("");setRole("");setUser("");}
  const request=useCallback(async(method,path,body)=>{
    const res=await fetch(`${API}${path}`,{method,headers:{"Content-Type":"application/json",...(token?{Authorization:`Bearer ${token}`}:{})},body:body?JSON.stringify(body):undefined});
    if(res.status===401){logout();throw{error:"Sesión expirada"};}
    if(!res.ok)throw await res.json();
    return res.json();
  },[token]);
  return <AuthCtx.Provider value={{token,role,user,login,logout,request}}>{children}</AuthCtx.Provider>;
}
function useAuth(){return useContext(AuthCtx);}
function useRequest(){return useContext(AuthCtx).request;}

// ── SHARED UI ─────────────────────────────────────────────────
function ABtn({children,onClick,v="dark",disabled=false,full=false,style={}}){
  return <button className={`ara-btn ${v}${full?" full":""}`} onClick={onClick} disabled={disabled} style={style}>{children}</button>;
}
function SPill({status}){
  const MAP={pending:{l:"En espera",bg:C.yellowBg,t:C.sYellow,b:C.yellowBorder},approved:{l:"Aprobado",bg:C.greenBg,t:C.sGreen,b:C.greenBorder},rejected:{l:"Negado",bg:C.redBg,t:C.sRed,b:C.redBorder},delivered:{l:"Entregado",bg:C.blueBg,t:C.sBlue,b:C.blueBorder},preparing:{l:"Preparando",bg:C.blueBg,t:C.sBlue,b:C.blueBorder},ready:{l:"Listo",bg:C.greenBg,t:C.sGreen,b:C.greenBorder}};
  const s=MAP[status]||MAP.pending;
  return <span className="s-pill" style={{background:s.bg,color:s.t,borderColor:s.b}}><span style={{width:5,height:5,borderRadius:"50%",background:s.t,display:"inline-block"}}/>{s.l}</span>;
}
function Stars({value=0,size=14,interactive=false,onRate}){
  const [hov,setHov]=useState(0);
  return <span style={{display:"inline-flex",gap:2}}>{[1,2,3,4,5].map(s=><span key={s} onClick={()=>interactive&&onRate?.(s)} onMouseEnter={()=>interactive&&setHov(s)} onMouseLeave={()=>interactive&&setHov(0)} style={{fontSize:size,cursor:interactive?"pointer":"default",color:s<=(hov||Math.round(value))?"#B8892A":"#EAD9C0",lineHeight:1,transition:"color .15s,transform .1s",transform:interactive&&hov===s?"scale(1.2)":"scale(1)",display:"inline-block"}}>★</span>)}</span>;
}
function Spinner(){return <div style={{textAlign:"center",padding:"3rem",fontFamily:F.sans,color:C.textLight,fontSize:".72rem",letterSpacing:"2px",textTransform:"uppercase"}}>Cargando...</div>;}
function ErrMsg({msg}){if(!msg)return null;return <div style={{background:C.redBg,border:`1px solid ${C.redBorder}`,padding:"10px 14px",fontFamily:F.sans,fontSize:".78rem",color:C.sRed,marginBottom:12}}>{msg}</div>;}
function Toast({msg,visible,isError=false}){return <div className={`toast${visible?" show":""}${isError?" error":""}`}><span>{msg}</span></div>;}

// ── CURSOR ────────────────────────────────────────────────────
function Cursor(){
  const ref=useRef(null);
  useEffect(()=>{
    const el=ref.current;
    const mv=e=>{el.style.left=e.clientX+"px";el.style.top=e.clientY+"px";};
    const md=()=>el.classList.add("click");
    const mu=()=>el.classList.remove("click");
    const mo=e=>{if(e.target.closest("button,a,[role=button]"))el.classList.add("big");else el.classList.remove("big");};
    document.addEventListener("mousemove",mv);document.addEventListener("mousedown",md);document.addEventListener("mouseup",mu);document.addEventListener("mouseover",mo);
    return()=>{document.removeEventListener("mousemove",mv);document.removeEventListener("mousedown",md);document.removeEventListener("mouseup",mu);document.removeEventListener("mouseover",mo);};
  },[]);
  return <div id="cursor" ref={ref}/>;
}

// ── LOADER ────────────────────────────────────────────────────
function Loader({gone}){return <div id="loader" className={gone?"gone":""}><div className="loader-logo">A R Á B I C A</div><div className="loader-bar"/></div>;}

// ── NAV ───────────────────────────────────────────────────────
function Nav({page,setPage,cartCount,cartBump,appView,setAppView,pendingCount}){
  const [scrolled,setScrolled]=useState(false);
  const {token,role,user,logout}=useAuth();
  useEffect(()=>{const h=()=>setScrolled(window.scrollY>20);window.addEventListener("scroll",h);return()=>window.removeEventListener("scroll",h);},[]);
  const isAdmin=["superadmin","admin","cashier"].includes(role);
  return(
    <nav className={`ara-nav${scrolled?" scrolled":""}`}>
      <button className="nav-logo" onClick={()=>{setPage("home");setAppView("customer");}}>Ará<span>bica</span></button>
      <div className="nav-links">
        {appView==="customer"
          ?[["home","Inicio"],["menu","Carta"],["experience","Experiencia"],["order","Pedido"]].map(([id,lbl])=><button key={id} className={`nav-link${page===id?" active":""}`} onClick={()=>setPage(id)}>{lbl}</button>)
          :<span style={{fontFamily:F.sans,fontSize:".72rem",letterSpacing:"2px",textTransform:"uppercase",color:C.smoke,padding:"0 16px"}}>{appView==="admin"?"Panel de Gestión":"Dashboard de Cocina"}</span>
        }
      </div>
      <div style={{display:"flex",gap:8,alignItems:"center"}}>
        {appView!=="customer"&&<button className="auth-btn" onClick={()=>{setAppView("customer");setPage("home");}}>← Volver</button>}
        {token?(
          <>
            {isAdmin&&<button className={`auth-btn${appView==="admin"?" av":""}`} onClick={()=>setAppView("admin")}>📊 Admin</button>}
            <button className={`auth-btn${appView==="kitchen"?" av":""}`} onClick={()=>setAppView("kitchen")} style={{display:"flex",alignItems:"center",gap:6}}>
              👨‍🍳 Cocina
              {pendingCount>0&&<span style={{background:C.granate,color:"#F5E6C8",borderRadius:"99px",padding:"1px 7px",fontSize:".6rem",fontWeight:700}}>{pendingCount}</span>}
            </button>
            <button className="auth-btn" onClick={()=>{logout();setAppView("customer");}}>🔓 {user}</button>
          </>
        ):<button className="auth-btn primary" onClick={()=>setAppView("login")}>🔐 Ingresar</button>}
        {appView==="customer"&&<button className="nav-cart" onClick={()=>setPage("order")}><span>Carrito</span><div className={`cart-dot${cartBump?" bump":""}`}>{cartCount}</div></button>}
      </div>
    </nav>
  );
}

// ── HERO CARD CYCLE ───────────────────────────────────────────
function HeroCard(){
  const [idx,setIdx]=useState(0);const [vis,setVis]=useState(true);
  useEffect(()=>{const t=setInterval(()=>{setVis(false);setTimeout(()=>{setIdx(i=>(i+1)%HERO_CARDS.length);setVis(true);},400);},3500);return()=>clearInterval(t);},[]);
  const c=HERO_CARDS[idx];
  return <div className="hero-card-float" style={{opacity:vis?1:0}}><span className="hero-card-emoji">{c.e}</span><div className="hero-card-name">{c.n}</div><div className="hero-card-desc">{c.d}</div><div className="hero-card-price">{c.p}</div></div>;
}

// ── HOME ──────────────────────────────────────────────────────
function HomePage({setPage,onQuickAdd,orders}){
  const featured=PRODUCTS.filter(p=>p.featured);
  return(
    <div className="page">
      <div className="hero">
        <div className="hero-left">
          <div className="hero-eyebrow">Bogotá · Colombia · Desde 2019</div>
          <h1 className="hero-headline">Cada sorbo<br/>es un <em>ritual</em><br/>de origen</h1>
          <p className="hero-sub">Granos de selección única de las regiones cafeteras de Colombia, preparados con técnica de barismo de competencia.</p>
          <div className="hero-actions">
            <button className="btn-dark" onClick={()=>setPage("menu")}><span>Explorar carta</span></button>
            <button className="btn-ghost" onClick={()=>setPage("experience")}>Vivir la experiencia</button>
          </div>
        </div>
        <div className="hero-right"><div className="hero-bg-text">CAFÉ</div><HeroCard/></div>
      </div>
      <div className="scroll-hint"><div className="scroll-line"/><span>Explorar</span></div>
      <div className="stats-bar">
        <div className="stat-item"><span className="stat-val">12</span><span className="stat-lbl">Bebidas artesanales</span></div>
        <div className="stat-item"><span className="stat-val">3</span><span className="stat-lbl">Orígenes de grano</span></div>
        <div className="stat-item"><span className="stat-val">⭐ 4.9</span><span className="stat-lbl">Calificación</span></div>
        <div className="stat-item"><span className="stat-val">{orders.length}</span><span className="stat-lbl">Pedidos hoy</span></div>
      </div>
      <div className="section">
        <div className="sec-label">Selección del barista</div>
        <h2 className="sec-title">Los favoritos<br/>de la semana</h2>
        <div className="featured-strip">
          {featured.map((p,i)=>(
            <div key={p.id} className="feat-card">
              <div className="feat-card-num">{String(i+1).padStart(2,"0")}</div>
              {p.tag&&<div><span className="feat-tag">{TAG_MAP[p.tag]}</span></div>}
              <span className="feat-card-emoji">{p.emoji}</span>
              <h3>{p.name}</h3><p>{p.desc.slice(0,90)}…</p>
              <div className="feat-card-footer">
                <span className="feat-price">${p.price.toLocaleString()}</span>
                <button className="feat-add" onClick={e=>{e.stopPropagation();onQuickAdd(p);}}>+</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── PRODUCT DRAWER ────────────────────────────────────────────
function ProductDrawer({product,onClose,onAdd}){
  const [qty,setQty]=useState(1);
  useEffect(()=>setQty(1),[product]);
  useEffect(()=>{document.body.style.overflow=product?"hidden":"";return()=>{document.body.style.overflow=""};},[product]);
  return(
    <>
      <div className={`drawer-overlay${product?" open":""}`} onClick={onClose}/>
      <div className={`drawer${product?" open":""}`}>
        {product&&<>
          <div className="drawer-hero">
            <button className="drawer-close" onClick={onClose}>✕</button>
            <span className="drawer-emoji">{product.emoji}</span>
            <div className="drawer-name">{product.name}</div>
            <div className="drawer-origin">{product.origin}</div>
            <div className="drawer-price">${product.price.toLocaleString()}</div>
          </div>
          <div className="drawer-body">
            <div className="dsec">Sobre este café</div>
            <p className="drawer-desc">{product.desc}</p>
            <div className="dsec">Ingredientes</div>
            <div className="ing-list">{product.ingredients.map((ing,i)=><div key={i} className="ing-pill"><span>{ing.e}</span>{ing.n}</div>)}</div>
            <div className="dsec">Preparación</div>
            <ol className="steps-ol">{product.steps.map((s,i)=><li key={i}>{s}</li>)}</ol>
            <button className="video-btn" style={{opacity:product.video?1:.4}} onClick={()=>product.video&&window.open(product.video,"_blank")}>
              <span className="play-icon">▶</span>
              <span>{product.video?"Ver método de preparación":"Video próximamente"}</span>
            </button>
          </div>
          <div className="drawer-footer">
            <div className="qty-row">
              <button className="qty-btn-d" onClick={()=>setQty(q=>Math.max(1,q-1))}>−</button>
              <span className="qty-num">{qty}</span>
              <button className="qty-btn-d" onClick={()=>setQty(q=>q+1)}>+</button>
            </div>
            <button className="add-main-btn" onClick={()=>{onAdd(product,qty);onClose();}}>Agregar al pedido</button>
          </div>
        </>}
      </div>
    </>
  );
}

// ── MENU PAGE ─────────────────────────────────────────────────
function MenuPage({onOpenProduct}){
  const [filter,setFilter]=useState("Todos");
  const cats=["Todos",...new Set(PRODUCTS.map(p=>p.cat))];
  const filtered=filter==="Todos"?PRODUCTS:PRODUCTS.filter(p=>p.cat===filter);
  return(
    <div className="page">
      <div className="section">
        <div className="sec-label">Nuestra carta</div>
        <h2 className="sec-title">Todo el menú</h2>
        <div className="menu-layout">
          <div className="menu-sidebar">
            <p style={{fontFamily:F.sans,fontSize:".68rem",letterSpacing:"2px",textTransform:"uppercase",color:C.smoke,marginBottom:"1.5rem"}}>Filtrar por</p>
            <div className="filter-list">
              {cats.map(c=><button key={c} className={`filter-item${filter===c?" active":""}`} onClick={()=>setFilter(c)}>{c}<span className="filter-count">{c==="Todos"?PRODUCTS.length:PRODUCTS.filter(p=>p.cat===c).length}</span></button>)}
            </div>
          </div>
          <div className="menu-grid">
            {filtered.map(p=>(
              <div key={p.id} className="menu-card" onClick={()=>onOpenProduct(p)}>
                <div className="menu-card-top">
                  <span className="menu-emoji">{p.emoji}</span>
                  {p.tag&&<span className={`menu-badge ${BADGE_CLS[p.tag]}`}>{TAG_MAP[p.tag]}</span>}
                </div>
                <div className="menu-name">{p.name}</div>
                <div className="menu-desc">{p.desc}</div>
                <div className="menu-footer">
                  <span className="menu-price">${p.price.toLocaleString()}</span>
                  <button className="menu-btn" onClick={e=>{e.stopPropagation();onOpenProduct(p);}}>Ver detalles</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── TRIVIA ────────────────────────────────────────────────────
function TriviaGame(){
  const [idx,setIdx]=useState(0);const [score,setScore]=useState(0);const [sel,setSel]=useState(null);
  const q=TRIVIA[idx];const answered=sel!==null;const finished=answered&&idx===TRIVIA.length-1;
  function answer(i){if(answered)return;setSel(i);if(i===q.c)setScore(s=>s+10);}
  return(
    <div>
      <div className="trivia-progress"><div className="trivia-progress-bar" style={{width:`${((idx+1)/TRIVIA.length)*100}%`}}/></div>
      <div className="trivia-meta"><span>Pregunta {idx+1} de {TRIVIA.length}</span><span className="trivia-pts">Puntos: {score}</span></div>
      <div className="trivia-q">{q.q}</div>
      <div className="trivia-opts">{q.opts.map((o,i)=>{let cls="t-opt";if(answered){if(i===q.c)cls+=" correct";else if(i===sel)cls+=" wrong";}return <button key={i} className={cls} disabled={answered} onClick={()=>answer(i)}>{o}</button>;})}</div>
      <div className="trivia-feedback">{answered&&(sel===q.c?`✓ Correcto — ${q.exp}`:`✗ ${q.exp}`)}{finished&&` Obtuviste ${score}/50 pts ${score===50?"— ¡Perfecto! ☕":""}`}</div>
      {answered&&!finished&&<button className="trivia-next" onClick={()=>{setSel(null);setIdx(i=>i+1);}}>Siguiente pregunta →</button>}
    </div>
  );
}

// ── WHEEL ─────────────────────────────────────────────────────
function WheelGame({onToast}){
  const canvasRef=useRef(null);const angleRef=useRef(0);
  const [spinning,setSpinning]=useState(false);const [result,setResult]=useState("¡Gira para descubrir tu premio!");
  const draw=useCallback(()=>{
    const c=canvasRef.current;if(!c)return;
    const ctx=c.getContext("2d");const n=WHEEL_PRIZES.length;
    ctx.clearRect(0,0,300,300);
    for(let i=0;i<n;i++){const a=(2*Math.PI/n)*i+angleRef.current;ctx.beginPath();ctx.moveTo(150,150);ctx.arc(150,150,140,a,a+2*Math.PI/n);ctx.closePath();ctx.fillStyle=WHEEL_COLS[i%WHEEL_COLS.length];ctx.fill();ctx.save();ctx.translate(150,150);ctx.rotate(a+Math.PI/n);ctx.textAlign="right";ctx.fillStyle="#F0E8D5";ctx.font="bold 10.5px Syne,sans-serif";ctx.fillText(WHEEL_PRIZES[i],132,4);ctx.restore();}
    ctx.beginPath();ctx.arc(150,150,22,0,2*Math.PI);ctx.fillStyle="#F7F2EA";ctx.fill();ctx.strokeStyle="#B8892A";ctx.lineWidth=3;ctx.stroke();
  },[]);
  useEffect(()=>{draw();},[draw]);
  function spin(){
    if(spinning)return;setSpinning(true);setResult("Girando…");
    const spins=(Math.random()*6+6)*2*Math.PI;const dur=3600;const start=performance.now();const sa=angleRef.current;
    function step(now){const t=Math.min((now-start)/dur,1);const e=1-Math.pow(1-t,4);angleRef.current=sa+spins*e;draw();
      if(t<1)requestAnimationFrame(step);
      else{setSpinning(false);const n=WHEEL_PRIZES.length;const norm=((angleRef.current%(2*Math.PI))+2*Math.PI)%(2*Math.PI);const sec=Math.floor(((2*Math.PI-norm)/(2*Math.PI)*n+n/2)%n);const prize=WHEEL_PRIZES[sec%n];setResult(`¡Ganaste: ${prize}!`);onToast(`🎉  Premio: ${prize}`);}
    }requestAnimationFrame(step);
  }
  return(
    <div className="wheel-wrap">
      <div style={{color:"#B8892A",fontSize:"1.8rem",marginBottom:"-8px",lineHeight:1}}>▼</div>
      <div className="wheel-outer">
        <canvas ref={canvasRef} width={300} height={300} style={{borderRadius:"50%",boxShadow:"0 20px 60px rgba(0,0,0,.3)"}}/>
        <div className="wheel-center"><button className="wheel-spin-btn" onClick={spin} disabled={spinning}>{spinning?"…":"GIRAR"}</button></div>
      </div>
      <div className="wheel-result-text">{result}</div>
      <p style={{fontSize:".72rem",color:C.smoke,letterSpacing:"1px",textTransform:"uppercase"}}>Muestra el resultado al barista</p>
    </div>
  );
}

// ── LOYALTY ───────────────────────────────────────────────────
function LoyaltyPanel({loyalty,onSimulate}){
  return(
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"2rem",alignItems:"start"}}>
      <div className="loyalty-card-v">
        <div className="l-pts-label">Tus puntos</div>
        <div className="l-pts-val">{loyalty.points.toLocaleString()}</div>
        <div style={{fontSize:".65rem",letterSpacing:"2px",textTransform:"uppercase",color:"rgba(232,201,122,.4)",marginBottom:"1.5rem"}}>puntos acumulados</div>
        <div style={{fontSize:".62rem",letterSpacing:"2px",textTransform:"uppercase",color:"rgba(232,201,122,.5)",marginBottom:10}}>Sellos para bebida gratis</div>
        <div className="stamps-row">{Array(10).fill(0).map((_,i)=><div key={i} className={`stamp${i<loyalty.stamps?" filled":""}`}>☕</div>)}</div>
      </div>
      <div>
        <h4 style={{fontFamily:F.serif,fontSize:"1.3rem",fontWeight:400,marginBottom:"1.2rem"}}>Cómo funciona</h4>
        <div style={{display:"flex",flexDirection:"column",gap:14,fontSize:".82rem",color:C.smoke,lineHeight:1.6}}>
          {[["🛍️","Cada compra suma puntos (valor / 100)"],["☕","Cada bebida agrega 1 sello a tu tarjeta"],["🎁","Con 10 sellos, tu próxima bebida es gratis"],["🏆","500 puntos = 10% de descuento"]].map(([ic,txt])=>(
            <div key={txt} style={{display:"flex",gap:10}}><span>{ic}</span><span>{txt}</span></div>
          ))}
        </div>
        <button className="btn-dark" style={{marginTop:"2rem",fontSize:".7rem",padding:"12px 28px"}} onClick={onSimulate}><span>Simular compra (+puntos)</span></button>
      </div>
    </div>
  );
}

// ── CONTACT FORM ──────────────────────────────────────────────
function ContactForm({onSave}){
  const [name,setName]=useState("");const [type,setType]=useState("Ingredientes / Alergias");const [msg,setMsg]=useState("");const [sent,setSent]=useState(false);
  function send(){if(!name.trim()||!msg.trim())return;onSave({name,type,msg});setSent(true);setName("");setMsg("");setTimeout(()=>setSent(false),4000);}
  return(
    <div>
      <h4 style={{fontFamily:F.serif,fontSize:"1.3rem",fontWeight:400,marginBottom:".4rem"}}>¿Tienes una consulta o pedido especial?</h4>
      <p style={{fontSize:".8rem",color:C.smoke,marginBottom:"2rem",lineHeight:1.6}}>Escríbenos y un barista responderá en menos de 30 minutos durante el horario de apertura.</p>
      <div className="contact-grid">
        <div className="contact-left">
          <h3>Estamos aquí</h3>
          <p>Cra. 13 #85-32, Bogotá<br/>Lunes a Sábado 7am – 8pm</p>
          <div style={{display:"flex",flexDirection:"column",gap:"1rem",fontSize:".8rem",color:"rgba(232,201,122,.7)",marginTop:"1.5rem"}}>
            {[["📍","Zona Rosa, Chapinero Alto"],["📞","+57 310 000 0000"],["✉️","hola@arabica.co"]].map(([ic,txt])=><div key={txt} style={{display:"flex",gap:10}}><span>{ic}</span><span>{txt}</span></div>)}
          </div>
        </div>
        <div className="contact-right">
          <div className="fgroup"><label>Nombre</label><input value={name} onChange={e=>setName(e.target.value)} placeholder="Tu nombre completo"/></div>
          <div className="fgroup"><label>Tipo de consulta</label><select value={type} onChange={e=>setType(e.target.value)}>{["Ingredientes / Alergias","Pedido personalizado","Métodos de preparación","Maridaje y recomendaciones","Otro"].map(o=><option key={o}>{o}</option>)}</select></div>
          <div className="fgroup"><label>Mensaje</label><textarea value={msg} onChange={e=>setMsg(e.target.value)} placeholder="Escribe tu pregunta o solicitud..."/></div>
          <button className="send-btn" onClick={send}>Enviar mensaje</button>
          {sent&&<div style={{background:C.greenBg,color:C.sGreen,padding:14,fontSize:".82rem",marginTop:"1rem",borderLeft:`3px solid ${C.sGreen}`}}>✓  Mensaje enviado — te respondemos pronto.</div>}
        </div>
      </div>
    </div>
  );
}

// ── EXPERIENCE PAGE ───────────────────────────────────────────
function ExperiencePage({loyalty,onSimulateLoyalty,onSaveMessage,onToast}){
  const [modal,setModal]=useState(null);
  const panels=[
    {id:"trivia",icon:"🧠",title:"Trivia Cafetera",desc:"¿Conoces de verdad el café? Pon a prueba tus conocimientos y gana puntos.",sub:"Responde correctamente y acumula puntos"},
    {id:"wheel", icon:"🎡",title:"Ruleta de Premios",desc:"Gira y gana: desde descuentos hasta bebidas completamente gratis.",sub:"Gira una vez por visita"},
    {id:"loyalty",icon:"⭐",title:"Programa Fidelidad",desc:"Acumula sellos con cada consumo y desbloquea tu bebida gratis.",sub:"Tu historial de consumo"},
    {id:"contact",icon:"💬",title:"Consulta al Barista",desc:"¿Alergias? ¿Personalización? Escríbenos ahora.",sub:"Un barista te responde hoy"},
  ];
  const active=panels.find(p=>p.id===modal);
  return(
    <div className="page">
      <div className="section">
        <div className="sec-label">Zona interactiva</div>
        <h2 className="sec-title">Más allá de la taza</h2>
        <p className="sec-sub">Descubre, aprende y gana premios mientras conoces el mundo del café specialty.</p>
        <div className="exp-grid">
          {panels.map(p=>(
            <div key={p.id} className="exp-panel" onClick={()=>setModal(p.id)}>
              <span className="exp-panel-icon">{p.icon}</span>
              <h3>{p.title}</h3><p>{p.desc}</p>
              <span className="exp-arrow">→</span>
            </div>
          ))}
        </div>
      </div>
      {modal&&active&&(
        <div className="exp-modal-bg" onClick={()=>setModal(null)}>
          <div className="exp-modal" onClick={e=>e.stopPropagation()}>
            <div className="exp-modal-header">
              <button className="exp-close" onClick={()=>setModal(null)}>✕</button>
              <h2>{active.title}</h2><p>{active.sub}</p>
            </div>
            <div className="exp-modal-body">
              {modal==="trivia"  &&<TriviaGame key={modal}/>}
              {modal==="wheel"   &&<WheelGame onToast={onToast}/>}
              {modal==="loyalty" &&<LoyaltyPanel loyalty={loyalty} onSimulate={onSimulateLoyalty}/>}
              {modal==="contact" &&<ContactForm onSave={m=>{onSaveMessage(m);onToast("✉️  Mensaje enviado al barista");}}/>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── ORDER PAGE ────────────────────────────────────────────────
// FIX: agrega campo de número de mesa + llama al backend
function OrderPage({cart,onRemove,onCheckout,checkingOut}){
  const [note,setNote]=useState("");
  const [tableNumber,setTableNumber]=useState("");
  const total=cart.reduce((s,i)=>s+i.price*i.qty,0);
  const tableValid=tableNumber.trim()!==""&&Number(tableNumber)>=1&&Number(tableNumber)<=50;

  if(!cart.length)return(
    <div className="page"><div className="section">
      <div className="sec-label">Tu selección</div>
      <h2 className="sec-title">Pedido actual</h2>
      <div style={{textAlign:"center",padding:"6rem 2rem"}}>
        <div style={{fontFamily:F.serif,fontSize:"6rem",color:"rgba(0,0,0,.04)",marginBottom:"1.5rem"}}>VACÍO</div>
        <p style={{color:C.smoke,fontSize:".9rem",marginBottom:"2rem"}}>Aún no has agregado nada a tu pedido</p>
      </div>
    </div></div>
  );
  return(
    <div className="page"><div className="section">
      <div className="sec-label">Tu selección</div>
      <h2 className="sec-title">Pedido actual</h2>
      <div className="order-grid">
        <div>
          {cart.map(item=>(
            <div key={item.id} className="cart-item-row">
              <div className="ci-emoji">{item.emoji}</div>
              <div className="ci-info"><div className="ci-name">{item.name}</div><div className="ci-sub">×{item.qty} · ${(item.price*item.qty).toLocaleString()}</div></div>
              <span className="ci-price">${(item.price*item.qty).toLocaleString()}</span>
              <button className="ci-rm" onClick={()=>onRemove(item.id)}>✕</button>
            </div>
          ))}
        </div>
        <div className="order-summary-box">
          <div className="os-title">Resumen del pedido</div>
          <div className="os-row"><span>Subtotal</span><span>${total.toLocaleString()}</span></div>
          <div className="os-row"><span>Productos</span><span>{cart.reduce((s,i)=>s+i.qty,0)}</span></div>
          <div className="os-total"><span>Total</span><span>${total.toLocaleString()}</span></div>

          {/* FIX: campo de número de mesa obligatorio */}
          <div className="table-input-wrap">
            <label>Número de mesa</label>
            <input
              type="number"
              min="1"
              max="50"
              value={tableNumber}
              onChange={e=>setTableNumber(e.target.value)}
              placeholder="Ej: 5"
            />
          </div>

          <div className="barista-note">
            <label>Nota para el barista</label>
            <textarea value={note} onChange={e=>setNote(e.target.value)} placeholder="Ej: sin azúcar, leche de almendras, para llevar…"/>
          </div>

          <button
            className="checkout-main"
            onClick={()=>onCheckout(note, Number(tableNumber))}
            disabled={checkingOut || !tableValid}
          >
            {checkingOut ? "Enviando…" : !tableValid ? "Ingresa el número de mesa" : "Confirmar pedido"}
          </button>
        </div>
      </div>
    </div></div>
  );
}

// ── LOGIN PAGE ────────────────────────────────────────────────
function LoginPage({onLogin}){
  const [form,setForm]=useState({user:"",pass:""});const [err,setErr]=useState("");const [loading,setLoading]=useState(false);
  async function handleLogin(){
    setErr("");setLoading(true);
    try{
      const res=await fetch(`${API}/auth/login`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({username:form.user,password:form.pass})});
      if(!res.ok){const e=await res.json();throw e;}
      const{token:t,role:r,username:u}=await res.json();
      onLogin(t,r,u);
    }catch(e){setErr(e.error||e.errors?.join(", ")||"Error — verifica que el backend esté corriendo en http://localhost:3001");}
    setLoading(false);
  }
  const creds=[["admin","cafe2024","superadmin"],["cocina","cocina2024","kitchen"],["cajero","cajero2024","cashier"]];
  return(
    <div className="page" style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:"100vh",padding:"2rem"}}>
      <div className="login-box">
        <div style={{textAlign:"center",marginBottom:"2rem"}}>
          <div style={{fontFamily:F.serif,fontSize:"3.5rem",color:C.gold,marginBottom:8,letterSpacing:"4px"}}>☕</div>
          <h2 style={{fontFamily:F.serif,fontSize:"2rem",fontWeight:300,marginBottom:4}}>Bienvenido</h2>
          <p style={{fontFamily:F.sans,fontSize:".68rem",letterSpacing:"2px",textTransform:"uppercase",color:C.smoke}}>Panel de Gestión · Arábica</p>
        </div>
        <ErrMsg msg={err}/>
        <div style={{display:"flex",flexDirection:"column",gap:16,marginBottom:24}}>
          {[["user","Usuario","text"],["pass","Contraseña","password"]].map(([k,l,t])=>(
            <div key={k}>
              <label className="ara-label">{l}</label>
              <input type={t} value={form[k]} onChange={e=>setForm(f=>({...f,[k]:e.target.value}))} className="ara-input" onKeyDown={e=>e.key==="Enter"&&handleLogin()}/>
            </div>
          ))}
        </div>
        <button className="btn-dark" style={{width:"100%",marginBottom:20}} onClick={handleLogin} disabled={loading}><span>{loading?"Verificando…":"Ingresar →"}</span></button>
        <div style={{background:C.cream,padding:"12px 16px"}}>
          <p className="ara-label" style={{marginBottom:8}}>Credenciales de prueba</p>
          {creds.map(([u,p,r])=>(
            <div key={u} onClick={()=>setForm({user:u,pass:p})} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",cursor:"pointer",borderBottom:`1px solid ${C.borderLight}`,fontFamily:F.mono,fontSize:".8rem",color:C.textMid}}>
              <span>{u} / {p}</span>
              <span style={{fontSize:".6rem",background:C.doradoLight,color:C.doradoDark,padding:"2px 8px",letterSpacing:"1px",textTransform:"uppercase"}}>{r}</span>
            </div>
          ))}
          <p style={{fontFamily:F.sans,fontSize:".62rem",color:C.textLight,marginTop:6,textAlign:"center",letterSpacing:"1px"}}>Clic para autocompletar</p>
        </div>
      </div>
    </div>
  );
}

// ── KITCHEN VIEW ──────────────────────────────────────────────
// FIX: normaliza campos del backend (menu_item_name/quantity) y del frontend (name/qty)
function KitchenView({orders,onUpdateStatus}){
  const STATUS={
    pending:  {bg:"#fffbf0",border:C.dorado,  label:"Pendiente", icon:"⏳"},
    preparing:{bg:"#f0f4ff",border:C.sBlue,   label:"Preparando",icon:"🔥"},
    ready:    {bg:"#f0fdf6",border:C.sGreen,  label:"Listo",     icon:"✅"},
    delivered:{bg:C.bg,     border:C.borderLight,label:"Entregado",icon:"📦"},
  };
  const active=orders.filter(o=>o.status!=="delivered"&&o.status!=="cancelled");

  // FIX: función helper para normalizar un item sea del backend o del frontend
  function getItemName(item){ return item.menu_item_name || item.name || "Producto"; }
  function getItemQty(item) { return item.quantity || item.qty || 1; }
  function getItemNote(item){ return item.special_note || item.note || ""; }

  return(
    <div>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:24}}>
        <span style={{width:8,height:8,borderRadius:"50%",background:C.sGreen,display:"inline-block"}}/>
        <span style={{fontFamily:F.sans,fontSize:".68rem",letterSpacing:"2px",textTransform:"uppercase",color:C.textLight}}>EN VIVO · {active.length} pedidos activos</span>
      </div>
      {active.length===0&&<div style={{textAlign:"center",padding:"4rem",color:C.borderLight}}><div style={{fontSize:48,marginBottom:8,opacity:.5}}>🍽️</div><p style={{fontFamily:F.sans,fontSize:".72rem",letterSpacing:"1px",textTransform:"uppercase"}}>Sin pedidos pendientes</p></div>}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(290px,1fr))",gap:14}}>
        {active.map(order=>{
          const s=STATUS[order.status]||STATUS.pending;
          return(
            <div key={order.id} style={{background:s.bg,padding:18,border:`2px solid ${s.border}`,transition:"all .3s"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                <div>
                  <span style={{fontFamily:F.serif,fontWeight:700,fontSize:"1.3rem",color:C.textDark}}>Mesa #{order.table_number||"—"}</span>
                  <span style={{fontFamily:F.sans,fontSize:".68rem",color:C.textLight,marginLeft:8}}>{order.created_at||order.time||""}</span>
                </div>
                <span style={{fontFamily:F.sans,fontSize:".68rem",fontWeight:600,color:C.textMid,background:"rgba(255,255,255,.7)",padding:"3px 10px"}}>{s.icon} {s.label}</span>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:5,marginBottom:14,paddingBottom:14,borderBottom:`1px solid ${s.border}60`}}>
                {(order.items||[]).map((item,i)=>(
                  <div key={i} style={{display:"flex",justifyContent:"space-between"}}>
                    <span style={{fontFamily:F.sans,fontSize:".82rem",color:C.textDark,fontWeight:500}}>
                      {getItemQty(item)}× {getItemName(item)}
                    </span>
                    {getItemNote(item)&&<span style={{fontFamily:F.sans,fontSize:".68rem",color:C.textLight,fontStyle:"italic"}}>"{getItemNote(item)}"</span>}
                  </div>
                ))}
              </div>
              {order.note&&<p style={{fontFamily:F.sans,fontSize:".72rem",color:C.textMid,fontStyle:"italic",marginBottom:10,paddingLeft:8,borderLeft:`2px solid ${s.border}`}}>{order.note}</p>}
              <div style={{display:"flex",gap:8}}>
                {order.status==="pending"   &&<ABtn v="gold"    full onClick={()=>onUpdateStatus(order.id,"preparing")}>🔥 Iniciar preparación</ABtn>}
                {order.status==="preparing" &&<ABtn v="dark"    full onClick={()=>onUpdateStatus(order.id,"ready")}>✅ Marcar listo</ABtn>}
                {order.status==="ready"     &&<ABtn v="outline" full onClick={()=>onUpdateStatus(order.id,"delivered")}>📦 Entregar</ABtn>}
              </div>
            </div>
          );
        })}
      </div>
      {orders.filter(o=>o.status==="delivered").length>0&&(
        <div style={{marginTop:28}}>
          <p style={{fontFamily:F.sans,fontSize:".62rem",letterSpacing:"2px",textTransform:"uppercase",color:C.textLight,marginBottom:10}}>Entregados hoy</p>
          {orders.filter(o=>o.status==="delivered").map(o=>(
            <div key={o.id} style={{display:"flex",justifyContent:"space-between",padding:"8px 14px",background:C.cream,fontSize:".78rem",color:C.textLight,marginBottom:4,fontFamily:F.sans}}>
              <span>Mesa #{o.table_number||"—"} · {(o.items||[]).map(i=>`${getItemQty(i)}× ${getItemName(i)}`).join(", ")}</span>
              <span style={{fontWeight:700,color:C.textMid}}>${Number(o.total||0).toLocaleString()}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // Helper necesario dentro del scope para los entregados
  function getItemName(item){ return item.menu_item_name || item.name || "Producto"; }
  function getItemQty(item) { return item.quantity || item.qty || 1; }
  function getItemNote(item){ return item.special_note || item.note || ""; }
}

// ── SUPPLY PANEL ──────────────────────────────────────────────
function SupplyPanel(){
  const request=useRequest();const{role}=useAuth();const isAdmin=["superadmin","admin"].includes(role);
  const[requests,setReqs]=useState([]);const[loading,setLoading]=useState(true);const[showForm,setShowForm]=useState(false);
  const[note,setNote]=useState("");const[items,setItems]=useState([{product_name:"",quantity:"",unit:"kg"}]);
  const[saving,setSaving]=useState(false);const[err,setErr]=useState("");
  useEffect(()=>{load();},[]);
  async function load(){setLoading(true);try{setReqs(await request("GET","/kitchen-requests"));}catch(e){setErr(e.error||"Error al cargar");}setLoading(false);}
  async function submit(){const valid=items.filter(i=>i.product_name.trim()&&i.quantity.trim());if(!valid.length){setErr("Agrega al menos un producto con cantidad");return;}setSaving(true);setErr("");try{await request("POST","/kitchen-requests",{items:valid,note});setShowForm(false);setItems([{product_name:"",quantity:"",unit:"kg"}]);setNote("");await load();}catch(e){setErr(e.error||"Error");}setSaving(false);}
  async function updateStatus(id,status){try{await request("PATCH",`/kitchen-requests/${id}/status`,{status});await load();}catch(e){setErr(e.error||"Error");}}
  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
        <div><h3 style={{fontFamily:F.serif,fontSize:"1.6rem",fontWeight:300,marginBottom:2}}>Solicitudes de Insumos</h3><p style={{fontFamily:F.sans,fontSize:".68rem",letterSpacing:"1px",color:C.textLight}}>Pedidos de productos para cocina</p></div>
        {!isAdmin&&<ABtn v="dark" onClick={()=>setShowForm(!showForm)}>+ Nueva solicitud</ABtn>}
      </div>
      <ErrMsg msg={err}/>
      {showForm&&!isAdmin&&(
        <div className="ara-card" style={{marginBottom:20,borderColor:C.dorado,borderWidth:2}}>
          <p style={{fontFamily:F.serif,fontSize:"1.2rem",marginBottom:16}}>Nueva solicitud de insumos</p>
          {items.map((item,idx)=>(
            <div key={idx} style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr auto",gap:8,marginBottom:8}}>
              <input className="ara-input" value={item.product_name} onChange={e=>setItems(it=>it.map((x,j)=>j===idx?{...x,product_name:e.target.value}:x))} placeholder="Producto"/>
              <input className="ara-input" value={item.quantity} onChange={e=>setItems(it=>it.map((x,j)=>j===idx?{...x,quantity:e.target.value}:x))} placeholder="Cantidad"/>
              <select className="ara-select" value={item.unit} onChange={e=>setItems(it=>it.map((x,j)=>j===idx?{...x,unit:e.target.value}:x))}>{KITCHEN_UNITS.map(u=><option key={u}>{u}</option>)}</select>
              <button onClick={()=>setItems(it=>it.filter((_,j)=>j!==idx))} style={{background:C.redBg,border:`1px solid ${C.redBorder}`,color:C.sRed,cursor:"pointer",padding:"8px 10px"}}>✕</button>
            </div>
          ))}
          <button onClick={()=>setItems(i=>[...i,{product_name:"",quantity:"",unit:"kg"}])} style={{fontFamily:F.sans,fontSize:".68rem",letterSpacing:"1px",textTransform:"uppercase",color:C.doradoDark,background:"none",border:"none",cursor:"pointer",marginBottom:12}}>+ Agregar producto</button>
          <div style={{marginBottom:12}}><label className="ara-label">Nota adicional</label><textarea className="ara-input" value={note} onChange={e=>setNote(e.target.value)} rows={2} placeholder="Ej: Urgente para el fin de semana..." style={{resize:"vertical"}}/></div>
          <div style={{display:"flex",gap:8}}><ABtn v="dark" onClick={submit} disabled={saving}>{saving?"Enviando...":"Enviar solicitud"}</ABtn><ABtn v="outline" onClick={()=>setShowForm(false)}>Cancelar</ABtn></div>
        </div>
      )}
      {loading?<Spinner/>:(
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          {requests.length===0&&<div style={{textAlign:"center",padding:"3rem",color:C.borderLight,fontFamily:F.sans,fontSize:".8rem",letterSpacing:"1px"}}>Sin solicitudes registradas aún</div>}
          {requests.map(req=>(
            <div key={req.id} className="ara-card">
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
                <div><span style={{fontFamily:F.serif,fontSize:"1.1rem"}}>Solicitud #{req.id}</span><span style={{fontFamily:F.sans,fontSize:".68rem",color:C.textLight,marginLeft:10}}>{req.created_at}</span></div>
                <SPill status={req.status}/>
              </div>
              <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:12}}>
                {(req.items||[]).map((item,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 14px",background:C.cream}}><span style={{fontFamily:F.sans,fontSize:".8rem"}}>{item.product_name}</span><span style={{fontFamily:F.serif,fontSize:".9rem",fontWeight:700,color:C.granate}}>{item.quantity} {item.unit}</span></div>)}
              </div>
              {req.note&&<p style={{fontFamily:F.sans,fontSize:".75rem",color:C.textLight,fontStyle:"italic",marginBottom:12,paddingLeft:10,borderLeft:`2px solid ${C.border}`}}>"{req.note}"</p>}
              {isAdmin&&req.status==="pending"&&<div style={{display:"flex",gap:8}}><ABtn v="outline" onClick={()=>updateStatus(req.id,"approved")} style={{color:C.sGreen,borderColor:C.greenBorder}}>✓ Aprobar</ABtn><ABtn v="danger" onClick={()=>updateStatus(req.id,"rejected")}>✕ Rechazar</ABtn><ABtn v="outline" onClick={()=>updateStatus(req.id,"delivered")}>📦 Entregado</ABtn></div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── LEAVE PANEL ───────────────────────────────────────────────
function LeavePanel({employeesList=[]}){
  const request=useRequest();const{role}=useAuth();const isAdmin=["superadmin","admin"].includes(role);
  const[leaves,setLeaves]=useState([]);const[loading,setLoading]=useState(true);const[showForm,setShowForm]=useState(false);
  const[form,setForm]=useState({employee_name:"",type:LEAVE_TYPES[0],reason:"",date_from:"",date_to:""});
  const[saving,setSaving]=useState(false);const[err,setErr]=useState("");const[adminNote,setAdminNote]=useState({});
  useEffect(()=>{load();},[]);
  async function load(){setLoading(true);try{setLeaves(await request("GET","/leave-requests"));}catch(e){setErr(e.error||"Error");}setLoading(false);}
  async function submit(){if(!form.employee_name||!form.reason||!form.date_from||!form.date_to){setErr("Completa todos los campos");return;}setSaving(true);setErr("");try{await request("POST","/leave-requests",form);setShowForm(false);await load();}catch(e){setErr(e.error||"Error");}setSaving(false);}
  async function updateStatus(id,status){try{await request("PATCH",`/leave-requests/${id}/status`,{status,admin_note:adminNote[id]||""});await load();}catch(e){setErr(e.error||"Error");}}
  const pending=leaves.filter(l=>l.status==="pending");const resolved=leaves.filter(l=>l.status!=="pending");
  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
        <div><h3 style={{fontFamily:F.serif,fontSize:"1.6rem",fontWeight:300,marginBottom:2}}>Incapacidades y Permisos</h3><p style={{fontFamily:F.sans,fontSize:".68rem",letterSpacing:"1px",color:C.textLight}}>Solicitudes del personal</p></div>
        <ABtn v="dark" onClick={()=>setShowForm(!showForm)}>+ Nueva solicitud</ABtn>
      </div>
      <ErrMsg msg={err}/>
      {showForm&&(
        <div className="ara-card" style={{marginBottom:20,borderColor:C.dorado,borderWidth:2}}>
          <p style={{fontFamily:F.serif,fontSize:"1.2rem",marginBottom:16}}>Nueva solicitud</p>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            {isAdmin?(
              <div style={{gridColumn:"1/-1"}}>
                <label className="ara-label">Empleado</label>
                <select className="ara-select" value={form.employee_id||""} onChange={e=>{const emp=employeesList.find(x=>x.id===Number(e.target.value));setForm(f=>({...f,employee_id:e.target.value,employee_name:emp?.name||""}));}}>
                  <option value="">Seleccionar...</option>
                  {employeesList.map(e=><option key={e.id} value={e.id}>{e.name} — {e.role}</option>)}
                </select>
              </div>
            ):(
              <div style={{gridColumn:"1/-1"}}><label className="ara-label">Tu nombre</label><input className="ara-input" value={form.employee_name} onChange={e=>setForm(f=>({...f,employee_name:e.target.value}))} placeholder="Nombre completo"/></div>
            )}
            <div><label className="ara-label">Tipo</label><select className="ara-select" value={form.type} onChange={e=>setForm(f=>({...f,type:e.target.value}))}>{LEAVE_TYPES.map(t=><option key={t}>{t}</option>)}</select></div>
            <div><label className="ara-label">Motivo</label><input className="ara-input" value={form.reason} onChange={e=>setForm(f=>({...f,reason:e.target.value}))} placeholder="Descripción breve"/></div>
            <div><label className="ara-label">Fecha desde</label><input type="date" className="ara-input" value={form.date_from} onChange={e=>setForm(f=>({...f,date_from:e.target.value}))}/></div>
            <div><label className="ara-label">Fecha hasta</label><input type="date" className="ara-input" value={form.date_to} onChange={e=>setForm(f=>({...f,date_to:e.target.value}))}/></div>
          </div>
          <div style={{display:"flex",gap:8,marginTop:16}}><ABtn v="dark" onClick={submit} disabled={saving}>{saving?"Enviando...":"Enviar"}</ABtn><ABtn v="outline" onClick={()=>setShowForm(false)}>Cancelar</ABtn></div>
        </div>
      )}
      {loading?<Spinner/>:(
        <div>
          {pending.length>0&&(
            <div style={{marginBottom:24}}>
              <p style={{fontFamily:F.sans,fontSize:".62rem",letterSpacing:"2px",textTransform:"uppercase",color:C.sYellow,marginBottom:10}}>⏳ En espera ({pending.length})</p>
              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                {pending.map(leave=>(
                  <div key={leave.id} className="ara-card" style={{borderColor:C.yellowBorder,borderWidth:1.5}}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}>
                      <div><p style={{fontFamily:F.serif,fontSize:"1.1rem",marginBottom:4}}>{leave.employee_name}</p><span style={{fontFamily:F.sans,fontSize:".62rem",background:C.cream,color:C.textMid,padding:"3px 10px",letterSpacing:"1px",textTransform:"uppercase"}}>{leave.type}</span></div>
                      <SPill status={leave.status}/>
                    </div>
                    <p style={{fontFamily:F.sans,fontSize:".82rem",color:C.textMid,marginBottom:6}}>{leave.reason}</p>
                    <p style={{fontFamily:F.sans,fontSize:".75rem",color:C.textLight,marginBottom:isAdmin?12:0}}>📅 {leave.date_from} → {leave.date_to}</p>
                    {isAdmin&&(<div><input className="ara-input" value={adminNote[leave.id]||""} onChange={e=>setAdminNote(n=>({...n,[leave.id]:e.target.value}))} placeholder="Nota del administrador (opcional)" style={{marginBottom:8}}/><div style={{display:"flex",gap:8}}><ABtn v="outline" onClick={()=>updateStatus(leave.id,"approved")} style={{color:C.sGreen,borderColor:C.greenBorder}}>✓ Aprobar</ABtn><ABtn v="danger" onClick={()=>updateStatus(leave.id,"rejected")}>✕ Negar</ABtn></div></div>)}
                  </div>
                ))}
              </div>
            </div>
          )}
          {resolved.length>0&&(
            <div>
              <p style={{fontFamily:F.sans,fontSize:".62rem",letterSpacing:"2px",textTransform:"uppercase",color:C.textLight,marginBottom:10}}>Historial</p>
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                {resolved.map(leave=>(
                  <div key={leave.id} className="ara-card" style={{opacity:.85}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      <div><p style={{fontFamily:F.sans,fontSize:".88rem",fontWeight:600}}>{leave.employee_name}</p><p style={{fontFamily:F.sans,fontSize:".75rem",color:C.textLight}}>{leave.type} · {leave.date_from} → {leave.date_to}</p></div>
                      <SPill status={leave.status}/>
                    </div>
                    {leave.admin_note&&<p style={{fontFamily:F.sans,fontSize:".75rem",color:C.textLight,fontStyle:"italic",marginTop:6}}>Nota: "{leave.admin_note}"</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
          {leaves.length===0&&<div style={{textAlign:"center",padding:"3rem",color:C.borderLight,fontFamily:F.sans,fontSize:".78rem",letterSpacing:"1px"}}>Sin solicitudes registradas</div>}
        </div>
      )}
    </div>
  );
}

// ── EMPLOYEES PANEL ───────────────────────────────────────────
function EmployeesPanel(){
  const request=useRequest();const{role}=useAuth();
  const canEdit=["superadmin","admin"].includes(role);const isSuperAdmin=role==="superadmin";
  const[staff,setStaff]=useState([]);const[loading,setLoading]=useState(true);const[filter,setFilter]=useState("Todos");
  const[editing,setEditing]=useState(null);const[form,setForm]=useState({});const[saving,setSaving]=useState(false);
  const[err,setErr]=useState("");const[rModal,setRModal]=useState(null);const[rHov,setRHov]=useState(0);
  useEffect(()=>{load();},[]);
  async function load(){setLoading(true);try{setStaff(await request("GET","/employees/all"));}catch(e){setErr(e.error||"Error");}setLoading(false);}
  async function save(){setSaving(true);setErr("");try{if(editing==="new")await request("POST","/employees",form);else await request("PUT",`/employees/${editing}`,form);setEditing(null);await load();}catch(e){setErr(e.errors?.join(", ")||e.error||"Error");}setSaving(false);}
  async function toggle(id){try{await request("PUT",`/employees/${id}/toggle`);await load();}catch(e){setErr(e.error||"Error");}}
  async function del(id){if(!confirm("¿Eliminar empleado?"))return;try{await request("DELETE",`/employees/${id}`);await load();}catch(e){setErr(e.error||"Error");}}
  async function rate(id,stars){try{await fetch(`${API}/employees/${id}/rate`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({stars})});await load();}catch(e){}setRModal(null);setRHov(0);}
  const filtered=staff.filter(e=>filter==="Todos"||e.role===filter);
  const roleCount=ROLES_LIST.reduce((a,r)=>({...a,[r]:staff.filter(e=>e.role===r).length}),{});
  const avgRating=staff.length?(staff.reduce((s,e)=>s+(Number(e.avg_rating)||0),0)/staff.length).toFixed(1):"—";
  if(loading)return<Spinner/>;
  return(
    <div>
      <ErrMsg msg={err}/>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:1,background:C.borderLight,marginBottom:20}}>
        {[{l:"Total",v:staff.length},{l:"Activos",v:staff.filter(e=>e.active).length},{l:"Rating prom.",v:`${avgRating} ★`},{l:"Roles activos",v:Object.values(roleCount).filter(v=>v>0).length}].map(s=>(
          <div key={s.l} style={{background:"#FFFCF5",padding:"1.2rem 1.5rem"}}>
            <p style={{fontFamily:F.sans,fontSize:".62rem",letterSpacing:"2px",textTransform:"uppercase",color:C.textLight,marginBottom:4}}>{s.l}</p>
            <p style={{fontFamily:F.serif,fontSize:"1.8rem",fontWeight:300,color:C.textDark}}>{s.v}</p>
          </div>
        ))}
      </div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,flexWrap:"wrap",gap:10}}>
        <div style={{display:"flex",gap:0,borderBottom:`1px solid ${C.borderLight}`}}>
          {["Todos",...ROLES_LIST].map(r=>(
            <button key={r} onClick={()=>setFilter(r)} style={{background:"none",border:"none",borderBottom:`2px solid ${filter===r?C.gold:"transparent"}`,padding:"8px 14px",fontFamily:F.sans,fontSize:".68rem",letterSpacing:"1px",textTransform:"uppercase",color:filter===r?C.espresso:C.smoke,cursor:"pointer",whiteSpace:"nowrap",marginBottom:"-1px",transition:"all .2s"}}>
              {r}{r!=="Todos"&&roleCount[r]>0?` (${roleCount[r]})` : ""}
            </button>
          ))}
        </div>
        {canEdit&&<ABtn v="dark" onClick={()=>{setEditing("new");setForm({name:"",role:"Barista",since:"",notes:"",active:true});}}>+ Agregar empleado</ABtn>}
      </div>
      {editing&&canEdit&&(
        <div className="ara-card" style={{marginBottom:18,borderColor:C.dorado,borderWidth:2}}>
          <p style={{fontFamily:F.serif,fontSize:"1.2rem",marginBottom:16}}>{editing==="new"?"Nuevo empleado":"Editar empleado"}</p>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            {[["name","Nombre completo"],["since","Desde (YYYY-MM)"],["notes","Notas"]].map(([k,l])=>(
              <div key={k} style={{gridColumn:k==="notes"?"1/-1":"auto"}}><label className="ara-label">{l}</label><input className="ara-input" value={form[k]||""} onChange={e=>setForm(f=>({...f,[k]:e.target.value}))}/></div>
            ))}
            <div><label className="ara-label">Rol</label><select className="ara-select" value={form.role||"Barista"} onChange={e=>setForm(f=>({...f,role:e.target.value}))}>{ROLES_LIST.map(r=><option key={r}>{r}</option>)}</select></div>
            <div style={{display:"flex",alignItems:"center",gap:8,paddingTop:18}}><input type="checkbox" checked={form.active!==false} onChange={e=>setForm(f=>({...f,active:e.target.checked}))} style={{accentColor:C.espresso,width:16,height:16,cursor:"pointer"}}/><label style={{fontFamily:F.sans,fontSize:".85rem",color:C.textMid}}>Activo</label></div>
          </div>
          <div style={{display:"flex",gap:8,marginTop:16}}><ABtn v="dark" onClick={save} disabled={saving}>{saving?"Guardando...":"Guardar"}</ABtn><ABtn v="outline" onClick={()=>setEditing(null)}>Cancelar</ABtn></div>
        </div>
      )}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:1,background:C.borderLight}}>
        {filtered.map((emp,idx)=>(
          <div key={emp.id} className="staff-card" style={{opacity:emp.active?1:.55}}>
            <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:14}}>
              <div style={{width:48,height:48,background:`${AV_COLORS[idx%AV_COLORS.length]}18`,border:`2px solid ${AV_COLORS[idx%AV_COLORS.length]}44`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                <span style={{fontFamily:F.sans,fontWeight:700,fontSize:".85rem",color:AV_COLORS[idx%AV_COLORS.length]}}>{emp.avatar||emp.name?.slice(0,2).toUpperCase()}</span>
              </div>
              <div style={{flex:1,minWidth:0}}>
                <p style={{fontFamily:F.serif,fontSize:"1.1rem",marginBottom:4,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{emp.name}</p>
                <div style={{display:"flex",gap:7,alignItems:"center"}}>
                  <span style={{fontFamily:F.sans,fontSize:".6rem",background:`${AV_COLORS[idx%AV_COLORS.length]}18`,color:AV_COLORS[idx%AV_COLORS.length],padding:"2px 8px",letterSpacing:"1px",textTransform:"uppercase"}}>{emp.role}</span>
                  {emp.since&&<span style={{fontFamily:F.sans,fontSize:".68rem",color:C.textLight}}>desde {emp.since}</span>}
                </div>
              </div>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
              <Stars value={emp.avg_rating||0} size={14}/>
              <span style={{fontFamily:F.serif,fontSize:"1rem",color:C.textDark}}>{emp.avg_rating>0?Number(emp.avg_rating).toFixed(1):"Sin rating"}</span>
              <span style={{fontFamily:F.sans,fontSize:".68rem",color:C.textLight}}>({emp.rating_count||0})</span>
              {canEdit&&<button onClick={()=>setRModal(emp)} style={{marginLeft:"auto",fontFamily:F.sans,fontSize:".62rem",letterSpacing:"1px",textTransform:"uppercase",color:C.doradoDark,background:`${C.doradoLight}44`,border:`1px solid ${C.dorado}44`,padding:"3px 10px",cursor:"pointer"}}>Calificar</button>}
            </div>
            {emp.notes&&<p style={{fontFamily:F.sans,fontSize:".75rem",color:C.textLight,fontStyle:"italic",marginBottom:14,paddingLeft:10,borderLeft:`2px solid ${C.border}`}}>"{emp.notes}"</p>}
            {canEdit&&(
              <div style={{display:"flex",gap:6,borderTop:`1px solid ${C.borderLight}`,paddingTop:12}}>
                <button onClick={()=>{setEditing(emp.id);setForm({...emp});}} style={{flex:1,padding:7,border:`1px solid ${C.border}`,background:C.cream,fontSize:".78rem",cursor:"pointer",fontFamily:F.sans,color:C.textMid}}>✏️ Editar</button>
                <button onClick={()=>toggle(emp.id)} style={{flex:1,padding:7,border:`1px solid ${emp.active?C.redBorder:C.greenBorder}`,background:emp.active?C.redBg:C.greenBg,fontSize:".78rem",cursor:"pointer",fontFamily:F.sans,color:emp.active?C.sRed:C.sGreen}}>{emp.active?"⏸ Desactivar":"▶ Activar"}</button>
                {isSuperAdmin&&<button onClick={()=>del(emp.id)} style={{padding:"7px 10px",border:`1px solid ${C.redBorder}`,background:"#FFFCF5",fontSize:".78rem",cursor:"pointer",color:C.sRed}}>🗑️</button>}
              </div>
            )}
          </div>
        ))}
      </div>
      {rModal&&(
        <div onClick={()=>setRModal(null)} style={{position:"fixed",inset:0,background:"rgba(13,10,6,.6)",zIndex:900,display:"flex",alignItems:"center",justifyContent:"center",padding:20,backdropFilter:"blur(4px)"}}>
          <div onClick={e=>e.stopPropagation()} style={{background:"#FFFCF5",padding:"2.5rem",maxWidth:360,width:"100%",textAlign:"center"}}>
            <h3 style={{fontFamily:F.serif,fontSize:"1.8rem",fontWeight:300,marginBottom:4}}>{rModal.name}</h3>
            <p style={{fontFamily:F.sans,fontSize:".68rem",color:C.textLight,letterSpacing:"1px",textTransform:"uppercase",marginBottom:24}}>{rModal.role}</p>
            <div style={{display:"flex",justifyContent:"center",gap:8,marginBottom:12}}>
              {[1,2,3,4,5].map(s=><span key={s} onMouseEnter={()=>setRHov(s)} onMouseLeave={()=>setRHov(0)} onClick={()=>rate(rModal.id,s)} style={{fontSize:36,cursor:"pointer",color:s<=(rHov||Math.round(rModal.avg_rating||0))?C.gold:"#EAD9C0",transition:"all .15s",transform:rHov===s?"scale(1.2)":"scale(1)",display:"inline-block"}}>★</span>)}
            </div>
            {rHov>0&&<p style={{fontFamily:F.sans,fontSize:".82rem",color:C.doradoDark,fontWeight:600,marginBottom:16}}>{["","Muy malo","Regular","Bueno","Muy bueno","Excelente"][rHov]}</p>}
            <button onClick={()=>setRModal(null)} style={{width:"100%",padding:10,border:`1px solid ${C.border}`,background:"#FFFCF5",fontFamily:F.sans,fontSize:".8rem",cursor:"pointer",color:C.textMid,marginTop:8}}>Cancelar</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── SALES DASHBOARD ───────────────────────────────────────────
function BarChart({data,period}){
  const[tip,setTip]=useState(null);
  if(!data||!data.length)return<div style={{height:160,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:F.sans,fontSize:".72rem",color:C.borderLight,letterSpacing:"1px",textTransform:"uppercase"}}>Sin datos disponibles</div>;
  const W=680,H=180,PAD={top:10,right:20,bottom:32,left:60};
  const cW=W-PAD.left-PAD.right,cH=H-PAD.top-PAD.bottom;
  const maxR=Math.max(...data.map(d=>Number(d.revenue)||0),1);
  const barW=Math.max(4,Math.floor(cW/data.length)-4);
  const gap=(cW-barW*data.length)/(data.length+1);
  const yR=v=>PAD.top+cH-(v/maxR)*cH;
  const xB=i=>PAD.left+gap+i*(barW+gap)+barW/2;
  const fmtL=s=>period==="day"?String(s).slice(5):period==="month"?String(s).slice(2,7):String(s);
  const fmtM=v=>v>=1e6?`$${(v/1e6).toFixed(1)}M`:v>=1000?`$${(v/1000).toFixed(0)}k`:`$${v}`;
  const skip=data.length>20?5:data.length>10?2:1;
  return(
    <div style={{width:"100%",overflowX:"auto"}}>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{display:"block"}}>
        {[0,.5,1].map((f,i)=><g key={i}><line x1={PAD.left} y1={yR(maxR*f)} x2={W-PAD.right} y2={yR(maxR*f)} stroke={C.borderLight} strokeWidth=".5" strokeDasharray={i===0?"none":"4 3"}/><text x={PAD.left-6} y={yR(maxR*f)+4} textAnchor="end" style={{fontFamily:F.sans,fontSize:9,fill:C.textLight}}>{fmtM(maxR*f)}</text></g>)}
        {data.map((d,i)=>{const rev=Number(d.revenue)||0;const bH=Math.max(2,(rev/maxR)*cH);const y=PAD.top+cH-bH;const hov=tip?.i===i;return<rect key={i} x={xB(i)-barW/2} y={y} width={barW} height={bH} rx="2" fill={hov?C.espresso:C.gold} opacity={hov?1:.85} style={{cursor:"pointer"}} onMouseEnter={()=>setTip({i,d})} onMouseLeave={()=>setTip(null)}/>;} )}
        {data.map((d,i)=>i%skip===0&&<text key={i} x={xB(i)} y={H-PAD.bottom+14} textAnchor="middle" style={{fontFamily:F.sans,fontSize:9,fill:C.textLight}}>{fmtL(d.period)}</text>)}
        <line x1={PAD.left} y1={PAD.top+cH} x2={W-PAD.right} y2={PAD.top+cH} stroke={C.border} strokeWidth="1"/>
        {tip&&(()=>{const tx=Math.min(xB(tip.i),W-140),ty=Math.max(PAD.top,yR(Number(tip.d.revenue)||0)-52);return<g><rect x={tx-2} y={ty} width={130} height={44} rx="4" fill={C.espresso} opacity=".92"/><text x={tx+10} y={ty+14} style={{fontFamily:F.sans,fontSize:10,fill:C.gold2,fontWeight:"bold"}}>{fmtL(tip.d.period)}</text><text x={tx+10} y={ty+30} style={{fontFamily:F.sans,fontSize:10,fill:C.cream}}>{fmtM(Number(tip.d.revenue)||0)} · {tip.d.orders} pedidos</text></g>;})()}
      </svg>
    </div>
  );
}

function SalesDashboard({localOrders}){
  const request=useRequest();
  const[period,setPeriod]=useState("day");const[sales,setSales]=useState(null);const[loading,setLoading]=useState(true);
  useEffect(()=>{load();},[period]);
  async function load(){setLoading(true);try{setSales(await request("GET",`/analytics/sales?period=${period}`));}catch(e){}setLoading(false);}
  const localRevenue=localOrders.reduce((s,o)=>s+o.total,0);
  const kpis=sales?.kpis||{today:localRevenue,ordersToday:localOrders.length,thisMonth:localRevenue,ordersMonth:localOrders.length,thisYear:localRevenue,avgTicket:localOrders.length?Math.round(localRevenue/localOrders.length):0,allTime:localRevenue};
  const rev=sales?.revenueOverTime||[];
  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20,flexWrap:"wrap",gap:10}}>
        <div><h3 style={{fontFamily:F.serif,fontSize:"1.6rem",fontWeight:300,marginBottom:2}}>Balance de Ventas</h3><p style={{fontFamily:F.sans,fontSize:".68rem",letterSpacing:"1px",color:C.textLight}}>Actualizado en tiempo real</p></div>
        <div style={{display:"flex",gap:0,border:`1px solid ${C.borderLight}`}}>
          {[["day","Diario"],["month","Mensual"],["year","Anual"]].map(([p,l])=><button key={p} onClick={()=>setPeriod(p)} style={{padding:"8px 18px",border:"none",background:period===p?C.espresso:"transparent",color:period===p?C.gold2:C.smoke,fontFamily:F.sans,fontSize:".68rem",letterSpacing:"1px",textTransform:"uppercase",cursor:"pointer",transition:"all .2s"}}>{l}</button>)}
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:1,background:C.borderLight,marginBottom:20}}>
        {[{l:"Ventas hoy",v:fmt$(kpis.today),sub:`${kpis.ordersToday||0} pedidos`},{l:"Este mes",v:fmt$(kpis.thisMonth),sub:`${kpis.ordersMonth||0} pedidos`},{l:"Este año",v:fmt$(kpis.thisYear),sub:""},{l:"Ticket prom.",v:fmt$(kpis.avgTicket),sub:"por pedido"},{l:"Histórico",v:fmt$(kpis.allTime),sub:"total acumulado"}].map(k=>(
          <div key={k.l} style={{background:"#FFFCF5",padding:"1.5rem"}}>
            <p style={{fontFamily:F.sans,fontSize:".62rem",letterSpacing:"2px",textTransform:"uppercase",color:C.textLight,marginBottom:6}}>{k.l}</p>
            <p style={{fontFamily:F.serif,fontSize:"1.8rem",fontWeight:300,color:C.textDark,lineHeight:1,marginBottom:4}}>{k.v}</p>
            <span style={{fontFamily:F.sans,fontSize:".68rem",color:C.textLight}}>{k.sub}</span>
          </div>
        ))}
      </div>
      {loading?<Spinner/>:rev.length>0&&<div className="ara-card"><p style={{fontFamily:F.sans,fontSize:".62rem",letterSpacing:"2px",textTransform:"uppercase",color:C.textLight,marginBottom:14}}>Ingresos por período</p><BarChart data={rev} period={period}/></div>}
    </div>
  );
}

// ── CASHIER DASHBOARD ─────────────────────────────────────────
function CashierDashboard({orders}){
  const delivered=orders.filter(o=>o.status==="delivered");
  const active=orders.filter(o=>["pending","preparing","ready"].includes(o.status));
  const revenue=delivered.reduce((s,o)=>s+Number(o.total||0),0);
  const SS={pending:{l:"Pendiente",bg:C.yellowBg,t:C.sYellow,b:C.yellowBorder},preparing:{l:"Preparando",bg:C.blueBg,t:C.sBlue,b:C.blueBorder},ready:{l:"Listo",bg:C.greenBg,t:C.sGreen,b:C.greenBorder},delivered:{l:"Entregado",bg:C.cream,t:C.textMid,b:C.border},cancelled:{l:"Cancelado",bg:C.redBg,t:C.sRed,b:C.redBorder}};
  return(
    <div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:1,background:C.borderLight,marginBottom:20}}>
        {[{l:"Ingresos del día",v:fmt$(revenue)},{l:"Pedidos activos",v:active.length},{l:"Entregados",v:delivered.length},{l:"Total registros",v:orders.length}].map(k=>(
          <div key={k.l} style={{background:"#FFFCF5",padding:"1.5rem"}}>
            <p style={{fontFamily:F.sans,fontSize:".62rem",letterSpacing:"2px",textTransform:"uppercase",color:C.textLight,marginBottom:6}}>{k.l}</p>
            <p style={{fontFamily:F.serif,fontSize:"1.8rem",fontWeight:300,color:C.textDark,lineHeight:1}}>{k.v}</p>
          </div>
        ))}
      </div>
      <div className="ara-card">
        <p style={{fontFamily:F.sans,fontSize:".62rem",letterSpacing:"2px",textTransform:"uppercase",color:C.textLight,marginBottom:14}}>Lista de pedidos</p>
        <div style={{display:"flex",flexDirection:"column",gap:6,maxHeight:500,overflowY:"auto"}}>
          {orders.length===0&&<div style={{textAlign:"center",padding:"2rem",color:C.borderLight,fontFamily:F.sans,fontSize:".78rem",letterSpacing:"1px"}}>Sin pedidos registrados</div>}
          {orders.slice(0,50).map(order=>{const s=SS[order.status]||SS.pending;return(
            <div key={order.id} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 14px",background:C.bg}}>
              <div style={{width:34,height:34,background:C.cream,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><span style={{fontFamily:F.serif,fontWeight:700,fontSize:".9rem",color:C.textMid}}>{order.table_number||"—"}</span></div>
              <div style={{flex:1,minWidth:0}}>
                <p style={{fontFamily:F.sans,fontSize:".85rem",fontWeight:600,color:C.textDark,marginBottom:2}}>Mesa #{order.table_number||"—"} <span style={{fontWeight:400,color:C.textLight}}>#{order.id}</span></p>
                <p style={{fontFamily:F.sans,fontSize:".72rem",color:C.textLight}}>{(order.items||[]).slice(0,3).map(i=>`${i.quantity||i.qty||1}× ${i.menu_item_name||i.name}`).join(", ")}{(order.items||[]).length>3?` +${(order.items||[]).length-3} más`:""}</p>
              </div>
              <span style={{fontFamily:F.serif,fontSize:"1.1rem",fontWeight:300,color:C.granate}}>${Number(order.total||0).toLocaleString()}</span>
              <span className="s-pill" style={{background:s.bg,color:s.t,borderColor:s.b}}>{s.l}</span>
            </div>
          );})}
        </div>
      </div>
    </div>
  );
}

// ── ADMIN DASHBOARD ───────────────────────────────────────────
function AdminDashboard({orders,onUpdateStatus,localOrders}){
  const request=useRequest();const{role}=useAuth();
  const canEdit=["superadmin","admin"].includes(role);const isSuperAdmin=role==="superadmin";
  const[tab,setTab]=useState(role==="cashier"?"caja":"analytics");
  const[menu,setMenu]=useState([]);const[empList,setEmpList]=useState([]);
  const[editing,setEditing]=useState(null);const[form,setForm]=useState({});
  const[saving,setSaving]=useState(false);const[err,setErr]=useState("");
  const tabs=[{id:"analytics",l:"Analytics",icon:"📊"},{id:"caja",l:"Caja",icon:"🧾"},{id:"kitchen",l:"Cocina",icon:"👨‍🍳"},{id:"menu",l:"Menú",icon:"🍽️"},{id:"employees",l:"Empleados",icon:"👥"},{id:"leaves",l:"Permisos",icon:"📋"},{id:"supply",l:"Insumos",icon:"📦"}];
  useEffect(()=>{loadMenu();},[]);
  async function loadMenu(){try{const[m,e]=await Promise.all([request("GET","/menu/all"),request("GET","/employees/all")]);setMenu(m);setEmpList(e);}catch(e){}}
  async function saveItem(){setSaving(true);setErr("");try{if(editing==="new")await request("POST","/menu",{...form,category_id:form.category_id||1});else await request("PUT",`/menu/${editing}`,form);setEditing(null);await loadMenu();}catch(e){setErr(e.errors?.join(", ")||e.error||"Error");}setSaving(false);}
  async function toggleItem(id){try{await request("PUT",`/menu/${id}/toggle`);await loadMenu();}catch(e){setErr(e.error||"Error");}}
  async function delItem(id){if(!confirm("¿Eliminar?"))return;try{await request("DELETE",`/menu/${id}`);await loadMenu();}catch(e){setErr(e.error||"Error");}}
  const allOrders=orders.length?orders:localOrders;
  return(
    <div>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:20}}>
        <span style={{fontFamily:F.sans,fontSize:".62rem",letterSpacing:"2px",textTransform:"uppercase",background:C.cream,color:C.textMid,padding:"3px 12px"}}>{role}</span>
        <span style={{fontFamily:F.sans,fontSize:".72rem",color:C.textLight}}>{role==="superadmin"?"Acceso total":role==="admin"?"Crear y editar":"Solo lectura"}</span>
      </div>
      <div className="admin-tabs">
        {tabs.map(t=><button key={t.id} className={`admin-tab${tab===t.id?" active":""}`} onClick={()=>setTab(t.id)}><span style={{marginRight:6}}>{t.icon}</span>{t.l}</button>)}
      </div>
      <ErrMsg msg={err}/>
      {tab==="analytics" &&<SalesDashboard localOrders={localOrders}/>}
      {tab==="caja"      &&<CashierDashboard orders={allOrders}/>}
      {tab==="kitchen"   &&<KitchenView orders={allOrders} onUpdateStatus={onUpdateStatus}/>}
      {tab==="employees" &&<EmployeesPanel/>}
      {tab==="leaves"    &&<LeavePanel employeesList={empList}/>}
      {tab==="supply"    &&<SupplyPanel/>}
      {tab==="menu"&&(
        <div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
            <p style={{fontFamily:F.sans,fontSize:".72rem",color:C.textLight,letterSpacing:"1px"}}>{menu.length} productos en catálogo</p>
            {canEdit&&<ABtn v="dark" onClick={()=>{setEditing("new");setForm({category_id:1,name:"",description:"",price:0,emoji:"☕",available:true,prep_time:5});}}>+ Agregar producto</ABtn>}
          </div>
          {editing&&canEdit&&(
            <div className="ara-card" style={{marginBottom:18,borderColor:C.dorado,borderWidth:2}}>
              <p style={{fontFamily:F.serif,fontSize:"1.2rem",marginBottom:16}}>{editing==="new"?"Nuevo producto":"Editar producto"}</p>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:12}}>
                {[["name","Nombre"],["emoji","Emoji"],["description","Descripción"],["price","Precio (COP)"],["prep_time","Tiempo (min)"]].map(([k,l])=>(
                  <div key={k} style={{gridColumn:k==="description"?"1/-1":"auto"}}><label className="ara-label">{l}</label><input className="ara-input" value={form[k]||""} onChange={e=>setForm(f=>({...f,[k]:["price","prep_time"].includes(k)?Number(e.target.value):e.target.value}))}/></div>
                ))}
                <div><label className="ara-label">Categoría</label><select className="ara-select" value={form.category_id||1} onChange={e=>setForm(f=>({...f,category_id:Number(e.target.value)}))}>
                  <option value={1}>Cafés</option><option value={2}>Alimentos</option><option value={3}>Especiales</option><option value={4}>No Cafés</option>
                </select></div>
                <div style={{display:"flex",alignItems:"center",gap:8,paddingTop:18}}><input type="checkbox" checked={form.available||false} onChange={e=>setForm(f=>({...f,available:e.target.checked}))} style={{accentColor:C.espresso,width:16,height:16,cursor:"pointer"}}/><label style={{fontFamily:F.sans,fontSize:".85rem",color:C.textMid}}>Disponible</label></div>
              </div>
              <div style={{display:"flex",gap:8,marginTop:16}}><ABtn v="dark" onClick={saveItem} disabled={saving}>{saving?"Guardando...":"Guardar"}</ABtn><ABtn v="outline" onClick={()=>setEditing(null)}>Cancelar</ABtn></div>
            </div>
          )}
          <div style={{display:"flex",flexDirection:"column",gap:1,background:C.borderLight}}>
            {menu.length===0&&<div style={{background:"#FFFCF5",padding:"2rem",textAlign:"center",color:C.textLight,fontFamily:F.sans,fontSize:".78rem",letterSpacing:"1px"}}>Conecta el backend para ver los productos</div>}
            {menu.map(item=>(
              <div key={item.id} style={{display:"flex",alignItems:"center",gap:14,padding:"12px 16px",background:"#FFFCF5",opacity:item.available?1:.5}}>
                <span style={{fontSize:22}}>{item.emoji}</span>
                <div style={{flex:1}}>
                  <p style={{fontFamily:F.sans,fontSize:".85rem",fontWeight:600,color:C.textDark,marginBottom:4}}>{item.name} <span style={{fontWeight:400,color:C.textLight}}>· {item.category}</span></p>
                  <div style={{display:"flex",alignItems:"center",gap:8}}><Stars value={item.avg_rating||0} size={12}/><span style={{fontFamily:F.sans,fontSize:".68rem",color:C.textLight}}>{Number(item.avg_rating||0).toFixed(1)} ({item.rating_count})</span><span style={{fontFamily:F.serif,fontSize:".9rem",color:C.granate}}>${Number(item.price).toLocaleString()}</span></div>
                </div>
                {canEdit&&<>
                  <button onClick={()=>toggleItem(item.id)} style={{padding:"4px 12px",border:`1px solid ${item.available?C.greenBorder:C.border}`,background:item.available?C.greenBg:C.cream,color:item.available?C.sGreen:C.textLight,fontSize:".68rem",cursor:"pointer",fontFamily:F.sans,letterSpacing:"1px",textTransform:"uppercase"}}>{item.available?"Activo":"Inactivo"}</button>
                  <button onClick={()=>{setEditing(item.id);setForm({...item});}} style={{padding:"6px 12px",border:`1px solid ${C.border}`,background:C.cream,fontSize:".82rem",cursor:"pointer",color:C.textMid}}>✏️</button>
                  {isSuperAdmin&&<button onClick={()=>delItem(item.id)} style={{padding:"6px 12px",border:`1px solid ${C.redBorder}`,background:"#FFFCF5",fontSize:".82rem",cursor:"pointer",color:C.sRed}}>🗑️</button>}
                </>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── KITCHEN DASHBOARD ─────────────────────────────────────────
function KitchenDashboard({orders,onUpdateStatus}){
  const[tab,setTab]=useState("orders");
  return(
    <div>
      <div className="admin-tabs" style={{marginBottom:24}}>
        {[{id:"orders",l:"Pedidos",icon:"🍽️"},{id:"supply",l:"Insumos",icon:"📦"},{id:"leaves",l:"Permisos",icon:"📋"}].map(t=><button key={t.id} className={`admin-tab${tab===t.id?" active":""}`} onClick={()=>setTab(t.id)}><span style={{marginRight:6}}>{t.icon}</span>{t.l}</button>)}
      </div>
      {tab==="orders"&&<KitchenView orders={orders} onUpdateStatus={onUpdateStatus}/>}
      {tab==="supply"&&<SupplyPanel/>}
      {tab==="leaves"&&<LeavePanel/>}
    </div>
  );
}

// ── ROOT APP ──────────────────────────────────────────────────
function AppContent(){
  const auth=useAuth();const{token,role,login,logout,request}=auth;
  const[page,setPage]=useState("home");const[appView,setAppView]=useState("customer");
  const[loaderGone,setLoaderGone]=useState(false);
  useEffect(()=>{const t=setTimeout(()=>setLoaderGone(true),1600);return()=>clearTimeout(t);},[]);
  const[cart,setCart]=useState([]);const[cartBump,setCartBump]=useState(false);
  const[localOrders,setLocalOrders]=useState(()=>loadLS("ara2_orders",[]));
  const[messages,setMessages]=useState(()=>loadLS("ara2_msgs",[]));
  const[loyalty,setLoyalty]=useState(()=>loadLS("ara2_loyalty",{points:0,stamps:0}));
  const[orders,setOrders]=useState([]);
  const[toast,setToast]=useState({msg:"",visible:false,isError:false});
  const[checkingOut,setCheckingOut]=useState(false);
  const toastTimer=useRef(null);
  const[drawerProduct,setDrawerProduct]=useState(null);

  function showToast(msg,isError=false){
    if(toastTimer.current)clearTimeout(toastTimer.current);
    setToast({msg,visible:true,isError});
    toastTimer.current=setTimeout(()=>setToast(t=>({...t,visible:false})),3200);
  }

  // FIX: WebSocket con reconexión automática
  useEffect(()=>{
    let ws;let reconnectTimer;
    function connect(){
      try{
        ws=new WebSocket(WS_URL);
        ws.onmessage=e=>{
          try{
            const{type,data}=JSON.parse(e.data);
            if(type==="NEW_ORDER"){
              setOrders(prev=>{
                if(prev.find(o=>o.id===data.id))return prev;
                return [data,...prev];
              });
            }
            if(type==="ORDER_STATUS"){
              setOrders(prev=>prev.map(o=>o.id===data.id?{...o,status:data.status}:o));
            }
          }catch(err){}
        };
        ws.onclose=()=>{
          // Reconectar en 5 segundos si se pierde la conexión
          reconnectTimer=setTimeout(connect,5000);
        };
        ws.onerror=()=>{};
      }catch(e){}
    }
    connect();
    return()=>{
      if(reconnectTimer)clearTimeout(reconnectTimer);
      try{ws?.close();}catch(e){}
    };
  },[]);

  // Cargar pedidos del backend cuando cambia la vista o el token
  useEffect(()=>{
    if(!((appView==="admin"||appView==="kitchen")&&token))return;
    request("GET","/orders").then(setOrders).catch(()=>{});
    const interval=setInterval(()=>{
      request("GET","/orders").then(setOrders).catch(()=>{});
    },15000);
    return()=>clearInterval(interval);
  },[appView,token]);

  function addToCart(product,qty=1){
    setCart(c=>{const ex=c.find(i=>i.id===product.id);return ex?c.map(i=>i.id===product.id?{...i,qty:i.qty+qty}:i):[...c,{...product,qty}];});
    setCartBump(true);setTimeout(()=>setCartBump(false),400);
    showToast(`${product.emoji}  ${product.name} agregado`);
  }
  function removeFromCart(id){setCart(c=>c.filter(i=>i.id!==id));}

  // FIX: checkout llama al backend y recibe el número de mesa como parámetro
  async function checkout(note, tableNumber){
    if(checkingOut)return;
    setCheckingOut(true);
    const total=cart.reduce((s,i)=>s+i.price*i.qty,0);

    // FIX: formato de items correcto para el backend
    const payload={
      table_number: tableNumber,
      note: note||"",
      items: cart.map(i=>({
        id: i.id,
        name: i.name,
        qty: i.qty,
        price: i.price,
        note: note||"",
      })),
    };

    try{
      // Intentar enviar al backend
      const res=await fetch(`${API}/orders`,{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify(payload),
      });
      if(!res.ok){
        const err=await res.json();
        throw new Error(err.error||JSON.stringify(err.errors));
      }
      const order=await res.json();
      // FIX: agregar el pedido del backend al estado de pedidos (llegará también por WS)
      setOrders(prev=>{
        if(prev.find(o=>o.id===order.id))return prev;
        return [order,...prev];
      });
      showToast("🎉  Pedido enviado a cocina");
    }catch(e){
      // Fallback a localStorage si el backend no está disponible
      const order={
        id:Date.now(),items:[...cart],total,note,
        table_number:tableNumber,status:"pending",
        created_at:new Date().toLocaleTimeString("es-CO",{hour:"2-digit",minute:"2-digit"}),
      };
      const newOrders=[order,...localOrders];
      setLocalOrders(newOrders);
      saveLS("ara2_orders",newOrders);
      showToast(`⚠️  Sin conexión al backend. Pedido guardado localmente.`,true);
    }

    // Siempre actualizar fidelidad y vaciar carrito
    const newL={points:loyalty.points+Math.floor(total/100),stamps:Math.min(10,loyalty.stamps+cart.reduce((s,i)=>s+i.qty,0))};
    if(newL.stamps>=10){showToast("🎁  10 sellos — ¡Bebida gratis en tu próxima visita!");newL.stamps=0;}
    setLoyalty(newL);saveLS("ara2_loyalty",newL);
    setCart([]);
    setCheckingOut(false);
  }

  function simulateLoyalty(){
    const newL={points:loyalty.points+150,stamps:Math.min(10,loyalty.stamps+1)};
    if(newL.stamps===10){showToast("🎁  10 sellos — ¡Bebida gratis!");newL.stamps=0;}
    setLoyalty(newL);saveLS("ara2_loyalty",newL);
  }
  function saveMessage(m){
    const newMsgs=[{...m,id:Date.now(),time:new Date().toLocaleTimeString("es-CO",{hour:"2-digit",minute:"2-digit"})},...messages];
    setMessages(newMsgs);saveLS("ara2_msgs",newMsgs);
  }
  function updateOrderStatus(orderId,newStatus){
    setOrders(prev=>prev.map(o=>o.id===orderId?{...o,status:newStatus}:o));
    setLocalOrders(prev=>prev.map(o=>o.id===orderId?{...o,status:newStatus}:o));
    if(token)request("PATCH",`/orders/${orderId}/status`,{status:newStatus}).catch(()=>{});
  }

  // FIX: handleLogin redirige correctamente según el rol
  function handleLogin(t,r,u){
    login(t,r,u);
    if(["superadmin","admin","cashier"].includes(r)){
      setAppView("admin");
    }else if(r==="kitchen"){
      setAppView("kitchen");
    }else{
      setAppView("customer");
    }
  }

  function changePage(p){setPage(p);window.scrollTo(0,0);}
  function changeView(v){setAppView(v);if(v==="customer")setPage("home");window.scrollTo(0,0);}

  const cartCount=cart.reduce((s,i)=>s+i.qty,0);
  const allOrders=orders.length?orders:localOrders;
  const pendingCount=allOrders.filter(o=>o.status==="pending").length;

  return(
    <>
      <style>{FONTS+CSS}</style>
      <Cursor/>
      <Loader gone={loaderGone}/>
      <Nav page={page} setPage={changePage} cartCount={cartCount} cartBump={cartBump} appView={appView} setAppView={changeView} pendingCount={pendingCount}/>

      {pendingCount>0&&appView!=="kitchen"&&(
        <div className="pending-bar" style={{position:"fixed",top:72,left:0,right:0,zIndex:400}}>
          <span className="pending-dot"/>
          <span style={{fontFamily:F.sans,fontSize:".68rem",letterSpacing:"1.5px",textTransform:"uppercase",color:"#B52A2A"}}>{pendingCount} pedido{pendingCount>1?"s":""} esperando en cocina</span>
          <button onClick={()=>changeView("kitchen")} style={{marginLeft:"auto",fontFamily:F.sans,fontSize:".68rem",letterSpacing:"1px",textTransform:"uppercase",color:"#B52A2A",background:"none",border:"1px solid rgba(139,26,26,.3)",padding:"3px 12px",cursor:"pointer",borderRadius:"99px"}}>Ver cocina →</button>
        </div>
      )}

      <ProductDrawer product={drawerProduct} onClose={()=>setDrawerProduct(null)} onAdd={addToCart}/>

      {appView==="customer"&&page==="home"       &&<HomePage setPage={changePage} onQuickAdd={p=>addToCart(p,1)} orders={localOrders}/>}
      {appView==="customer"&&page==="menu"       &&<MenuPage onOpenProduct={setDrawerProduct}/>}
      {appView==="customer"&&page==="experience" &&<ExperiencePage loyalty={loyalty} onSimulateLoyalty={simulateLoyalty} onSaveMessage={saveMessage} onToast={showToast}/>}
      {appView==="customer"&&page==="order"      &&<OrderPage cart={cart} onRemove={removeFromCart} onCheckout={checkout} checkingOut={checkingOut}/>}

      {appView==="login"&&<LoginPage onLogin={handleLogin}/>}

      {appView==="admin"&&(
        <div className="page" style={{paddingTop:pendingCount>0?108:72}}>
          <div style={{padding:"2.5rem 3rem",maxWidth:1200,margin:"0 auto"}}>
            <div style={{marginBottom:28}}>
              <h1 style={{fontFamily:F.serif,fontSize:"2.5rem",fontWeight:300,marginBottom:4}}>Panel de Gestión</h1>
              <p style={{fontFamily:F.sans,fontSize:".68rem",letterSpacing:"2px",textTransform:"uppercase",color:C.textLight}}>Arábica Cafetería · Sistema de administración</p>
            </div>
            <AdminDashboard orders={orders} onUpdateStatus={updateOrderStatus} localOrders={localOrders}/>
          </div>
        </div>
      )}

      {appView==="kitchen"&&(
        <div className="page">
          <div style={{padding:"2.5rem 3rem",maxWidth:1200,margin:"0 auto"}}>
            <div style={{marginBottom:28}}>
              <h1 style={{fontFamily:F.serif,fontSize:"2.5rem",fontWeight:300,marginBottom:4}}>Dashboard de Cocina</h1>
              <p style={{fontFamily:F.sans,fontSize:".68rem",letterSpacing:"2px",textTransform:"uppercase",color:C.textLight}}>Pedidos · Insumos · Permisos del personal</p>
            </div>
            <KitchenDashboard orders={allOrders} onUpdateStatus={updateOrderStatus}/>
          </div>
        </div>
      )}

      <Toast msg={toast.msg} visible={toast.visible} isError={toast.isError}/>
    </>
  );
}

export default function App(){
  return <AuthProvider><AppContent/></AuthProvider>;
}