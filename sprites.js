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

function art(sp, st, sad){
  const c = SP[sp];
  const pal = {o:INK, k:INK, m:INK, w:'#fff', p:'#e8758a', y:'#f5d36b', a:c.d, b:c.b, d:c.d, l:c.l};
  let extra = '';
  if (st === 4) extra += '<rect x="6" y="10" width="4" height="2" fill="#f4f4f4"/>';
  if (sad) extra += '<rect x="4" y="8" width="1" height="2" fill="#6ec6ff"/>';
  return px(mir([...HEAD[sp], ...(sp === 'dragon' ? BODYD : BODY)]), pal, extra);
}
const EGG = px(mir(['.....ooo','...ooeee','..oeeeee','..oeesee','.oeeeeee','.oeeeeee','.oeeseee','oeeeeeee','oeeeeeee','oeeeseee','oeeeeeee','.oeeeeee','.oeeeeee','..oeeeee','...ooooo']), {o:INK, e:'#f4ead2', s:'#c98f5a'});
const APPLE = px(['....sg..','..oosoo.','.orrrrro','orrhrrro','orrrrrro','orrrrrro','.orrrrro','..oo.oo.'], {o:INK, r:'#e5484d', h:'#ff9a9a', s:'#6b4423', g:'#4aa05a'});
const BALL = px(['..oooo..','.orrrro.','orwwrrro','orwrrrro','orrrrrro','orrrrrro','.orrrro.','..oooo..'], {o:INK, r:'#e5484d', w:'#ffb3b3'});
const HEART = px(['.rr.rr.','rrrrrrr','rrrrrrr','.rrrrr.','..rrr..','...r...'], {r:'#e5484d'});
