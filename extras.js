// Extras: daily streak, daily egg, the Finds tab (collection + workshop for cosmetics) and the trophy shelf.
// Wrapped in a function so its names can't collide with game.js.
const Extras = (() => {
  const pad = n => String(n).padStart(2, '0'), dstr = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const today = () => dstr(new Date()), yesterday = () => { const d = new Date(); d.setDate(d.getDate() - 1); return dstr(d) };
  const sum = o => Object.values(o || {}).reduce((a, b) => a + b, 0), items = () => World.ITEMS, short = k => items()[k].n.replace(/^an? /, '');
  const stage = () => stageOf(ageOf(S.xp)), done = k => () => S.st.done[k] || 0, best = () => (S.sk && S.sk.best) || 0;
  let lastEgg = null;
  function ensure(){
    S.finds = S.finds || {}; S.owned = S.owned || {}; S.wear = S.wear || {}; S.tr = S.tr || {}; S.st = S.st || {};
    S.st.done = S.st.done || {feed: 0, play: 0, pet: 0, clean: 0, quiz: 0};
  }
  const T = (id, n, d, goal, v) => ({id, n, d, goal, v});
  const TROPHIES = [
    T('pop', 'Bubble Popper', 'Pop 100 soap bubbles', 100, () => S.st.pops || 0), T('fast', 'Quick Hands', 'Answer 10 requests within a minute', 10, () => S.st.fast || 0),
    T('gem', 'Treasure Hunter', 'Find a gem', 1, () => S.finds.gem || 0), T('hoard', 'Collector', 'Collect 25 finds', 25, () => sum(S.finds)),
    T('s3', 'On a Roll', 'Reach a 3-day streak', 3, best), T('s7', 'Week Warrior', 'Reach a 7-day streak', 7, best), T('s30', 'Devoted', 'Reach a 30-day streak', 30, best),
    T('chef', 'Head Chef', 'Feed your pet 25 times', 25, done('feed')), T('play', 'Playmate', 'Play 25 times', 25, done('play')), T('cuddle', 'Cuddle Expert', 'Pet your pet 25 times', 25, done('pet')),
    T('clean', 'Squeaky Clean', 'Wash your pet 15 times', 15, done('clean')), T('brain', 'Brainiac', 'Answer 25 quizzes correctly', 25, done('quiz')),
    T('teen', 'Growing Up', 'Reach the Teen stage', 1, () => stage() >= 2 ? 1 : 0), T('elder', 'Wise Elder', 'Reach the Elder stage', 1, () => stage() >= 4 ? 1 : 0),
    T('shiny', 'Shiny!', 'Hatch a shiny pet', 1, () => S.color === 'shiny' ? 1 : 0), T('dress', 'Dress-up', 'Craft 3 cosmetics', 3, () => Object.keys(S.owned).length),
    T('eggs', 'Egg Fan', 'Hatch 7 daily eggs', 7, () => S.st.eggs || 0), T('friend', 'Good Friend', 'Give 5 waves or treats', 5, () => S.st.gifts || 0)
  ];

  // ---------- streak: a new day in a row gives XP; missing a day only resets the bonus ----------
  function dayCheck(){
    const td = today(); if (S.sk && S.sk.last === td) return;
    const n = S.sk && S.sk.last === yesterday() ? S.sk.n + 1 : 1, bonus = Math.min(30, 5 + 3 * n);
    S.sk = {n, last: td, best: Math.max(n, best())}; S.xp += bonus; save();
    toast(`Day ${n} streak! +${bonus} XP. Your daily egg is ready.`);
  }
  function checkTrophies(){ for (const t of TROPHIES) if (!S.tr[t.id] && t.v() >= t.goal) { S.tr[t.id] = Date.now(); save(); toast(`Trophy unlocked: ${t.n}!`) } }

  // ---------- daily egg: 2 to 4 finds; a longer streak improves them; every 7th day adds a guaranteed rare ----------
  function hatch(){
    if (S.eggDay === today()) return; $('#eggbtn').disabled = true; fx($('#eggimg'), 'shake', 700);
    setTimeout(() => {
      const n = S.sk ? S.sk.n : 1, count = 2 + (n >= 3) + (n >= 7), I = items(), got = {};
      const roll = () => { let r = R(100); for (const k in I) { if ((r -= I[k].w) < 0) return k } };
      for (let i = 0; i < count; i++) { let k = roll(); if (n >= 5) { const k2 = roll(); if (I[k2].w < I[k].w) k = k2 } got[k] = (got[k] || 0) + 1 }
      if (n % 7 === 0) { const k = R(2) ? 'coin' : 'gem'; got[k] = (got[k] || 0) + 1 }
      for (const k in got) S.finds[k] = (S.finds[k] || 0) + got[k];
      S.eggDay = today(); S.st.eggs = (S.st.eggs || 0) + 1; S.xp += 3; save(); lastEgg = got; render();
    }, 700);
  }
  const untilMidnight = () => { const n = new Date(), m = new Date(n.getFullYear(), n.getMonth(), n.getDate() + 1) - n; return `Next egg in ${Math.floor(m / 36e5)}h ${pad(Math.floor(m % 36e5 / 6e4))}m` };

  // ---------- cosmetics ----------
  function use(id, a){
    const g = GEAR[id];
    if (a === 'craft') { for (const k in g.cost) if ((S.finds[k] || 0) < g.cost[k]) return; for (const k in g.cost) S.finds[k] -= g.cost[k]; S.owned[id] = true; S.wear[g.slot] = id }
    else if (a === 'wear') S.wear[g.slot] = id; else delete S.wear[g.slot];
    save(); draw(); render();
  }
  function decor(){ const id = (S.wear && S.wear.decor) || '', e = $('#decor'); if (e.dataset.id !== id) { e.dataset.id = id; e.innerHTML = id ? DECOR[id] : '' } }

  // ---------- the Finds tab ----------
  function render(){
    ensure(); const sk = S.sk || {n: 0}, ready = S.eggDay !== today(), I = items();
    $('#streak').innerHTML = `<div style="flex:1"><b>Day ${sk.n} streak</b><small>Best ${Math.max(best(), sk.n)} · +${Math.min(30, 5 + 3 * Math.max(sk.n, 1))} XP a day</small><div class="dots">${[...Array(7)].map((_, i) => `<i class="${sk.n && i <= (sk.n - 1) % 7 ? 'on' : ''}"></i>`).join('')}</div></div>`;
    const got = lastEgg ? `<div class="reveal">${Object.entries(lastEgg).map(([k, v]) => `<div>${I[k].svg}×${v}</div>`).join('')}</div>` : '';
    $('#degg').innerHTML = `<div id="eggimg">${EGG}</div><div style="flex:1"><b>Daily egg</b><small>${ready ? 'Hatches into 2–4 finds. A longer streak means better finds.' : 'Come back tomorrow for the next one.'}</small>${ready ? '<button id="eggbtn" style="margin-top:8px">Hatch</button>' : '<small id="eggtime"></small>'}${got}</div>`;
    if (ready) $('#eggbtn').onclick = hatch; else $('#eggtime').textContent = untilMidnight();
    $('#coll').innerHTML = Object.keys(I).map(k => `<div class="item ${S.finds[k] ? '' : 'none'}">${I[k].svg}<b>${S.finds[k] || 0}</b><small>${short(k)}</small></div>`).join('');
    $('#shop').innerHTML = Object.keys(GEAR).map(id => {
      const g = GEAR[id], owned = S.owned[id], worn = S.wear[g.slot] === id, can = Object.keys(g.cost).every(k => (S.finds[k] || 0) >= g.cost[k]);
      const cost = Object.keys(g.cost).map(k => `<span class="cost ${(S.finds[k] || 0) >= g.cost[k] ? '' : 'lack'}">${I[k].svg}${S.finds[k] || 0}/${g.cost[k]}</span>`).join('');
      return `<div class="recipe${worn ? ' worn' : ''}"><div class="ic">${gearIcon(id)}</div><div class="body"><b>${g.n}</b><span class="slot">${{hat: 'Hat', neck: 'Neck', decor: 'Scene'}[g.slot]}</span><div class="costs">${owned ? `<small>${worn ? 'Worn right now' : 'In your wardrobe'}</small>` : cost}</div></div>
        <button data-id="${id}" data-a="${owned ? (worn ? 'remove' : 'wear') : 'craft'}" ${!owned && !can ? 'disabled' : ''}>${owned ? (worn ? 'Remove' : 'Wear') : 'Craft'}</button></div>`;
    }).join('');
    $('#shop').querySelectorAll('button').forEach(b => { b.onclick = () => use(b.dataset.id, b.dataset.a) });
  }
  function renderTrophies(){
    ensure(); $('#tcount').textContent = `${TROPHIES.filter(t => S.tr[t.id]).length}/${TROPHIES.length}`;
    $('#shelf').innerHTML = TROPHIES.map(t => { const got = !!S.tr[t.id], v = Math.min(t.v(), t.goal);
      return `<div class="trophy ${got ? 'got' : ''}">${TROPHY}<b>${t.n}</b><small>${t.d}</small>${t.goal >= 5 ? `<em>${got ? t.goal : v}/${t.goal}</em>` : ''}</div>` }).join('');
  }

  function init(){ ensure(); dayCheck() }
  function tick(){
    if (!S) return; ensure(); dayCheck(); checkTrophies();
    $('#tab-finds').classList.toggle('ping', S.eggDay !== today());
    const t = $('#eggtime'); if (t) t.textContent = untilMidnight();
  }
  const nextDay = () => { ensure(); S.sk = S.sk || {n: 0, best: 0}; S.sk.last = yesterday(); S.eggDay = '' };   // admin: pretend a day has passed
  return {init, tick, render, renderTrophies, ensure, decor, nextDay};
})();
