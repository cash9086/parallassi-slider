/* parallassi-slider — cape-tendina.js
   La tendina dei testi della home — quella delle slide di .cape-hs-wrap —
   su qualunque elemento abbia la classe .tendina nel Designer. Nata per la
   pagina minimal, ma non sa niente di lei.

   COSA FA
   -------
   Quando la cima dell'elemento arriva all'80% dello schermo, il testo sale
   da dietro il proprio bordo: un secondo, con la stessa curva della home.
   Quando esce del tutto dallo schermo si rimette sotto il bordo, e
   rientrando risale: come le slide dell'orizzontale, a ogni passaggio.

   Tre modi, scelti da soli guardando l'elemento:
   - solo testo      riga per riga: si misura dove va a capo davvero, ogni
                     riga sale dietro il suo bordo, 0.09 s dopo la precedente
                     (e' .testo-scroll nella home)
   - testo con dentro altri elementi (un link, un grassetto, un a capo)
                     tutto il blocco sale come una riga sola, per non perderli
                     (sono i titoli e i sottotitoli nella home)
   - un link o un bottone, o un contenitore flex o grid
                     sale di 20px comparendo, senza ritaglio: il ritaglio
                     taglierebbe il contorno del focus, e dentro un flex o un
                     grid l'involucro della tendina romperebbe l'impaginazione
                     (sono i DISCOVER nella home)

   Piu' elementi che partono insieme vanno a cascata, nell'ordine della
   pagina, 0.15 s uno dall'altro: lo scalino della home.

   VA IN PAGINA: le righe dell'head (nel README, sezione cape-tendina.js), e
   un tag <script defer> nel footer. Nessuna dipendenza.

   prefers-reduced-motion: niente tendina, i testi sono al loro posto.
*/
(function(){
'use strict';

/* ── le manopole: sono quelle della tendina della home ─────────────────── */

var DURATA   = 1000;   /* ms di una salita                                   */
var SCALINO  = 150;    /* ms fra un elemento e il successivo                 */
var RIGA     = 90;     /* ms fra una riga e la successiva dello stesso testo */
var PARTENZA = 0.80;   /* parte quando la cima arriva a questa altezza dello
                          schermo, contata dall'alto                          */
var SALITA   = 20;     /* px di cui sale un bottone                          */
var ATTESA_FONT = 1200; /* ms: oltre questo non si aspetta il font vero per
                           misurare le righe                                  */
var CURVA    = 'cubic-bezier(.16,1,.3,1)';

/* ── da qui in giu' non ci sono numeri da girare ──────────────────────── */

var SEL       = '.tendina';
var BOTTONE   = 'a, button, .w-button';
var IN_ATTESA = 'tendina-attesa';
var SCADUTO   = 'tendina-scaduto';

var h = document.documentElement;

var ridotto = false;
try{ ridotto = matchMedia('(prefers-reduced-motion: reduce)').matches; }catch(e){}

/* Il vestito delle classi che questo file si crea. Qui e non nell'head
   perche' sono meta' di un meccanismo la cui altra meta' e' in questo file.
   Il ritaglio e' clip-path e non overflow: il -100% ai lati non taglia la
   pancia delle lettere, i -0.14em sopra e sotto lasciano respirare accenti e
   discendenti. Sono i numeri della home. */
function vesti(){
  if(document.getElementById('cape-tendina-css')) return;
  var st = document.createElement('style');
  st.id = 'cape-tendina-css';
  st.textContent =
    '.tendina-ln{display:block}' +
    '.tendina-riga{display:block}' +
    '.tendina-armata{clip-path:inset(-0.14em -100% -0.14em -100%)}';
  document.head.appendChild(st);
}

function impaginato(el){
  return !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
}

/* Di quanto scendere per sparire davvero: il riquadro vero, un quarto in
   piu', e un dito di margine. E' il giu() della home, e il commento che lo
   spiega sta la'. */
function giu(w){
  var alto = 0;
  try{
    var box = w.parentNode;
    alto = Math.max(box ? box.getBoundingClientRect().height : 0,
                    w.getBoundingClientRect().height);
  }catch(e){}
  return alto > 0 ? Math.ceil(alto * 1.25 + 12) + 'px' : '135%';
}

function tipo(el){
  if(el.matches(BOTTONE)) return 'bottone';
  var d = getComputedStyle(el).display;
  if(/flex|grid/.test(d)) return 'bottone';
  return el.children.length ? 'blocco' : 'righe';
}

/* ── costruire e smontare ─────────────────────────────────────────────── */

function blocco(v){
  var w = document.createElement('span');
  w.className = 'tendina-ln';
  while(v.el.firstChild) w.appendChild(v.el.firstChild);
  v.el.appendChild(w);
  v.parti = [w];
}

/* Dove va a capo davvero: una <span> per parola, e si guarda quale cambia
   riga. Poi ogni riga diventa un riquadro suo, che fa da finestra. */
function righe(v){
  var el = v.el;
  var parole = v.testo.trim().split(/\s+/);
  el.textContent = '';
  var sonde = parole.map(function(p, i){
    var s = document.createElement('span');
    s.textContent = p;
    el.appendChild(s);
    if(i < parole.length - 1) el.appendChild(document.createTextNode(' '));
    return s;
  });

  var file = [], ultima = null;
  sonde.forEach(function(s, i){
    var cima = Math.round(s.offsetTop);
    if(ultima === null || cima - ultima > 2){ ultima = cima; file.push([]); }
    file[file.length - 1].push(parole[i]);
  });

  /* Fra una riga e l'altra resta uno spazio: fra due blocchi non si vede, ma
     senza, chi copia il testo o lo legge con un lettore di schermo trova
     l'ultima parola di una riga attaccata alla prima della successiva. */
  el.textContent = '';
  v.parti = file.map(function(f, i){
    if(i) el.appendChild(document.createTextNode(' '));
    var box = document.createElement('span');
    box.className = 'tendina-riga';
    var w = document.createElement('span');
    w.className = 'tendina-ln';
    w.textContent = f.join(' ');
    box.appendChild(w);
    el.appendChild(box);
    return w;
  });
}

function costruisci(v){
  if(v.tipo === 'bottone'){ v.parti = [v.el]; return; }
  if(!impaginato(v.el) || (v.tipo === 'righe' && !v.testo.trim())){ v.parti = []; return; }
  if(v.tipo === 'blocco') blocco(v);
  else righe(v);
}

function smonta(v){
  if(v.tipo === 'righe'){
    if(v.parti.length) v.el.textContent = v.testo;
    v.parti = [];
    return;
  }
  if(v.tipo === 'blocco'){
    var w = v.parti[0];
    if(w && w.parentNode === v.el){
      while(w.firstChild) v.el.insertBefore(w.firstChild, w);
      v.el.removeChild(w);
    }
    v.parti = [];
  }
}

/* ── gli stati: armata (sotto il bordo) e fatta (al suo posto) ────────── */

function ferma(v){
  v.corse.forEach(function(a){ try{ a.cancel(); }catch(e){} });
  v.corse = [];
}

function arma(v){
  ferma(v);
  if(v.tipo === 'bottone'){
    v.el.style.transition = 'none';
    v.el.style.transform  = 'translateY(' + SALITA + 'px)';
    v.el.style.opacity    = '0';
  } else {
    v.parti.forEach(function(w){
      w.parentNode.classList.add('tendina-armata');
      w.style.transform = 'translateY(' + giu(w) + ')';
    });
  }
  v.armata = true;
}

function posa(v, w){
  w.style.removeProperty('transform');
  if(v.tipo === 'bottone'){
    w.style.removeProperty('opacity');
    if(v.transizione) w.style.transition = v.transizione;
    else w.style.removeProperty('transition');
  } else if(w.parentNode){
    w.parentNode.classList.remove('tendina-armata');
  }
}

function scopri(v){
  ferma(v);
  v.parti.forEach(function(w){ posa(v, w); });
  v.armata = false;
}

/* La cascata: SCALINO fra un elemento e l'altro, RIGA fra le righe dello
   stesso testo. Non vale solo dentro un fotogramma: due testi uno sotto
   l'altro, scrollando, diventano pronti a pochi fotogrammi di distanza, e
   partirebbero quasi insieme. Quindi si ricorda quando potra' partire il
   prossimo, e chi arriva prima di allora aspetta il suo turno. */
var prossimo = 0;

function gioca(v, dopo){
  var adesso = performance.now();
  var inizio = Math.max(adesso, prossimo);
  var ritardo = inizio - adesso;
  v.armata = false;
  v.parti.forEach(function(w, i){
    var fotogrammi = v.tipo === 'bottone'
      ? [{ transform: 'translateY(' + SALITA + 'px)', opacity: 0 },
         { transform: 'translateY(0)', opacity: 1 }]
      : [{ transform: 'translateY(' + giu(w) + ')' }, { transform: 'translateY(0)' }];
    var a = w.animate(fotogrammi, { duration: DURATA, delay: ritardo + i * RIGA, easing: CURVA, fill: 'both' });
    v.corse.push(a);
    a.onfinish = function(){
      posa(v, w);
      try{ a.cancel(); }catch(e){}
      v.corse = v.corse.filter(function(c){ return c !== a; });
      if(!v.corse.length && dopo) dopo(v);
    };
  });
  prossimo = inizio + Math.max(0, v.parti.length - 1) * RIGA + SCALINO;
}

/* ── dove sta ─────────────────────────────────────────────────────────── */

function pronta(r, vh, vw){
  return r.top < vh * PARTENZA && r.bottom > 0 && r.right > 0 && r.left < vw;
}

/* Fuori vuol dire del tutto oltre un bordo dello schermo: non basta che sia
   sotto la soglia di partenza, se no scorrendo piano sul confine partirebbe
   e si riarmerebbe a singhiozzo. */
function fuori(r, vh, vw){
  return r.bottom < 0 || r.top > vh || r.right < 0 || r.left > vw;
}

function avvia(){
  var voci = [].slice.call(document.querySelectorAll(SEL)).map(function(el){
    var v = { el: el, tipo: tipo(el), parti: [], corse: [], armata: false,
              transizione: el.style.transition || '' };
    if(v.tipo === 'righe') v.testo = el.textContent;
    return v;
  });

  if(ridotto || !voci.length){
    h.classList.remove(IN_ATTESA);
    return;
  }

  vesti();

  /* La rete dell'head e' scattata: questo file e' arrivato tardi e i testi
     si vedono gia'. Quelli in vista restano come sono; gli altri si armano
     appena escono dallo schermo, e da li' in poi e' tutto come sempre. */
  var tardi = h.classList.contains(SCADUTO);

  voci.forEach(function(v){
    costruisci(v);
    if(!tardi) arma(v);
  });
  h.classList.remove(IN_ATTESA);

  var atteso = false, partito = false;

  function passa(){
    atteso = false;
    if(!partito) return;
    var vh = window.innerHeight, vw = window.innerWidth;
    voci.forEach(function(v){
      if(!v.parti.length) return;
      var r = v.el.getBoundingClientRect();
      if(!r.width && !r.height) return;
      if(v.armata){ if(pronta(r, vh, vw)) gioca(v, finita); }
      else if(fuori(r, vh, vw)){ arma(v); if(v.rifare) rifai(v); }
    });
  }

  function sveglia(){
    if(atteso) return;
    atteso = true;
    requestAnimationFrame(passa);
  }

  /* Cambia la larghezza o arriva il font vero, cambiano gli a capo: si
     rismonta e si ricostruisce, e ognuno torna nello stato in cui era. Chi
     sta salendo si rifa' quando ha finito: fermarlo a meta' vorrebbe dire
     vederlo scattare al suo posto senza tendina. */
  function rifai(v){
    var armata = v.armata;
    v.rifare = false;
    scopri(v);
    smonta(v);
    costruisci(v);
    if(armata) arma(v);
  }

  function finita(v){
    if(v.rifare) rifai(v);
  }

  function ricostruisci(){
    voci.forEach(function(v){
      if(v.corse.length) v.rifare = true;
      else rifai(v);
    });
    sveglia();
  }

  /* Si comincia col font vero: le righe misurate con quello di ripiego
     andrebbero a capo in un altro punto. Se il font tarda, non lo si aspetta
     oltre ATTESA_FONT: i testi sono coperti, e coperti non si leggono. */
  function parti(){
    if(partito) return;
    partito = true;
    ricostruisci();
  }

  window.addEventListener('scroll', sveglia, { passive: true });
  window.addEventListener('load', sveglia);

  var largo = window.innerWidth, rT = null;
  window.addEventListener('resize', function(){
    clearTimeout(rT);
    rT = setTimeout(function(){
      if(window.innerWidth === largo){ sveglia(); return; }
      largo = window.innerWidth;
      if(partito) ricostruisci();
    }, 180);
  }, { passive: true });

  if(document.fonts && document.fonts.ready){
    document.fonts.ready.then(function(){ if(partito) ricostruisci(); else parti(); });
    setTimeout(parti, ATTESA_FONT);
  } else {
    parti();
  }

  window.capePatti && capePatti.dichiara('tendina a classe', {
    scrivo: [['tendina-ln / tendina-riga / tendina-armata', '.tendina',
              'l\'involucro che sale e la finestra che lo ritaglia'],
             [IN_ATTESA, 'html', 'la toglie appena ha armato i testi uno per uno']],
    leggo:  [[SCADUTO, 'html', 'la rete dell\'head e\' scattata: i testi in vista restano come sono']]
  });
}

if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', avvia);
else avvia();

})();
