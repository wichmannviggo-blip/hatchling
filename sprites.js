// Pixel-art engine. Shapes are rasterised onto a 32x32 grid (half the pixel size of the old 16x16 art),
// then shaded and outlined automatically, so each animal is just a handful of simple shapes.
const INK = '#1d1830', N = 32;
const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const shade = (h, k) => '#' + hex(h).map(v => Math.round(v * k).toString(16).padStart(2, '0')).join('');
const sg = (x, y, ax, ay, bx, by) => (x - bx) * (ay - by) - (ax - bx) * (y - by);
// shapes: ['e', cx, cy, rx, ry, role] ellipse, ['r', x0, y0, x1, y1, role] rectangle, ['t', x1, y1, x2, y2, x3, y3, role] triangle
function inside(s, x, y){
  if (s[0] === 'e') return ((x - s[1]) / s[3]) ** 2 + ((y - s[2]) / s[4]) ** 2 <= 1;
  if (s[0] === 'r') return x >= s[1] && x < s[3] && y >= s[2] && y < s[4];
  const a = sg(x, y, s[1], s[2], s[3], s[4]), b = sg(x, y, s[3], s[4], s[5], s[6]), c = sg(x, y, s[5], s[6], s[1], s[2]);
  return !((a < 0 || b < 0 || c < 0) && (a > 0 || b > 0 || c > 0));
}
function raster(shapes, W = N, H = N, ox = 0, oy = 0){
  const g = Array.from({length: H}, () => Array(W).fill(''));
  for (const s of shapes) {
    const role = s[s[0] === 't' ? 7 : 5];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (inside(s, x + ox + .5, y + oy + .5)) g[y][x] = role;
  }
  return g;
}
function outlined(g){   // darken the bottom and right rim of the main colour, then add the outline
  const H = g.length, W = g[0].length, at = (x, y) => (g[y] && g[y][x]) || '', o = g.map(r => r.slice());
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (g[y][x] === 'b' && (!at(x, y + 1) || !at(x, y + 2) || !at(x + 1, y))) o[y][x] = 'd';
    if (!g[y][x] && (at(x - 1, y) || at(x + 1, y) || at(x, y - 1) || at(x, y + 1))) o[y][x] = 'o';
  }
  return o;
}
function rects(g, pal, ox = 0, oy = 0){
  let r = '';
  g.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const c = row[x]; if (!c || !pal[c]) { x++; continue }
      let e = x; while (e < row.length && row[e] === c) e++;
      r += `<rect x="${x + ox}" y="${y + oy}" width="${e - x}" height="1.02" fill="${pal[c]}"${c === 'm' ? ' class="m"' : ''}/>`; x = e;
    }
  });
  return r;
}
const svg = (g, pal, extra = '') => `<svg viewBox="0 0 ${g[0].length} ${g.length}" shape-rendering="crispEdges">${rects(g, pal)}${extra}</svg>`;

// ---- the animals. Roles: b fur, d dark fur, l light (belly, muzzle), a pink, k black, w white, y gold, q orange, m mouth
const BODYS = [['e',11,28.6,3.6,2,'b'], ['e',21,28.6,3.6,2,'b'], ['e',16,23.2,9.5,7,'b'], ['e',16,24.2,6,4.8,'l']];
const C = (n, b, l) => ({n, b, l});
const BLK = C('Black', '#3b3b46', '#8d8d99'), WHT = C('White', '#f2f2f2', '#ffffff'), GRY = C('Gray', '#8b9097', '#dcdfe3');
const SPECIES = {
  dog: {n:'Dog', eye:[13, 4.4, 1], mouth:19.6, colors:[C('Brown', '#a9744a', '#ecd2ac'), C('Golden', '#d9a441', '#f6e3b4'), BLK, WHT, GRY],
    back:[['e',5.5,14,3.8,7.5,'d'], ['e',26.5,14,3.8,7.5,'d'], ['e',27.5,22,2,4.5,'b']], head:[['e',16,13,10.5,9.2,'b']],
    face:[['e',16,17.8,5.2,3.8,'l'], ['e',16,16.2,2.2,1.5,'k']]},
  cat: {n:'Cat', eye:[13, 4.4, 1], mouth:19.4, colors:[C('Orange', '#ee9b45', '#ffe1b5'), BLK, WHT, GRY, C('Cream', '#e8cfa4', '#fff3da')],
    back:[['t',6,11,7.5,1.8,14.5,7,'b'], ['t',26,11,24.5,1.8,17.5,7,'b'], ['t',8,9.5,8.3,4.8,12,7.3,'a'], ['t',24,9.5,23.7,4.8,20,7.3,'a'], ['e',27.5,21,2.2,6,'b']],
    head:[['e',16,13,10.5,9,'b']], face:[['e',16,17.8,3.8,2.6,'l'], ['r',15,16,17,17,'a']]},
  frog: {n:'Frog', eye:[7.5, 5.5, 1.1], mouth:19.4, mw:6.5, colors:[C('Green', '#62c06b', '#d3f2c5'), C('Blue', '#4f8fd9', '#cfe6ff'), C('Red', '#d9503f', '#ffd9cf'), C('Yellow', '#e5c93a', '#fff3b0')],
    back:[['e',10.5,7.5,4.8,4.6,'b'], ['e',21.5,7.5,4.8,4.6,'b']], head:[['e',16,15,12,8,'b']],
    face:[['r',14,14,15,15,'k'], ['r',17,14,18,15,'k']]},
  dragon: {n:'Dragon', eye:[13, 4.4, 1], mouth:19.6, colors:[C('Red', '#d64545', '#ffd9a8'), C('Purple', '#8e76d6', '#e0d6ff'), C('Green', '#4aa862', '#d8f3c4'), C('Blue', '#4a86d9', '#cde4ff')],
    back:[['t',9,8,7,1.5,13,5,'y'], ['t',23,8,25,1.5,19,5,'y'], ['t',6.5,19,1,17,6.5,26,'d'], ['t',25.5,19,31,17,25.5,26,'d'], ['e',28,27,3.8,1.5,'d']],
    head:[['e',16,13,10.5,9,'b']], face:[['e',16,17.8,5.4,3.6,'l'], ['r',13.5,16,14.5,17,'k'], ['r',17.5,16,18.5,17,'k']]},
  bunny: {n:'Bunny', eye:[13.6, 4.4, 1], mouth:19.8, colors:[WHT, C('Brown', '#a9815a', '#eddcc4'), GRY, BLK],
    back:[['e',10.5,6.6,2.9,5.6,'b'], ['e',21.5,6.6,2.9,5.6,'b'], ['e',10.5,7.2,1.4,4.2,'a'], ['e',21.5,7.2,1.4,4.2,'a'], ['e',27,25.5,2.6,2.6,'l']],
    head:[['e',16,14,10,8.6,'b']], face:[['e',16,18.4,5.8,3.4,'l'], ['r',15,16.8,17,17.8,'a']]},
  fox: {n:'Fox', eye:[12.6, 4.6, 1], mouth:20, colors:[C('Red', '#e0782f', '#fff4e6'), C('Arctic', '#eef1f4', '#ffffff'), GRY, C('Silver', '#5d626b', '#c9cdd3')],
    back:[['t',5.5,12,6.5,1.8,14,7.5,'b'], ['t',26.5,12,25.5,1.8,18,7.5,'b'], ['t',6.2,6,6.8,2.4,9,4.6,'k'], ['t',25.8,6,25.2,2.4,23,4.6,'k'], ['e',27,21.5,4.2,7,'b'], ['e',28.2,16.8,2.6,2.6,'l']],
    head:[['e',16,13.4,10.6,8.8,'b']], face:[['e',9.3,17.6,4.6,3.5,'l'], ['e',22.7,17.6,4.6,3.5,'l'], ['e',16,18.6,4.2,3,'l'], ['e',16,16.4,1.9,1.3,'k']]},
  hamster: {n:'Hamster', eye:[13, 4.2, 1], mouth:19.6, colors:[C('Golden', '#e0a755', '#fff0d6'), WHT, GRY, C('Brown', '#9b6b45', '#e9d3bb')],
    back:[['e',8.5,6.4,3.2,3,'b'], ['e',23.5,6.4,3.2,3,'b'], ['e',8.5,6.8,1.7,1.6,'a'], ['e',23.5,6.8,1.7,1.6,'a']],
    body:[['e',11,28.6,3.6,2,'b'], ['e',21,28.6,3.6,2,'b'], ['e',16,23,10.5,7.4,'b'], ['e',16,24.2,6.4,4.8,'l']],
    head:[['e',16,13.6,11,9,'b']], face:[['e',8.2,18.2,4.4,3.4,'l'], ['e',23.8,18.2,4.4,3.4,'l'], ['e',16,17.8,3.6,2.6,'l'], ['r',15,16.2,17,17.2,'a']]},
  owl: {n:'Owl', eye:[13, 4.8, 1.45], colors:[C('Brown', '#8a6240', '#e6d2b5'), C('Snowy', '#eef1f4', '#ffffff'), GRY, C('Tawny', '#c28a4e', '#f1dfbf')],
    back:[['t',7.5,9,6.5,1.6,13,6.5,'d'], ['t',24.5,9,25.5,1.6,19,6.5,'d'], ['e',6.5,23.5,3.6,6.5,'d'], ['e',25.5,23.5,3.6,6.5,'d']],
    body:[['e',16,18,11,12.5,'b'], ['e',16,21.5,7,8.5,'l'], ['e',12,30,3,1.3,'q'], ['e',20,30,3,1.3,'q']],
    head:[['e',16,13,9.6,7.6,'l']], face:[['r',13,23,14,25,'d'], ['r',17,25,18,27,'d'], ['r',19,22,20,24,'d']], after:[['t',14.4,16.2,17.6,16.2,16,20,'q']]},
  penguin: {n:'Penguin', eye:[12, 3.2, .85], colors:[C('Black', '#2f3342', '#ffffff'), C('Blue', '#4f6f96', '#f2f6fb'), C('Gray', '#8590a0', '#ffffff'), C('Brown', '#8a6e55', '#efe4d3')],
    back:[['e',5.2,20,2.4,6.4,'b'], ['e',26.8,20,2.4,6.4,'b'], ['e',11,30,3.6,1.3,'q'], ['e',21,30,3.6,1.3,'q']],
    body:[['e',16,18.2,10.4,12.3,'b'], ['e',16,21.5,6.8,9.2,'l']], head:[['e',16,13,6.8,5.6,'l']], face:[], after:[['t',14.2,15.2,17.8,15.2,16,18.6,'q']]}
};
const SP = SPECIES;   // names, colours and shapes, keyed by species

function palette(sp, ci){
  const c = ci === 'shiny' ? {b:'#f2b705', l:'#fff1a8'} : SPECIES[sp].colors[ci % SPECIES[sp].colors.length];
  return {o:INK, b:c.b, d:shade(c.b, .78), l:c.l, a:'#f08aa0', w:'#fff', k:'#15101f', m:INK, y:'#ffd84a', q:'#f2a81d', u:'#6ec6ff'};
}
const eyes = (y, dx, dy, k) => [-dx, dx].flatMap(s => {
  const x = 16 + s, py = y + .7 + dy, hx = Math.floor(x - .6 * k), hy = Math.floor(py - k);
  return [['e',x,y,2.9 * k,3.3 * k,'o'], ['e',x,y,2.4 * k,2.8 * k,'w'], ['e',x,py,1.35 * k,1.85 * k,'k'], ['r',hx,hy,hx + 1,hy + 1,'w']];
});
// adult looks: a well-cared-for pet gets a gold collar, a neglected one is scruffy (messy fur, dirt, flies)
const LOOKS = {
  polished: [['r',10.5,21.4,21.5,22.8,'y'], ['e',16,23.4,1.3,1.3,'a']],
  scruffy: [['e',11,25,2,1.2,'d'], ['e',21.5,27,2.4,1.3,'d'], ['t',13,5.5,14.2,1.6,15.4,5.5,'d'], ['t',16.6,5,17.8,1.2,19.2,5,'d'], ['r',4,9,5,10,'k'], ['r',27,7,28,8,'k']]
};
const shut = (y, dx, k) => [-dx, dx].map(s => ['r', 16 + s - 2.2 * k, y + .6, 16 + s + 2.2 * k, y + 1.6, 'k']);   // closed eyes
function shapesFor(sp, st, sad, look, sleep){
  const d = SPECIES[sp], [ey, dx, k] = d.eye, out = [...d.back, ...(d.body || BODYS), ...(d.head || []), ...(LOOKS[look] || []), ...d.face, ...(sleep ? shut(ey, dx, k) : eyes(ey, dx, sad ? 1 : 0, k)), ...(d.after || [])];
  if (sad) out.push(['r', Math.round(16 - dx - 1.4 * k), ey + 3 * k, Math.round(16 - dx - 1.4 * k) + 1, ey + 3 * k + 2, 'u']);
  if (d.mouth) {
    if (st === 4) out.push(['e', 16, d.mouth + 1.5, 4.6, 2.1, 'w']);                 // elder: white beard
    out.push(['e', 16, d.mouth + (sad ? .8 : 0), d.mw || 1.7, .9, 'm']);
  }
  return out;
}
function wings(pal){   // big flapping wings for the flying dragon; two frames that swap
  const W = 13, H = 28, ox = -12, oy = 3;
  const mk = shapes => { const g = outlined(raster(shapes, W, H, ox, oy)); return rects(g, pal, ox, oy) + rects(g.map(r => r.slice().reverse()), pal, N - ox - W, oy) };
  return `<g class="w1">${mk([['t',-.5,13,-.5,23,-11,5,'d'], ['t',-.5,17,-.5,25,-11,15,'d']])}</g><g class="w2">${mk([['t',-.5,17,-.5,26,-11,30,'d'], ['t',-.5,14,-.5,22,-11,19,'d']])}</g>`;
}
const spark = (x, y, t) => `<g class="tw" style="animation-delay:${t}s" fill="#fff"><rect x="${x}" y="${y - 1}" width="1" height="3"/><rect x="${x - 1}" y="${y}" width="3" height="1"/></g>`;
function art(sp, st, sad, fly, ci = 0, look = '', sleep = false){
  const pal = palette(sp, ci);
  const extra = (fly && sp === 'dragon' ? wings(pal) : '') + (ci === 'shiny' ? spark(3, 6, 0) + spark(28, 10, .4) + spark(5, 24, .8) + spark(27, 26, .2) : '');
  return svg(outlined(raster(shapesFor(sp, st, sad, look, sleep))), pal, extra);
}

// ---- everything else in the scene, drawn with the same engine
const EGG = svg(outlined(raster([['e',16,19,11.4,11.2,'b'], ['e',16,12.5,9,10.5,'b'], ['e',11.5,16.5,2.6,2.2,'a'], ['e',21,22.5,3.2,2.6,'g'], ['e',14.5,26,2,1.4,'v'], ['e',20,11,1.5,1.5,'a'], ['e',11,10,1.3,2.2,'w']])),
  {o:INK, b:'#f4ead2', d:'#d8c79f', a:'#c98f5a', g:'#8fc7a8', v:'#b9a3e0', w:'#fff'});
const APPLE = svg(outlined(raster([['r',7,1.5,9,5,'t'], ['e',11,3.2,2.4,1.2,'g'], ['e',5.6,9,4.4,5.2,'b'], ['e',10.4,9,4.4,5.2,'b'], ['e',8,10,6,5,'b'], ['e',5,7.4,1,1.4,'w']], 16, 16)),
  {o:INK, b:'#e5484d', d:'#b8343a', t:'#6b4423', g:'#4aa05a', w:'#ffb3b3'});
const BALL = svg(outlined(raster([['e',8,8,6.6,6.6,'b'], ['e',8,12,5,1.6,'d'], ['e',5.5,5,1.6,1.6,'w']], 16, 16)), {o:INK, b:'#e5484d', d:'#b8343a', w:'#ffd0d0'});
const HEART = svg(outlined(raster([['e',5.2,5.3,3.7,3.5,'b'], ['e',10.8,5.3,3.7,3.5,'b'], ['t',1.6,6.3,14.4,6.3,8,12.6,'b'], ['e',4,4,1,1,'w']], 16, 14)), {o:INK, b:'#e5484d', d:'#b8343a', w:'#ffb3b3'});
const HAND = svg(outlined(raster([['r',6,3,27,13,'b'], ['e',8,15,2,5,'b'], ['e',13.4,16.2,2,5.6,'b'], ['e',18.8,16.2,2,5.6,'b'], ['e',24.2,15,2,5,'b'], ['e',28,9,2.6,3.8,'b']], 32, 24)), {o:INK, b:'#f2c9a0', d:'#d9a77c'});
const SUN = svg(raster([['r',15,1,17,6,'y'], ['r',15,26,17,31,'y'], ['r',1,15,6,17,'y'], ['r',26,15,31,17,'y'], ['e',6.5,6.5,1.4,1.4,'y'], ['e',25.5,6.5,1.4,1.4,'y'], ['e',6.5,25.5,1.4,1.4,'y'], ['e',25.5,25.5,1.4,1.4,'y'],
  ['e',16,16,8.4,8.4,'q'], ['e',16,16,7,7,'y'], ['e',13.6,13.4,2.2,1.6,'w']]), {y:'#ffe066', q:'#f2a81d', w:'#fff6b0'});
const TG = outlined(raster([['r',12,15,16,25,'t'], ['r',10.5,23,17.5,25,'t'], ['e',14,9,10,7.5,'b'], ['e',7.5,13,6,5,'b'], ['e',20.5,13,6.5,5,'b'], ['e',14,6,6.5,4.5,'b'],
  ['e',9.5,7.5,3.2,2.2,'l'], ['e',17,5,2.6,1.7,'l'], ['e',5.5,12,2,1.4,'l'], ['e',22,11.5,1.8,1.3,'l']], 28, 26));
const treePal = (b, d, l) => ({o:INK, b, d, l, t:'#8a5a32'});
const TREES = {summer: svg(TG, treePal('#3f9b4a', '#2f7d3a', '#7fd070')), spring: svg(TG, treePal('#6cc56a', '#4a9e48', '#ffc2d4')),
  autumn: svg(TG, treePal('#e08a2e', '#b2601b', '#f4c04e')), winter: svg(TG, treePal('#dfeaf0', '#b6c9d6', '#ffffff'))};
const TREE = TREES.summer;
const PENCIL = svg(['......oo', '.....oeo', '....oyo.', '...oyo..', '..oyo...', '.oppo...', '.opo....', '.oo.....'].map(r => [...r].map(c => c === '.' ? '' : c)), {o:INK, e:'#e5758a', y:'#f2b134', p:'#f2c9a0'});

// ---- finds (welcome-back items), moon and clouds
const item = (shapes, pal) => svg(outlined(raster(shapes, 16, 16)), Object.assign({o:INK}, pal));
const ACORN = item([['r',7.5,1.5,8.5,3.5,'t'], ['e',8,10,4.2,4.8,'b'], ['e',8,5.8,5.6,3.2,'t']], {b:'#d9a066', d:'#b07a44', t:'#7a4a2a'});
const FEATHER = item([['t',2.5,13.5,13,2,8.5,12.5,'b'], ['t',2.5,13.5,13,2,13.2,3.4,'d']], {b:'#8fd3ff', d:'#5aa9e0'});
const MUSH = item([['r',6,9,10,14.5,'s'], ['e',8,6.5,6.4,4.5,'b'], ['e',5.5,5.5,1.2,1.2,'w'], ['e',10.5,6,1.1,1.1,'w'], ['e',8,3.8,.9,.9,'w']], {b:'#e5484d', d:'#b8343a', s:'#f2e6d0', w:'#fff'});
const COIN = item([['e',8,8,6.2,6.2,'b'], ['e',8,8,4,4,'d'], ['e',6,6,1.2,1.2,'w']], {b:'#f2b705', d:'#d99a00', w:'#fff6b0'});
const GEM = item([['t',2,6,14,6,8,14.5,'b'], ['t',3.5,6,12.5,6,8,2,'l'], ['e',6.5,6.2,1,.8,'w']], {b:'#3cc8e8', d:'#2a9ab8', l:'#b8f0ff', w:'#fff'});
const MOON = svg(raster([['e',16,16,9,9,'y'], ['e',20.5,13.5,8,8,''], ['e',11.5,19,1.4,1.4,'d']]), {y:'#f6f1c9', d:'#d9d3a0'});
const CLOUD = svg(outlined(raster([['e',10,14,6,4,'b'], ['e',17,11,6,5,'b'], ['e',23,15,5,3.5,'b'], ['r',8,15,26,18,'b']], 32, 24)), {b:'#ffffff', d:'#dde6ef', o:'rgba(255,255,255,0)'});
