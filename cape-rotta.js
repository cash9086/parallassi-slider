/* parallassi-slider — cape-rotta.js
   La sezione fra lo studio e cape-open: due righe di città e coordinate
   ricalcate a schizzo, che scorrono in versi opposti, e un bottone in
   mezzo. Gira da sola: se in pagina non c'è .cape-rotta esce subito.

   COSA SUCCEDE
   1. Finché la sezione non è in vista le righe sono vuote e il bottone sta
      nascosto sotto il proprio bordo.
   2. Quando le due righe sono in vista — una volta sola in tutta la vita
      della pagina — la matita le disegna: la riga alta dal bordo destro
      verso sinistra, quella bassa al contrario. Nello stesso istante il
      bottone sale da dietro il proprio bordo.
   3. Finito il disegno le righe partono piano e scorrono: l'alta verso
      sinistra, la bassa verso destra. Lo scroll le spinge, ognuna nel suo
      verso, e poi tornano lente.
   4. Il bottone rifà la sua tendina ogni volta che esce e rientra.

   IL MARKUP — tutto nel Designer
     .cape-rotta                     la sezione
       .cape-rotta-riga.is-alto      le voci della riga, in fila
         (un testo)                  una città, una coordinata: font, corpo,
                                     colore e spaziatura dal pannello
         .cape-rotta-segno.is-stella un segno fra due voci: un div vuoto
         .cape-rotta-segno.is-croce
       .cape-rotta-cta               il contenitore del bottone
         a.link-uni                  il bottone, testo e link a scelta
       .cape-rotta-riga.is-basso     come quella alta
   Lo spazio fra una voce e l'altra è il gap della riga. La misura dei segni
   è larghezza e altezza di .cape-rotta-segno; se non le dai, sono mezzo
   corpo del testo.

   IL TESTO NON È UNA COPIA. Il codice non conosce il font: guarda il testo
   come il browser lo ha appena disegnato, con il font, il corpo e la
   spaziatura del Designer, e ne ricalca i contorni a mano libera. Cambi
   font nel Designer e cambia anche lo schizzo. Il testo vero resta dov'è,
   trasparente: per Google e per i lettori di schermo non cambia niente.
   Se il ricalco non torna con il testo vero — un font che non arriva, un
   browser vecchio — quella voce resta testo e compare in dissolvenza.

   NIENTE DIPENDENZE: niente GSAP, niente jQuery, niente font da scaricare.
   Lo scroll si legge da window.scrollY, che Lenis tiene aggiornato.

   VA IN PAGINA: un tag <script defer> nel footer, in PARTE 2.
*/
(function(){
'use strict';

/* ── le manopole ─────────────────────────────────────────────────────── */

var TRATTO     = 0.018; /* spessore della matita, in frazioni del corpo del
                           testo: su un corpo di 56px è un pixel.         */
var TRATTO_PX  = 0.9;   /* ...ma mai sotto questo, in pixel: su un corpo
                           piccolo il tratto diventerebbe grigio.         */
var SCHIZZO    = 0.035; /* quanto la mano esce dal segno, sempre in
                           frazioni del corpo. 0 è un ricalco preciso,
                           0.05 comincia a non leggersi più.              */
var PASSATE    = 3;     /* quante volte la mano ripassa ogni contorno di
                           una lettera. 1 è un ricalco pulito.            */
var PASSATE_SEGNI = 3;  /* e ogni segno, che è piccolo e regge di più.    */
var RIPASSO    = 0.8;   /* opacità delle passate dopo la prima.           */

var SPAZZATA   = 1.6;   /* secondi che la matita impiega ad attraversare lo
                           schermo, da un bordo all'altro.                */
var VELOCITA_MATITA = 0.0012; /* secondi per pixel di tratto: una voce lunga
                           si scrive in più tempo di una corta...         */
var TRATTO_MIN = 0.5, TRATTO_MAX = 1.6; /* ...ma mai meno né più di così. */

var VELOCITA   = 2.6;   /* crociera, in vw al secondo.                    */
var PARTENZA   = 1.8;   /* secondi per arrivare in crociera da fermi.     */
var SPINTA     = 0.16;  /* quanta velocità presta lo scroll: scrollando a
                           1000px al secondo le righe ne guadagnano 160.  */
var SPINTA_MAX = 7;     /* la spinta non supera questo multiplo della
                           crociera, per quanto forte si scrolli.         */
var RIPOSO     = 0.55;  /* secondi in cui la spinta si spegne.            */

var SOGLIA     = 0.9;   /* quanta parte delle due righe deve essere in vista
                           perché la matita parta.                        */

/* La tendina del bottone. Sono i numeri della tendina che c'è già nel
   footer della pagina, e la curva è la stessa: se cambiano là, vanno
   cambiati anche qui. */
var DUR        = 1000;
var START_V    = 0.80;
var EASE       = 'cubic-bezier(.16,1,.3,1)';

/* L'invito del bottone: quando è fermo al suo posto, ogni tanto le lettere
   prendono un filo d'aria una dopo l'altra, da sinistra a destra, come
   un'onda che passa, e tornano. Deve quasi non vedersi. */
var INVITO_OGNI  = 7;     /* secondi fra un invito e l'altro              */
var INVITO_PRIMO = 3.5;   /* il primo, dopo che il bottone è salito       */
var INVITO_EM    = 0.08;  /* quanto si apre ogni lettera, in em           */
var INVITO_DUR   = 1.1;   /* secondi di una lettera: apertura e ritorno   */
var INVITO_PASSO = 0.05;  /* secondi fra una lettera e la successiva      */

/* ── da qui in giù non ci sono numeri da girare ──────────────────────── */

var SEZ   = '.cape-rotta';
var RIGA  = '.cape-rotta-riga';
var CTA   = '.cape-rotta-cta';
var SEGNO = 'cape-rotta-segno';

/* I segni, in un quadrato di lato 1. La stella è fatta di curve (q: punto,
   controllo, punto, controllo...), la croce di due linee. */
var SEGNI = {
  stella: [{ chiuso: true, q: [[.5,0],[.555,.445],[1,.5],[.555,.555],[.5,1],[.445,.555],[0,.5],[.445,.445],[.5,0]] }],
  croce:  [{ chiuso: false, l: [[.14,.14],[.86,.86]] }, { chiuso: false, l: [[.86,.14],[.14,.86]] }]
};


/* ══ piccoli attrezzi ═══════════════════════════════════════════════════ */

function prng(seme){
  return function(){
    seme |= 0; seme = seme + 0x6D2B79F5 | 0;
    var t = Math.imul(seme ^ seme >>> 15, 1 | seme);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function semeDi(s){
  var h = 2166136261;
  for(var i = 0; i < s.length; i++){ h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h | 0;
}

function f1(n){ return Math.round(n * 10) / 10; }

function lunghezza(P, chiuso){
  var L = 0;
  for(var i = 1; i < P.length; i++) L += Math.hypot(P[i][0] - P[i-1][0], P[i][1] - P[i-1][1]);
  if(chiuso && P.length > 1) L += Math.hypot(P[0][0] - P[P.length-1][0], P[0][1] - P[P.length-1][1]);
  return L;
}

/* Ripercorre una spezzata a passi regolari. */
function ricampiona(P, chiuso, passo){
  var Q = P.slice();
  if(chiuso) Q.push(P[0]);
  var acc = [0];
  for(var i = 1; i < Q.length; i++) acc.push(acc[i-1] + Math.hypot(Q[i][0] - Q[i-1][0], Q[i][1] - Q[i-1][1]));
  var L = acc[acc.length - 1];
  if(!(L > 0)) return { p: P.slice(), len: 0 };
  var n = Math.max(chiuso ? 6 : 2, Math.round(L / passo)), out = [], j = 0;
  for(var k = 0; k < (chiuso ? n : n + 1); k++){
    var t = L * k / n;
    while(j < acc.length - 2 && acc[j + 1] < t) j++;
    var u = (t - acc[j]) / ((acc[j + 1] - acc[j]) || 1);
    out.push([Q[j][0] + (Q[j+1][0] - Q[j][0]) * u, Q[j][1] + (Q[j+1][1] - Q[j][1]) * u]);
  }
  return { p: out, len: L };
}

/* Toglie i punti che non servono: un tratto dritto resta due punti. */
function sfoltisci(P, eps){
  if(P.length < 3) return P;
  var tieni = new Uint8Array(P.length), pila = [[0, P.length - 1]];
  tieni[0] = tieni[P.length - 1] = 1;
  while(pila.length){
    var s = pila.pop(), a = P[s[0]], b = P[s[1]], dx = b[0] - a[0], dy = b[1] - a[1];
    var dl = Math.hypot(dx, dy) || 1, max = 0, idx = -1;
    for(var i = s[0] + 1; i < s[1]; i++){
      var d = Math.abs((P[i][0] - a[0]) * dy - (P[i][1] - a[1]) * dx) / dl;
      if(d > max){ max = d; idx = i; }
    }
    if(max > eps && idx > 0){ tieni[idx] = 1; pila.push([s[0], idx], [idx, s[1]]); }
  }
  return P.filter(function(_, i){ return tieni[i]; });
}


/* ══ il ricalco ═════════════════════════════════════════════════════════
   Il testo viene ridisegnato su una tela nascosta, grande qualche volta
   il vero, con lo stesso font del Designer. Dalla tela si leggono i
   contorni delle lettere — con i bordi interpolati, quindi curve morbide e
   non scalini — e quei contorni diventano i tratti che la matita ripassa. */

var BUF = { k: 0, n1: null, n2: null, vis: null };

function contorni(al, W, H, iso){
  var K = W * H * 2;
  if(K > BUF.k){
    BUF.k = K; BUF.n1 = new Int32Array(K); BUF.n2 = new Int32Array(K); BUF.vis = new Uint8Array(K);
  }
  var n1 = BUF.n1, n2 = BUF.n2, vis = BUF.vis, usati = [];
  n1.fill(-1, 0, K); n2.fill(-1, 0, K); vis.fill(0, 0, K);

  /* solo il rettangolo in cui c'è inchiostro: il resto della tela è vuoto */
  var x0 = W, x1 = -1, y0 = H, y1 = -1, x, y, i;
  for(y = 0; y < H; y++){
    var r = y * W;
    for(x = 0; x < W; x++){
      if(al[r + x]){
        if(x < x0) x0 = x;
        if(x > x1) x1 = x;
        if(y < y0) y0 = y;
        y1 = y;
      }
    }
  }
  if(x1 < 0) return [];
  x0 = Math.max(0, x0 - 1); y0 = Math.max(0, y0 - 1);
  x1 = Math.min(W - 2, x1); y1 = Math.min(H - 2, y1);

  function lega(a, b){
    if(n1[a] < 0){ n1[a] = b; usati.push(a); } else n2[a] = b;
    if(n1[b] < 0){ n1[b] = a; usati.push(b); } else n2[b] = a;
  }
  for(y = y0; y <= y1; y++){
    for(x = x0; x <= x1; x++){
      i = y * W + x;
      var a0 = al[i], a1 = al[i + 1], a2 = al[i + W + 1], a3 = al[i + W];
      var c = (a0 > iso ? 8 : 0) | (a1 > iso ? 4 : 0) | (a2 > iso ? 2 : 0) | (a3 > iso ? 1 : 0);
      if(c === 0 || c === 15) continue;
      var T = i * 2, R = (i + 1) * 2 + 1, B = (i + W) * 2, L = i * 2 + 1;
      var centro = (a0 + a1 + a2 + a3) / 4 > iso;
      switch(c){
        case 1: case 14: lega(L, B); break;
        case 2: case 13: lega(B, R); break;
        case 3: case 12: lega(L, R); break;
        case 4: case 11: lega(T, R); break;
        case 6: case 9:  lega(T, B); break;
        case 7: case 8:  lega(L, T); break;
        case 5:  if(centro){ lega(L, T); lega(B, R); } else { lega(L, B); lega(T, R); } break;
        case 10: if(centro){ lega(T, R); lega(L, B); } else { lega(L, T); lega(B, R); } break;
      }
    }
  }

  /* il punto esatto in cui il bordo attraversa il lato della cella */
  function punto(k){
    var j = k >> 1, px = j % W, py = (j - px) / W, a = al[j], b, t;
    if(k & 1){ b = al[j + W]; t = (iso - a) / ((b - a) || 1e-6); return [px + 0.5, py + t + 0.5]; }
    b = al[j + 1]; t = (iso - a) / ((b - a) || 1e-6);
    return [px + t + 0.5, py + 0.5];
  }

  var out = [];
  for(var u = 0; u < usati.length; u++){
    var cur = usati[u];
    if(vis[cur]) continue;
    var poly = [], prima = -1;
    while(cur >= 0 && !vis[cur]){
      vis[cur] = 1;
      poly.push(punto(cur));
      var nx = n1[cur] !== prima ? n1[cur] : n2[cur];
      prima = cur; cur = nx;
    }
    if(poly.length > 2) out.push(poly);
  }
  return out;
}

var avvisato = false;
function avvisa(msg){
  if(avvisato) return;
  avvisato = true;
  try{ console.warn('[rotta] ' + msg); }catch(e){}
}

function testoVisto(el, cs){
  var t = el.textContent.replace(/\s+/g, ' ').trim();
  var tt = cs.textTransform;
  if(tt === 'uppercase') t = t.toUpperCase();
  else if(tt === 'lowercase') t = t.toLowerCase();
  else if(tt === 'capitalize') t = t.replace(/(^|\s)(\S)/g, function(_, a, b){ return a + b.toUpperCase(); });
  return t;
}

/* Restituisce i contorni del testo di el, in pixel, con l'origine
   nell'angolo in alto a sinistra di el. Oppure null se il ricalco non
   combacia con il testo vero. */
function ricalca(el){
  var cs = getComputedStyle(el);
  var testo = testoVisto(el, cs);
  if(!testo) return null;
  var corpo = parseFloat(cs.fontSize) || 16;
  var ls = parseFloat(cs.letterSpacing) || 0;

  var rg = document.createRange();
  rg.selectNodeContents(el);
  var rt = rg.getBoundingClientRect(), re = el.getBoundingClientRect();
  if(!rt.width || !rt.height) return null;

  var S = Math.max(1.5, Math.min(3, 90 / corpo));
  var font = cs.fontStyle + ' ' + cs.fontWeight + ' ' + (corpo * S) + 'px ' + cs.fontFamily;
  var cv = document.createElement('canvas'), cx = cv.getContext('2d', { willReadFrequently: true });
  var perLettera = !('letterSpacing' in cx) && ls !== 0;

  function prepara(){
    cx.font = font;
    if(!perLettera && ls) cx.letterSpacing = (ls * S) + 'px';
    try{ cx.fontKerning = cs.fontKerning === 'none' ? 'none' : 'normal'; }catch(e){}
  }
  prepara();

  var m = cx.measureText(testo);
  var largo = m.width;
  if(perLettera){
    largo = 0;
    for(var q = 0; q < testo.length; q++) largo += cx.measureText(testo[q]).width + ls * S;
  }
  var sx = (rt.width * S) / (largo || 1);
  if(Math.abs(sx - 1) > 0.04){
    avvisa('il ricalco di "' + testo + '" non combacia con il testo vero (' +
           Math.round((sx - 1) * 100) + '%): quella voce resta testo.');
    return null;
  }

  var asc = m.fontBoundingBoxAscent || corpo * S * 0.8;
  var desc = m.fontBoundingBoxDescent || corpo * S * 0.25;
  var pad = Math.ceil(corpo * S * 0.3);
  var W = Math.ceil(largo + pad * 2), H = Math.ceil(asc + desc + pad * 2);
  cv.width = W; cv.height = H;
  prepara();
  cx.textBaseline = 'alphabetic';
  cx.fillStyle = '#000';
  if(perLettera){
    var xx = pad;
    for(var r = 0; r < testo.length; r++){
      cx.fillText(testo[r], xx, pad + asc);
      xx += cx.measureText(testo[r]).width + ls * S;
    }
  } else {
    cx.fillText(testo, pad, pad + asc);
  }

  var dati = cx.getImageData(0, 0, W, H).data, al = new Uint8Array(W * H);
  for(var i = 0; i < W * H; i++) al[i] = dati[i * 4 + 3];
  var grezzi = contorni(al, W, H, 127.5);

  /* dalla tela al testo vero: stessa linea di base, stessa partenza */
  var ox = rt.left - re.left, base = (rt.top - re.top) + asc / S;
  var out = [];
  grezzi.forEach(function(poly){
    var p = poly.map(function(a){ return [ox + (a[0] - pad) / S * sx, base + (a[1] - pad - asc) / S]; });
    if(lunghezza(p, true) < 1) return;
    out.push({ p: p, chiuso: true });
  });
  if(!out.length) return null;
  return { contorni: out, corpo: corpo, colore: cs.color, w: el.offsetWidth, h: el.offsetHeight, testo: testo };
}


/* ══ la mano ════════════════════════════════════════════════════════════
   Un contorno pulito diventa più passate a mano libera: ognuna trema un
   poco, è appena spostata rispetto all'altra, e i giri chiusi non si
   chiudono dove sono partiti ma vanno un po' oltre, come fa una penna che
   non si stacca in tempo. */

function schizzo(c, opt, rnd){
  var base = ricampiona(c.p, c.chiuso, opt.passo);
  var P = base.p, L = base.len, out = [];
  if(P.length < 2 || !(L > 0)) return out;
  var cx0 = 0, cy0 = 0;
  P.forEach(function(a){ cx0 += a[0]; cy0 += a[1]; });
  cx0 /= P.length; cy0 /= P.length;

  for(var ps = 0; ps < opt.passate; ps++){
    var A = opt.amp * (ps === 0 ? 0.55 : 1);
    var dx = ps ? (rnd() - 0.5) * 1.6 * opt.amp : 0, dy = ps ? (rnd() - 0.5) * 1.6 * opt.amp : 0;
    var sc = ps ? 1 + (rnd() - 0.5) * 0.03 : 1;
    var w1 = 2 * Math.PI / (opt.onda * (0.8 + rnd() * 0.7)), w2 = 2 * Math.PI / (opt.onda * (0.25 + rnd() * 0.2));
    var h1 = rnd() * 6.28, h2 = rnd() * 6.28, Q = [];

    if(c.chiuso){
      var n = P.length, start = Math.floor(rnd() * n);
      var oltre = Math.round(n * Math.min(ps ? 0.06 + rnd() * 0.08 : 0.025, opt.oltreMax / L));
      for(var k = 0; k <= n + oltre; k++) Q.push(P[(start + k) % n]);
    } else {
      var e = ps ? opt.oltreMax * (0.3 + rnd() * 0.7) : opt.oltreMax * 0.2;
      var a0 = P[0], a1 = P[1], b0 = P[P.length - 1], b1 = P[P.length - 2];
      var u0 = [a0[0] - a1[0], a0[1] - a1[1]], l0 = Math.hypot(u0[0], u0[1]) || 1;
      var u1 = [b0[0] - b1[0], b0[1] - b1[1]], l1 = Math.hypot(u1[0], u1[1]) || 1;
      var e1 = e * (0.4 + rnd());
      Q.push([a0[0] + u0[0] / l0 * e, a0[1] + u0[1] / l0 * e]);
      Q = Q.concat(P);
      Q.push([b0[0] + u1[0] / l1 * e1, b0[1] + u1[1] / l1 * e1]);
    }

    var R = [], s = 0;
    for(var i = 0; i < Q.length; i++){
      if(i) s += Math.hypot(Q[i][0] - Q[i-1][0], Q[i][1] - Q[i-1][1]);
      var pa = Q[Math.max(0, i - 1)], pb = Q[Math.min(Q.length - 1, i + 1)];
      var nx = -(pb[1] - pa[1]), ny = pb[0] - pa[0], nl = Math.hypot(nx, ny) || 1;
      var off = A * (0.7 * Math.sin(s * w1 + h1) + 0.3 * Math.sin(s * w2 + h2));
      R.push([cx0 + (Q[i][0] - cx0) * sc + dx + nx / nl * off,
              cy0 + (Q[i][1] - cy0) * sc + dy + ny / nl * off]);
    }
    R = sfoltisci(R, opt.eps);
    var d = 'M' + f1(R[0][0]) + ',' + f1(R[0][1]);
    var mx = R[0][0];
    for(var j = 1; j < R.length; j++){ d += 'L' + f1(R[j][0]) + ',' + f1(R[j][1]); mx += R[j][0]; }
    out.push({ d: d, len: lunghezza(R, false), x: mx / R.length, ps: ps });
  }
  return out;
}

/* Tutte le passate dello stesso giro diventano un tracciato solo: la
   matita lo percorre da un pezzo al successivo, quindi le lettere si
   scrivono una dopo l'altra, e il browser anima pochi tracciati invece di
   centinaia. */
function unisci(tratti){
  var giri = [];
  tratti.forEach(function(t){
    var g = giri[t.ps] || (giri[t.ps] = { d: '', len: 0, x: 0, n: 0, ps: t.ps });
    g.d += t.d; g.len += t.len; g.x += t.x; g.n++;
  });
  return giri.filter(Boolean).map(function(g){ g.x /= g.n; return g; });
}

function svg(tratti, w, h, colore, spessore){
  var html = '';
  unisci(tratti).forEach(function(t){
    html += '<path d="' + t.d + '" pathLength="1" data-l="' + Math.round(t.len) + '" data-x="' + f1(t.x) + '"' +
      (t.ps ? ' data-r="' + t.ps + '" stroke-width="' + Math.round(spessore * 65) / 100 + '" opacity="' + RIPASSO + '"'
            : ' stroke-width="' + Math.round(spessore * 100) / 100 + '"') + '/>';
  });
  return '<svg class="cape-rotta-tratto" width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h +
    '" aria-hidden="true" focusable="false"><g fill="none" stroke="' + colore +
    '" stroke-linecap="round" stroke-linejoin="round">' + html + '</g></svg>';
}

function segno(el){
  el.innerHTML = '';
  var w = el.offsetWidth, h = el.offsetHeight;
  if(!w || !h) return;
  var cs = getComputedStyle(el), corpo = parseFloat(cs.fontSize) || 16;
  var forma = el.classList.contains('is-croce') ? 'croce' : 'stella';
  var rnd = prng(semeDi(forma + w + 'x' + h + (el._rottaN || 0)));
  var m = Math.min(w, h), tratti = [];
  SEGNI[forma].forEach(function(s){
    var p = [];
    if(s.q){
      for(var i = 0; i + 2 < s.q.length; i += 2){
        for(var t = (i ? 1 : 0); t <= 8; t++){
          var u = t / 8, a = s.q[i], b = s.q[i+1], c = s.q[i+2];
          p.push([((1-u)*(1-u)*a[0] + 2*(1-u)*u*b[0] + u*u*c[0]) * w,
                  ((1-u)*(1-u)*a[1] + 2*(1-u)*u*b[1] + u*u*c[1]) * h]);
        }
      }
      p.pop();
    } else {
      p = s.l.map(function(a){ return [a[0] * w, a[1] * h]; });
    }
    tratti = tratti.concat(schizzo({ p: p, chiuso: s.chiuso }, {
      passo: 1.5, passate: PASSATE_SEGNI, amp: m * 0.07, onda: m * 0.9, oltreMax: m * 0.2, eps: 0.2
    }, rnd));
  });
  el.innerHTML = svg(tratti, w, h, cs.color, Math.max(TRATTO_PX, corpo * TRATTO));
}

function schizzaTesto(el, r){
  [].forEach.call(el.querySelectorAll('.cape-rotta-tratto'), function(t){ t.parentNode.removeChild(t); });
  if(!r){ el.classList.remove('is-schizzo'); el.classList.add('is-piano'); return; }
  el.classList.remove('is-piano');
  var rnd = prng(semeDi(r.testo + r.corpo));
  var tratti = [];
  r.contorni.sort(function(a, b){ return a.p[0][0] - b.p[0][0]; }).forEach(function(c){
    tratti = tratti.concat(schizzo(c, {
      passo: Math.max(1, r.corpo * 0.03), passate: PASSATE, amp: r.corpo * SCHIZZO,
      onda: r.corpo * 0.9, oltreMax: r.corpo * 0.2, eps: 0.18
    }, rnd));
  });
  el.insertAdjacentHTML('beforeend', svg(tratti, r.w, r.h, r.colore, Math.max(TRATTO_PX, r.corpo * TRATTO)));
  el.classList.add('is-schizzo');
}


/* ══ il vestito ═════════════════════════════════════════════════════════ */

function vesti(){
  if(document.getElementById('cape-rotta-css')) return;
  var st = document.createElement('style');
  st.id = 'cape-rotta-css';
  st.textContent = [
    /* La riga deve essere larga quanto la sezione, qualunque sia
       l'allineamento nel Designer: con Align center si allargherebbe quanto
       il nastro, migliaia di pixel, e finirebbe centrata fuori schermo. */
    '.cape-rotta-riga{overflow-x:clip;overflow-y:visible;align-self:stretch;width:auto;min-width:0;max-width:100%;' +
      'display:flex;justify-content:flex-start;flex-wrap:nowrap}',
    /* Il nastro parte sempre dal bordo sinistro della riga. Con Justify
       center nel Designer verrebbe centrato: è migliaia di pixel più largo
       dello schermo, e sborderebbe da tutte e due le parti. */
    '.cape-rotta-nastro{flex:0 0 auto;margin:0;align-self:center}',
    '.cape-rotta-nastro{display:flex;width:max-content;will-change:transform}',
    '.cape-rotta-giro{display:flex;flex:none}',
    '.cape-rotta-giro>*{flex:none;white-space:nowrap;position:relative}',
    ':where(.cape-rotta-segno){width:.55em;height:.55em}',
    '.cape-rotta-tratto{position:absolute;left:0;top:0;overflow:visible;pointer-events:none}',
    '.cape-rotta-segno>.cape-rotta-tratto{position:static;display:block}',
    '.cape-rotta-giro>.is-schizzo{color:transparent;-webkit-text-fill-color:transparent}',
    '.cape-rotta.is-armed .cape-rotta-giro>*{visibility:hidden}',
    '.cape-rotta-cta .cape-ln{display:block}',
    '.cape-rotta-cta.is-armed{clip-path:inset(-0.14em -100% -0.14em -100%)}'
  ].join('');
  document.head.appendChild(st);
}


/* ══ il meccanismo ══════════════════════════════════════════════════════ */

function init(){
  var sez = document.querySelector(SEZ);
  if(!sez) return;
  var righe = [].slice.call(sez.querySelectorAll(RIGA));
  if(!righe.length) return;
  var cta = sez.querySelector(CTA);
  /* Se il bottone sta direttamente nella sezione, senza contenitore, glielo
     si fa: la tendina ha bisogno di un bordo dietro cui nascondersi. Il
     contenitore prende il posto del bottone nella colonna della sezione. */
  if(!cta){
    var solo = null;
    [].forEach.call(sez.children, function(c){
      if(!solo && !c.matches(RIGA) && (c.matches('a, button') || c.querySelector('a, button'))) solo = c;
    });
    if(solo){
      var cs0 = getComputedStyle(solo);
      cta = document.createElement('div');
      cta.className = 'cape-rotta-cta';
      var as = cs0.alignSelf;
      if(as === 'auto' || as === 'normal') as = getComputedStyle(sez).alignItems;
      cta.style.alignSelf = (as === 'normal' || as === 'stretch') ? 'center' : as;
      cta.style.margin = cs0.margin;
      solo.style.margin = '0';
      solo.parentNode.insertBefore(cta, solo);
      cta.appendChild(solo);
    }
  }

  var ridotto = false;
  try{ ridotto = matchMedia('(prefers-reduced-motion: reduce)').matches; }catch(e){}

  vesti();
  if(!ridotto) sez.classList.add('is-armed');

  /* Le voci del Designer restano le stesse: vengono solo spostate dentro
     un giro, e il giro viene copiato quante volte serve a coprire la riga.
     Il nastro si sposta di un giro e poi ricomincia, e il salto non si vede
     perché ricomincia uguale. */
  var nastri = righe.map(function(r){
    var nastro = document.createElement('div'), giro = document.createElement('div');
    nastro.className = 'cape-rotta-nastro';
    giro.className = 'cape-rotta-giro';
    var voci = [].slice.call(r.children);
    voci.forEach(function(v, i){ v._rottaN = i; giro.appendChild(v); });
    nastro.appendChild(giro);
    r.appendChild(nastro);
    return { riga: r, nastro: nastro, giro: giro, voci: voci,
             verso: r.classList.contains('is-basso') ? 1 : -1, pos: 0, x: null, largo: 1 };
  });

  function posa(n){
    var x = ((n.pos % n.largo) + n.largo) % n.largo - n.largo;
    x = Math.round(x * 100) / 100;
    if(x === n.x) return;
    n.x = x;
    n.nastro.style.transform = 'translate3d(' + x + 'px,0,0)';
  }

  /* Il lavoro si fa a pezzi — una voce per volta, nei momenti in cui il
     browser non ha altro da fare — così mentre scrolli non si sente. Una
     voce costa qualche millesimo; tutte insieme, su un telefono, farebbero
     un singhiozzo lungo. */
  var coda = [], lavorando = false;
  var ozio = window.requestIdleCallback || function(f){ return setTimeout(f, 16); };

  function aggiungi(fn){
    coda.push(fn);
    if(!lavorando){ lavorando = true; ozio(turno, { timeout: 250 }); }
  }

  function turno(){
    var t0 = performance.now();
    while(coda.length && performance.now() - t0 < 10) coda.shift()();
    if(coda.length) ozio(turno, { timeout: 250 });
    else lavorando = false;
  }

  /* Una voce alla volta, e le copie del giro solo alla fine: fino ad
     allora restano quelle di prima, quindi un ricalco dopo un resize non
     lascia mai la riga a metà. */
  function monta(n, fatto){
    aggiungi(function(){
      var cs = getComputedStyle(n.riga);
      var gap = cs.columnGap && cs.columnGap !== 'normal' ? cs.columnGap : '0.6em';
      n.giro.style.gap = gap;
      n.giro.style.paddingRight = gap;
      n.giro.style.alignItems = cs.alignItems && cs.alignItems !== 'normal' ? cs.alignItems : 'center';
    });
    /* per ogni testo due pezzi: prima il ricalco, poi la mano */
    n.voci.forEach(function(v){
      var r = null, rotto = false;
      function guasto(){
        rotto = true;
        v.classList.remove('is-schizzo');
        v.classList.add('is-piano');
        avvisa('una voce non si è potuta ricalcare: resta com\'è.');
      }
      if(v.classList.contains(SEGNO)){
        aggiungi(function(){ try{ segno(v); }catch(e){ guasto(); } });
        return;
      }
      aggiungi(function(){ try{ r = ricalca(v); }catch(e){ guasto(); } });
      aggiungi(function(){ if(!rotto){ try{ schizzaTesto(v, r); }catch(e){ guasto(); } } });
    });
    aggiungi(function(){
      while(n.nastro.children.length > 1) n.nastro.removeChild(n.nastro.lastChild);
      n.w = n.riga.clientWidth;
      n.h = n.riga.clientHeight;
      n.largo = n.giro.getBoundingClientRect().width || 1;
      var copie = Math.ceil(Math.max(n.w, window.innerWidth) / n.largo) + 2;
      for(var i = 1; i < copie; i++){
        var c = n.giro.cloneNode(true);
        c.setAttribute('aria-hidden', 'true');
        [].forEach.call(c.querySelectorAll('a, button, [tabindex]'), function(a){ a.setAttribute('tabindex', '-1'); });
        n.nastro.appendChild(c);
      }
      n.x = null;
      posa(n);
      if(fatto) fatto();
    });
  }

  var pronti = false;

  /* Il ricalco guarda il testo come il browser lo disegna: quindi aspetta
     che il font del Designer sia arrivato. Se non arriva entro qualche
     secondo si ricalca lo stesso, e il controllo dentro ricalca() decide
     voce per voce. */
  function quandoFont(fatto){
    var fonti = {}, attese = [];
    nastri.forEach(function(n){
      n.voci.forEach(function(v){
        if(v.classList.contains(SEGNO)) return;
        var cs = getComputedStyle(v);
        fonti[cs.fontStyle + ' ' + cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily] = testoVisto(v, cs);
      });
    });
    if(document.fonts && document.fonts.load){
      for(var f in fonti) attese.push(document.fonts.load(f, fonti[f]).catch(function(){}));
    }
    var chiuso = false;
    function una(){ if(chiuso) return; chiuso = true; fatto(); }
    Promise.all(attese).then(una, una);
    setTimeout(una, 4000);
  }

  var vivo = false, girando = false, avviato = false;

  /* Si comincia a ricalcare quando mancano tre schermate alla sezione:
     prima è lavoro che nessuno vedrà, e all'inizio della pagina il browser
     ha già il suo da fare con l'hero. */
  new IntersectionObserver(function(es, io){
    if(!es[0].isIntersecting || avviato) return;
    avviato = true;
    io.disconnect();
    quandoFont(function(){
      var restano = nastri.length;
      nastri.forEach(function(n){
        monta(n, function(){ if(--restano === 0){ pronti = true; sveglia(); } });
      });
    });
  }, { rootMargin: '300% 0px' }).observe(sez);

  /* Si ricalca solo se la riga ha cambiato misura: su un telefono la barra
     del browser che entra ed esce manda un resize a ogni scroll, e cambia
     solo l'altezza della finestra, non quella delle righe. */
  var rT = null;
  addEventListener('resize', function(){
    clearTimeout(rT);
    rT = setTimeout(function(){
      if(!pronti) return;
      nastri.forEach(function(n){
        if(n.riga.clientWidth === n.w && n.riga.clientHeight === n.h) return;
        monta(n);
      });
    }, 180);
  }, { passive: true });

  window.capeRotta = { stato: function(){ return { pronti: pronti, ridotto: ridotto }; } };

  if(ridotto) return;

  /* ── la tendina del bottone ─────────────────────────────────────────
     La stessa del footer: il contenuto scivola dentro una .cape-ln, il
     contenitore fa da bordo e lo tiene nascosto finché è armato. */
  var slitta = null, corsa = null, armato = false;
  if(cta){
    slitta = document.createElement('span');
    slitta.className = 'cape-ln';
    while(cta.firstChild) slitta.appendChild(cta.firstChild);
    cta.appendChild(slitta);
    cta.classList.add('cape-rise');
  }

  function giu(w){
    var h = 0;
    try{
      var box = w.parentNode;
      h = Math.max(box ? box.getBoundingClientRect().height : 0, w.getBoundingClientRect().height);
    }catch(e){}
    return h > 0 ? Math.ceil(h * 1.25 + 12) + 'px' : '135%';
  }

  function arma(){
    if(!slitta) return;
    if(corsa){ try{ corsa.cancel(); }catch(e){} corsa = null; }
    cta.classList.add('is-armed');
    slitta.style.transform = 'translateY(' + giu(slitta) + ')';
    armato = true;
    prossimoInvito = 0;
  }

  function sali(){
    if(!slitta || !armato) return;
    armato = false;
    var a = slitta.animate([{ transform: 'translateY(' + giu(slitta) + ')' }, { transform: 'translateY(0)' }],
                           { duration: DUR, easing: EASE, fill: 'both' });
    corsa = a;
    a.onfinish = function(){
      slitta.style.removeProperty('transform');
      try{ a.cancel(); }catch(e){}
      if(corsa === a) corsa = null;
      cta.classList.remove('is-armed');
    };
  }

  arma();

  /* ── il disegno ─────────────────────────────────────────────────────── */

  var disegnato = false, fineDisegno = 0;

  function inVista(){
    var vh = window.innerHeight, a = null, b = null;
    righe.forEach(function(r){
      var q = r.getBoundingClientRect();
      if(!a || q.top < a.top) a = q;
      if(!b || q.bottom > b.bottom) b = q;
    });
    var alto = b.bottom - a.top, dentro = Math.min(b.bottom, vh) - Math.max(a.top, 0);
    return dentro > 0 && dentro / Math.max(1, Math.min(alto, vh)) >= SOGLIA;
  }

  function disegna(){
    disegnato = true;
    var fine = 0, piani = [];
    nastri.forEach(function(n){
      /* la finestra è la parte della riga che si vede davvero */
      var q0 = n.riga.getBoundingClientRect();
      var rr = { left: Math.max(q0.left, 0), right: Math.min(q0.right, window.innerWidth) };
      rr.width = Math.max(1, rr.right - rr.left);
      var W = rr.width;
      /* Tutte le voci, anche quelle fuori schermo: prima che il nastro
         parta devono essere scritte tutte. Fuori schermo il ritardo è
         quello del bordo più vicino. */
      [].forEach.call(n.nastro.querySelectorAll('.cape-rotta-giro>*'), function(v){
        var q = v.getBoundingClientRect();
        if(v.classList.contains('is-piano')){ piani.push([v, q, n, rr]); return; }
        var t = v.querySelector('.cape-rotta-tratto');
        if(!t) return;
        var sl = t.getBoundingClientRect().left;
        [].forEach.call(t.querySelectorAll('path'), function(p){
          var x = sl + (+p.getAttribute('data-x') || 0);
          var u = Math.max(0, Math.min(1, (x - rr.left) / W));
          if(n.verso < 0) u = 1 - u;
          var l = +p.getAttribute('data-l') || 50;
          var dur = Math.max(TRATTO_MIN, Math.min(TRATTO_MAX, l * VELOCITA_MATITA));
          var ritardo = u * SPAZZATA + (p.hasAttribute('data-r') ? 0.1 + 0.08 * (+p.getAttribute('data-r')) : 0);
          var a = p.animate([{ strokeDashoffset: '1.05', strokeDasharray: '1 1.1' },
                             { strokeDashoffset: '0', strokeDasharray: '1 1.1' }],
                            { duration: dur * 1000, delay: ritardo * 1000,
                              easing: 'cubic-bezier(.42,.05,.32,1)', fill: 'both' });
          a.onfinish = function(){ try{ a.cancel(); }catch(e){} };
          fine = Math.max(fine, ritardo + dur);
        });
      });
    });

    /* Le voci rimaste testo compaiono in dissolvenza, quando la matita
       passa di lì. */
    piani.forEach(function(x){
      var v = x[0], q = x[1], n = x[2], rr = x[3];
      var u = Math.max(0, Math.min(1, ((q.left + q.right) / 2 - rr.left) / (rr.width || 1)));
      if(n.verso < 0) u = 1 - u;
      var a = v.animate([{ opacity: 0 }, { opacity: 1 }],
                        { duration: 900, delay: u * SPAZZATA * 1000, easing: 'ease', fill: 'both' });
      a.onfinish = function(){ try{ a.cancel(); }catch(e){} };
      fine = Math.max(fine, u * SPAZZATA + 0.9);
    });

    sez.classList.remove('is-armed');
    fineDisegno = performance.now() + fine * 1000;
    sali();
  }

  /* ── l'invito ───────────────────────────────────────────────────────── */

  var bottone = cta && (cta.querySelector('a, button') || slitta), sopra = false;
  var prossimoInvito = 0, invito = null, lettere = [];

  /* L'onda ha bisogno delle lettere una per una. Si spezza il testo solo se
     il bottone è testo e basta; il testo intero resta come etichetta per chi
     usa un lettore di schermo. */
  if(bottone && !bottone.children.length){
    var scritta = bottone.textContent;
    if(scritta.trim()){
      bottone.setAttribute('aria-label', scritta.trim());
      bottone.textContent = '';
      for(var li = 0; li < scritta.length; li++){
        var sp = document.createElement('span');
        sp.setAttribute('aria-hidden', 'true');
        sp.textContent = scritta[li];
        bottone.appendChild(sp);
        if(scritta[li].trim()) lettere.push(sp);
      }
    }
  }

  function fermaOnda(){
    (invito || []).forEach(function(a){ try{ a.cancel(); }catch(e){} });
    invito = null;
  }

  if(bottone){
    bottone.addEventListener('mouseenter', function(){
      sopra = true;
      fermaOnda();
    });
    bottone.addEventListener('mouseleave', function(){ sopra = false; });
  }

  function invita(ora){
    if(!bottone || armato || corsa || sopra || invito || document.hidden) return;
    if(!prossimoInvito){ prossimoInvito = ora + INVITO_PRIMO * 1000; return; }
    if(ora < prossimoInvito) return;
    var r = cta.getBoundingClientRect();
    if(r.bottom < 0 || r.top > window.innerHeight) return;
    var cs = getComputedStyle(bottone);
    var base = parseFloat(cs.letterSpacing) || 0, corpo = parseFloat(cs.fontSize) || 12;
    var onda = [], bersagli = lettere.length ? lettere : [bottone], restano = bersagli.length;
    bersagli.forEach(function(el, i){
      var a = el.animate([
        { letterSpacing: base + 'px' },
        { letterSpacing: (base + corpo * INVITO_EM) + 'px', offset: 0.45 },
        { letterSpacing: base + 'px' }
      ], { duration: INVITO_DUR * 1000, delay: i * INVITO_PASSO * 1000, easing: 'cubic-bezier(.45,0,.25,1)' });
      a.onfinish = function(){ if(--restano === 0 && invito === onda) invito = null; };
      onda.push(a);
    });
    invito = onda;
    prossimoInvito = ora + INVITO_OGNI * 1000;
  }

  /* ── lo scorrimento ─────────────────────────────────────────────────── */

  var tPrima = 0, yPrima = null, spinta = 0;

  function giro(ora){
    if(!vivo){ girando = false; return; }
    var dt = tPrima ? Math.min(0.05, (ora - tPrima) / 1000) : 0;
    tPrima = ora;

    if(pronti && !disegnato && inVista()) disegna();
    if(slitta && armato && disegnato){
      var r = cta.getBoundingClientRect();
      if(r.top < window.innerHeight * START_V && r.bottom > 0) sali();
    }
    if(disegnato) invita(ora);

    var y = window.scrollY || window.pageYOffset;
    var v = (yPrima === null || !dt) ? 0 : Math.abs(y - yPrima) / dt;
    yPrima = y;

    if(disegnato && ora > fineDisegno){
      var crociera = VELOCITA / 100 * window.innerWidth;
      var p = Math.min(1, (ora - fineDisegno) / (PARTENZA * 1000));
      var rampa = p * p * (3 - 2 * p);
      var voglia = Math.min(crociera * SPINTA_MAX, v * SPINTA);
      spinta += (voglia - spinta) * (1 - Math.exp(-dt / (voglia > spinta ? 0.12 : RIPOSO)));
      var passo = (crociera + spinta) * rampa * dt;
      nastri.forEach(function(n){ n.pos += n.verso * passo; posa(n); });
    }
    requestAnimationFrame(giro);
  }

  function sveglia(){
    if(girando || !vivo) return;
    girando = true;
    tPrima = 0;
    yPrima = null;
    requestAnimationFrame(giro);
  }

  new IntersectionObserver(function(es){
    vivo = es[0].isIntersecting;
    if(vivo) sveglia();
  }, { rootMargin: '0px' }).observe(sez);

  /* Il bottone si riarma appena esce del tutto dallo schermo, e rifà la
     tendina quando rientra. Fino al primo disegno resta armato: la prima
     volta sale insieme alla matita. */
  if(cta){
    new IntersectionObserver(function(es){
      if(!es[0].isIntersecting && !armato && disegnato) arma();
    }, { rootMargin: '0px' }).observe(cta);
  }

  window.capeRotta.stato = function(){
    return { pronti: pronti, disegnato: disegnato, bottone: armato ? 'armato' : 'su',
             spinta: Math.round(spinta),
             righe: nastri.map(function(n){
               return { giro: Math.round(n.largo), copie: n.nastro.children.length,
                        ricalcate: n.voci.filter(function(v){ return v.classList.contains('is-schizzo'); }).length,
                        testo: n.voci.filter(function(v){ return v.classList.contains('is-piano'); }).length };
             }) };
  };
}

if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();

})();
