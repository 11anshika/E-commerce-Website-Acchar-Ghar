"use strict";
// Achaar Ghar storefront and admin console. Talks to the Spring Boot API under /api.
const COL = {
  Mango: "#f59e0b",
  Lemon: "#eab308",
  Chilli: "#dc2626",
  Garlic: "#a8a29e",
  Mixed: "#65a30d",
};
const TK = "achaar_token",
  LK = "achaar_local";
let S = { p: [], o: [], k: [], u: [], sub: [], c: {}, w: [] },
  ME = null,
  RV = [],
  TOKEN = null;

try {
  const l = JSON.parse(localStorage.getItem(LK));
  if (l) {
    S.c = l.c || {};
    S.w = l.w || [];
  }
} catch (e) {}

const save = () => {
  try {
    localStorage.setItem(LK, JSON.stringify({ c: S.c, w: S.w }));
  } catch (e) {}
};

const getToken = () => {
  try {
    return TOKEN || localStorage.getItem(TK);
  } catch (e) {
    return TOKEN;
  }
};

async function api(path, o = {}) {
  const t = getToken();
  const r = await fetch(path, {
    method: o.method || "GET",
    headers: {
      ...(t ? { Authorization: "Bearer " + t } : {}),
      ...(o.body ? { "Content-Type": "application/json" } : {}),
    },
    body: o.form || (o.body ? JSON.stringify(o.body) : undefined),
  });
  let d = null;
  try {
    d = await r.json();
  } catch (e) {}
  if (!r.ok) {
    const e = new Error(
      (d && d.message) || "Something went wrong. Please try again.",
    );
    e.status = r.status;
    throw e;
  }
  return d;
}

const ST = ["PLACED", "PACKED", "SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED"];

const mapP = (p) => {
  const v = p.variants[0] || {};
  return {
    id: p.id,
    name: p.name,
    cat: p.category,
    price: v.price || 0,
    stock: v.stock || 0,
    vid: v.id,
    emo: p.emoji || "🫙",
    desc: p.description || "",
    img: p.imageUrl || "",
    avgRating: p.avgRating || 0,
    ratingCount: p.ratingCount || 0,
    active: p.active,
    raw: p,
  };
};

const mapO = (o) => ({
  id: o.orderNo,
  k: o.id,
  date: new Date(o.createdAt).toLocaleDateString(),
  items: o.items.map((i) => ({ n: i.name, q: i.qty, pr: i.price })),
  total: o.total,
  sub: o.subtotal,
  disc: o.discount,
  ship: o.shipping,
  coupon: o.couponCode || "",
  st: Math.max(0, ST.indexOf(o.status)),
  cx: o.status == "CANCELLED",
  pending: o.status == "PENDING_PAYMENT",
  paid: o.paymentStatus != "PENDING",
  pay: o.paymentMethod == "COD" ? "Cash on delivery" : "Razorpay",
  pid: o.razorpayPaymentId || "",
  name: o.customerName,
  phone: o.phone,
  addr: o.address,
  email: o.email || "",
});

const loadP = async () => {
  S.p = (await api("/api/products/all")).map(mapP);
};
const loadMine = async () => {
  S.o = (await api("/api/orders")).map(mapO);
};

const esc = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      }[c]),
  );

const $ = (q) => document.querySelector(q);
const avg = (p) => p.avgRating || 0;
const stars = (r) => "★".repeat(Math.round(r)) + "☆".repeat(5 - Math.round(r));
const STEPS = ["Placed", "Packed", "Shipped", "Out for delivery", "Delivered"];

let V = "shop",
  F = { q: "", cat: "All", max: 500, sort: "def", pg: 1 },
  adm = false,
  slide = 0;

const SLIDES = [
  [
    "Mango season, all year",
    "Sun-cured Aam Ka Achaar, 20% off today",
    "linear-gradient(120deg,#d97706,#b45309)",
  ],
  [
    "Fiery & fabulous",
    "Stuffed chilli pickles for the bold",
    "linear-gradient(120deg,#dc2626,#7f1d1d)",
  ],
  [
    "Free delivery over ₹750",
    "Fresh batches shipped every Monday",
    "linear-gradient(120deg,#65a30d,#365314)",
  ],
];

const cartItems = () =>
  Object.entries(S.c)
    .map(([id, q]) => ({ p: S.p.find((x) => x.id == id), q }))
    .filter((x) => x.p);

const sub = () => cartItems().reduce((a, x) => a + x.p.price * x.q, 0);

const disc = () => {
  const s = sub();
  return Math.round(s > 700 ? s * 0.1 : s >= 400 ? s * 0.05 : 0);
};

let CP = null;
const cdisc = () =>
  CP && sub() >= CP.min ? Math.round((sub() * CP.pct) / 100) : 0;
const total = () => sub() - disc() - cdisc();

function upd() {
  document.body.classList.toggle("adm", isA());
  $("#ab").textContent = ME ? "👤 " + ME.n.split(" ")[0] : "Login";
  $("#cb").textContent =
    "🛒 Cart (" + Object.values(S.c).reduce((a, b) => a + b, 0) + ")";
  document
    .querySelectorAll("nav [data-v]")
    .forEach((b) => b.classList.toggle("on", b.dataset.v == V));
}

function add(id) {
  const p = S.p.find((x) => x.id == id);
  if ((S.c[id] || 0) >= p.stock) return alert("No more stock available");
  S.c[id] = (S.c[id] || 0) + 1;
  save();
  upd();
  toast(p.emo + " " + p.name + " added to cart");
  const c = $("#cb");
  c.classList.remove("bump");
  void c.offsetWidth;
  c.classList.add("bump");
  const e = window.event && window.event.target;
  if (e && e.tagName == "BUTTON" && e.textContent == "Add") {
    e.textContent = "✓ Added";
    setTimeout(() => {
      e.textContent = "Add";
    }, 900);
  }
}

function render() {
  if (isA()) V = "admin";
  upd();
  ({ shop, track, admin })[V]();
}

function shop() {
  let l = S.p.filter(
    (p) =>
      p.name.toLowerCase().includes(F.q.toLowerCase()) &&
      (F.cat == "All" || p.cat == F.cat) &&
      p.price <= F.max &&
      (!F.wish || S.w.includes(p.id)),
  );
  const sf = {
    pa: (a, b) => a.price - b.price,
    pd: (a, b) => b.price - a.price,
    r: (a, b) => avg(b) - avg(a),
    n: (a, b) => a.name.localeCompare(b.name),
  }[F.sort];
  if (sf) l.sort(sf);
  const per = 6,
    pages = Math.max(1, Math.ceil(l.length / per));
  F.pg = Math.min(F.pg, pages);
  const cats = ["All", ...new Set(S.p.map((p) => p.cat))];

  $("#app").innerHTML = `<div class="car">${SLIDES.map((s, i) => `<div class="sl ${i == slide ? "on" : ""}" style="background:${s[2]}"><h2>${s[0]}</h2><p>${s[1]}</p></div>`).join("")}<button class="arr" style="left:8px" onclick="go(-1)">‹</button><button class="arr" style="right:8px" onclick="go(1)">›</button><div class="dots">${SLIDES.map((_, i) => `<i class="${i == slide ? "on" : ""}" onclick="slide=${i};show()"></i>`).join("")}</div></div>
 ${tiles()}${ben()}<h2 class="sh">Shop our best sellers</h2><div class="bar"><input id="q" placeholder="Search pickles…" value="${esc(F.q)}"><select id="cat">${cats.map((c) => `<option ${c == F.cat ? "selected" : ""}>${c}</option>`).join("")}</select>
 <select id="mx">${[[500, "Any price"], [250, "Up to ₹250"], [200, "Up to ₹200"]].map((o) => `<option value="${o[0]}" ${o[0] == F.max ? "selected" : ""}>${o[1]}</option>`).join("")}</select>
 <button class="b ${F.wish ? "on" : "g"}" onclick="F.wish=!F.wish;F.pg=1;shop()">♥ Wishlist (${S.w.length})</button><select id="so">${[["def", "Sort: Featured"], ["pa", "Price: low to high"], ["pd", "Price: high to low"], ["r", "Top rated"], ["n", "Name A–Z"]].map((o) => `<option value="${o[0]}" ${o[0] == F.sort ? "selected" : ""}>${o[1]}</option>`).join("")}</select></div>
 <div class="grid">${l.slice((F.pg - 1) * per, F.pg * per).map((p) => `<div class="card"><div class="img" style="background:${COL[p.cat] || "#a16207"}33" onclick="detail(${p.id})"><button class="hb" title="Wishlist" onclick="heart(${p.id},event)">${S.w.includes(p.id) ? "♥" : "♡"}</button>${p.img ? `<img src="${p.img}" alt="${esc(p.name)}" style="width:100%;height:100%;object-fit:cover">` : p.emo}</div><div class="ci"><h3>${esc(p.name)}</h3><span class="tag" style="width:fit-content">${esc(p.cat)}</span><div class="st">${stars(avg(p))} <span class="mut">(${p.ratingCount})</span></div><div class="pr">₹${p.price} <span class="mut">/ 400g</span></div><div class="row"><button class="b g" onclick="detail(${p.id})">Details</button><button class="b" onclick="add(${p.id})" ${p.stock < 1 ? "disabled" : ""}>${p.stock < 1 ? "Sold out" : "Add"}</button></div></div></div>`).join("") || "<p>No pickles match your filters.</p>"}</div>
 <div class="pg">${Array.from({ length: pages }, (_, i) => `<button class="b ${i + 1 == F.pg ? "on" : "g"}" onclick="F.pg=${i + 1};shop()">${i + 1}</button>`).join("")}</div>${extra()}`;

  $("#q").oninput = (e) => {
    F.q = e.target.value;
    F.pg = 1;
    shop();
    $("#q").focus();
    $("#q").setSelectionRange(99, 99);
  };
  $("#cat").onchange = (e) => {
    F.cat = e.target.value;
    F.pg = 1;
    shop();
  };
  $("#mx").onchange = (e) => {
    F.max = +e.target.value;
    F.pg = 1;
    shop();
  };
  $("#so").onchange = (e) => {
    F.sort = e.target.value;
    shop();
  };
}

function show() {
  document
    .querySelectorAll(".sl")
    .forEach((e, i) => e.classList.toggle("on", i == slide));
  document
    .querySelectorAll(".dots i")
    .forEach((e, i) => e.classList.toggle("on", i == slide));
}

function go(d) {
  slide = (slide + d + SLIDES.length) % SLIDES.length;
  show();
}

setInterval(() => {
  if (V == "shop" && !$("#ov").innerHTML && !$(".car:hover")) go(1);
}, 4500);

function modal(h, c) {
  $("#ov").innerHTML = `<div class="ov ${c || ""}" onclick="if(event.target==this)closeM()"><div class="md"><button class="x" onclick="closeM()">×</button>${h}</div></div>`;
}

function closeM() {
  $("#ov").innerHTML = "";
}

let rs = 5;
async function detail(id) {
  rs = 5;
  try {
    RV = (await api("/api/reviews/" + id)).map((r) => ({
      n: r.userName,
      r: r.rating,
      t: r.comment,
    }));
  } catch (e) {
    RV = [];
  }
  const p = S.p.find((x) => x.id == id);
  modal(
    `${p.img ? `<img src="${p.img}" alt="${esc(p.name)}" style="width:100%;max-height:260px;object-fit:cover;border-radius:12px">` : `<div style="font-size:4rem;text-align:center">${p.emo}</div>`}<h2 style="margin:4px 0">${esc(p.name)}</h2><div class="st">${stars(avg(p))} <span class="mut">${avg(p).toFixed(1)} · ${p.ratingCount} reviews</span></div><p>${esc(p.desc)}</p><p class="pr">₹${p.price} <span class="mut">· ${p.stock} in stock</span></p><button class="b" onclick="add(${id});closeM()" ${p.stock < 1 ? "disabled" : ""}>Add to cart</button><button class="b g" onclick="buyNow(${id})" ${p.stock < 1 ? "disabled" : ""}>Buy now</button><div style="margin-top:10px"><input id="pdz" placeholder="Delivery pincode" maxlength="6" inputmode="numeric" style="max-width:150px;background:var(--card);border:1px solid var(--bd);border-radius:8px;padding:8px 10px" oninput="pinCheck('#pdz','#pdr')"><div id="pdr" class="mut"></div></div>
 <h3>Reviews</h3>${RV.map((r) => `<div class="li"><div><b>${esc(r.n)}</b> <span class="st">${stars(r.r)}</span><br>${esc(r.t)}</div></div>`).join("") || "<p class='mut'>No reviews yet.</p>"}
 <h4>Rate this product</h4><div class="f"><div id="sp" class="st" style="font-size:1.8rem;cursor:pointer">${[1, 2, 3, 4, 5].map((n) => `<span onclick="setR(${n})" onmouseover="hr(${n})" onmouseout="hr(rs)">★</span>`).join("")}</div><input type="hidden" id="rr" value="5"><input id="rn" placeholder="Your name" value="${esc(ME ? ME.n : "")}" readonly><textarea id="rt" placeholder="Your review"></textarea><button class="b" onclick="addRev(${id})">Submit review</button></div>`,
  );
}

async function addRev(id) {
  if (!ME) return authM("login");
  const t = $("#rt").value.trim();
  if (!t) return alert("Write a short review");
  try {
    await api("/api/reviews", {
      method: "POST",
      body: { productId: id, rating: +$("#rr").value, comment: t },
    });
    toast("Thanks for your review");
    await loadP();
    detail(id);
    if (V == "shop") shop();
  } catch (e) {
    alert(e.message);
  }
}

function buyNow(id) {
  S.c = { [id]: 1 };
  save();
  upd();
  checkout();
}

$("#cb").onclick = cart;

function cart() {
  const it = cartItems();
  modal(
    `<h2>Your cart</h2>${it.map((x) => `<div class="li"><div>${x.p.emo} ${esc(x.p.name)}<br><span class="mut">₹${x.p.price} × ${x.q}</span></div><div><button class="b g" onclick="qty(${x.p.id},-1)">−</button> <button class="b g" onclick="qty(${x.p.id},1)">+</button></div></div>`).join("") || "<p>Your cart is empty.</p>"}${disc() ? `<p style="color:var(--ok)">Festive discount applied: you saved ₹${disc()} 🎉</p>` : `<p class="mut">Spend ₹400+ to get 5% off, ₹700+ for 10% off.</p>`}${it.length ? freeBar() + couponBox() : ""}<h3>Total: ₹${total()}</h3><button class="b" onclick="checkout()" ${it.length ? "" : "disabled"}>Checkout</button>`,
    "dr",
  );
}

function qty(id, d) {
  const p = S.p.find((x) => x.id == id),
    n = (S.c[id] || 0) + d;
  if (n > p.stock) return;
  if (n <= 0) delete S.c[id];
  else S.c[id] = n;
  save();
  upd();
  cart();
}

function checkout() {
  if (!cartItems().length) return;
  if (!ME) return authM("login", 1);
  const ship = total() >= 750 ? 0 : 49;
  modal(
    `<h2>Checkout</h2><div class="f"><input id="cn" placeholder="Full name" value="${esc(ME.n)}"><input id="cp" placeholder="Phone"><textarea id="ca" placeholder="Delivery address"></textarea><input id="cz" placeholder="Pincode (6 digits)" maxlength="6" inputmode="numeric" oninput="pinCheck('#cz','#cr')"><div id="cr" class="mut"></div><select id="pm"><option>Pay online (Razorpay)</option><option>Cash on delivery</option></select>
 <div class="mut">Items ₹${total()} + shipping ₹${ship}</div><h3 style="margin:0">Pay ₹${total() + ship}</h3><button class="b" onclick="rzp(${ship})">Proceed to pay</button><div class="mut">Razorpay test mode: no real payment is taken.</div></div>`,
  );
}

async function track() {
  if (!ME) return needLogin();
  try {
    await loadMine();
  } catch (e) {}
  $("#app").innerHTML = `<h2>Track your order</h2><div class="bar"><input id="tid" placeholder="Order ID e.g. AG123456"><button class="b" id="tg">Track</button></div><div id="tr"></div>`;
  $("#tg").onclick = () => {
    const o = S.o.find(
      (x) => x.id == $("#tid").value.trim().toUpperCase(),
    );
    $("#tr").innerHTML = o
      ? `<div class="card" style="padding:16px"><b>${o.id}</b> · ${o.date} · ₹${o.total} · ${o.paid ? "Paid" : o.pending ? "Payment pending" : "Pay on delivery"}${o.cx ? '<p style="color:#dc2626"><b>Order cancelled</b>' + (o.paid ? " · refund of ₹" + o.total + " initiated (3–5 business days)" : "") + "</p>" : ""}<div class="tr" ${o.cx ? 'style="opacity:.4"' : ""}>${STEPS.map((s, i) => `<div class="${i <= o.st ? "d" : ""}"><b>${i <= o.st ? "✓" : i + 1}</b>${s}</div>`).join("")}</div>${o.items.map((i) => `<div class="mut">${esc(i.n)} × ${i.q}</div>`).join("")}${cxBtn(o)}</div>`
      : "<p>No order found with that ID.</p>";
  };
}

async function admin() {
  if (!isA()) {
    $("#app").innerHTML =
      "<h2>Admin only</h2><p>Log in with an admin account to continue.</p><button class='b' onclick=\"authM('login')\">Login</button>";
    return;
  }
  adm = true;
  $("#app").innerHTML = '<p class="mut">Loading…</p>';
  try {
    await loadAdmin();
  } catch (e) {
    $("#app").innerHTML = '<p class="bad">' + esc(e.message) + "</p>";
    return;
  }
  adminView();
}

async function loadAdmin() {
  const full = ME.role == "ADMIN";
  const [o, p, u, k, sb] = await Promise.all([
    api("/api/admin/orders"),
    api("/api/admin/products"),
    full ? api("/api/admin/users") : [],
    full ? api("/api/admin/coupons") : [],
    full ? api("/api/admin/subscribers") : [],
  ]);
  S.o = o.map(mapO);
  S.p = p.filter((x) => x.active).map(mapP);
  S.u = u.map((x) => ({
    id: x.id,
    n: x.name,
    e: x.email,
    role: x.role,
    orders: x.orders,
    spent: x.spent,
  }));
  S.k = k.map((c) => ({
    id: c.id,
    code: c.code,
    pct: c.percent,
    min: c.minOrder,
  }));
  S.sub = sb;
}

async function putP(p, c) {
  const r = p.raw,
    v0 = r.variants[0];
  const body = {
    name: c.name ?? r.name,
    category: c.cat ?? r.category,
    description: c.desc ?? r.description,
    ingredients: r.ingredients,
    shelfLife: r.shelfLife,
    emoji: c.emo ?? r.emoji,
    imageUrl: c.img ?? r.imageUrl,
    active: r.active,
    variants: [
      {
        id: v0.id,
        label: v0.label,
        price: c.price ?? v0.price,
        stock: c.stock ?? v0.stock,
      },
      ...r.variants
        .slice(1)
        .map((v) => ({ id: v.id, label: v.label, price: v.price, stock: v.stock })),
    ],
  };
  const x = await api("/api/admin/products/" + p.id, {
    method: "PUT",
    body,
  });
  Object.assign(p, mapP(x));
  return p;
}

async function setRole(id, r) {
  try {
    await api("/api/admin/users/" + id + "/role", {
      method: "PATCH",
      body: { role: r },
    });
    toast("Role updated");
    await loadAdmin();
    adminView();
  } catch (e) {
    alert(e.message);
    adminView();
  }
}

async function setSt(id, v) {
  const o = S.o.find((o) => o.id == id);
  if (!o || o.cx) return;
  try {
    await api("/api/admin/orders/" + o.k + "/status", {
      method: "PATCH",
      body: { status: ST[+v] },
    });
    o.st = +v;
    toast("Order " + id + " updated");
  } catch (e) {
    alert(e.message);
    adminView();
  }
}

async function setStock(id, v) {
  const p = S.p.find((x) => x.id == id);
  try {
    await putP(p, { stock: Math.max(0, +v || 0) });
  } catch (e) {
    alert(e.message);
    adminView();
  }
}

async function del(id) {
  if (!confirm("Delete this product?")) return;
  try {
    await api("/api/admin/products/" + id, { method: "DELETE" });
    S.p = S.p.filter((p) => p.id != id);
    delete S.c[id];
    save();
    upd();
    adminView();
  } catch (e) {
    alert(e.message);
  }
}

document.querySelectorAll("nav [data-v]").forEach(
  (b) =>
    (b.onclick = () => {
      V = b.dataset.v;
      render();
    }),
);

const D = {};
const isA = () => !!ME && (ME.role == "ADMIN" || ME.role == "STAFF");

$("#ab").onclick = () => (ME ? acct() : authM("login"));

function authM(m, co) {
  const L = m == "login";
  modal(
    `<h2>${L ? "Login" : "Create account"}</h2><div class="f">${L ? "" : '<input id="un" placeholder="Full name">'}<input id="ue" type="email" placeholder="Email"><input id="up" type="password" placeholder="Password (min 6 characters)"><button class="b" onclick="auth('${m}',${co ? 1 : 0})">${L ? "Login" : "Sign up"}</button>${L ? `<button class="b g" onclick="forgotM(${co ? 1 : 0})">Forgot password?</button>` : ""}<button class="b g" onclick="authM('${L ? "signup" : "login"}',${co ? 1 : 0})">${L ? "New here? Create account" : "Have an account? Login"}</button></div>`,
  );
}

async function auth(m, co) {
  const e = $("#ue").value.trim().toLowerCase(),
    p = $("#up").value;
  if (!/^\S+@\S+\.\S+$/.test(e) || p.length < 6)
    return alert("Enter a valid email and a password of 6+ characters");
  try {
    let r;
    if (m == "signup") {
      const n = $("#un").value.trim();
      if (!n) return alert("Enter your name");
      r = await api("/api/auth/register", {
        method: "POST",
        body: { name: n, email: e, password: p },
      });
    } else
      r = await api("/api/auth/login", {
        method: "POST",
        body: { email: e, password: p },
      });
    TOKEN = r.token;
    try {
      localStorage.setItem(TK, r.token);
    } catch (x) {}
    ME = { n: r.user.name, e: r.user.email, role: r.user.role, id: r.user.id };
    closeM();
    S.o = [];
    if (isA()) V = "admin";
    upd();
    render();
    if (co && !isA()) checkout();
  } catch (er) {
    if (m == "signup" && er.status == 409) return existsM(e, co);
    alert(er.message);
  }
}

async function acct() {
  const u = { n: ME.n, e: ME.e };
  if (!isA())
    try {
      await loadMine();
    } catch (e) {}
  modal(
    `<h2>Hi, ${esc(u.n)}</h2><p class="mut">${esc(u.e)}${isA() ? " · Admin" : ""}</p><h3>Your orders</h3>${(isA() ? [] : S.o).map((o) => `<div class="li"><div><b>${o.id}</b> · ₹${o.total}<br><span class="mut">${o.cx ? "Cancelled" : STEPS[o.st]}</span></div>${o.cx ? "" : `<button class="b g" onclick="invoice('${o.id}')">Invoice</button>`}${canCx(o) ? `<button class="b g" onclick="cancelO('${o.id}',1)">Cancel</button>` : ""}</div>`).join("") || "<p class='mut'>No orders yet.</p>"}<button class="b g" onclick="logout()">Logout</button>`,
  );
}

function logout() {
  try {
    localStorage.removeItem(TK);
  } catch (e) {}
  TOKEN = null;
  ME = null;
  S.o = [];
  S.u = [];
  S.k = [];
  adm = false;
  closeM();
  V = "shop";
  loadP()
    .catch(() => {})
    .then(render);
}

function gc(c) {
  V = "shop";
  F.cat = c;
  F.pg = 1;
  render();
  const e = document.querySelector(".sh");
  if (e) e.scrollIntoView();
}

function tiles() {
  const cs = [...new Set(S.p.map((p) => p.cat))];
  return `<div class="tiles">${cs.map((c) => {
        const l = S.p.filter((p) => p.cat == c);
        return `<div class="tile" onclick="gc('${esc(c)}')"><span>${l[0].emo}</span><b>${esc(c)} pickles</b><br><small>${l.length} items</small></div>`;
      }).join("")}</div>`;
}

function ben() {
  return `<div class="ben"><div><span>🚚</span><b>Quick delivery</b>Fresh flavours, right on time</div><div><span>😋</span><b>Authentic taste</b>Traditional recipes, true to roots</div><div><span>🫙</span><b>Wide range</b>Mango, lemon, chilli &amp; more</div><div><span>🌿</span><b>Real ingredients</b>No artificial colours</div><div><span>✅</span><b>Quality-made</b>Clean, safe, consistent</div></div>`;
}

function extra() {
  return `<div class="prom"><h2>The Achaar Ghar promise</h2><p>We make pickles the way they were made in family kitchens: sun-cured fruit and vegetables, hand-ground spices and cold-pressed oil, prepared in small batches with minimal processing. Every jar is packed to carry that homemade taste to your table.</p><div class="bd"><i>Nostalgia</i><i>Trust</i><i>Legacy</i><i>Great value</i><i>Good health</i><i>Authentic</i></div></div>
<h2 class="sh">What our customers say</h2><div class="tst"><div><p>“Tastes exactly like my grandmother’s mango pickle. Perfect with aloo parathas.”</p><b>Surbhi T.</b></div><div><p>“The garlic pickle with curd rice is unbeatable. Ordering again.”</p><b>Ashwini R.</b></div><div><p>“Great flavour and the jar arrived well packed. Highly recommended.”</p><b>Javed K.</b></div><div><p>“Spicy, tangy and not too oily. The lemon pickle is my favourite.”</p><b>Durga M.</b></div></div>
<h2 class="sh">Frequently asked questions</h2><details><summary>Is pickle good for health?</summary><p>In small amounts, yes. Spices like mustard, fenugreek and turmeric support digestion, but pickles contain salt and oil, so enjoy a spoonful rather than a bowlful.</p></details><details><summary>Can I eat pickle every day?</summary><p>A small spoon with meals is generally fine. If you have high blood pressure or heart conditions, check with your doctor first.</p></details><details><summary>How long does a jar last?</summary><p>Unopened jars keep for months at room temperature. Once opened, use a dry spoon and keep the lid tight.</p></details>
<div class="nl"><h3 style="margin-top:0">Sign up for more updates</h3><p class="mut">Be the first to know about new launches, recipes and offers.</p><input id="nle" type="email" placeholder="Email"><button class="b" onclick="subscribe()">Sign up</button></div>`;
}

const canCx = (o) => !o.cx && o.st < 3;
const cxBtn = (o) =>
  (o.cx
    ? ""
    : `<button class="b g" style="margin:12px 8px 0 0" onclick="invoice('${o.id}')">View invoice</button>`) +
  (o.pending
    ? `<button class="b" style="margin:12px 8px 0 0" onclick="payOrder(${o.k})">Complete payment</button>`
    : "") +
  cxBtn0(o);
const cxBtn0 = (o) =>
  canCx(o)
    ? `<button class="b g" style="margin-top:12px" onclick="cancelO('${o.id}')">Cancel order</button>`
    : o.cx
      ? ""
      : o.st >= 3
        ? '<p class="mut">Cancellation is not available once the order is out for delivery.</p>'
        : "";

async function cancelO(id, a) {
  const o = S.o.find((x) => x.id == id);
  if (!o || !canCx(o)) return alert("This order can no longer be cancelled.");
  if (!confirm("Cancel order " + id + "?")) return;
  try {
    const r = await api("/api/orders/" + o.k + "/cancel", { method: "POST" });
    await loadMine();
    try {
      await loadP();
    } catch (x) {}
    if (a) acct();
    else if (V == "track" && $("#tg")) $("#tg").onclick();
    alert(
      "Order cancelled." +
        (r.paymentStatus == "REFUND_INITIATED"
          ? " Your refund of ₹" + o.total + " has been initiated."
          : ""),
    );
  } catch (e) {
    alert(e.message);
  }
}

function toast(m) {
  const t = document.createElement("div");
  t.className = "toast";
  t.textContent = m;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2300);
}

function heart(id, e) {
  e.stopPropagation();
  const b = e.currentTarget,
    i = S.w.indexOf(id);
  if (i < 0) S.w.push(id);
  else S.w.splice(i, 1);
  save();
  b.textContent = i < 0 ? "♥" : "♡";
  toast(i < 0 ? "Added to wishlist ♥" : "Removed from wishlist");
  if (F.wish) shop();
  else
    document.querySelectorAll(".bar .b").forEach((x) => {
      if (x.textContent.startsWith("♥"))
        x.textContent = "♥ Wishlist (" + S.w.length + ")";
    });
}

function freeBar() {
  const t = total(),
    r = 750 - t;
  return r > 0
    ? `<div class="mut">Add ₹${r} more for free delivery</div><div class="pb"><i style="width:${Math.min(100, t / 7.5)}%"></i></div>`
    : '<div style="color:var(--ok);margin:6px 0 12px">🎉 You have unlocked free delivery!</div>';
}

function setR(n) {
  rs = n;
  $("#rr").value = n;
  hr(n);
}

function hr(n) {
  document
    .querySelectorAll("#sp span")
    .forEach((s, i) => (s.textContent = i < n ? "★" : "☆"));
}

function confetti() {
  for (let i = 0; i < 36; i++) {
    const s = document.createElement("div");
    s.className = "cf";
    s.textContent = ["🎉", "🌶️", "🥭", "🍋", "✨"][i % 5];
    s.style.left = Math.random() * 100 + "vw";
    s.style.animationDelay = Math.random() * 0.6 + "s";
    document.body.appendChild(s);
    setTimeout(() => s.remove(), 3000);
  }
}

$("#tb").onclick = () => {
  const r = document.documentElement,
    d =
      r.dataset.theme == "dark" ||
      (!r.dataset.theme && matchMedia("(prefers-color-scheme:dark)").matches);
  r.dataset.theme = d ? "light" : "dark";
};

const TP = document.createElement("button");
TP.className = "b top";
TP.textContent = "↑";
TP.onclick = () => scrollTo({ top: 0, behavior: "smooth" });
document.body.appendChild(TP);
addEventListener("scroll", () => {
  TP.style.display = scrollY > 400 ? "block" : "none";
});

function goHome() {
  closeM();
  V = isA() ? "admin" : "shop";
  F = { q: "", cat: "All", max: 500, sort: "def", pg: 1 };
  slide = 0;
  render();
  scrollTo({ top: 0, behavior: "smooth" });
}

let AT = "dash",
  OF = "All";

function adminView() {
  const tabs = [
    ["dash", "📊 Dashboard"],
    ["ord", "📦 Orders"],
    ["prod", "🫙 Products"],
    ["cpn", "🏷️ Coupons"],
    ["nws", "📧 Newsletter"],
    ["usr", "👥 Customers"],
  ].filter((t) => ME.role == "ADMIN" || t[0] == "dash" || t[0] == "ord");
  const act = S.o.filter((o) => !o.cx && !o.pending),
    rev = act.reduce((a, o) => a + o.total, 0);
  let h = `<div class="bar">${tabs.map((t) => `<button class="b ${AT == t[0] ? "on" : "g"}" onclick="AT='${t[0]}';adminView()">${t[1]}</button>`).join("")}</div>`;
  if (AT == "dash") {
    const cnt = STEPS.map((s, i) => act.filter((o) => o.st == i).length),
      mx = Math.max(1, ...cnt),
      low = S.p.filter((p) => p.stock < 10);
    h += `<div class="tiles">${[["₹" + rev, "Revenue"], [S.o.length, "Total orders"], [act.filter((o) => o.st < 4).length, "Open orders"], [S.o.filter((o) => o.cx).length, "Cancelled"], [S.u.filter((u) => u.role == "CUSTOMER").length, "Customers"], [low.length, "Low stock"]].map((k) => `<div class="tile" style="cursor:default"><b style="font-size:1.5rem">${k[0]}</b><br><small>${k[1]}</small></div>`).join("")}</div>
  <h3>Orders by status</h3>${STEPS.map((s, i) => `<div class="li"><span style="width:130px">${s}</span><div class="pb" style="flex:1;margin:0"><i style="width:${(cnt[i] / mx) * 100}%"></i></div><b>${cnt[i]}</b></div>`).join("")}
  <h3>Low stock (under 10)</h3>${low.map((p) => `<div class="li"><span>${p.emo} ${esc(p.name)}</span><b>${p.stock} left</b></div>`).join("") || "<p class='mut'>All products are well stocked.</p>"}
  <h3>Recent orders</h3>${S.o.slice(0, 5).map((o) => `<div class="li"><span><b>${o.id}</b> · ${esc(o.name)}</span><span>₹${o.total} · ${o.cx ? "Cancelled" : STEPS[o.st]}</span></div>`).join("") || "<p class='mut'>No orders yet.</p>"}`;
  }
  if (AT == "ord") {
    const l = S.o.filter(
      (o) =>
        OF == "All" ||
        (OF == "Cancelled" ? o.cx : !o.cx && STEPS[o.st] == OF),
    );
    h += `<div class="bar"><select onchange="OF=this.value;adminView()">${["All", ...STEPS, "Cancelled"].map((x) => `<option ${x == OF ? "selected" : ""}>${x}</option>`).join("")}</select></div><div class="wrap"><table class="tbl"><tr><th>ID</th><th>Customer</th><th>Items</th><th>Total</th><th>Status</th></tr>${l.map((o) => `<tr><td>${o.id}<br><span class="mut">${o.date}</span></td><td>${esc(o.name)}<br><span class="mut">${esc(o.email || "")}<br>${esc(o.phone)} · ${esc(o.addr)}</span></td><td>${o.items.map((i) => esc(i.n) + " × " + i.q).join("<br>")}</td><td>₹${o.total}<br><span class="mut">${esc(o.pay)}${o.pid ? "<br>" + esc(o.pid) : ""}</span></td><td>${o.cx ? '<b style="color:#dc2626">Cancelled</b>' : o.pending ? '<span class="mut">Awaiting payment</span>' : `<select onchange="setSt('${o.id}',this.value)">${STEPS.map((s, i) => `<option value="${i}" ${i == o.st ? "selected" : ""}>${s}</option>`).join("")}</select>`}</td></tr>`).join("") || "<tr><td colspan=5>No orders.</td></tr>"}</table></div>`;
  }
  if (AT == "prod") {
    h += `<h3>Add product</h3><div class="bar"><input id="an" placeholder="Name"><select id="ac">${Object.keys(COL).map((c) => `<option>${c}</option>`).join("")}</select><input id="ap" type="number" placeholder="Price ₹" style="max-width:110px"><input id="as" type="number" placeholder="Stock" style="max-width:100px"><input id="ae" placeholder="Emoji" style="max-width:80px" value="🫙"><button class="b" id="ad">Add product</button></div><div class="wrap"><table class="tbl">${S.p.map((p) => `<tr><td>${p.emo} ${esc(p.name)}<br><span class="mut">${esc(p.cat)}</span></td><td>₹${p.price}</td><td>Stock <input type="number" value="${p.stock}" style="width:70px" onchange="setStock(${p.id},this.value)"></td><td><button class="b g" onclick="editP(${p.id})">Edit</button> <button class="b g" onclick="del(${p.id})">Delete</button></td></tr>`).join("")}</table></div>`;
  }
  if (AT == "cpn") {
    h += couponAdmin();
  }
  if (AT == "nws") {
    h += newsAdmin();
  }
  if (AT == "usr") {
    h += `<div class="wrap"><table class="tbl"><tr><th>Name</th><th>Email</th><th>Orders</th><th>Spent</th><th>Role</th></tr>${S.u.map((u) => `<tr><td>${esc(u.n)}</td><td>${esc(u.e)}</td><td>${u.orders}</td><td>₹${u.spent}</td><td>${u.e == ME.e ? `<span class="mut">${u.role.toLowerCase()} (you)</span>` : `<select onchange="setRole(${u.id},this.value)">${["CUSTOMER", "STAFF", "ADMIN"].map((r) => `<option value="${r}" ${r == u.role ? "selected" : ""}>${r[0] + r.slice(1).toLowerCase()}</option>`).join("")}</select>`}</td></tr>`).join("") || "<tr><td colspan=5>No users yet.</td></tr>"}</table></div>`;
  }
  $("#app").innerHTML =
    "<h2>Admin console</h2>" +
    h +
    `<button class="b g" onclick="logout()" style="margin-top:14px">Logout</button>`;
  if (AT == "prod")
    $("#ad").onclick = async () => {
      const n = $("#an").value.trim(),
        pr = +$("#ap").value;
      if (!n || pr <= 0) return alert("Enter a name and price");
      try {
        await api("/api/admin/products", {
          method: "POST",
          body: {
            name: n,
            category: $("#ac").value,
            description:
              "Small-batch, sun-cured with cold-pressed mustard oil and hand-ground spices.",
            ingredients: "",
            shelfLife: "12 months unopened",
            emoji: $("#ae").value || "🫙",
            active: true,
            variants: [{ label: "400g", price: pr, stock: +$("#as").value || 0 }],
          },
        });
        toast("Product added");
        await loadAdmin();
        adminView();
      } catch (e) {
        alert(e.message);
      }
    };
}

let PE = "";
function existsM(e, co) {
  PE = e;
  modal(
    `<h2>This email already has an account</h2><p><b>${esc(e)}</b> is already registered. Log in with it, or reset your password if you have forgotten it.</p><div class="f"><button class="b" onclick="authM('login',${co ? 1 : 0});$('#ue').value=PE">Log in instead</button><button class="b g" onclick="forgotM(${co ? 1 : 0})">Forgot password</button></div>`,
  );
}

function forgotM(co) {
  const c = $("#ue");
  if (c && c.value.trim()) PE = c.value.trim().toLowerCase();
  modal(
    `<h2>Forgot your password?</h2><p class="mut">Enter your email and we will send a 6-digit code to reset your password.</p><div class="f"><input id="fe" type="email" placeholder="Email" value="${esc(PE)}"><button class="b" onclick="sendCode(${co ? 1 : 0})">Send code</button><button class="b g" onclick="authM('login',${co ? 1 : 0})">Back to login</button></div>`,
  );
}

async function sendCode(co) {
  const e = $("#fe").value.trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(e)) return alert("Enter a valid email");
  PE = e;
  let dev = "";
  try {
    const r = await api("/api/auth/forgot", {
      method: "POST",
      body: { email: e },
    });
    dev = r.devCode || "";
  } catch (er) {
    return alert(er.message);
  }
  modal(
    `<h2>Check your email</h2><p>If <b>${esc(e)}</b> has an account, we have sent a 6-digit code. It works for 10 minutes.</p>${dev ? `<p class="mut" style="background:var(--bd);padding:8px;border-radius:8px">Local testing only: your code is <b>${dev}</b>.</p>` : ""}<div class="f"><input id="rc" inputmode="numeric" placeholder="6-digit code"><input id="np" type="password" placeholder="New password (min 6 characters)"><button class="b" onclick="resetPw(${co ? 1 : 0})">Change password</button><button class="b g" onclick="authM('login',${co ? 1 : 0})">Back to login</button></div>`,
  );
}

async function resetPw(co) {
  const code = $("#rc").value.trim(),
    p = $("#np").value;
  if (p.length < 6)
    return alert("Choose a password of at least 6 characters");
  try {
    await api("/api/auth/reset", {
      method: "POST",
      body: { email: PE, code, password: p },
    });
    toast("Password changed. Please log in.");
    authM("login", co);
    $("#ue").value = PE;
  } catch (e) {
    alert(e.message);
  }
}

function couponBox() {
  return CP && cdisc()
    ? `<p style="color:var(--ok)">Coupon ${esc(CP.code)} applied: you saved ₹${cdisc()} <button class="b g" onclick="CP=null;cart()">Remove</button></p>`
    : `<div class="row" style="margin:8px 0"><input id="cc" placeholder="Coupon code" style="flex:1;background:var(--card);border:1px solid var(--bd);border-radius:8px;padding:8px 10px"><button class="b g" onclick="applyCp()">Apply</button></div>`;
}

async function applyCp() {
  const code = $("#cc").value.trim().toUpperCase();
  if (!code) return;
  if (!ME) return authM("login");
  try {
    const c = await api(
      "/api/coupons/validate?code=" +
        encodeURIComponent(code) +
        "&subtotal=" +
        sub(),
    );
    CP = { code: c.code, pct: c.percent, min: c.minOrder };
    toast("Coupon applied");
    cart();
  } catch (e) {
    toast(e.message);
  }
}

function couponAdmin() {
  return `<h3>Create coupon</h3><div class="bar"><input id="kc" placeholder="Code e.g. DIWALI15"><input id="kp" type="number" placeholder="% off" style="max-width:100px"><input id="km" type="number" placeholder="Min order ₹" style="max-width:130px"><button class="b" onclick="addCp()">Create</button></div><div class="wrap"><table class="tbl"><tr><th>Code</th><th>Discount</th><th>Minimum order</th><th></th></tr>${S.k.map((c, i) => `<tr><td>${esc(c.code)}</td><td>${c.pct}%</td><td>₹${c.min}</td><td><button class="b g" onclick="delCp(${i})">Delete</button></td></tr>`).join("") || "<tr><td colspan=4>No coupons yet.</td></tr>"}</table></div>`;
}

async function addCp() {
  const code = $("#kc").value.trim().toUpperCase(),
    pct = +$("#kp").value,
    min = +$("#km").value || 0;
  if (!code || pct < 1 || pct > 90)
    return alert("Enter a code and a discount between 1 and 90 percent");
  try {
    await api("/api/admin/coupons", {
      method: "POST",
      body: { code, percent: pct, minOrder: min, active: true },
    });
    toast("Coupon created");
    await loadAdmin();
    adminView();
  } catch (e) {
    alert(e.message);
  }
}

async function delCp(i) {
  const c = S.k[i];
  try {
    await api("/api/admin/coupons/" + c.id, { method: "DELETE" });
    await loadAdmin();
    adminView();
  } catch (e) {
    alert(e.message);
  }
}

function deliv(z) {
  if (!/^[1-8]\d{5}$/.test(z)) return null;
  const m = ["110", "400", "560", "600", "700", "500", "411", "380"].includes(
      z.slice(0, 3),
    ),
    far = ["78", "79", "18", "19"].includes(z.slice(0, 2)),
    d = m ? [2, 3] : far ? [6, 8] : [4, 6],
    f = (n) =>
      new Date(Date.now() + n * 864e5).toLocaleDateString(undefined, {
        day: "numeric",
        month: "short",
      });
  return {
    days: d,
    txt:
      "Delivery in " +
      d[0] +
      "–" +
      d[1] +
      " days (by " +
      f(d[0]) +
      " to " +
      f(d[1]) +
      ")",
  };
}

function pinCheck(el, out) {
  const v = $(el).value.trim(),
    r = deliv(v),
    o = $(out);
  if (!v) {
    o.textContent = "";
    return;
  }
  o.style.color = r ? "var(--ok)" : "#dc2626";
  o.textContent = r
    ? r.txt
    : v.length < 6
      ? "Enter a 6-digit pincode"
      : "Sorry, we cannot deliver to this pincode";
}

let EP = null;
function editP(id) {
  const p = S.p.find((x) => x.id == id);
  EP = { id, img: p.img || "" };
  modal(
    `<h2>Edit product</h2><div class="f"><input id="en" value="${esc(p.name)}" placeholder="Name"><select id="ec">${Object.keys(COL).map((c) => `<option ${c == p.cat ? "selected" : ""}>${c}</option>`).join("")}</select><input id="ep" type="number" value="${p.price}" placeholder="Price ₹"><input id="es" type="number" value="${p.stock}" placeholder="Stock"><input id="ee" value="${esc(p.emo)}" placeholder="Emoji"><textarea id="ed">${esc(p.desc)}</textarea><label class="mut">Photo (optional)<input type="file" accept="image/*" onchange="pickImg(this)"></label><div id="ei">${p.img ? `<img src="${p.img}" style="max-width:140px;border-radius:8px">` : ""}</div><div class="row"><button class="b" onclick="saveP()">Save changes</button>${p.img ? `<button class="b g" onclick="EP.img='';$('#ei').innerHTML=''">Remove photo</button>` : ""}</div></div>`,
  );
}

async function pickImg(inp) {
  const f = inp.files[0];
  if (!f) return;
  if (!f.type.startsWith("image/")) return alert("Choose an image file");
  const fd = new FormData();
  fd.append("file", f);
  try {
    const r = await api("/api/admin/upload", { method: "POST", form: fd });
    EP.img = r.url;
    $("#ei").innerHTML = `<img src="${EP.img}" style="max-width:140px;border-radius:8px">`;
  } catch (e) {
    alert(e.message);
  }
}

async function saveP() {
  const p = S.p.find((x) => x.id == EP.id),
    n = $("#en").value.trim(),
    pr = +$("#ep").value;
  if (!n || pr <= 0) return alert("Enter a name and price");
  try {
    await putP(p, {
      name: n,
      cat: $("#ec").value,
      price: pr,
      stock: Math.max(0, +$("#es").value || 0),
      emo: $("#ee").value || "🫙",
      desc: $("#ed").value.trim(),
      img: EP.img,
    });
    closeM();
    toast("Product updated");
    adminView();
  } catch (e) {
    alert(e.message);
  }
}

function invoice(id) {
  const o = S.o.find((x) => x.id == id);
  if (!o) return;
  const sb =
      o.sub != null ? o.sub : o.items.reduce((a, i) => a + i.q * i.pr, 0),
    adj = o.total - sb;
  modal(
    `<div id="inv"><h2 style="margin:0">🫙 Achaar Ghar</h2><div class="mut">Invoice (demo store)</div><hr><div class="row" style="justify-content:space-between;align-items:flex-start"><div><b>Invoice</b> ${esc(o.id)}<br>${esc(o.date)}</div><div><b>Billed to</b><br>${esc(o.name)}<br>${esc(o.phone)}<br>${esc(o.addr)}</div></div><table class="tbl"><tr><th>Item</th><th>Qty</th><th>Price</th><th>Amount</th></tr>${o.items.map((i) => `<tr><td>${esc(i.n)}</td><td>${i.q}</td><td>₹${i.pr}</td><td>₹${i.pr * i.q}</td></tr>`).join("")}</table><p style="text-align:right;margin:8px 0">Subtotal ₹${sb}${o.disc ? `<br>Discounts −₹${o.disc}${o.coupon ? " (" + esc(o.coupon) + ")" : ""}` : ""}${o.ship != null ? `<br>Delivery ${o.ship ? "₹" + o.ship : "Free"}` : adj ? `<br>Adjustments ${adj < 0 ? "−" : "+"}₹${Math.abs(adj)}` : ""}<br><b style="font-size:1.2rem">Total ₹${o.total}</b></p><p class="mut">Payment: ${esc(o.pay)} · ${o.paid ? "Paid" : "Pay on delivery"}${o.pid ? " · " + esc(o.pid) : ""}</p></div><button class="b noprint" onclick="window.print()">Print / Save as PDF</button>`,
  );
}

async function subscribe() {
  const v = $("#nle").value.trim();
  if (!/^\S+@\S+\.\S+$/.test(v)) return alert("Enter a valid email");
  try {
    const r = await api("/api/newsletter/subscribe", {
      method: "POST",
      body: { email: v },
    });
    toast(r.message);
    $("#nle").value = "";
  } catch (e) {
    alert(e.message);
  }
}

function newsAdmin() {
  const act = S.sub.filter((x) => x.active).length,
    pl = act == 1 ? "" : "s";
  return `<h3>Newsletter</h3><p class="mut">${act} active subscriber${pl}. Every email carries an unsubscribe link.</p><div class="f" style="max-width:560px"><input id="ns" placeholder="Subject e.g. New mango batch is here"><textarea id="nm" placeholder="Your message" style="min-height:120px"></textarea><button class="b" onclick="sendNews()" ${act ? "" : "disabled"}>Send to ${act} subscriber${pl}</button></div><h3>Subscribers</h3><div class="wrap"><table class="tbl"><tr><th>Email</th><th>Joined</th><th>Status</th></tr>${S.sub.map((x) => `<tr><td>${esc(x.email)}</td><td>${new Date(x.createdAt).toLocaleDateString()}</td><td>${x.active ? "Subscribed" : "Unsubscribed"}</td></tr>`).join("") || "<tr><td colspan=3>No subscribers yet.</td></tr>"}</table></div>`;
}

async function sendNews() {
  const s = $("#ns").value.trim(),
    m = $("#nm").value.trim();
  if (!s || !m) return alert("Add a subject and a message");
  if (!confirm("Send this to all active subscribers?")) return;
  try {
    const r = await api("/api/admin/newsletter", {
      method: "POST",
      body: { subject: s, message: m },
    });
    toast("Sent to " + r.sent + " subscriber" + (r.sent == 1 ? "" : "s"));
    $("#ns").value = "";
    $("#nm").value = "";
  } catch (e) {
    alert(e.message);
  }
}

function needLogin() {
  $("#app").innerHTML =
    "<h2>Please login</h2><p>Login to view your orders.</p><button class='b' onclick=\"authM('login')\">Login</button>";
}

function rzp(ship) {
  const n = $("#cn").value.trim(),
    ph = $("#cp").value.trim(),
    a = $("#ca").value.trim(),
    m = $("#pm").value;
  if (!n || !/^\d{10}$/.test(ph) || !a)
    return alert("Enter name, a 10-digit phone and address");
  const z = $("#cz").value.trim();
  if (!deliv(z))
    return alert("Enter a valid 6-digit pincode that we deliver to");
  Object.assign(D, { n, ph, a: a + " - " + z, z, m, ship });
  placeOrder();
}

async function placeOrder() {
  modal('<div class="sp"></div><p style="text-align:center">Placing your order…</p>');
  try {
    const cod = D.m == "Cash on delivery";
    const o = await api("/api/orders", {
      method: "POST",
      body: {
        items: cartItems().map((x) => ({ variantId: x.p.vid, qty: x.q })),
        name: D.n,
        phone: D.ph,
        address: D.a,
        pincode: D.z,
        paymentMethod: cod ? "COD" : "ONLINE",
        couponCode: CP && cdisc() ? CP.code : "",
      },
    });
    D.order = o;
    if (cod) return done(o);
    D.info = await api("/api/payments/create/" + o.id, { method: "POST" });
    D.amt = o.total;
    D.tab = "UPI";
    if (D.info.mock) rzUI();
    else realPay();
  } catch (e) {
    closeM();
    alert(e.message);
    try {
      await loadP();
    } catch (x) {}
  }
}

async function payOrder(k) {
  const o = S.o.find((x) => x.k == k);
  if (!o) return;
  try {
    D.order = { id: k };
    D.info = await api("/api/payments/create/" + k, { method: "POST" });
    D.amt = o.total;
    D.tab = "UPI";
    D.m = "Razorpay";
    if (D.info.mock) rzUI();
    else realPay();
  } catch (e) {
    alert(e.message);
  }
}

function realPay() {
  new Promise((res, rej) => {
    if (window.Razorpay) return res();
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = res;
    s.onerror = () =>
      rej(new Error("Could not load Razorpay. Check your internet connection."));
    document.body.appendChild(s);
  })
    .then(() => {
      new window.Razorpay({
        key: D.info.keyId,
        amount: D.info.amount,
        currency: "INR",
        name: "Achaar Ghar",
        order_id: D.info.razorpayOrderId,
        prefill: { name: D.n || ME.n, email: ME.e, contact: D.ph || "" },
        handler: (r) => verifyPay(r.razorpay_payment_id, r.razorpay_signature),
        modal: {
          ondismiss: () => {
            closeM();
            toast("Payment not completed. You can finish it from Track order.");
            V = "track";
            render();
          },
        },
      }).open();
    })
    .catch((e) => {
      closeM();
      alert(e.message);
    });
}

async function verifyPay(pid, sig) {
  try {
    done(
      await api("/api/payments/verify/" + D.order.id, {
        method: "POST",
        body: { razorpayPaymentId: pid, razorpaySignature: sig },
      }),
    );
  } catch (e) {
    closeM();
    alert(e.message);
  }
}

async function done(o) {
  const m = mapO(o);
  S.c = {};
  CP = null;
  save();
  upd();
  try {
    await loadP();
  } catch (e) {}
  render();
  confetti();
  modal(
    `<h2 style="color:var(--ok)">✓ Order placed!</h2><p>Your order ID is <b>${m.id}</b>.${m.pid ? " Payment ID: " + m.pid + "." : ""} Use it in “Track order”.</p><button class="b" onclick="V='track';closeM();render()">Track order</button>`,
  );
}

function rzUI(msg) {
  const t = D.tab;
  modal(
    `<div style="background:#0b2a5b;color:#fff;margin:-18px -18px 14px;padding:14px 18px;border-radius:14px 14px 0 0"><b>Achaar Ghar</b><br><span style="opacity:.8;font-size:.8rem">Razorpay Trusted Business · TEST MODE</span><div style="font-size:1.4rem;margin-top:6px">₹${D.amt}</div></div><div class="bar">${["UPI", "Card", "Netbanking", "Wallet"].map((x) => `<button class="b ${x == t ? "on" : "g"}" onclick="D.tab='${x}';rzUI()">${x}</button>`).join("")}</div>
 <div class="f">${t == "UPI" ? '<input id="r1" placeholder="UPI ID e.g. success@razorpay">' : t == "Card" ? '<input id="r1" placeholder="Card number" value="4111 1111 1111 1111"><div class="bar"><input id="r2" placeholder="MM/YY" value="12/30"><input id="r3" placeholder="CVV" type="password" value="123"></div>' : t == "Netbanking" ? '<select id="r1"><option>HDFC Bank</option><option>SBI</option><option>ICICI Bank</option></select>' : '<select id="r1"><option>Paytm</option><option>PhonePe</option><option>Amazon Pay</option></select>'}${msg ? `<div style="color:#dc2626">${msg}</div>` : ""}<button class="b" style="background:#2563eb" onclick="rzPay()">Pay ₹${D.amt}</button><div class="mut">Test mode: card 4111 1111 1111 1111 or UPI success@razorpay succeeds. UPI failure@razorpay or card 4000 0000 0000 0002 fails.</div></div>`,
  );
}

function rzPay() {
  const t = D.tab,
    v = $("#r1").value.trim();
  let ok = true;
  if (t == "UPI") {
    if (!/^[\w.\-]+@\w+$/.test(v)) return rzUI("Enter a valid UPI ID");
    ok = !v.startsWith("failure");
  }
  if (t == "Card") {
    const d = v.replace(/\s/g, "");
    if (
      !/^\d{16}$/.test(d) ||
      !/^\d{2}\/\d{2}$/.test($("#r2").value) ||
      !/^\d{3}$/.test($("#r3").value)
    )
      return rzUI("Check your card details");
    ok = d != "4000000000000002";
  }
  modal(
    '<div class="sp"></div><p style="text-align:center">Authorising with your bank…</p>',
  );
  setTimeout(() => {
    if (!ok)
      return rzUI(
        "Payment failed: bank declined (test). Try another method.",
      );
    D.m = "Razorpay " + t;
    verifyPay(
      "pay_" + Math.random().toString(36).slice(2, 12).toUpperCase(),
      "mock",
    );
  }, 1500);
}

async function init() {
  if (getToken()) {
    try {
      const u = await api("/api/me");
      ME = { n: u.name, e: u.email, role: u.role, id: u.id };
    } catch (e) {
      try {
        localStorage.removeItem(TK);
      } catch (x) {}
      TOKEN = null;
    }
  }
  try {
    await loadP();
  } catch (e) {
    toast("Could not reach the server. Please refresh in a moment.");
  }
  render();
}

init();