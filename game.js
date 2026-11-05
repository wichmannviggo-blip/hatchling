const $ = s => document.querySelector(s), R = n => Math.floor(Math.random() * n);
const KEY = 'hatchling', CD = 10 * 60e3;
const STAGES = [[0,'Baby'],[10,'Toddler'],[30,'Teen'],[60,'Adult'],[90,'Elder']];
const BANDS = [[0,10,120],[10,30,300],[30,60,600],[60,100,1200]]; // age range, XP needed (about 2h/5h/10h/20h)
const TASKS = [
  {id:'feed', n:'Feed', xp:6, hunger:40}, {id:'play', n:'Play', xp:10, happy:35},
  {id:'pet', n:'Pet', xp:4, happy:15}, {id:'clean', n:'Clean', xp:8, happy:20}, {id:'quiz', n:'Quiz', xp:15, happy:20}
];
let S = JSON.parse(localStorage.getItem(KEY) || 'null');
const P = $('#pet'), act = $('#act');
const save = () => localStorage.setItem(KEY, JSON.stringify(S));

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

function finish(t, ok){
  const n = needs(); S.hunger = n.h; S.happy = n.p; S.t = Date.now();
  const sad = n.h < 30 || n.p < 30, g = ok ? Math.round(t.xp * (sad ? .5 : 1)) : 0;
  S.xp += g;
  if (t.hunger) S.hunger = Math.min(100, S.hunger + t.hunger);
  if (t.happy && ok) S.happy = Math.min(100, S.happy + t.happy);
  S.cd[t.id] = Date.now() + CD; save(); act.replaceChildren(); draw();
  $('#toast').textContent = ok ? `+${g} XP${sad && g ? ' (half, your pet is sad)' : ''}` : 'Not quite. No XP this time.';
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
    let d = 0, n = 0, lx = null; const need = 6, info = line('Stroke your pet: 0/' + need);
    const stop = () => { P.onpointerdown = P.onpointerup = P.onpointerleave = P.onpointermove = null };
    P.onpointerdown = e => { lx = e.clientX };
    P.onpointerup = P.onpointerleave = () => { lx = null };
    P.onpointermove = e => {
      if (lx === null) return;
      d += Math.abs(e.clientX - lx); lx = e.clientX;
      if (d >= 80) {
        d = 0; n++; fx(P, 'love', 500); heart(); info.textContent = `Stroke your pet: ${n}/${need}`;
        if (n >= need) { stop(); finish(t, true) }
      }
    };
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
function openTask(t){ act.replaceChildren(); $('#fx').replaceChildren(); $('#toast').textContent = ''; run[t.id](t) }

// view
function draw(){
  const n = needs(), age = ageOf(S.xp), st = stageOf(age), sad = n.h < 30 || n.p < 30;
  P.style.setProperty('--s', [96,120,144,168,168][st] + 'px'); P.classList.toggle('elder', st === 4); P.classList.toggle('sad', sad);
  if (!P.firstChild || P.dataset.k !== `${S.species}${st}${sad}`) { P.innerHTML = art(S.species, st, sad); P.dataset.k = `${S.species}${st}${sad}` }
  $('#pname').textContent = S.name;
  $('#meta').textContent = `${SP[S.species].n} · ${STAGES[st][1]} · age ${Math.floor(age)} · ${S.xp} XP${sad ? ' · sad' : ''}`;
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
S ? showGame() : showEgg();
