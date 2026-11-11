// World: day and night, seasons, real weather, animal behaviour and welcome-back finds.
// Wrapped in a function so none of its names can collide with game.js (which runs after this file).
const World = (() => {
  const GEO = 'hatchling-geo', SEASONS = ['winter', 'spring', 'summer', 'autumn'];
  const wx = {kind: 'clear', day: null};
  const geo = () => { try { return JSON.parse(localStorage.getItem(GEO)) } catch (e) { return null } };
  const season = () => { const m = new Date().getMonth(), g = geo(), s = m === 11 || m < 2 ? 0 : m < 5 ? 1 : m < 8 ? 2 : 3; return SEASONS[(s + (g && g.lat < 0 ? 2 : 0)) % 4] };
  const night = () => cfg.weather && wx.day !== null ? !wx.day : (new Date().getHours() >= 21 || new Date().getHours() < 6);
  const sleeping = () => !!S && !S.req && !P.classList.contains('held') && (S.species === 'owl' ? !night() : night());   // owls are nocturnal: they nap by day
  const perched = () => !!S && S.species === 'owl' && sleeping();

  // ---------- scene ----------
  const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t)), hx = c => '#' + c.map(v => v.toString(16).padStart(2, '0')).join('');
  const GRASS = {winter: [[238, 243, 247], [205, 216, 226]], spring: [[140, 210, 110], [100, 175, 80]], summer: [[116, 194, 98], [79, 159, 70]], autumn: [[176, 166, 84], [136, 124, 58]]};
  let sceneKey = '';
  function scene(force){
    const se = season(), ni = night(), kind = cfg.weather ? wx.kind : 'clear', key = [se, ni, kind, cfg.weather].join('|');
    if (!force && key === sceneKey) return; sceneKey = key;
    const over = kind !== 'clear', sky = ni ? [[12, 20, 48], [44, 60, 108]] : [[143, 203, 238], [211, 236, 250]];
    const gray = ni ? [30, 36, 52] : [128, 138, 150], k = over ? (kind === 'storm' ? .7 : .5) : 0, dim = ni ? .55 : 1;
    const st = [];
    for (let i = 0; i < 12; i++) st.push(`${hx(mix(mix(sky[0], sky[1], i / 11), gray, k))} ${i * 6}% ${(i + 1) * 6}%`);
    for (let i = 0; i < 5; i++) st.push(`${hx(mix(mix(GRASS[se][0], GRASS[se][1], i / 4), [0, 0, 0], 1 - dim))} ${72 + i * 5.6}% ${72 + (i + 1) * 5.6}%`);
    $('#stage').style.background = 'linear-gradient(' + st.join(',') + ')';
    $('#tree').innerHTML = TREES[se]; $('#sun').innerHTML = ni ? MOON : SUN; $('#sun').style.opacity = over ? .35 : 1;
    // sky layer: stars and clouds
    const skyEl = $('#sky'), wxEl = $('#wx'), mk = (c, h, css) => { const e = document.createElement('i'); e.className = c; if (h) e.innerHTML = h; e.style.cssText = css; return e };
    skyEl.replaceChildren(); wxEl.replaceChildren();
    if (ni) for (let i = 0; i < 16; i++) skyEl.append(mk('star', '', `left:${R(96)}%;top:${R(60)}%;animation-delay:${(Math.random() * 2).toFixed(1)}s`));
    for (let i = 0; i < (kind === 'clear' ? 2 : kind === 'cloud' ? 4 : 5); i++)
      skyEl.append(mk('cloud' + (kind === 'storm' ? ' dark' : ''), CLOUD, `top:${4 + R(34)}px;width:${90 + R(40)}px;animation-duration:${60 + R(50)}s;animation-delay:-${R(100)}s`));
    if (kind === 'rain' || kind === 'storm') for (let i = 0; i < 40; i++) wxEl.append(mk('drop', '', `left:${R(100)}%;animation-duration:${(.5 + Math.random() * .4).toFixed(2)}s;animation-delay:-${(Math.random()).toFixed(2)}s`));
    if (kind === 'snow') for (let i = 0; i < 30; i++) wxEl.append(mk('flake', '', `left:${R(100)}%;animation-duration:${4 + R(3)}s;animation-delay:-${R(6)}s`));
    if (kind === 'storm') wxEl.append(mk('flash', '', ''));
  }
  async function fetchWx(){
    const g = geo(); if (!g || !cfg.weather) return;
    try {
      const j = await (await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${g.lat}&longitude=${g.lon}&current=weather_code,is_day`)).json(), c = j.current.weather_code;
      wx.kind = c >= 95 ? 'storm' : (c >= 71 && c <= 77) || c === 85 || c === 86 ? 'snow' : (c >= 51 && c <= 67) || (c >= 80 && c <= 82) ? 'rain' : c >= 2 ? 'cloud' : 'clear';
      wx.day = !!j.current.is_day; scene(true);
    } catch (e) {}
  }
  function toggleWeather(){
    if (cfg.weather) { cfg.weather = false; applyCfg(); return scene(true) }
    if (!navigator.geolocation) return alert('This browser can’t share a location.');
    navigator.geolocation.getCurrentPosition(p => {
      localStorage.setItem(GEO, JSON.stringify({lat: +p.coords.latitude.toFixed(1), lon: +p.coords.longitude.toFixed(1)}));   // rounded: about 10 km, stays in this browser
      cfg.weather = true; applyCfg(); fetchWx();
    }, () => alert('Location is blocked. Allow it in your browser’s site settings, then try again.'));
  }

  // ---------- behaviour ----------
  let timers = [], busy = false;
  const later = (f, ms) => timers.push(setTimeout(f, ms));
  function cancel(){ timers.forEach(clearTimeout); timers = []; busy = false; P.classList.remove('hopping'); P.style.setProperty('--tr', '0ms') }
  function setPos(x, fb, ms){
    P.style.setProperty('--tr', ms + 'ms'); P.style.left = Math.min(.9, Math.max(.1, x)) * 100 + '%'; pos.fb = fb;
    const was = P.classList.contains('fly'); if (placePet(stageOf(ageOf(S.xp))) !== was) draw();
  }
  function behave(){
    if (!S || busy || !stageH() || P.classList.contains('held') || act.children.length || sleeping()) return;
    const sp = S.species, H = stageH(), r = Math.random(), x0 = petX() / 100, fb0 = pos.fb;
    const rx = () => .12 + Math.random() * .76, rf = () => .05 * H + Math.random() * .2 * H, end = ms => { busy = true; later(() => { busy = false; P.classList.remove('hopping'); P.style.setProperty('--tr', '0ms') }, ms) };
    if (r < .4) return;
    if (sp === 'fox' && r < .62) { end(3600); setPos(.12, fb0, 900); later(() => setPos(.88, fb0, 1500), 950); later(() => setPos(x0, fb0, 900), 2500); return }   // a lap around the grass
    if (sp === 'dragon' && r < .72) {                                                                                                                     // a loop through the air
      end(4800); for (let i = 0; i <= 24; i++) later(() => setPos(.5 + .34 * Math.cos(i / 24 * 6.28 + 3.14), .25 * H + .12 * H + .1 * H * Math.sin(i / 24 * 12.56), 170), i * 170);
      later(() => setPos(x0, .1 * H, 600), 4300); return;
    }
    end(1500); if (sp === 'frog') P.classList.add('hopping'); setPos(rx(), rf(), 1400);
  }

  // ---------- finds: something the pet dug up while you were away ----------
  const ITEMS = {acorn:{n:'an acorn', w:40, xp:5, svg:ACORN}, feather:{n:'a feather', w:30, xp:6, svg:FEATHER}, mushroom:{n:'a mushroom', w:20, xp:8, svg:MUSH}, coin:{n:'a gold coin', w:8, xp:12, svg:COIN}, gem:{n:'a gem', w:2, xp:25, svg:GEM}};
  function checkFind(){
    if (!S || S.find) return; const away = Date.now() - (S.seen || Date.now()); if (away < 30 * 60e3) return;
    const roll = () => { let r = R(100); for (const k in ITEMS) { if ((r -= ITEMS[k].w) < 0) return k } };
    let a = roll(); if (away > 8 * 36e5) { const b = roll(); if (ITEMS[b].w < ITEMS[a].w) a = b }   // away a long time: a better find
    S.find = {k: a}; save(); toast(`Welcome back! ${S.name} found ${ITEMS[a].n} for you. Tap it!`);
  }
  function showFind(){
    if (!S || !S.find || $('#find')) return; const it = ITEMS[S.find.k], e = spawn('find', it.svg, Math.min(84, petX() + 12) + '%', '66%', 0);
    e.id = 'find'; e.title = 'Pick it up';
    e.onclick = () => {
      const k = S.find.k; S.finds = S.finds || {}; S.finds[k] = (S.finds[k] || 0) + 1; S.xp += ITEMS[k].xp; S.find = null; save(); e.remove(); heart(); draw();
      toast(`${S.name} found ${ITEMS[k].n}! +${ITEMS[k].xp} XP`);
    };
  }
  const findsText = () => { const f = S && S.finds ? Object.entries(S.finds).map(([k, v]) => `${v}× ${k}`).join(', ') : ''; return f || 'nothing yet' };

  let started = false;
  function init(){
    if (started) return; started = true; scene(true); fetchWx();
    setInterval(() => scene(), 60000); setInterval(fetchWx, 15 * 60e3); setInterval(behave, 3500);
    setInterval(() => { if (S) { S.seen = Date.now(); save() } }, 120000);
    document.addEventListener('visibilitychange', () => { if (document.hidden && S) { S.seen = Date.now(); save() } });
    checkFind();
  }
  function tick(){ if (S) { S.seen = Date.now(); showFind() } }
  return {init, tick, sleeping, perched, cancel, toggleWeather, findsText, season, night, wx, behave, scene, fetchWx};
})();
