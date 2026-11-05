const $ = s => document.querySelector(s), R = n => Math.floor(Math.random() * n);
const KEY = 'hatchling', CD = 10 * 60e3;
const SP = {dog:{c:'#c28a54',n:'Dog'}, cat:{c:'#eba04a',n:'Cat'}, frog:{c:'#5fbf6a',n:'Frog'}, dragon:{c:'#8a6fd1',n:'Dragon'}};
const STAGES = [[0,'Baby'],[10,'Toddler'],[30,'Teen'],[60,'Adult'],[90,'Elder']];
const BANDS = [[0,10,120],[10,30,300],[30,60,600],[60,100,1200]]; // age range, XP needed (about 2h/5h/10h/20h)
const TASKS = [
  {id:'feed', n:'Feed', xp:6, hunger:40}, {id:'play', n:'Play', xp:10, happy:35},
  {id:'pet', n:'Pet', xp:4, happy:15}, {id:'clean', n:'Clean', xp:8, happy:20}, {id:'quiz', n:'Quiz', xp:15, happy:20}
];
const APPLE = '<svg viewBox="0 0 36 36"><circle cx="18" cy="21" r="13" fill="#e5484d"/><path d="M18 9q1-6 7-7" stroke="#3f8f4a" stroke-width="3" fill="none"/></svg>';
let S = JSON.parse(localStorage.getItem(KEY) || 'null');
const P = $('#pet'), act = $('#act');
const save = () => localStorage.setItem(KEY, JSON.stringify(S));

function ageOf(xp){ let r = xp; for (const [lo,hi,c] of BANDS){ if (r >= c) r -= c; else return lo + (hi-lo)*r/c } return 100 }
function stageOf(a){ let i = 0; STAGES.forEach((s,j) => { if (a >= s[0]) i = j }); return i }
function needs(){ const d = (Date.now() - S.t) / 36e5; return {h: Math.max(0, S.hunger - d*100/6), p: Math.max(0, S.happy - d*100/8)} }

function art(sp, st, sad){
  const c = SP[sp].c, k = [.62,.76,.9,1,1][st], e = st ? 6 : 8, s = 'stroke="rgba(0,0,0,.28)" stroke-width="2"';
  const back = {
    dog:`<ellipse cx="33" cy="52" rx="9" ry="19" fill="#7a4e2a" ${s}/><ellipse cx="87" cy="52" rx="9" ry="19" fill="#7a4e2a" ${s}/>`,
    cat:`<polygon points="36,34 42,12 56,28" fill="${c}" ${s}/><polygon points="84,34 78,12 64,28" fill="${c}" ${s}/>`,
    frog:`<circle cx="42" cy="30" r="13" fill="${c}" ${s}/><circle cx="78" cy="30" r="13" fill="${c}" ${s}/>`,
    dragon:`<path d="M34 84L6 58l6 32z M86 84l28-26-6 32z" fill="#5b45a8" ${s}/><polygon points="40,28 44,8 52,26" fill="#f5d36b" ${s}/><polygon points="80,28 76,8 68,26" fill="#f5d36b" ${s}/>`
  }[sp];
  const pos = sp === 'frog' ? [[42,30],[78,30]] : [[48,50],[72,50]];
  const eyes = pos.map(([x,y]) => `<circle cx="${x}" cy="${y}" r="${e+3}" fill="#fff"/><circle cx="${x}" cy="${y+(sad?2:0)}" r="${e-2}" fill="#1b1430"/>`).join('');
  const extra = (sp==='cat' ? '<path d="M34 62h-16M34 68l-15 5M86 62h16M86 68l15 5" stroke="#fff" stroke-width="2" stroke-linecap="round"/>' : '')
    + (sp==='dog' ? '<ellipse cx="60" cy="60" rx="6" ry="4" fill="#2a1b12"/>' : '')
    + (st===4 ? '<path d="M44 64q16 12 32 0" stroke="#fff" stroke-width="5" fill="none" stroke-linecap="round"/>' : '');
  const mouth = sad ? 'M52 74q8-8 16 0' : 'M52 68q8 9 16 0';
  return `<svg viewBox="0 0 120 120" role="img" aria-label="${SP[sp].n}"><g transform="translate(60 112) scale(${k}) translate(-60 -112)">${back}
    <ellipse cx="60" cy="86" rx="34" ry="28" fill="${c}" ${s}/><ellipse cx="60" cy="92" rx="21" ry="17" fill="rgba(255,255,255,.35)"/>
    <circle cx="60" cy="52" r="29" fill="${c}" ${s}/>${eyes}${extra}
    <path d="${mouth}" stroke="#1b1430" stroke-width="3" fill="none" stroke-linecap="round"/>
    <ellipse class="mo" cx="60" cy="70" rx="8" ry="7" fill="#7a1f2b"/></g></svg>`;
}
const EGG = '<svg viewBox="0 0 120 140" role="img" aria-label="Egg"><ellipse cx="60" cy="76" rx="42" ry="56" fill="#f4ead2" stroke="rgba(0,0,0,.28)" stroke-width="2"/><circle cx="44" cy="58" r="7" fill="#d9a066"/><circle cx="74" cy="90" r="9" fill="#8fc7a8"/><circle cx="52" cy="104" r="5" fill="#b9a3e0"/></svg>';

// helpers
const fx = (el, cls, ms) => { el.classList.add(cls); setTimeout(() => el.classList.remove(cls), ms) };
function spawn(cls, html, x, y, ms){
  const e = document.createElement('span'); e.className = cls; if (html) e.innerHTML = html;
  if (x != null) { e.style.left = x; e.style.top = y }
  $('#fx').append(e); if (ms) setTimeout(() => e.remove(), ms); return e;
}
const heart = () => spawn('heart', '♥', (35 + R(30)) + '%', (25 + R(20)) + '%', 1000);
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
      b.disabled = true; spawn('ball', '', null, null, 1150);
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
    const r = Math.random(); sp = r < .05 ? 'dragon' : r < .2 ? 'frog' : r < .6 ? 'dog' : 'cat';
    $('#eggart').innerHTML = art(sp, 0, false); $('#hatchbtn').hidden = true; $('#namebox').hidden = false;
    $('#got').textContent = `It’s a ${SP[sp].n}!${sp === 'dragon' ? ' A legendary Dragon.' : sp === 'frog' ? ' A rare Frog.' : ''}`; $('#nm').focus();
  };
  $('#go').onclick = () => { const nm = $('#nm').value.trim(); if (!nm) return $('#nm').focus();
    S = {name:nm, species:sp, xp:0, hunger:80, happy:80, t:Date.now(), cd:{}}; save(); showGame() };
}
S ? showGame() : showEgg();
