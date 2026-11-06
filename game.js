const $ = s => document.querySelector(s), R = n => Math.floor(Math.random() * n);
const KEY = 'hatchling', CD = 10 * 60e3;
const STAGES = [[0,'Baby'],[10,'Toddler'],[30,'Teen'],[60,'Adult'],[90,'Elder']];
const BANDS = [[0,10,120],[10,30,300],[30,60,600],[60,100,1200]]; // age range, XP needed (about 2h/5h/10h/20h)
const TASKS = [
  {id:'feed', n:'Feed', xp:6, hunger:40}, {id:'play', n:'Play', xp:10, happy:35},
  {id:'pet', n:'Pet', xp:4, happy:15}, {id:'clean', n:'Clean', xp:8, happy:20}, {id:'quiz', n:'Quiz', xp:15, happy:20}
];
let dirty = false;
let S = JSON.parse(localStorage.getItem(KEY) || 'null');
const P = $('#pet'), act = $('#act');
const save = () => { S.u = Date.now(); localStorage.setItem(KEY, JSON.stringify(S)); dirty = true; push() };

function ageOf(xp){ let r = xp; for (const [lo,hi,c] of BANDS){ if (r >= c) r -= c; else return lo + (hi-lo)*r/c } return 100 }
function stageOf(a){ let i = 0; STAGES.forEach((s,j) => { if (a >= s[0]) i = j }); return i }
function needs(){ const d = (Date.now() - S.t) / 36e5; return {h: Math.max(0, S.hunger - d*100/6), p: Math.max(0, S.happy - d*100/8)} }


// helpers
const fx = (el, cls, ms) => { el.classList.add(cls); setTimeout(() => el.classList.remove(cls), ms) };
function spawn(cls, html, x, y, ms){
  const e = document.createElement('span'); e.className = cls; if (html) e.innerHTML = html;
  if (x != null) { e.style.left = x; e.style.top = y }
  $('#fx').append(e); if (ms) setTimeout(() => e.remove(), ms); return e;
}
const heart = () => spawn('heart', HEART, (35 + R(30)) + '%', (25 + R(20)) + '%', 1000);
function line(t){ const p = document.createElement('p'); p.textContent = t; act.append(p); return p }
function btn(label, fn){ const b = document.createElement('button'); b.textContent = label; b.onclick = () => fn(b); act.append(b); return b }

let toastT;
function toast(t){ const e = $('#toast'); e.textContent = t; clearTimeout(toastT); if (t) toastT = setTimeout(() => { e.textContent = '' }, 5000) }

function finish(t, ok){
  const n = needs(); S.hunger = n.h; S.happy = n.p; S.t = Date.now();
  const sad = n.h < 30 || n.p < 30, g = ok ? Math.round(t.xp * (sad ? .5 : 1)) : 0;
  S.xp += g;
  if (t.hunger) S.hunger = Math.min(100, S.hunger + t.hunger);
  if (t.happy && ok) S.happy = Math.min(100, S.happy + t.happy);
  S.cd[t.id] = Date.now() + CD; save(); act.replaceChildren(); draw();
  toast(ok ? `+${g} XP${sad && g ? ' (half, your pet is sad)' : ''}` : 'Not quite. No XP this time.');
}

// tasks
const run = {
  feed(t){
    btn('Give apple', b => {
      b.disabled = true; spawn('food', APPLE, null, null, 950);
      setTimeout(() => fx(P, 'eat', 1300), 800);
      setTimeout(() => { heart(); finish(t, true) }, 2200);
    });
  },
  play(t){
    let n = 0; const info = line('Throws: 0/3');
    btn('Throw ball', b => {
      b.disabled = true; spawn('ball', BALL, null, null, 1150);
      fx(P, 'chase', 1400);
      setTimeout(() => { n++; info.textContent = `Throws: ${n}/3`; heart(); if (n >= 3) finish(t, true); else b.disabled = false }, 1500);
    });
  },
  pet(t){
    line('Give your pet some love.');
    btn('Pet', b => {
      b.disabled = true;
      const h = document.createElement('span'); h.className = 'hand'; h.innerHTML = HAND; P.append(h);
      setTimeout(() => h.remove(), 2300);
      fx(P, 'love', 1700);
      [500, 900, 1300, 1700].forEach(ms => setTimeout(heart, ms));
      setTimeout(() => finish(t, true), 2400);
    });
  },
  clean(t){
    let left = 6; const info = line('Pop the bubbles: 6 left');
    for (let i = 0; i < 6; i++){
      const el = spawn('bubble', '', (15 + R(65)) + '%', (10 + R(55)) + '%'); el.setAttribute('role', 'button');
      el.onclick = () => { el.onclick = null; el.classList.add('pop'); setTimeout(() => el.remove(), 200);
        info.textContent = `Pop the bubbles: ${--left} left`; if (!left) finish(t, true) };
    }
  },
  quiz(t){
    const x = 2 + R(8), y = 2 + R(8), a = x * y, o = [a, a + x, a - y].sort(() => Math.random() - .5);
    line(`What is ${x} × ${y}?`); const w = document.createElement('div'); w.className = 'opts';
    o.forEach(v => { const b = document.createElement('button'); b.textContent = v; b.onclick = () => finish(t, v === a); w.append(b) }); act.append(w);
  }
};
function openTask(t){ act.replaceChildren(); $('#fx').replaceChildren(); toast(''); run[t.id](t) }

// view
function draw(){
  const n = needs(), age = ageOf(S.xp), st = stageOf(age), sad = n.h < 30 || n.p < 30;
  P.style.setProperty('--s', [96,120,144,168,168][st] + 'px'); P.classList.toggle('elder', st === 4); P.classList.toggle('sad', sad);
  if (!P.firstChild || P.dataset.k !== `${S.species}${st}${sad}`) { P.innerHTML = art(S.species, st, sad); P.dataset.k = `${S.species}${st}${sad}` }
  $('#pname').textContent = S.name;
  $('#s-sp').textContent = SP[S.species].n; $('#s-st').textContent = STAGES[st][1]; $('#s-age').textContent = Math.floor(age); $('#s-xp').textContent = S.xp;
  $('#s-mood').textContent = sad ? 'Sad' : (n.h >= 60 && n.p >= 60 ? 'Happy' : 'Okay'); $('#stats').classList.toggle('sad', sad);
  $('#bx').style.width = (age >= 100 ? 100 : (age % 1) * 100) + '%'; tick();
}
function tick(){
  if (!S) return; const n = needs(); $('#bh').style.width = n.h + '%'; $('#bp').style.width = n.p + '%';
  TASKS.forEach(t => { const b = $('#t-' + t.id), r = (S.cd[t.id] || 0) - Date.now();
    if (r > 0) { b.disabled = true; const s = Math.ceil(r / 1e3); b.textContent = `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}` } else { b.disabled = false; b.textContent = t.n } });
}
function showGame(){
  $('#egg').hidden = true; $('#game').hidden = false;
  TASKS.forEach(t => { const b = document.createElement('button'); b.id = 't-' + t.id; b.onclick = () => openTask(t); $('#tasks').append(b) });
  draw(); setInterval(() => { tick(); draw() }, 1000);
}
function showEgg(){
  $('#egg').hidden = false; $('#eggart').innerHTML = EGG; let sp;
  $('#hatchbtn').onclick = () => {
    $('#hatchbtn').disabled = true; fx($('#eggart'), 'shake', 700);
    setTimeout(() => {
    const r = Math.random(); sp = r < .05 ? 'dragon' : r < .2 ? 'frog' : r < .6 ? 'dog' : 'cat';
    $('#eggart').innerHTML = art(sp, 0, false); $('#hatchbtn').hidden = true; $('#namebox').hidden = false;
    $('#got').textContent = `It’s a ${SP[sp].n}!${sp === 'dragon' ? ' A legendary Dragon.' : sp === 'frog' ? ' A rare Frog.' : ''}`; $('#nm').focus();
    }, 700);
  };
  $('#go').onclick = () => { const nm = $('#nm').value.trim(); if (!nm) return $('#nm').focus();
    S = {name:nm, species:sp, xp:0, hunger:80, happy:80, t:Date.now(), cd:{}}; save(); showGame() };
}

// Admin test tools. The code is checked against a hash, but this is client-side only: it hides nothing from anyone who reads the page source.
const ADMIN_HASH = '56222f8c0009a263619b977ad396d1f224567e60db09fe5642bba6a4699d8727';
let adminOn = false;
async function sha(x){ const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(x)); return [...new Uint8Array(b)].map(v => v.toString(16).padStart(2, '0')).join('') }
function xpForAge(a){ let x = 0; for (const [lo,hi,c] of BANDS){ if (a >= hi) x += c; else { x += c * (a - lo) / (hi - lo); break } } return Math.round(x) }
function adminSet(fn){
  if (!S) { S = {name:'Test', species:'cat', xp:0, hunger:100, happy:100, t:Date.now(), cd:{}}; save(); showGame() }
  fn(); save(); P.dataset.k = ''; draw();
}
function adminPanel(){
  if ($('#admin')) return $('#admin').remove();
  const d = document.createElement('div'); d.id = 'admin';
  const grp = (title, items) => {
    const l = document.createElement('p'); l.textContent = title; d.append(l);
    const w = document.createElement('div'); w.className = 'opts wrap';
    items.forEach(([n, f]) => { const b = document.createElement('button'); b.textContent = n; b.onclick = f; w.append(b) }); d.append(w);
  };
  grp('Animal', Object.keys(SP).map(k => [SP[k].n, () => adminSet(() => { S.species = k })]));
  grp('Stage', STAGES.map(s => [s[1], () => adminSet(() => { S.xp = xpForAge(s[0]) })]));
  grp('Needs', [['Fill', () => adminSet(() => { S.hunger = S.happy = 100; S.t = Date.now() })], ['Sad', () => adminSet(() => { S.hunger = S.happy = 10; S.t = Date.now() })], ['No cooldowns', () => adminSet(() => { S.cd = {} })]]);
  grp('Pet', [['New egg', () => { localStorage.removeItem(KEY); location.reload() }]]);
  document.body.append(d);
}
$('#adminbtn').onclick = async () => {
  if (!adminOn) {
    const c = prompt('Admin code'); if (c === null) return;
    try { if (await sha(c) !== ADMIN_HASH) return alert('Wrong code') } catch (e) { return alert('Admin needs https or localhost') }
    adminOn = true;
  }
  adminPanel();
};


// ---- Supabase: accounts, cloud save, leaderboard ----
// The pet is saved in the browser first, then synced. Offline play keeps working and syncs when you're back online.
const sb = (window.supabase && typeof SUPABASE_URL === 'string' && SUPABASE_URL.startsWith('http')) ? supabase.createClient(SUPABASE_URL, SUPABASE_KEY) : null;
let user = null, username = '', mode = 'in';
const UKEY = KEY + '-user';
const toRow = () => ({user_id: user.id, name: S.name, species: S.species, xp: S.xp, state: {hunger: S.hunger, happy: S.happy, t: S.t, cd: S.cd}, updated: S.u});
const fromRow = r => ({name: r.name, species: r.species, xp: r.xp, ...r.state, u: r.updated});
const screen = id => ['auth', 'verify', 'uname'].forEach(x => { $('#' + x).hidden = x !== id });

async function push(){
  if (!sb || !user || !S) return;
  try { const {error} = await sb.from('pets').upsert(toRow()); dirty = !!error; if (!error) loadBoard() } catch (e) { dirty = true }
}
async function loadBoard(){
  if (!sb) return;
  const {data} = await sb.from('leaderboard').select('*'); if (!data) return;
  const box = $('#lb'); box.replaceChildren();
  if (!data.length) box.textContent = 'No players yet.';
  data.forEach((r, i) => {
    const d = document.createElement('div'), l = document.createElement('div'), n = document.createElement('b'), p = document.createElement('small'), x = document.createElement('span');
    d.className = 'row' + (r.username === username ? ' me' : '');
    n.textContent = `${i + 1}. ${r.username}`; p.textContent = `${r.name} · ${(SP[r.species] || {n: '?'}).n}`;
    x.textContent = `age ${Math.floor(ageOf(r.xp))} · ${r.xp} XP`;
    l.append(n, p); d.append(l, x); box.append(d);
  });
}
function showTab(t){
  $('#petview').hidden = t !== 'pet'; $('#lbbox').hidden = t !== 'board';
  $('#tab-pet').classList.toggle('on', t === 'pet'); $('#tab-board').classList.toggle('on', t === 'board');
  if (t === 'board') loadBoard();
}

function setMode(m){
  mode = m; const up = m === 'up';
  $('#m-in').classList.toggle('on', !up); $('#m-up').classList.toggle('on', up);
  $('#cpw-wrap').hidden = !up; $('#authgo').textContent = up ? 'Create account' : 'Log in';
  $('#auth-h').textContent = up ? 'Create your account' : 'Welcome back';
  $('#auth-sub').textContent = up ? 'Sign up to save your pet and join the leaderboard.' : 'Log in to continue with your pet.';
  $('#pw').autocomplete = up ? 'new-password' : 'current-password'; $('#aerr').textContent = '';
}
async function authDo(){
  const up = mode === 'up', email = $('#em').value.trim().toLowerCase(), pw = $('#pw').value, err = $('#aerr'); err.textContent = '';
  if (!/^\S+@\S+\.\S+$/.test(email)) return err.textContent = 'Enter a valid email address.';
  if (up && pw.length < 8) return err.textContent = 'Use at least 8 characters for your password.';
  if (up && pw !== $('#pw2').value) return err.textContent = 'The passwords don’t match.';
  const btn = $('#authgo'); btn.disabled = true;
  try {
    if (up) {
      const {data, error} = await sb.auth.signUp({email, password: pw, options: {emailRedirectTo: location.origin + location.pathname}});
      // An existing email comes back as an error, or as a user with no identities. Either way it can't be registered twice.
      if ((error && /already|registered/i.test(error.message)) || (data && data.user && data.user.identities && !data.user.identities.length)) { setMode('in'); return $('#aerr').textContent = 'That email already has an account. Log in instead.' }
      if (error) return err.textContent = error.message;
      if (!data.session) { $('#vmail').textContent = email; return screen('verify') }
      return enter(data.session.user);
    }
    const {data, error} = await sb.auth.signInWithPassword({email, password: pw});
    if (error) return err.textContent = /not confirmed/i.test(error.message) ? 'Verify your email first. Check your inbox for the link.' : /invalid/i.test(error.message) ? 'Wrong email or password.' : error.message;
    enter(data.session.user);
  } finally { btn.disabled = false }
}
async function enter(u){
  user = u;
  const {data, error} = await sb.from('profiles').select('username').maybeSingle();
  if (!error && !data) return screen('uname');                   // verified, but no username yet
  username = data ? data.username : (localStorage.getItem(UKEY) || '');
  if (data) localStorage.setItem(UKEY, username);
  start();
}
async function saveUsername(){
  const v = $('#un').value, err = $('#uerr'); err.textContent = '';
  if (!/^[A-Za-z0-9]{3,16}$/.test(v)) return err.textContent = 'Use 3–16 letters or numbers, no spaces or symbols.';
  const {error} = await sb.from('profiles').insert({user_id: user.id, username: v});
  if (error) return err.textContent = error.code === '23505' ? 'That username is taken.' : error.message;
  username = v; localStorage.setItem(UKEY, v); start();
}
async function start(){
  screen(''); $('#acct').hidden = false; $('#tabs').hidden = false; $('#who').textContent = username || 'player';
  let remote = null;
  try { const {data} = await sb.from('pets').select('*').maybeSingle(); if (data) remote = fromRow(data) } catch (e) {}
  if (remote && (!S || remote.u >= (S.u || 0))) { S = remote; localStorage.setItem(KEY, JSON.stringify(S)) } else if (S) push();
  S ? showGame() : showEgg(); loadBoard();
}

window.addEventListener('online', push);
setInterval(() => { if (dirty) push(); if (user) loadBoard() }, 30000);
$('#m-in').onclick = () => setMode('in'); $('#m-up').onclick = () => setMode('up'); $('#authgo').onclick = authDo;
['em', 'pw', 'pw2'].forEach(id => { $('#' + id).onkeydown = e => { if (e.key === 'Enter') authDo() } });
$('#guest').onclick = () => { screen(''); S ? showGame() : showEgg() };
$('#vback').onclick = () => { setMode('in'); screen('auth') };
$('#un').oninput = e => { e.target.value = e.target.value.replace(/[^A-Za-z0-9]/g, '') };
$('#ugo').onclick = saveUsername;
$('#tab-pet').onclick = () => showTab('pet'); $('#tab-board').onclick = () => showTab('board');
$('#logout').onclick = async () => { await sb.auth.signOut(); localStorage.removeItem(KEY); localStorage.removeItem(UKEY); location.reload() };
$('#authlogo').innerHTML = EGG; setMode('in');
(async () => {
  if (!sb) return S ? showGame() : showEgg();            // no server configured: local only
  const {data} = await sb.auth.getSession();            // works offline too (session is cached)
  if (data.session) enter(data.session.user); else screen('auth');
})();
