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

const careOf = () => S.cn ? S.cs / S.cn : .5;                                    // 0..1: how quickly its requests were answered
const lookOf = st => st >= 3 && (S.cn || 0) >= 8 ? (careOf() >= .75 ? 'polished' : careOf() <= .4 ? 'scruffy' : '') : '';
function ageOf(xp){ let r = xp; for (const [lo,hi,c] of BANDS){ if (r >= c) r -= c; else return lo + (hi-lo)*r/c } return 100 }
function stageOf(a){ let i = 0; STAGES.forEach((s,j) => { if (a >= s[0]) i = j }); return i }
// Four needs, each with its own meter that drains in real time. A request appears when a meter reaches the ask line.
const RATE = {feed: 1.83, social: 2.2, clean: 1.22, mind: .92};   // % per minute: reaches the ask line after ~30, 25, 45 and 60 minutes
const NEED = {feed:'feed', play:'social', pet:'social', clean:'clean', quiz:'mind'};
const ASK = 45, URGENT = 25;
function needs(){
  const d = (Date.now() - S.t) / 6e4, n = {};
  for (const k in RATE) n[k] = Math.max(0, S.m[k] - d * RATE[k] * S.rate[k]);
  n.h = n.feed; n.p = (n.feed + n.social + n.clean + n.mind) / 4;   // hunger bar, overall happiness
  return n;
}
function commit(){ const n = needs(); for (const k in RATE) S.m[k] = n[k]; S.t = Date.now() }


// helpers
const fx = (el, cls, ms) => { el.classList.add(cls); setTimeout(() => el.classList.remove(cls), ms) };
function spawn(cls, html, x, y, ms){
  const e = document.createElement('span'); e.className = cls; if (html) e.innerHTML = html;
  if (x != null) { e.style.left = x; e.style.top = y }
  $('#fx').append(e); if (ms) setTimeout(() => e.remove(), ms); return e;
}
const petX = () => parseFloat(P.style.left) || 50;
const heart = () => spawn('heart', HEART, (petX() - 8 + R(16)) + '%', ((stageH() - pos.fb - P.offsetHeight) / stageH() * 100 + R(10)) + '%', 1000);
function line(t){ const p = document.createElement('p'); p.textContent = t; act.append(p); return p }
function btn(label, fn){ const b = document.createElement('button'); b.textContent = label; b.onclick = () => fn(b); act.append(b); return b }

let toastT;
function toast(t){ const e = $('#toast'); e.textContent = t; clearTimeout(toastT); if (t) toastT = setTimeout(() => { e.textContent = '' }, 5000) }

function finish(t, ok){
  working = false; commit();
  const k = NEED[t.id], mine = S.req && S.req.id === t.id, wait = mine ? Date.now() - S.req.at : 0;
  const mult = !mine ? 1 : wait < 5 * 60e3 ? 1.25 : wait > 30 * 60e3 ? .5 : 1;
  const g = ok ? Math.round(t.xp * mult) : 0;
  S.xp += g;
  if (ok) { S.m[k] = Math.min(100, S.m[k] + 60); S.rate[k] = .75 + Math.random() * .5 }   // new pace each time, so it isn't predictable
  if (mine && ok) { S.cs = (S.cs || 0) + (wait < 5 * 60e3 ? 1 : wait > 30 * 60e3 ? .2 : .6); S.cn = (S.cn || 0) + 1; S.req = null; S.gap = Date.now() + 15e3 }                              // short breather before the next request
  save(); act.replaceChildren(); draw();
  toast(ok ? `+${g} XP${mult === 1.25 ? ' (quick bonus)' : mult === .5 ? ' (half, it waited a long time)' : ''}` : 'Not quite. Try again.');
}

// tasks
const run = {   // each task starts the moment you press its request button
  feed(t){
    const f = spawn('food', APPLE, P.style.left || '50%', '0', 950); f.style.setProperty('--fall', (stageH() - pos.fb - .42 * P.offsetHeight - 22) + 'px');
    setTimeout(() => fx(P, 'eat', 1300), 800);
    setTimeout(() => { heart(); finish(t, true) }, 2200);
  },
  play(t){   // three throws, one after another
    let n = 0;
    const toss = () => {
      spawn('ball', BALL, null, null, 1150).style.setProperty('--gb', pos.fb + 'px'); fx(P, 'chase', 1400);
      setTimeout(() => { heart(); if (++n >= 3) finish(t, true); else toss() }, 1500);
    };
    toss();
  },
  pet(t){
    const h = document.createElement('span'); h.className = 'hand'; h.innerHTML = HAND; P.append(h);
    setTimeout(() => h.remove(), 2300); fx(P, 'love', 1700);
    [500, 900, 1300, 1700].forEach(ms => setTimeout(heart, ms));
    setTimeout(() => finish(t, true), 2400);
  },
  clean(t){   // soap bubbles float around the pet and move with it; pop them all
    let left = 6; const info = line(`Pop the bubbles: ${left} left`);
    for (let i = 0; i < left; i++) {
      const b = document.createElement('span'); b.className = 'soap'; b.innerHTML = SOAP;
      b.style.cssText = `left:${-12 + R(78)}%;top:${-10 + R(66)}%;width:${22 + R(14)}%;animation-delay:-${R(16) / 10}s`;
      b.onpointerdown = e => {
        e.stopPropagation(); b.onpointerdown = null; b.classList.add('burst'); setTimeout(() => b.remove(), 260);
        info.textContent = `Pop the bubbles: ${--left} left`; if (!left) setTimeout(() => finish(t, true), 300);
      };
      P.append(b);
    }
  },
  quiz(t){
    const hi = [4, 6, 8, 10, 12][stageOf(ageOf(S.xp))], x = 2 + R(hi - 1), y = 2 + R(hi - 1), a = x * y, o = [a, a + x, a - y].sort(() => Math.random() - .5);
    line(`What is ${x} × ${y}?`); const w = document.createElement('div'); w.className = 'opts';
    o.forEach(v => { const b = document.createElement('button'); b.textContent = v; b.onclick = () => finish(t, v === a); w.append(b) }); act.append(w);
  }
};
let working = false;
function openTask(t){ if (working) return; working = true; act.replaceChildren(); $('#fx').replaceChildren(); toast(''); run[t.id](t) }

// view
function draw(){
  const n = needs(), age = ageOf(S.xp), st = stageOf(age), sad = Math.min(n.feed, n.social, n.clean, n.mind) < 30;
  const fly = placePet(st); P.classList.toggle('elder', st === 4); P.classList.toggle('sad', sad);
  const sleep = World.sleeping(), look = lookOf(st);
  P.classList.toggle('shiny', S.color === 'shiny'); P.classList.toggle('sleep', sleep);
  const key = `${S.species}${S.color}${st}${sad}${fly}${look}${sleep}`;
  const cur = [...P.children].find(c => c.tagName === 'svg');
  if (!cur || P.dataset.k !== key) { const tmp = document.createElement('div'); tmp.innerHTML = art(S.species, st, sad, fly, S.color, look, sleep); if (cur) cur.replaceWith(tmp.firstChild); else P.prepend(tmp.firstChild); P.dataset.k = key }
  $('#set-care').textContent = `${Math.round(careOf() * 100)}%${look ? ' · ' + look : ''}`; $('#set-finds').textContent = World.findsText();
  $('#pname').textContent = S.name; $('#set-name').textContent = S.name;
  $('#s-sp').textContent = SP[S.species].n; $('#s-st').textContent = STAGES[st][1]; $('#s-age').textContent = Math.floor(age); $('#s-xp').textContent = S.xp;
  $('#s-mood').textContent = n.feed < 30 ? 'Hungry' : n.social < 30 ? 'Lonely' : n.clean < 30 ? 'Dirty' : n.mind < 30 ? 'Bored' : (n.p >= 65 ? 'Happy' : 'Okay'); $('#stats').classList.toggle('sad', sad);
  $('#bx').style.width = (age >= 100 ? 100 : (age % 1) * 100) + '%'; renderReq(); tick();
}
function tick(){
  if (!S) return; const n = needs();
  $('#bh').style.width = n.h + '%'; $('#bp').style.width = n.p + '%'; $('#lh').hidden = n.h >= 35;   // hunger only shows when really hungry
  if (S.req && !S.req.neg && Date.now() - S.req.at > 60 * 60e3) { S.req.neg = true; S.cn = (S.cn || 0) + 1 }   // ignored for an hour: counts against its care
  World.tick();
  if (!S.req && Date.now() >= (S.gap || 0)) {
    let k = null; for (const x in RATE) if (n[x] < ASK && (!k || n[x] < n[k])) k = x;                   // the most urgent need below the ask line
    if (k) ask(k === 'feed' ? 'feed' : k === 'clean' ? 'clean' : k === 'mind' ? 'quiz' : n.social < URGENT ? 'pet' : 'play');
  }
}
function showGame(){
  $('#egg').hidden = true; $('#game').hidden = false; $('#tabs').hidden = false; initDrag();
  World.init();
  if (!S.m) { S.m = {feed: S.hunger ?? 80, social: S.happy ?? 80, clean: 80, mind: 80}; S.rate = {feed: 1, social: 1, clean: 1, mind: 1}; S.t = S.t || Date.now(); save() }
  if (S.color === undefined) { S.color = R(SP[S.species].colors.length); save() }
  draw(); setInterval(() => { tick(); draw() }, 1000);
}
function showEgg(){
  $('#egg').hidden = false; $('#eggart').innerHTML = EGG; let sp, col;
  $('#hatchbtn').onclick = () => {
    $('#hatchbtn').disabled = true; fx($('#eggart'), 'shake', 700);
    setTimeout(() => {
    sp = rollSpecies(); col = R(100) === 0 ? 'shiny' : R(SP[sp].colors.length);   // 1 in 100 is shiny
    $('#eggart').innerHTML = art(sp, 0, false, false, col); $('#hatchbtn').hidden = true; $('#namebox').hidden = false;
    $('#got').textContent = col === 'shiny' ? `It’s a SHINY ${SP[sp].n}! One in a hundred!` : `It’s a ${SP[sp].colors[col].n.toLowerCase()} ${SP[sp].n}!${TIER[sp] ? ` A ${TIER[sp]} find.` : ''}`; $('#nm').focus();
    }, 700);
  };
  $('#go').onclick = () => { const nm = $('#nm').value.trim(); if (!nm) return $('#nm').focus();
    S = {name:nm, species:sp, color:col, xp:0, t:Date.now(), m:{feed:62, social:56, clean:90, mind:90}, rate:{feed:1, social:1, clean:1, mind:1}, req:null, gap:0, renamed:0}; save(); showGame() };
}

// Admin test tools. The code is checked against a hash, but this is client-side only: it hides nothing from anyone who reads the page source.
const ADMIN_HASH = '56222f8c0009a263619b977ad396d1f224567e60db09fe5642bba6a4699d8727';
let adminOn = false;
async function sha(x){ const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(x)); return [...new Uint8Array(b)].map(v => v.toString(16).padStart(2, '0')).join('') }
function xpForAge(a){ let x = 0; for (const [lo,hi,c] of BANDS){ if (a >= hi) x += c; else { x += c * (a - lo) / (hi - lo); break } } return Math.round(x) }
function adminSet(fn){
  if (!S) { S = {name:'Test', species:'cat', color:0, xp:0, t:Date.now(), m:{feed:100, social:100, clean:100, mind:100}, rate:{feed:1, social:1, clean:1, mind:1}, req:null, gap:0, renamed:0}; save(); showGame() }
  fn(); save(); P.dataset.k = ''; draw();
  if ($('#admin')) { $('#admin').remove(); adminPanel() }
}
function adminPanel(){
  if ($('#admin')) return $('#admin').remove();
  const d = document.createElement('div'); d.id = 'admin';
  const grp = (title, items) => {
    const l = document.createElement('p'); l.textContent = title; d.append(l);
    const w = document.createElement('div'); w.className = 'opts wrap';
    items.forEach(([n, f]) => { const b = document.createElement('button'); b.textContent = n; b.onclick = f; w.append(b) }); d.append(w);
  };
  grp('Animal', Object.keys(SP).map(k => [SP[k].n, () => adminSet(() => { S.species = k; S.color = 0 })]));
  grp('Color', [...SP[S ? S.species : 'cat'].colors.map((c, i) => [c.n, () => adminSet(() => { S.color = i })]), ['Shiny', () => adminSet(() => { S.color = 'shiny' })]]);
  grp('Stage', STAGES.map(s => [s[1], () => adminSet(() => { S.xp = xpForAge(s[0]) })]));
  grp('Needs', [['Fill', () => adminSet(() => { for (const k in RATE) S.m[k] = 100; S.t = Date.now() })], ['Sad', () => adminSet(() => { for (const k in RATE) S.m[k] = 10; S.t = Date.now() })]]);
  grp('Request', [...TASKS.map(t => [t.n, () => adminSet(() => { commit(); S.m[NEED[t.id]] = Math.min(S.m[NEED[t.id]], 20); ask(t.id) })]), ['Clear', () => adminSet(() => { S.req = null; S.gap = 0 })]]);
  grp('Pet', [['New egg', () => { localStorage.removeItem(KEY); location.reload() }]]);
  document.body.append(d);
}
const OWNER_EMAIL_HASH = '3250a962aa84e6cf56c02c24c30c7f51a85cefe40c3925be3aa0647d15002212';
async function ownerCheck(){   // only the owner's profile gets the admin button (cosmetic: the code prompt is still required)
  let ok = (username || '').toLowerCase() === 'viko';
  try { ok = ok || !!(user && user.email && await sha(user.email.toLowerCase()) === OWNER_EMAIL_HASH) } catch (e) {}
  $('#adminbtn').hidden = !ok;
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
const toRow = () => ({user_id: user.id, name: S.name, species: S.species, xp: S.xp, state: (({name, species, xp, u, ...rest}) => rest)(S), updated: S.u});
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
    if (r.username !== username) { d.classList.add('link'); d.tabIndex = 0; d.onclick = () => openVisit(r); d.onkeydown = e => { if (e.key === 'Enter') openVisit(r) } }
    n.textContent = `${i + 1}. ${r.username}`; p.textContent = `${r.name} · ${(SP[r.species] || {n: '?'}).n}`;
    x.textContent = `age ${Math.floor(ageOf(r.xp))} · ${r.xp} XP`;
    l.append(n, p); d.append(l, x); box.append(d);
  });
}
// ---- visiting a friend's pet ----
const gcolor = c => c === 'shiny' ? 'shiny' : (parseInt(c, 10) || 0);
function openVisit(r){
  $('#lb').hidden = true; $('#visit').hidden = false; $('#vmsg').textContent = '';
  const age = ageOf(+r.xp || 0), sc = $('#vscene');
  sc.innerHTML = art(SP[r.species] ? r.species : 'dog', stageOf(age), false, false, gcolor(r.color)); sc.style.background = $('#stage').style.background;
  $('#vname').textContent = r.name; $('#vinfo').textContent = `${r.username}’s ${(SP[r.species] || {n: 'pet'}).n} · age ${Math.floor(age)}`;
  $('#vwave').onclick = () => sendGift(r, 'wave'); $('#vtreat').onclick = () => sendGift(r, 'treat');
}
function closeVisit(){ $('#visit').hidden = true; $('#lb').hidden = false }
function visitFx(kind){   // little animation in the visit scene
  const sc = $('#vscene'), pet = sc.querySelector('svg');
  const put = (cls, html, css, ms) => { const e = document.createElement('span'); e.className = cls; e.innerHTML = html; e.style.cssText = css; sc.append(e); setTimeout(() => e.remove(), ms) };
  const hearts = ms => ms.forEach(m => setTimeout(() => put('heart', HEART, `left:${44 + R(20)}%;top:${28 + R(14)}%`, 1000), m));
  if (kind === 'treat') {
    put('food', APPLE, 'left:50%;top:0;--fall:98px', 950);
    setTimeout(() => { pet.classList.add('eat'); setTimeout(() => pet.classList.remove('eat'), 1300) }, 800);
    hearts([1300, 1700, 2100]);
  } else { pet.classList.add('love'); setTimeout(() => pet.classList.remove('love'), 1700); hearts([300, 700, 1100]) }
}
async function sendGift(r, kind){
  const m = $('#vmsg'), bs = [$('#vwave'), $('#vtreat')]; m.textContent = ''; bs.forEach(b => { b.disabled = true });
  const {error} = await sb.rpc('send_gift', {to_name: r.username, gift: kind});
  if (error) { bs.forEach(b => { b.disabled = false }); m.textContent = /limit|already/i.test(error.message) ? 'That’s all you can give them today (5 a day). Come back tomorrow.' : 'Couldn’t send that right now.'; return }
  visitFx(kind);
  setTimeout(() => { m.textContent = kind === 'wave' ? `You waved at ${r.name}!` : `${r.name} loved the treat!`; bs.forEach(b => { b.disabled = false }) }, kind === 'treat' ? 2400 : 1800);
}
async function claimGifts(){   // visitors' waves (+3 XP) and treats (+8 XP)
  if (!sb || !user || !S) return;
  const {data} = await sb.from('gifts').select('*').eq('claimed', false); if (!data || !data.length) return;
  const {error} = await sb.from('gifts').update({claimed: true}).in('id', data.map(g => g.id)); if (error) return;
  const xp = data.reduce((a, g) => a + (g.kind === 'treat' ? 8 : 3), 0), who = [...new Set(data.map(g => g.from_name))];
  S.xp += xp; save(); draw(); toast(`${who.slice(0, 2).join(' and ')}${who.length > 2 ? ' and others' : ''} visited ${S.name}! +${xp} XP`);
}
function showTab(t){
  $('#petview').hidden = t !== 'pet'; $('#lbbox').hidden = t !== 'board'; $('#settings').hidden = t !== 'settings';
  ['pet', 'board', 'settings'].forEach(k => $('#tab-' + k).classList.toggle('on', k === t));
  if (t === 'board') { closeVisit(); loadBoard() }
  if (t === 'pet' && S) draw();                                   // re-place the pet now that the stage is visible again
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
  screen(''); $('#acct').hidden = false; $('#tab-board').hidden = false; $('#set-acct').hidden = false; $('#set-user').textContent = username || 'player'; ownerCheck(); $('#who').textContent = username || 'player';
  let remote = null;
  try { const {data} = await sb.from('pets').select('*').maybeSingle(); if (data) remote = fromRow(data) } catch (e) {}
  if (remote && (!S || remote.u >= (S.u || 0))) { S = remote; localStorage.setItem(KEY, JSON.stringify(S)) } else if (S) push();
  S ? showGame() : showEgg(); loadBoard(); claimGifts();
}

window.addEventListener('online', push);
setInterval(() => { if (dirty) push(); if (user) { loadBoard(); claimGifts() } }, 30000);
$('#m-in').onclick = () => setMode('in'); $('#m-up').onclick = () => setMode('up'); $('#authgo').onclick = authDo;
['em', 'pw', 'pw2'].forEach(id => { $('#' + id).onkeydown = e => { if (e.key === 'Enter') authDo() } });
$('#guest').onclick = () => { screen(''); S ? showGame() : showEgg() };
$('#vback').onclick = () => { setMode('in'); screen('auth') };
$('#un').oninput = e => { e.target.value = e.target.value.replace(/[^A-Za-z0-9]/g, '') };
$('#ugo').onclick = saveUsername;
$('#vclose').onclick = closeVisit; $('#tab-pet').onclick = () => showTab('pet'); $('#tab-board').onclick = () => showTab('board');
async function logoutNow(){ await sb.auth.signOut(); localStorage.removeItem(KEY); localStorage.removeItem(UKEY); location.reload() }
// ---- pet name, settings, dragging ----
const CFGKEY = KEY + '-cfg';
const cfg = Object.assign({anim: true, notify: false, weather: false}, JSON.parse(localStorage.getItem(CFGKEY) || '{}'));
function applyCfg(){ document.body.classList.toggle('no-anim', !cfg.anim); $('#set-anim').textContent = cfg.anim ? 'On' : 'Off'; $('#set-notify').textContent = cfg.notify ? 'On' : 'Off'; $('#set-weather').textContent = cfg.weather ? 'On' : 'Off'; localStorage.setItem(CFGKEY, JSON.stringify(cfg)) }
$('#set-anim').onclick = () => { cfg.anim = !cfg.anim; applyCfg() }; applyCfg();

$('#pencil').innerHTML = PENCIL;
function openRename(){
  const left = (S.renamed || 0) + 3600e3 - Date.now();
  if (left > 0) return toast(`You can rename ${S.name} again in ${Math.ceil(left / 6e4)} min.`);
  $('#namerow').hidden = true; $('#nameedit').hidden = false; const i = $('#ne'); i.value = S.name; i.focus(); i.select();
}
function closeRename(){ $('#nameedit').hidden = true; $('#namerow').hidden = false }
function saveRename(){
  const v = $('#ne').value.trim().slice(0, 16); if (!v) return $('#ne').focus();
  if (v !== S.name) { S.name = v; S.renamed = Date.now(); save() }
  closeRename(); draw();
}
$('#pname').onclick = $('#pencil').onclick = openRename;
$('#pname').onkeydown = e => { if (e.key === 'Enter') openRename() };
$('#nesave').onclick = saveRename; $('#necancel').onclick = closeRename;
$('#ne').onkeydown = e => { if (e.key === 'Enter') saveRename(); if (e.key === 'Escape') closeRename() };

$('#tab-settings').onclick = () => showTab('settings'); $('#set-weather').onclick = () => World.toggleWeather();
$('#set-rename').onclick = () => { showTab('pet'); openRename() };
$('#set-logout').onclick = logoutNow;
$('#set-reset').onclick = async () => {
  if (!confirm('Delete this pet and hatch a new egg? This can’t be undone.')) return;
  if (sb && user) { const {error} = await sb.from('pets').delete().eq('user_id', user.id); if (error) return alert('Couldn’t reset. Check your connection and try again.') }
  localStorage.removeItem(KEY); location.reload();
};

// Depth: lower on the grass = closer = bigger, higher = further away = smaller. Only the dragon can leave the grass and fly.
const BASE = [96, 120, 144, 168, 168];
const pos = {fb: null};                                   // distance of the pet's feet from the bottom of the scene, in px
const stageH = () => $('#stage').clientHeight;
function placePet(st){
  const H = stageH(), lo = .05 * H, grass = .25 * H, dragon = S.species === 'dragon';
  if (!H) return P.classList.contains('fly');            // stage is hidden (another tab is open): leave the position alone
  if (pos.fb === null) pos.fb = lo + (grass - lo) * .2;
  const free = dragon || World.perched();
  if (World.perched()) { P.style.setProperty('--tr', '1200ms'); P.style.left = '19%'; pos.fb = .33 * H }          // asleep on a branch of the tree
  pos.fb = Math.max(lo, free ? pos.fb : Math.min(pos.fb, grass));
  const d = Math.min(1, (pos.fb - lo) / (grass - lo)), size = BASE[st] * (1 - .42 * d);
  if (free) pos.fb = Math.min(pos.fb, H - size - 6);
  const fly = dragon && pos.fb > grass + 2;
  P.style.setProperty('--s', size + 'px'); P.style.bottom = pos.fb + 'px';
  P.style.zIndex = fly ? 3 : pos.fb > .22 * H ? 0 : 2;    // behind the tree when far back on the grass
  P.classList.toggle('fly', fly);
  const sh = $('#shadow'); sh.hidden = !fly; sh.style.left = P.style.left || '50%'; sh.style.width = size * .6 + 'px';
  return fly;
}
function initDrag(){
  if (initDrag.done) return; initDrag.done = true;
  let drag = false, offX = 0, offY = 0;
  const move = e => {
    const r = $('#stage').getBoundingClientRect(), half = P.offsetWidth / 2 / r.width;
    P.style.left = Math.min(1 - half, Math.max(half, (e.clientX - offX - r.left) / r.width)) * 100 + '%';
    pos.fb = r.bottom - (e.clientY + offY);
    const was = P.classList.contains('fly'), st = stageOf(ageOf(S.xp));
    if (placePet(st) !== was) draw();                     // dragon took off or landed: swap the sprite
  };
  P.addEventListener('pointerdown', e => {
    World.cancel(); drag = true; P.setPointerCapture(e.pointerId); P.classList.add('held');
    const b = P.getBoundingClientRect(); offX = e.clientX - (b.left + b.width / 2); offY = b.bottom - e.clientY;
  });
  P.addEventListener('pointermove', e => { if (drag) move(e) });
  const end = () => { drag = false; P.classList.remove('held') };
  P.addEventListener('pointerup', end); P.addEventListener('pointercancel', end);
}

// ---- hatching odds ----
const RARITY = [['dog', 18], ['cat', 18], ['bunny', 14], ['hamster', 14], ['fox', 9], ['owl', 8], ['frog', 7], ['penguin', 7], ['dragon', 5]];   // out of 100
const TIER = {fox:'uncommon', owl:'uncommon', frog:'rare', penguin:'rare', dragon:'legendary'};
function rollSpecies(){ let r = R(100); for (const [k, w] of RARITY) { if ((r -= w) < 0) return k } return 'dog' }

// ---- the pet asks for things on its own ----
const MSG = {feed:'is getting hungry.', play:'wants to play.', pet:'wants some attention.', clean:'could use a wash.', quiz:'is bored and wants a challenge.'};
const URG = {feed:'is really hungry!', play:'is bored and restless!', pet:'feels very lonely!', clean:'is filthy!', quiz:'is going stir-crazy!'};
function ask(id){
  S.req = {id, at: Date.now()}; save(); draw();
  if (cfg.notify && 'Notification' in window && Notification.permission === 'granted' && document.hidden) {
    try { new Notification('Hatchling', {body: `${S.name} ${MSG[id]}`}) } catch (e) {}
  }
}
function renderReq(){
  const low = S.req && needs()[NEED[S.req.id]] < URGENT, key = (S.req ? S.req.id : '') + '|' + S.name + '|' + !!low, w = $('#tasks');
  if (w.dataset.k === key) return; w.dataset.k = key; w.replaceChildren();
  document.title = S.req ? '(1) Hatchling' : 'Hatchling';
  if (!S.req) { $('#need').textContent = `${S.name} is fine for now.`; return }
  const t = TASKS.find(x => x.id === S.req.id), b = document.createElement('button');
  b.className = 'req' + (low ? ' urgent' : ''); b.textContent = t.n; b.onclick = () => openTask(t); w.append(b);
  $('#need').textContent = `${S.name} ${low ? URG[S.req.id] : MSG[S.req.id]}`;
}
$('#set-notify').onclick = async () => {
  if (cfg.notify) cfg.notify = false;
  else if (!('Notification' in window)) return alert('This browser doesn’t support notifications.');
  else { cfg.notify = (await Notification.requestPermission()) === 'granted'; if (!cfg.notify) alert('Notifications are blocked. Allow them in your browser’s site settings, then try again.') }
  applyCfg();
};
$('#sun').innerHTML = SUN; $('#tree').innerHTML = TREE;

$('#authlogo').innerHTML = EGG; setMode('in');
(async () => {
  if (!sb) return S ? showGame() : showEgg();            // no server configured: local only
  const {data} = await sb.auth.getSession();            // works offline too (session is cached)
  if (data.session) enter(data.session.user); else screen('auth');
})();
