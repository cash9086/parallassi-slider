/* parallassi-slider — cape-skew-slow.js
   Due effetti che si accendono con una classe messa nel Designer. Nati per la
   pagina minimal, ma non sanno niente di lei: vanno su qualunque pagina.

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
   Sale piu' lento dello scroll: all'80%. Entra dal basso esattamente dove sta
   nel Designer, poi resta indietro, e lo spazio con quello che ha sopra
   cresce. Non e' incollato alla rotella: insegue la sua posizione con un po'
   di ritardo, ed e' quello il peso che si sente.

   Si muove con la proprieta' `translate`, non con `transform`. Le due si
   sommano invece di cancellarsi: un elemento che ha gia' un suo transform —
   lo zoom della foto dell'header, un Move del Designer, una Interaction —
   se lo tiene.

   Solo da 992px in su, come lo scroll morbido della pagina. Sotto sta fermo.

   VA IN PAGINA: le righe dell'head (nel README, sezione cape-skew-slow.js),
   e un tag <script defer> nel footer. Nessuna dipendenza.

   prefers-reduced-motion: niente di tutto questo. Le immagini sono scoperte e
   niente resta indietro.
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

var LENTO    = 0.80;   /* velocita' di salita di .slow, rispetto allo scroll */
var INERZIA  = 0.10;   /* quanta strada recupera a ogni fotogramma a 60fps:
                          1 e' incollato alla rotella, piu' basso e' piu'
                          pesante. E' la MORBIDEZZA di reel-salita.js.       */
var MIN_W    = 992;

/* ── da qui in giu' non ci sono numeri da girare ──────────────────────── */

var SEL_SKEW = '.skew-img';
var SEL_SLOW = '.slow';

/* Le classi che l'head mette sul tag html prima del primo disegno. */
var IN_ATTESA = 'skew-attesa';
var SCADUTO   = 'skew-scaduto';

var h = document.documentElement;

var ridotto = false;
try{ ridotto = matchMedia('(prefers-reduced-motion: reduce)').matches; }catch(e){}

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
  var sposta = -e * w;
  var q = Math.tan(-SKEW * v * Math.PI / 180);
  var a = w + sposta - q * alto / 2;
  var b = w + sposta + q * alto / 2;
  return 'polygon(' + a + 'px 0,' + w + 'px 0,' + w + 'px ' + alto + 'px,' + b + 'px ' + alto + 'px)';
}

function caricata(el){
  var imgs = el.tagName === 'IMG' ? [el] : [].slice.call(el.querySelectorAll('img'));
  return Promise.all(imgs.map(function(im){
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
      misure.forEach(function(m){ m.el.style.clipPath = ''; });
      return;
    }
    var e = ease(t), v = velocita(t) / VMAX;
    misure.forEach(function(m){ m.el.style.clipPath = scoperto(e, v, m.w, m.alto); });
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
  attesa.forEach(function(el){ el.style.clipPath = COPERTO; });
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
      var r = s.el.getBoundingClientRect();
      var cima = r.top - s.y;
      var corsa = Math.min(sy, vh - cima);
      corsa = Math.max(0, Math.min(vh + r.height, corsa));
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
        s.el.style.translate = '0 ' + y.toFixed(2) + 'px';
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
      stati.forEach(function(s){ s.y = 0; s.meta = 0; s.el.style.translate = ''; });
      return;
    }
    sveglia();
  }

  window.addEventListener('scroll', sveglia, { passive: true });
  window.addEventListener('resize', controlla, { passive: true });
  window.addEventListener('load', sveglia);
  controlla();
}

function avvia(){
  avviaSkew();
  avviaSlow();

  window.capePatti && capePatti.dichiara('skew-img e slow', {
    scrivo: [['clip-path', '.skew-img', 'la tiene coperta finche\' non entra, poi la scopre e lo toglie'],
             ['translate', '.slow', 'lo fa restare indietro mentre sale; transform resta libero'],
             [IN_ATTESA, 'html', 'la toglie appena ha coperto le immagini una per una']],
    leggo:  [[SCADUTO, 'html', 'la rete dell\'head e\' scattata: le immagini restano scoperte']]
  });
}

if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', avvia);
else avvia();

})();
