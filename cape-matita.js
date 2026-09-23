/* parallassi-slider — cape-matita.js
   I segni a matita della home: un sole, una freccia, tre stelle e una luna,
   tre frecce verso l'opera. Ognuno si disegna UNA volta sola nella vita
   della pagina, resta un secondo e se ne va: la coda del tratto insegue la
   punta, nello stesso verso in cui è stato disegnato.

   DOVE E QUANDO
     slide bianca di .cape-hs-wrap   sole in alto a sinistra, freccia a destra
                                     verso lo scroll. Partono quando la slide
                                     è ferma al suo posto e il ponte non la
                                     copre più.
     slide nera di .cape-hs-wrap     tre stelle e una luna attorno alla foto,
                                     in bianco. Partono quando la slide è nera
                                     e ferma, e solo se la polvere non ha già
                                     cominciato a spegnerla.
     .studio-hero                    tre frecce verso l'angolo basso a sinistra
                                     dell'opera. Partono appena finisce
                                     l'entrata della sezione.

   LE MISURE SONO PERCENTUALI. L'unità è l'1% della larghezza della sezione;
   su uno schermo molto largo e basso si ferma a quella di un rapporto 2.2:1,
   così un segno non cresce più dello spazio che ha in altezza.

   NIENTE ADDOSSO AL CONTENUTO. Prima di disegnare si misurano testi,
   immagini, bottoni e la barra in alto. Se un segno ci finirebbe sopra, si
   sposta poco lontano; se non c'è posto, si rimpicciolisce; se non c'è posto
   nemmeno così, non si disegna. In console, capeMatita.stato() dice quali
   segni sono stati saltati.

   IL TRATTO è quello di cape-rotta.js: tre passate, la mano che trema, i giri
   chiusi che vanno oltre il punto di partenza.

   NIENTE DIPENDENZE. Niente sotto i 992px, niente per chi chiede meno
   movimento.

   VA IN PAGINA: un tag <script defer> nel footer, in PARTE 2.
*/
(function(){
'use strict';

/* ── le manopole ─────────────────────────────────────────────────────── */

var RESTA     = 1.0;   /* secondi in cui il segno finito resta sulla pagina */
var USCITA    = 0.8;   /* secondi in cui la coda insegue la punta e sparisce */
var STACCO    = 0.035; /* la matita che si alza fra un tratto e l'altro     */
var PASSATE   = 3;     /* quante volte la mano ripassa ogni tratto          */
var RIPASSO   = 0.8;   /* opacità delle passate dopo la prima               */
var MARGINE   = 1.4;   /* distanza minima dal contenuto, in unità           */
var RAPPORTO  = 2.2;   /* oltre questo rapporto l'unità segue l'altezza     */
var MIN_W     = 992;

var INK    = '#141416';
var BIANCO = '#ffffff';

/* ── da qui in giù non ci sono numeri da girare ──────────────────────── */

var GIRO  = 'cubic-bezier(.42,.05,.32,1)';
var CODA  = 'cubic-bezier(.45,0,.3,1)';
var BARRA = '.header-cape-left, .header-cape-center, .header-cape-right22';


/* ══ attrezzi, da cape-rotta ════════════════════════════════════════════ */

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

/* La mano. Come in cape-rotta, con una differenza: sui tratti aperti la
   sforatura alle due estremità si ferma a una frazione del tratto. Un raggio
   del sole è lungo poco più della sforatura di una lettera, e con la misura
   piena uscirebbe il doppio di com'è. */
function schizzo(c, opt, rnd){
  var base = ricampiona(c.p, c.chiuso, opt.passo);
  var P = base.p, L = base.len, out = [];
  if(P.length < 2 || !(L > 0)) return out;
  var cx0 = 0, cy0 = 0;
  P.forEach(function(a){ cx0 += a[0]; cy0 += a[1]; });
  cx0 /= P.length; cy0 /= P.length;
  var oltreAperto = Math.min(opt.oltreMax, L * 0.16);

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
      var e = ps ? oltreAperto * (0.3 + rnd() * 0.7) : oltreAperto * 0.2;
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
    for(var j = 1; j < R.length; j++) d += 'L' + f1(R[j][0]) + ',' + f1(R[j][1]);
    out.push({ d: d, len: lunghezza(R, false), ps: ps });
  }
  return out;
}


/* ══ le forme ═══════════════════════════════════════════════════════════
   In pixel, dentro il proprio riquadro w×h. L'ordine dei tratti è quello
   in cui la matita li scrive. */

function quad(a, b, c, n){
  var out = [];
  for(var t = 0; t <= n; t++){
    var u = t / n;
    out.push([(1-u)*(1-u)*a[0] + 2*(1-u)*u*b[0] + u*u*c[0],
              (1-u)*(1-u)*a[1] + 2*(1-u)*u*b[1] + u*u*c[1]]);
  }
  return out;
}

function ruota(P, cx, cy, a){
  var c = Math.cos(a), s = Math.sin(a);
  return P.map(function(p){ var x = p[0] - cx, y = p[1] - cy; return [cx + x * c - y * s, cy + x * s + y * c]; });
}

var FORME = {
  sole: function(w, h, rnd){
    var m = Math.min(w, h), cx = w / 2, cy = h / 2, r = m * 0.24, tr = [], cerchio = [];
    for(var i = 0; i < 64; i++){
      var a = i / 64 * Math.PI * 2;
      cerchio.push([cx + Math.cos(a) * r * 1.03, cy + Math.sin(a) * r * 0.97]);
    }
    tr.push({ p: cerchio, chiuso: true });
    var n = 9, a0 = -Math.PI / 2 + 0.2;
    for(var k = 0; k < n; k++){
      var b = a0 + k * 2 * Math.PI / n + (rnd() - 0.5) * 0.16;
      var r0 = r * (1.32 + rnd() * 0.1), r1 = r * (1.72 + rnd() * 0.22);
      tr.push({ p: [[cx + Math.cos(b) * r0, cy + Math.sin(b) * r0],
                    [cx + Math.cos(b) * r1, cy + Math.sin(b) * r1]], chiuso: false });
    }
    return tr;
  },
  freccia: function(w, h){
    return [
      { p: quad([w * 0.02, h * 0.62], [w * 0.5, h * 0.30], [w * 0.93, h * 0.5], 28), chiuso: false },
      { p: [[w * 0.80, h * 0.10], [w * 0.955, h * 0.5], [w * 0.79, h * 0.92]], chiuso: false }
    ];
  },
  diagonale: function(w, h){
    return [
      { p: quad([w * 0.06, h * 0.94], [w * 0.40, h * 0.52], [w * 0.93, h * 0.08], 24), chiuso: false },
      { p: [[w * 0.52, h * 0.11], [w * 0.945, h * 0.065], [w * 0.905, h * 0.50]], chiuso: false }
    ];
  },
  /* la stella di cape-rotta, la stessa dei segni fra le città */
  stella: function(w, h){
    var q = [[.5,0],[.555,.445],[1,.5],[.555,.555],[.5,1],[.445,.555],[0,.5],[.445,.445],[.5,0]], p = [];
    for(var i = 0; i + 2 < q.length; i += 2){
      for(var t = (i ? 1 : 0); t <= 8; t++){
        var u = t / 8, a = q[i], b = q[i+1], c = q[i+2];
        p.push([((1-u)*(1-u)*a[0] + 2*(1-u)*u*b[0] + u*u*c[0]) * w,
                ((1-u)*(1-u)*a[1] + 2*(1-u)*u*b[1] + u*u*c[1]) * h]);
      }
    }
    p.pop();
    return [{ p: p, chiuso: true }];
  },
  /* Una falce aperta a destra, un giro solo: l'arco esterno scende lungo la
     sinistra, quello interno — un cerchio spostato a destra — risale. */
  luna: function(w, h){
    var m = Math.min(w, h), cx = w / 2, cy = h / 2, R = m * 0.45, out = [], i, a;
    var a0 = 55 * Math.PI / 180, a1 = 305 * Math.PI / 180;
    for(i = 0; i <= 40; i++){ a = a0 + (a1 - a0) * i / 40; out.push([cx + Math.cos(a) * R, cy + Math.sin(a) * R]); }
    var k = 0.236 * R, r2 = 0.886 * R, b = Math.atan2(-0.8192, 0.3376);
    var s0 = 2 * Math.PI + b, s1 = -b;
    for(i = 1; i < 40; i++){ a = s0 + (s1 - s0) * i / 40; out.push([cx + k + Math.cos(a) * r2, cy + Math.sin(a) * r2]); }
    return [{ p: ruota(out, cx, cy, -0.35), chiuso: true }];
  }
};

/* quanto trema la mano, in frazioni del lato corto del segno */
var MANO = { sole: 0.03, freccia: 0.035, diagonale: 0.04, stella: 0.07, luna: 0.04 };

var NOMI = { sole: 'il sole', freccia: 'la freccia', diagonale: 'una freccia dello studio',
             stella: 'una stella', luna: 'la luna' };


/* ══ le scene ═══════════════════════════════════════════════════════════
   Ogni scena dice dove vive, quando è pronta, cosa non deve toccare e dove
   vorrebbe i suoi segni. I segni stanno in GRUPPI: un gruppo si sposta e
   si rimpicciolisce tutto insieme, così le tre frecce dello studio restano
   una composizione e non tre frecce sparse.

   at e dur sono secondi: quando parte il segno e quanto ci mette a
   disegnarsi. x, y, w, h sono pixel, ma tutti calcolati da percentuali
   della sezione o da U, l'unità. */

function sezioni(){ return [].slice.call(document.querySelectorAll('.cape-hs-track > section')); }

function ferma(s){
  var r = s.getBoundingClientRect();
  return Math.abs(r.top) <= 2 && Math.abs(r.left) <= window.innerWidth * 0.03;
}

function segno(forma, cx, cy, w, h, dur, at){
  return { forma: forma, x: cx - w / 2, y: cy - h / 2, w: w, h: h, dur: dur, at: at };
}

var SCENE = [
  {
    nome: 'mattino',
    colore: INK,
    host: function(){ var s = sezioni(); return s.length > 1 ? s[0] : null; },
    pronta: function(s){
      if(!ferma(s)) return false;
      var ponte = document.querySelector('.cape-bridge-photo');
      return !(ponte && ponte.classList.contains('is-on'));
    },
    ostacoli: function(s){
      return [].slice.call(s.querySelectorAll('img, picture, video, svg, h1, h2, h3, h4, h5, h6, p, a, button, .link-uni'))
        .concat([].slice.call(document.querySelectorAll('.cape-hs-palm img, .cape-leaves-top')));
    },
    gruppi: function(s, W, H, U){
      var ws = 7.8 * U, wf = 10 * U, hf = 3.2 * U;
      return [
        [segno('sole', W * 0.085, H * 0.22, ws, ws, 0.85, 0)],
        [segno('freccia', W * 0.95 - wf / 2, H * 0.5, wf, hf, 0.6, 0.3)]
      ];
    }
  },
  {
    nome: 'notte',
    colore: BIANCO,
    host: function(){ var s = sezioni(); return s.length > 1 ? s[s.length - 1] : null; },
    pronta: function(s){
      var tr = s.parentNode;
      if(!tr.classList.contains('is-night') || !ferma(s)) return false;
      var v = parseFloat(tr.style.getPropertyValue('--cape-veil'));
      return isNaN(v) || v >= 0.98;
    },
    ostacoli: function(s){
      return [].slice.call(s.querySelectorAll('img, picture, video, svg, h1, h2, h3, h4, h5, h6, p, a, button, .link-uni'));
    },
    gruppi: function(s, W, H, U, base){
      var foto = s.querySelector('.image-14'), I = null;
      if(foto){
        var r = foto.getBoundingClientRect();
        if(r.width && r.height) I = { l: r.left - base.left, t: r.top - base.top, r: r.right - base.left, b: r.bottom - base.top };
      }
      if(!I) I = { l: W * 0.35, t: H * 0.2, r: W * 0.55, b: H * 0.8 };
      return [
        [segno('stella', I.l - 2.4 * U, I.t + 2.6 * U,             2.2 * U, 2.2 * U, 0.3,  0)],
        [segno('stella', I.r + 2.2 * U, I.t + (I.b - I.t) * 0.58,  1.5 * U, 1.5 * U, 0.26, 0.14)],
        [segno('luna',   I.r + 2.8 * U, I.t + 1.2 * U,             3.4 * U, 3.4 * U, 0.55, 0.28)],
        [segno('stella', I.l - 2.0 * U, I.b - 3.2 * U,             1.8 * U, 1.8 * U, 0.3,  0.42)]
      ];
    }
  },
  {
    nome: 'studio',
    colore: INK,
    host: function(){ return document.querySelector('.studio-hero'); },
    pronta: function(s){
      var cop = s.querySelector('.stde-coperta');
      if(cop && !cop.classList.contains('is-via')) return false;
      if(parseFloat(getComputedStyle(s).opacity) < 0.95) return false;
      var st = s.querySelector('.studio-stage');
      if(!st) return false;
      var r = st.getBoundingClientRect();
      return r.height > 0 && r.top >= -2 && r.bottom <= window.innerHeight + 2;
    },
    ostacoli: function(s){
      return [].slice.call(s.querySelectorAll('.studio-stage, .studio-headline__row, [data-field], .studio-info__cta, .studio-pager, .studio-stats, img, svg, a, button, p, h1, h2, h3'));
    },
    /* Ricalcate dal tuo schizzo, un po' più piccole: le coordinate sono in
       unità, misurate dall'angolo basso a sinistra dell'opera. */
    gruppi: function(s, W, H, U, base){
      var st = s.querySelector('.studio-stage');
      var r = st.getBoundingClientRect(), x = r.left - base.left, y = r.bottom - base.top;
      function f(x0, x1, y0, y1, dur, at){
        return { forma: 'diagonale', x: x + x0 * U, y: y + y0 * U, w: (x1 - x0) * U, h: (y1 - y0) * U, dur: dur, at: at };
      }
      return [[
        f(-12.75, -7.13, -3.48, 0.75, 0.42, 0),
        f(-11.83, -8.30,  0.28, 3.78, 0.34, 0.12),
        f( -7.83, -2.48, -1.36, 4.00, 0.44, 0.24)
      ]];
    }
  }
];


/* ══ dove si posano ═════════════════════════════════════════════════════ */

function rettangoli(lista, base, gonfia){
  var out = [];
  lista.forEach(function(el){
    if(!el || (el.closest && el.closest('.cape-matita'))) return;
    var r = el.getBoundingClientRect();
    if(r.width < 1 || r.height < 1) return;
    var cs = getComputedStyle(el);
    if(cs.visibility === 'hidden' || cs.display === 'none') return;
    out.push({ l: r.left - base.left - gonfia, t: r.top - base.top - gonfia,
               r: r.right - base.left + gonfia, b: r.bottom - base.top + gonfia });
  });
  return out;
}

/* Oltre a quelli elencati dalla scena, è contenuto tutto ciò che ha un fondo
   pieno o del testo suo: un blocco di testo del Designer è un div, non un
   paragrafo, e un riquadro colorato non è un'immagine. Si salta quello che
   copre più di metà della sezione — un contenitore, uno sfondo — se no non
   resterebbe posto per niente. */
function trasparente(c){ var m = c.match(/[\d.]+/g); return !m || (m.length > 3 && +m[3] < 0.05); }

function contenuti(s, base){
  var A = base.width * base.height, out = [];
  [].forEach.call(s.querySelectorAll('*'), function(el){
    if(el.closest('.cape-matita, svg')) return;
    var testo = false;
    for(var n = el.firstChild; n && !testo; n = n.nextSibling) testo = n.nodeType === 3 && /\S/.test(n.nodeValue);
    if(!testo){
      var cs = getComputedStyle(el);
      if(cs.backgroundImage === 'none' && trasparente(cs.backgroundColor)) return;
    }
    var r = el.getBoundingClientRect();
    if(r.width * r.height > A * 0.5) return;
    out.push(el);
  });
  return out;
}

/* il riquadro di un segno più quello che la mano ci mette di suo */
function ingombro(b){
  var p = Math.min(b.w, b.h) * 0.12 + 2;
  return { l: b.x - p, t: b.y - p, r: b.x + b.w + p, b: b.y + b.h + p };
}

function libero(q, ost, W, H, bordo){
  if(q.l < bordo || q.t < bordo || q.r > W - bordo || q.b > H - bordo) return false;
  for(var i = 0; i < ost.length; i++){
    var o = ost[i];
    if(q.l < o.r && q.r > o.l && q.t < o.b && q.b > o.t) return false;
  }
  return true;
}

/* Prima dove il segno vorrebbe stare; poi in cerchi sempre più larghi, fino
   a sei unità; poi un po' più piccolo, e un'altra volta. Se non trova posto
   nemmeno così, il gruppo non si disegna: meglio un segno in meno che un
   segno sopra una scritta. */
var RAGGI = [0, 1, 2, 3, 4.5, 6], SCALE = [1, 0.85, 0.72];

function posa(gruppo, ost, W, H, U){
  var l = Infinity, t = Infinity, r = -Infinity, b = -Infinity;
  gruppo.forEach(function(s){
    l = Math.min(l, s.x); t = Math.min(t, s.y); r = Math.max(r, s.x + s.w); b = Math.max(b, s.y + s.h);
  });
  var cx = (l + r) / 2, cy = (t + b) / 2;
  for(var si = 0; si < SCALE.length; si++){
    var k = SCALE[si];
    for(var ri = 0; ri < RAGGI.length; ri++){
      var n = RAGGI[ri] ? 12 : 1;
      for(var a = 0; a < n; a++){
        var ang = a / n * Math.PI * 2;
        var dx = Math.cos(ang) * RAGGI[ri] * U, dy = Math.sin(ang) * RAGGI[ri] * U;
        var prova = gruppo.map(function(s){
          return { forma: s.forma, dur: s.dur, at: s.at,
                   x: cx + (s.x - cx) * k + dx, y: cy + (s.y - cy) * k + dy, w: s.w * k, h: s.h * k };
        });
        var ok = true;
        for(var i = 0; i < prova.length && ok; i++) ok = libero(ingombro(prova[i]), ost, W, H, U);
        if(ok) return prova;
      }
    }
  }
  return null;
}


/* ══ il disegno ═════════════════════════════════════════════════════════ */

var NS = 'http://www.w3.org/2000/svg';

function costruisci(strato, d, seme, colore, sw, W, H){
  var w = d.w, h = d.h, m = Math.min(w, h);
  var rnd = prng(semeDi(seme));
  var amp = m * MANO[d.forma];
  var opt = { passo: Math.max(1, m * 0.02), passate: PASSATE, amp: amp, onda: m * 0.9, oltreMax: m * 0.2, eps: 0.18 };
  var colpi = FORME[d.forma](w, h, rnd)
    .map(function(t){ return schizzo(t, opt, rnd); })
    .filter(function(c){ return c.length; });

  var pad = Math.ceil(m * 0.3 + amp * 2 + sw * 2), VW = w + pad * 2, VH = h + pad * 2;
  var linee = '';
  colpi.forEach(function(passate, ci){
    passate.forEach(function(p){
      linee += '<path d="' + p.d + '" pathLength="1" stroke-dasharray="1 1.1" stroke-dashoffset="1.05"' +
        ' stroke-width="' + f1(p.ps ? sw * 0.65 : sw) + '"' + (p.ps ? ' opacity="' + RIPASSO + '"' : '') +
        ' data-c="' + ci + '" data-p="' + p.ps + '"/>';
    });
  });

  /* In percentuale anche qui: se la finestra cambia misura mentre il segno
     è in scena, resta dov'era rispetto alla sezione. */
  var svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', (-pad) + ' ' + (-pad) + ' ' + f1(VW) + ' ' + f1(VH));
  svg.setAttribute('focusable', 'false');
  svg.style.left   = ((d.x - pad) / W * 100).toFixed(3) + '%';
  svg.style.top    = ((d.y - pad) / H * 100).toFixed(3) + '%';
  svg.style.width  = (VW / W * 100).toFixed(3) + '%';
  svg.style.height = (VH / H * 100).toFixed(3) + '%';
  svg.innerHTML = '<g fill="none" stroke="' + colore + '" stroke-linecap="round" stroke-linejoin="round">' + linee + '</g>';
  strato.appendChild(svg);

  var sym = { d: d, svg: svg, colpi: [] };
  [].forEach.call(svg.querySelectorAll('path'), function(p){
    var ci = +p.getAttribute('data-c'), ps = +p.getAttribute('data-p');
    var c = sym.colpi[ci] || (sym.colpi[ci] = { main: null, rip: [], len: 0 });
    if(ps === 0){ c.main = p; c.len = colpi[ci][0].len; } else c.rip.push(p);
  });
  sym.colpi = sym.colpi.filter(function(c){ return c && c.main; });
  return sym;
}

function anima(el, frames, dur, delay, easing, fill){
  el.animate(frames, { duration: dur * 1000, delay: delay * 1000, easing: easing, fill: fill });
}

function somma(colpi){ return colpi.reduce(function(s, c){ return s + c.len; }, 0) || 1; }

var DENTRO = [{ strokeDashoffset: '1.05' }, { strokeDashoffset: '0' }];
var FUORI  = [{ strokeDashoffset: '0' }, { strokeDashoffset: '-1.05' }];

/* La durata del segno si divide fra i tratti in proporzione alla lunghezza:
   la matita va sempre alla stessa velocità, e un raggio corto si scrive in
   meno tempo del cerchio. Restituisce l'istante in cui l'ultima passata ha
   finito. */
function disegna(sym, t0){
  var n = sym.colpi.length;
  var k = Math.max(0.15, sym.d.dur - STACCO * (n - 1)) / somma(sym.colpi);
  var t = t0, fine = t0;
  sym.colpi.forEach(function(c){
    var d = Math.max(0.05, c.len * k);
    anima(c.main, DENTRO, d, t, GIRO, 'both');
    c.rip.forEach(function(p, i){
      var dl = t + 0.05 + 0.04 * i;
      anima(p, DENTRO, d, dl, GIRO, 'both');
      fine = Math.max(fine, dl + d);
    });
    t += d + STACCO;
    fine = Math.max(fine, t);
  });
  return fine;
}

/* La coda insegue la punta: il tratto si stacca da dove è partito e scivola
   via nello stesso verso. 'forwards' e non 'both': nell'attesa non deve
   toccare niente, se no coprirebbe il disegno prima del tempo. */
function scivola(sym, t0){
  var n = sym.colpi.length;
  var k = Math.max(0.2, USCITA - 0.03 * (n - 1)) / somma(sym.colpi);
  var t = t0, fine = t0;
  sym.colpi.forEach(function(c){
    var d = Math.max(0.06, c.len * k);
    anima(c.main, FUORI, d, t, CODA, 'forwards');
    c.rip.forEach(function(p, i){
      var dl = t + 0.04 * (i + 1);
      anima(p, FUORI, d, dl, CODA, 'forwards');
      fine = Math.max(fine, dl + d);
    });
    t += d + 0.03;
    fine = Math.max(fine, t);
  });
  return fine;
}


/* ══ il meccanismo ══════════════════════════════════════════════════════ */

function vesti(){
  if(document.getElementById('cape-matita-css')) return;
  var st = document.createElement('style');
  st.id = 'cape-matita-css';
  st.textContent =
    '.cape-matita{position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none;z-index:3;overflow:visible}' +
    '.cape-matita>svg{position:absolute;display:block;overflow:visible}';
  document.head.appendChild(st);
}

function init(){
  if(window.innerWidth < MIN_W) return;
  try{ if(matchMedia('(prefers-reduced-motion: reduce)').matches) return; }catch(e){}

  var scene = SCENE.filter(function(sc){ sc.s = sc.host(); return !!sc.s; });
  if(!scene.length) return;

  vesti();

  /* Lo strato sta DENTRO la sezione, come ultimo figlio. Nelle slide è il
     posto giusto per due motivi: scorre con la slide, e la regola della head
     che spegne il contenuto mentre arriva la polvere (opacità del velo su
     ogni figlio diretto della slide) spegne anche lui, senza chiederglielo. */
  scene.forEach(function(sc){
    var strato = document.createElement('div');
    strato.className = 'cape-matita';
    strato.setAttribute('aria-hidden', 'true');
    sc.s.appendChild(strato);
    sc.strato = strato;
    sc.fatta = false;
    sc.vista = false;
    sc.saltati = [];
  });

  function gioca(sc){
    var base = sc.strato.getBoundingClientRect(), W = base.width, H = base.height;
    if(!W || !H) return;
    sc.fatta = true;

    var U = Math.min(W, H * RAPPORTO) / 100;
    var ost = rettangoli(sc.ostacoli(sc.s).concat(contenuti(sc.s, base)), base, MARGINE * U)
      .concat(rettangoli([].slice.call(document.querySelectorAll(BARRA)), base, MARGINE * U));

    var segni = [];
    sc.gruppi(sc.s, W, H, U, base).forEach(function(g){
      var posti = posa(g, ost, W, H, U);
      if(!posti){
        g.forEach(function(s){ sc.saltati.push(NOMI[s.forma]); });
        try{ console.info('[matita] ' + NOMI[g[0].forma] + ' (' + sc.nome + ') non ha trovato posto libero: non si disegna.'); }catch(e){}
        return;
      }
      posti.forEach(function(p){
        segni.push(p);
        var q = ingombro(p);
        ost.push({ l: q.l - 0.8 * U, t: q.t - 0.8 * U, r: q.r + 0.8 * U, b: q.b + 0.8 * U });
      });
    });

    var sw = Math.max(0.9, 0.065 * U), fineTutto = 0;
    segni.forEach(function(d, i){
      var sym = costruisci(sc.strato, d, sc.nome + i + d.forma, sc.colore, sw, W, H);
      var fine = disegna(sym, d.at + 0.1);
      fineTutto = Math.max(fineTutto, scivola(sym, fine + RESTA));
    });

    /* A cose fatte i tracciati si tolgono: sono spariti a vista, ma restare
       nel documento vorrebbe dire tenerli in memoria per tutta la pagina. */
    setTimeout(function(){ sc.strato.innerHTML = ''; }, (fineTutto + 0.3) * 1000);
  }

  var girando = false;

  function giro(){
    girando = false;
    var restano = false, viste = false;
    scene.forEach(function(sc){
      if(sc.fatta) return;
      restano = true;
      if(!sc.vista) return;
      viste = true;
      if(window.innerWidth >= MIN_W && sc.pronta(sc.s)) gioca(sc);
    });
    if(!restano){ io.disconnect(); return; }
    if(viste) sveglia();
  }

  function sveglia(){
    if(girando) return;
    girando = true;
    requestAnimationFrame(giro);
  }

  /* Il giro gira solo mentre una delle sezioni è sullo schermo, e si spegne
     per sempre quando tutti i segni si sono disegnati. */
  var io = new IntersectionObserver(function(es){
    es.forEach(function(e){
      scene.forEach(function(sc){ if(sc.s === e.target) sc.vista = e.isIntersecting; });
    });
    sveglia();
  }, { rootMargin: '0px' });
  scene.forEach(function(sc){ io.observe(sc.s); });

  window.capePatti && capePatti.dichiara('matita', {
    leggo: [['is-on', '.cape-bridge-photo', 'finché il ponte copre la slide bianca, sole e freccia aspettano'],
            ['is-night', '.cape-hs-track', 'le stelle si disegnano solo sulla slide già nera'],
            ['--cape-veil', '.cape-hs-track', 'se la polvere ha già cominciato a spegnere la slide, le stelle non partono'],
            ['is-via', '.studio-stage .stde-coperta', 'le frecce dello studio partono a montaggio finito']]
  });

  window.capeMatita = {
    stato: function(){
      var out = {};
      scene.forEach(function(sc){ out[sc.nome] = { disegnata: sc.fatta, saltati: sc.saltati.slice() }; });
      return out;
    }
  };
}

if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();

})();
