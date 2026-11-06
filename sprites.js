// Pixel art: sprites are drawn as half-grids and mirrored, so every pet is perfectly symmetric.
const SP = {
  dog:    {n:'Dog',    b:'#c8915a', d:'#8a5a32', l:'#f1d9b5'},
  cat:    {n:'Cat',    b:'#f0a24a', d:'#b8702a', l:'#ffe2b8'},
  frog:   {n:'Frog',   b:'#62c06b', d:'#3d8f47', l:'#c8f0c4'},
  dragon: {n:'Dragon', b:'#8e76d6', d:'#5d48a8', l:'#d9ccff'}
};
const INK = '#1d1830';
function px(rows, pal, extra = ''){
  let r = '';
  rows.forEach((row, y) => [...row].forEach((c, x) => {
    if (pal[c]) r += `<rect x="${x}" y="${y}" width="1" height="1" fill="${pal[c]}"${c === 'm' ? ' class="m"' : ''}/>`;
  }));
  return `<svg viewBox="0 0 ${rows[0].length} ${rows.length}" shape-rendering="crispEdges">${r}${extra}</svg>`;
}
const mir = half => half.map(r => r + [...r].reverse().join(''));

// legend: o outline, b body, d shade, l light, k eye, w highlight, p nose, m mouth, y horn, a wing
const HEAD = {
  cat:    ['........','.oo.....','.obo....','.obboooo','.obbbbbb','obbbbbbb','obbkwbbb','obbkkbbb','obbbbbbp','obbbbbbm'],
  dog:    ['........','...ooooo','..obbbbb','.oobbbbb','odobbbbb','oddbkwbb','oddbkkbb','odobbbll','.oobbllk','..obbllm'],
  frog:   ['.oooo...','owwwwo..','owkkwo..','owkkwooo','.obbbbbb','obbbbbbb','obbbbbbb','obbbbbbb','obbbbkbb','obmmmmmm'],
  dragon: ['........','.yy.....','.oyo....','.obboooo','.obbbbbb','obbbbbbb','obbkwbbb','obbkkbbb','obbbbllk','obbbbllm']
};
const BODY  = ['.oobbbbb','.obbllll','.obbllll','.obbllll','.obbbbbb','.ooooooo'];
const BODYD = ['.oobbbbb','aobbllll','aobbllll','aobbllll','.obbbbbb','.ooooooo'];

function art(sp, st, sad, fly){
  const c = SP[sp];
  const pal = {o:INK, k:INK, m:INK, w:'#fff', p:'#e8758a', y:'#f5d36b', a:c.d, b:c.b, d:c.d, l:c.l};
  let extra = '';
  if (st === 4) extra += '<rect x="6" y="10" width="4" height="2" fill="#f4f4f4"/>';
  if (fly && sp === 'dragon') extra += wing(WU, 6, 'w1', c.d) + wing(WD, 9, 'w2', c.d);
  if (sad) extra += '<rect x="4" y="8" width="1" height="2" fill="#6ec6ff"/>';
  return px(mir([...HEAD[sp], ...(sp === 'dragon' ? BODYD : BODY)]), pal, extra);
}
const EGG = px(mir(['.....ooo','...ooeee','..oeeeee','..oeesee','.oeeeeee','.oeeeeee','.oeeseee','oeeeeeee','oeeeeeee','oeeeseee','oeeeeeee','.oeeeeee','.oeeeeee','..oeeeee','...ooooo']), {o:INK, e:'#f4ead2', s:'#c98f5a'});
const APPLE = px(['....sg..','..oosoo.','.orrrrro','orrhrrro','orrrrrro','orrrrrro','.orrrrro','..oo.oo.'], {o:INK, r:'#e5484d', h:'#ff9a9a', s:'#6b4423', g:'#4aa05a'});
const BALL = px(['..oooo..','.orrrro.','orwwrrro','orwrrrro','orrrrrro','orrrrrro','.orrrro.','..oooo..'], {o:INK, r:'#e5484d', w:'#ffb3b3'});
const HEART = px(['.rr.rr.','rrrrrrr','rrrrrrr','.rrrrr.','..rrr..','...r...'], {r:'#e5484d'});
const HAND = (() => {
  const top = '.' + 'o'.repeat(13), palm = '.o' + 's'.repeat(11) + 'o', fing = '.ossossossosso';
  return px([top, palm, palm, palm, fing, fing, fing, '..oo.oo.oo.oo.'], {o:INK, s:'#f2c9a0'});
})();
const PENCIL = px(['......oo','.....oeo','....oyo.','...oyo..','..oyo...','.oppo...','.opo....','.oo.....'], {o:INK, e:'#e5758a', y:'#f2b134', p:'#f2c9a0'});
const SUN = (() => {
  const n = 16, c = 7.5, rows = [];
  for (let y = 0; y < n; y++) { let r = ''; for (let x = 0; x < n; x++) {
    const d = Math.hypot(x - c, y - c), a = Math.abs(x - c), b = Math.abs(y - c);
    r += d <= 4 ? 'y' : d <= 5.2 ? 'o' : (d > 6.3 && d <= 8 && (a < 1.1 || b < 1.1 || Math.abs(a - b) < 1.1)) ? 'r' : '.';
  } rows.push(r) }
  return px(rows, {y:'#ffe066', o:'#f2a81d', r:'#ffd84a'});
})();
const TREE = px(mir(['.....oo','...oogg','..oghhg','.oghhgg','.oggggg','oggghgg','ogggddd','.ogggdd','..ooddd','....ott','....ott','....ott','...ottt']), {o:INK, g:'#3f9b4a', h:'#62bf62', d:'#2f7d3a', t:'#8a5a32'});

// wings for a flying dragon: two frames that swap, drawn outside the 16x16 body on both sides
const WU = ['x...', 'xx..', 'xxx.', 'xxxx', '.xxx', '...x'], WD = ['...x', '.xxx', 'xxxx', 'xxx.', 'xx..', 'x...'];
function wing(rows, y0, cls, col){
  let r = '';
  rows.forEach((row, j) => [...row].forEach((ch, i) => { if (ch === 'x') { const x = -4 + i; r += `<rect x="${x}" y="${y0 + j}" width="1" height="1"/><rect x="${15 - x}" y="${y0 + j}" width="1" height="1"/>` } }));
  return `<g class="${cls}" fill="${col}">${r}</g>`;
}
