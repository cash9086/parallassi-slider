/* parallassi-slider — cape-onda.js
   L'invito dei bottoni: quando un bottone è fermo al suo posto e in vista,
   ogni tanto le sue lettere scivolano di un soffio verso destra, una dopo
   l'altra, e tornano. Si legge un'onda morbida che attraversa la parola.
   È lo stesso invito del bottone di cape-rotta.js, con gli stessi numeri:
   se cambiano là, vanno cambiati anche qui.

   A CHI SI APPLICA
     .cape-hs-track .link-uni   i DISCOVER dello scroll orizzontale
     [data-onda]                qualunque altro bottone, se un domani gli
                                metti questo attributo nel Designer
   Solo ai bottoni fatti di testo e basta: quelli con dentro altri elementi
   restano come sono.

   CON LA TENDINA DEL FOOTER
   La tendina fa salire i DISCOVER muovendo il bottone intero; l'onda muove
   le lettere dentro. Sono due cose diverse e non si pestano i piedi, ma
   l'onda aspetta comunque che la tendina abbia finito: parte solo quando
   il bottone non ha animazioni in corso ed è del tutto visibile.

   VA IN PAGINA: un tag <script defer> nel footer, in PARTE 2.
*/
(function(){
'use strict';

var OGNI  = 7;     /* secondi fra un invito e l'altro                   */
var PRIMO = 3.5;   /* il primo, da quando il bottone è fermo e in vista */
var EM    = 0.11;  /* di quanto scivola ogni lettera, in em             */
var DUR   = 0.9;   /* secondi di una lettera: andata e ritorno          */
var PASSO = 0.07;  /* secondi fra una lettera e la successiva           */

var SEL = '.cape-hs-track .link-uni, [data-onda]';
var CURVA = 'cubic-bezier(.37,0,.63,1)';

function init(){
  try{ if(matchMedia('(prefers-reduced-motion: reduce)').matches) return; }catch(e){}

  var bottoni = [];
  [].forEach.call(document.querySelectorAll(SEL), function(b){
    if(b.children.length || b._onda) return;
    var scritta = b.textContent;
    if(!scritta.trim()) return;
    b._onda = true;
    b.setAttribute('aria-label', scritta.trim());
    b.textContent = '';
    var lettere = [];
    for(var i = 0; i < scritta.length; i++){
      var sp = document.createElement('span');
      sp.setAttribute('aria-hidden', 'true');
      sp.style.display = 'inline-block';
      sp.style.whiteSpace = 'pre';
      sp.textContent = scritta[i];
      b.appendChild(sp);
      if(scritta[i].trim()) lettere.push(sp);
    }
    var o = { el: b, lettere: lettere, sopra: false, prossimo: 0, onda: null };
    b.addEventListener('mouseenter', function(){ o.sopra = true; ferma(o); });
    b.addEventListener('mouseleave', function(){ o.sopra = false; });
    bottoni.push(o);
  });
  if(!bottoni.length) return;

  function ferma(o){
    (o.onda || []).forEach(function(a){ try{ a.cancel(); }catch(e){} });
    o.onda = null;
    o.prossimo = 0;
  }

  /* Fermo e in vista: dentro lo schermo per intero, opaco, e senza
     animazioni sue in corso (la tendina che lo fa salire). */
  function aRiposo(b){
    var r = b.getBoundingClientRect();
    if(!r.width || r.left < 0 || r.right > window.innerWidth || r.top < 0 || r.bottom > window.innerHeight) return false;
    if(parseFloat(getComputedStyle(b).opacity) < 0.99) return false;
    if(b.getAnimations && b.getAnimations().length) return false;
    return true;
  }

  function onda(o){
    var corpo = parseFloat(getComputedStyle(o.el).fontSize) || 12;
    var dx = (corpo * EM).toFixed(2) + 'px', resta = o.lettere.length, giro = [];
    o.lettere.forEach(function(el, i){
      var a = el.animate([
        { transform: 'translateX(0)', easing: CURVA },
        { transform: 'translateX(' + dx + ')', offset: 0.5, easing: CURVA },
        { transform: 'translateX(0)' }
      ], { duration: DUR * 1000, delay: i * PASSO * 1000, easing: 'linear' });
      a.onfinish = function(){ if(--resta === 0 && o.onda === giro) o.onda = null; };
      giro.push(a);
    });
    o.onda = giro;
  }

  /* Un controllo ogni quarto di secondo basta: l'invito arriva ogni sette.
     Nessun lavoro a ogni fotogramma. */
  setInterval(function(){
    if(document.hidden) return;
    var ora = performance.now();
    bottoni.forEach(function(o){
      if(o.onda || o.sopra) return;
      if(!aRiposo(o.el)){ o.prossimo = 0; return; }
      if(!o.prossimo){ o.prossimo = ora + PRIMO * 1000; return; }
      if(ora < o.prossimo) return;
      onda(o);
      o.prossimo = ora + OGNI * 1000;
    });
  }, 250);
}

if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();

})();
