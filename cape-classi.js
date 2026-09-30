/* parallassi-slider — cape-classi.js
   Tre effetti che si accendono con una classe messa nel Designer. Nati per la
   pagina minimal, ma non sanno niente di lei: vanno su qualunque pagina.
   Prima si chiamava cape-skew-slow.js: e' diventato cape-classi.js quando e'
   arrivato .parallax, che deve stare nello stesso file degli altri due per
   potersi mettere d'accordo con loro sulla stessa foto.

   .skew-img
   ---------
   L'elemento resta bianco finche' non entra nello schermo, poi il bianco
   scivola via verso sinistra e lo scopre. E' la scivolata dell'entrata della
   sezione studio in home, con i numeri del carosello: stessa curva, stessa
   durata, e l'inclinazione che cresce quando il bianco accelera e sparisce
   quando rallenta. Una volta sola in tutta la vita della pagina. Se ne entrano
   piu' d'uno insieme, partono nello stesso istante.

   Il bianco non e' un foglio appoggiato sopra: e' l'elemento stesso che viene
   ritagliato (clip-path), e quello che si vede al posto suo e' il fondo della
   pagina. Sul bianco e' identico al velo della home, e in pagina non si
   aggiunge niente che possa spostare il layout. Il rovescio: su un fondo
   colorato si vedrebbe quel colore, non il bianco.

   Va bene sull'immagine o su un contenitore: con la classe su un div si
   scopre tutto quello che c'e' dentro. Parte solo a immagini scaricate, se no
   il bianco se ne andrebbe da sopra un riquadro vuoto.

   .slow
   -----
   Sale piu' lento dello scroll: al 95%. Entra dal basso esattamente dove sta
   nel Designer, poi resta indietro, e lo spazio con quello che ha sopra
   cresce. Non e' incollato alla rotella: insegue la sua posizione con un po'
   di ritardo, ed e' quello il peso che si sente.

   Si muove con la proprieta' `translate`, non con `transform`. Le due si
   sommano invece di cancellarsi: un elemento che ha gia' un suo transform —
   lo zoom della foto dell'header, un Move del Designer, una Interaction —
   se lo tiene.

   Solo da 992px in su, come lo scroll morbido della pagina. Sotto sta fermo.

   .parallax
   ---------
   La parallasse dentro la foto: l'immagine e' ingrandita di ZOOM e ritagliata
   sul suo riquadro, e mentre il riquadro attraversa lo schermo lei ci scorre
   dentro, restando indietro — entrando dal basso si vede la parte bassa della
   foto, uscendo in alto quella alta. La cornice non si muove e il layout non
   se ne accorge: il ritaglio e' un clip-path sulla foto stessa, calcolato
   perche' dopo lo zoom e lo spostamento combaci col riquadro di prima.

   Sull'immagine o su un contenitore: con la classe su un div si muovono le
   foto che ci sono dentro, ognuna nel suo riquadro. A qualunque larghezza.

   COME SI PARLANO
   ---------------
   Sulla stessa foto possono stare tutti e tre, e ognuno scrive due proprieta'
   che anche un altro vuole: per questo stanno in un file solo.
   - translate: slow e parallax lo scrivono tutti e due. Si sommano, e
     ognuno, quando misura, toglie solo la sua parte.
   - clip-path: mentre il bianco di skew-img scivola, il ritaglio e' suo;
     tiene conto di quello di parallax, e a scivolata finita glielo lascia.

   VA IN PAGINA: le righe dell'head (nel README, sezione cape-classi.js), e un
   tag <script defer> nel footer. Nessuna dipendenza.

   prefers-reduced-motion: niente di tutto questo. Le immagini sono scoperte,
   senza zoom, e niente resta indietro.
*/
(function(){
'use strict';

/* ── le manopole ─────────────────────────────────────────────────────── */

var DURATA   = 0.9;    /* secondi della scivolata: SLIDE_DUR del carosello   */
var SKEW     = 5;      /* gradi di inclinazione al picco di velocita': SKEW
                          del carosello. E' un angolo, quindi su un'immagine
                          alta lo scarto in pixel e' piu' grande.             */
var ENTRA    = 0.15;   /* quanto dev'essere entrato nello schermo, in
                          schermate, prima che il bianco parta.              */
var ATTESA   = 2500;   /* ms: se un'immagine non finisce di caricare entro
                          questo tempo, si scopre lo stesso.                 */
var VICINO   = 1.5;    /* schermate: a questa distanza dallo schermo le
                          immagini coperte cominciano a scaricarsi.          */

var LENTO    = 0.95;   /* velocita' di salita di .slow, rispetto allo scroll */
var INERZIA  = 0.10;   /* quanta strada recupera a ogni fotogramma a 60fps:
                          1 e' incollato alla rotella, piu' basso e' piu'
                          pesante. E' la MORBIDEZZA di reel-salita.js.       */
var MIN_W    = 992;

var ZOOM     = 1.06;   /* ingrandimento delle foto con .parallax. La corsa
                          dentro il riquadro e' tutto il margine che lo zoom
                          lascia: il 6% dell'altezza della foto. Se lo cambi,
                          cambia anche il 1.06 e il 2.83% nelle righe
                          dell'head: 2.83 e' (1 - 1/ZOOM) / 2 * 100.          */

/* ── da qui in giu' non ci sono numeri da girare ──────────────────────── */

var SEL_SKEW     = '.skew-img';
var SEL_SLOW     = '.slow';
var SEL_PARALLAX = '.parallax';

/* Le classi che l'head mette sul tag html prima del primo disegno. */
var IN_ATTESA = 'skew-attesa';
var SCADUTO   = 'skew-scaduto';

var h = document.documentElement;

var ridotto = false;
try{ ridotto = matchMedia('(prefers-reduced-motion: reduce)').matches; }catch(e){}

/* ── quello che i tre si dicono ───────────────────────────────────────── */

/* translate: la parte di slow e quella di parallax, sommate. */
var spinte = new WeakMap();

function sposta(el, chi, y){
  var m = spinte.get(el);
  if(!m){ m = { slow: 0, parallax: 0 }; spinte.set(el, m); }
  m[chi] = y;
  var tot = m.slow + m.parallax;
  el.style.translate = tot ? '0 ' + tot.toFixed(2) + 'px' : '';
}

function spinta(el, chi){
  var m = spinte.get(el);
  if(!m) return 0;
  return chi ? m[chi] : m.slow + m.parallax;
}

/* clip-path: il riquadro di parallax per ogni foto, e le foto su cui in
   questo momento il ritaglio e' di skew-img. */
var ritagli = new WeakMap();
var velate  = new WeakSet();

function ritaglio(el){
  var r = ritagli.get(el);
  return r ? r.clip : '';
}

/* ── skew-img ─────────────────────────────────────────────────────────── */

/* La curva del carosello, scritta a mano per la stessa ragione: serve la sua
   velocita', e l'inclinazione la segue. */
function cubicBezier(x1, y1, x2, y2){
  var ax = 3 * x1, bx = 3 * (x2 - x1) - ax, cx = 1 - ax - bx;
  var ay = 3 * y1, by = 3 * (y2 - y1) - ay, cy = 1 - ay - by;
  function sx(t){ return ((cx * t + bx) * t + ax) * t; }
  function dx(t){ return (3 * cx * t + 2 * bx) * t + ax; }
  return function(x){
    if(x <= 0) return 0;
    if(x >= 1) return 1;
    var t = x;
    for(var i = 0; i < 8; i++){
      var err = sx(t) - x;
      if(err > -1e-7 && err < 1e-7) break;
      var d = dx(t);
      if(d > -1e-7 && d < 1e-7) break;
      t -= err / d;
      t = t < 0 ? 0 : (t > 1 ? 1 : t);
    }
    return ((cy * t + by) * t + ay) * t;
  };
}

var ease = cubicBezier(0.78, 0, 0.4, 1);
var EPS = 0.004;
function velocita(t){
  return (ease(Math.min(1, t + EPS)) - ease(Math.max(0, t - EPS))) / (2 * EPS);
}
var VMAX = (function(){
  var top = 0;
  for(var i = 0; i <= 400; i++) top = Math.max(top, velocita(i / 400));
  return top || 1;
})();

/* Tutto coperto: la parte visibile e' una striscia larga zero sul bordo
   destro. E' la stessa forma che l'head mette prima che questo file arrivi. */
var COPERTO = 'polygon(100% 0,100% 0,100% 100%,100% 100%)';

/* La parte scoperta a un fotogramma della scivolata. Il bianco e' un
   rettangolo largo quanto l'elemento, spostato a sinistra di e*w e inclinato
   intorno al suo centro, come skewX(): il suo bordo destro e' la linea da
   (a, 0) a (b, alto). Si vede tutto quello che sta a destra di quella linea. */
function scoperto(e, v, w, alto){
  var via = -e * w;
  var q = Math.tan(-SKEW * v * Math.PI / 180);
  var a = w + via - q * alto / 2;
  var b = w + via + q * alto / 2;
  return [[a, 0], [w, 0], [w, alto], [b, alto]];
}

/* Se la foto ha anche .parallax, la parte scoperta si ritaglia sul suo
   riquadro, se no sborderebbe dello zoom. Sutherland-Hodgman: si taglia il
   poligono con i quattro lati del rettangolo, uno alla volta. */
function ritaglia(punti, r){
  [[0, r.L, 1], [0, r.R, -1], [1, r.T, 1], [1, r.B, -1]].forEach(function(lato){
    var asse = lato[0], val = lato[1], verso = lato[2], tenuti = [], n = punti.length;
    for(var i = 0; i < n; i++){
      var a = punti[i], b = punti[(i + 1) % n];
      var da = verso * (a[asse] - val) >= 0, db = verso * (b[asse] - val) >= 0;
      if(da) tenuti.push(a);
      if(da !== db){
        var t = (val - a[asse]) / (b[asse] - a[asse]);
        tenuti.push([a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])]);
      }
    }
    punti = tenuti;
  });
  return punti;
}

function poligono(punti){
  if(punti.length < 3) return 'polygon(0 0,0 0,0 0)';
  return 'polygon(' + punti.map(function(p){
    return p[0].toFixed(2) + 'px ' + p[1].toFixed(2) + 'px';
  }).join(',') + ')';
}

function immagini(el){
  return el.tagName === 'IMG' ? [el] : [].slice.call(el.querySelectorAll('img'));
}

/* Le immagini di Webflow sono in lazy load, e il browser decide quando
   scaricarle guardando quanto se ne vede: ritagliate a zero, per lui non si
   vedono mai. Senza questo restavano da scaricare fino alla fine di ATTESA,
   e il bianco partiva con l'immagine gia' passata. Qui si dice di scaricarle
   quando mancano VICINO schermate: arrivate in vista sono pronte. */
function chiama(el){
  immagini(el).forEach(function(im){ if(im.loading === 'lazy') im.loading = 'eager'; });
}

function caricata(el){
  return Promise.all(immagini(el).map(function(im){
    if(im.complete) return null;
    return new Promise(function(ok){
      im.addEventListener('load', ok, { once: true });
      im.addEventListener('error', ok, { once: true });
    });
  }));
}

function entroAttesa(p){
  return Promise.race([p, new Promise(function(ok){ setTimeout(ok, ATTESA); })]);
}

/* Un gruppo parte insieme e gira su un solo requestAnimationFrame: le
   misure si prendono una volta, all'inizio. */
function scivola(gruppo){
  var misure = gruppo.map(function(el){
    return { el: el, w: el.offsetWidth, alto: el.offsetHeight };
  });
  var t0 = 0;
  function passo(ora){
    if(!t0) t0 = ora;
    var t = Math.min(1, (ora - t0) / (DURATA * 1000));
    if(t >= 1){
      misure.forEach(function(m){
        velate.delete(m.el);
        m.el.style.clipPath = ritaglio(m.el);
      });
      return;
    }
    var e = ease(t), v = velocita(t) / VMAX;
    misure.forEach(function(m){
      var punti = scoperto(e, v, m.w, m.alto);
      var r = ritagli.get(m.el);
      m.el.style.clipPath = poligono(r ? ritaglia(punti, r) : punti);
    });
    requestAnimationFrame(passo);
  }
  requestAnimationFrame(passo);
}

function avviaSkew(){
  /* La rete dell'head e' scattata: questo file e' arrivato tardi e le
     immagini sono gia' scoperte. Ricoprirle adesso sarebbe un lampo. */
  if(h.classList.contains(SCADUTO)) return;

  var attesa = [].slice.call(document.querySelectorAll(SEL_SKEW));
  if(ridotto || !attesa.length){
    h.classList.remove(IN_ATTESA);
    return;
  }

  /* Da qui in poi a coprirle e' lo stile di ognuna, non la classe sul tag
     html: si possono scoprire una per una. */
  attesa.forEach(function(el){
    velate.add(el);
    el.style.clipPath = COPERTO;
  });
  h.classList.remove(IN_ATTESA);

  /* Niente IntersectionObserver: Chrome misura la parte visibile DOPO il
     ritaglio dell'elemento stesso, e un'immagine coperta, ritagliata a zero,
     per lui non entra mai. La posizione la guardiamo noi, a ogni scroll.

     Entrato vuol dire: se ne vede almeno ENTRA di schermata, oppure si vede
     tutto. La seconda serve a un'immagine piccola in fondo alla pagina, che
     arrivati in fondo non sale abbastanza da farsi vedere per ENTRA. Un
     elemento nascosto misura zero e aspetta. */
  var inCoda = false;

  function guarda(){
    inCoda = false;
    var vh = window.innerHeight, vw = window.innerWidth, gruppo = [];
    attesa = attesa.filter(function(el){
      var r = el.getBoundingClientRect();
      if(r.right <= 0 || r.left >= vw) return true;
      if(r.top < vh * (1 + VICINO) && r.bottom > -vh * VICINO) chiama(el);
      var visto = Math.min(r.bottom, vh) - Math.max(r.top, 0);
      if(visto > 0 && visto >= Math.min(ENTRA * vh, r.height - 1)){
        gruppo.push(el);
        return false;
      }
      return true;
    });
    if(gruppo.length){
      entroAttesa(Promise.all(gruppo.map(caricata))).then(function(){ scivola(gruppo); });
    }
    if(!attesa.length){
      window.removeEventListener('scroll', sveglia);
      window.removeEventListener('resize', sveglia);
      window.removeEventListener('load', sveglia);
    }
  }

  function sveglia(){
    if(inCoda) return;
    inCoda = true;
    requestAnimationFrame(guarda);
  }

  window.addEventListener('scroll', sveglia, { passive: true });
  window.addEventListener('resize', sveglia, { passive: true });
  window.addEventListener('load', sveglia);
  sveglia();
}

/* ── slow ─────────────────────────────────────────────────────────────── */

function avviaSlow(){
  var els = [].slice.call(document.querySelectorAll(SEL_SLOW));
  if(ridotto || !els.length) return;
  try{ if(!CSS.supports('translate', '0 1px')) return; }catch(e){ return; }

  var stati = els.map(function(el){ return { el: el, y: 0, meta: 0 }; });
  var attivo = false, girando = false, ultimo = 0;

  /* Dove starebbe senza di noi: la sua misura meno lo spostamento che gli
     abbiamo dato. Letta ogni volta, quindi segue da sola le immagini che
     finiscono di caricare e tutto quello che cambia l'altezza della pagina.

     La corsa parte quando il bordo alto entra dal basso — o dall'apertura
     della pagina, per chi e' gia' in vista: cosi' al primo disegno tutto e'
     esattamente dove sta nel Designer. Finisce quando il bordo basso esce in
     cima, e da li' lo spostamento resta com'e'. */
  function mete(){
    var vh = window.innerHeight;
    var sy = window.scrollY || window.pageYOffset;
    stati.forEach(function(s){
      /* Dal centro e non dalla cima: se ha anche .parallax e' ingrandito, e
         lo zoom sposta la cima ma non il centro. Si tolgono tutti e due gli
         spostamenti, il nostro e quello di parallax. */
      var r = s.el.getBoundingClientRect();
      var alto = s.el.offsetHeight || r.height;
      var cima = (r.top + r.bottom) / 2 - spinta(s.el) - alto / 2;
      var corsa = Math.min(sy, vh - cima);
      corsa = Math.max(0, Math.min(vh + alto, corsa));
      s.meta = (1 - LENTO) * corsa;
    });
  }

  function passo(ora){
    if(!attivo){ girando = false; return; }
    var dt = ultimo ? Math.min(64, ora - ultimo) : 1000 / 60;
    ultimo = ora;
    var k = 1 - Math.pow(1 - INERZIA, dt * 60 / 1000);

    mete();

    var fermo = true;
    stati.forEach(function(s){
      var y = s.y + (s.meta - s.y) * k;
      if(Math.abs(s.meta - y) < 0.05) y = s.meta;
      else fermo = false;
      if(y !== s.y){
        s.y = y;
        sposta(s.el, 'slow', y);
      }
    });

    if(fermo){ girando = false; return; }
    requestAnimationFrame(passo);
  }

  function sveglia(){
    if(girando || !attivo) return;
    girando = true;
    ultimo = 0;
    requestAnimationFrame(passo);
  }

  function controlla(){
    var largo = window.innerWidth >= MIN_W;
    if(largo === attivo){ sveglia(); return; }
    attivo = largo;
    if(!attivo){
      stati.forEach(function(s){ s.y = 0; s.meta = 0; sposta(s.el, 'slow', 0); });
      return;
    }
    sveglia();
  }

  window.addEventListener('scroll', sveglia, { passive: true });
  window.addEventListener('resize', controlla, { passive: true });
  window.addEventListener('load', sveglia);
  controlla();
}

/* ── parallax ─────────────────────────────────────────────────────────── */

function avviaParallax(){
  var foto = [];
  [].slice.call(document.querySelectorAll(SEL_PARALLAX)).forEach(function(el){
    immagini(el).forEach(function(im){ if(foto.indexOf(im) < 0) foto.push(im); });
  });
  if(ridotto || !foto.length) return;
  try{ if(!CSS.supports('scale', '1') || !CSS.supports('translate', '0 1px')) return; }catch(e){ return; }

  foto.forEach(function(im){ im.style.scale = String(ZOOM); });

  /* Quanto ha attraversato lo schermo: 0 con la cima sul bordo basso, 1 col
     fondo sul bordo alto. Il riquadro si misura dal centro, che lo zoom non
     sposta, togliendo solo il nostro spostamento: quello di slow e' un
     movimento vero della cornice, e la foto lo deve seguire.

     Da -margine a +margine: entrando la foto e' spinta in su e si vede la sua
     parte bassa, uscendo e' spinta in giu' e si vede la parte alta. Mentre la
     cornice sale, l'immagine dentro scende: resta indietro.

     Il ritaglio e' il riquadro di prima riportato dentro la foto trasformata:
     un punto a quota y finisce a centro + ZOOM * (y - centro) + spostamento,
     e si tiene solo quello che finisce fra 0 e l'altezza. */
  function passa(){
    inCoda = false;
    var vh = window.innerHeight;
    foto.forEach(function(im){
      var W = im.offsetWidth, H = im.offsetHeight;
      if(!W || !H) return;
      var r = im.getBoundingClientRect();
      var prima = spinta(im, 'parallax');
      var cima = (r.top + r.bottom) / 2 - prima - H / 2;
      var p = (vh - cima) / (vh + H);
      p = p < 0 ? 0 : (p > 1 ? 1 : p);
      var ty = (2 * p - 1) * (ZOOM - 1) / 2 * H;

      var cx = W / 2, cy = H / 2;
      var su   = cy - (cy + ty) / ZOOM;
      var giu  = cy - (cy - ty) / ZOOM;
      var lato = cx - cx / ZOOM;
      var clip = 'inset(' + su.toFixed(2) + 'px ' + lato.toFixed(2) + 'px ' +
                 giu.toFixed(2) + 'px ' + lato.toFixed(2) + 'px)';
      ritagli.set(im, { L: lato, R: W - lato, T: su, B: H - giu, clip: clip });

      if(Math.abs(ty - prima) > 0.05) sposta(im, 'parallax', ty);
      if(!velate.has(im) && im.style.clipPath !== clip) im.style.clipPath = clip;
    });
  }

  var inCoda = false;
  function sveglia(){
    if(inCoda) return;
    inCoda = true;
    requestAnimationFrame(passa);
  }

  window.addEventListener('scroll', sveglia, { passive: true });
  window.addEventListener('resize', sveglia, { passive: true });
  window.addEventListener('load', sveglia);
  passa();
}

function avvia(){
  avviaSkew();
  avviaParallax();
  avviaSlow();

  window.capePatti && capePatti.dichiara('skew-img, slow e parallax', {
    scrivo: [['clip-path', '.skew-img', 'la tiene coperta finche\' non entra, poi la scopre e lo toglie'],
             ['translate', '.slow', 'lo fa restare indietro mentre sale; transform resta libero'],
             ['scale / translate / clip-path', '.parallax', 'la foto zoomata che scorre dentro il suo riquadro'],
             [IN_ATTESA, 'html', 'la toglie appena ha coperto le immagini una per una']],
    leggo:  [[SCADUTO, 'html', 'la rete dell\'head e\' scattata: le immagini restano scoperte']]
  });
}

if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', avvia);
else avvia();

})();
