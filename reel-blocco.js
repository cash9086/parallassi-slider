/* parallassi-slider — reel-blocco.js
   Il magnete che ti riseduta all'arrivo della sezione reel di The Cape Studio.
   Gira da solo: se in pagina non c'è [data-reel] esce subito e non costa niente.
   Le manopole e il perché di ognuna stanno qui sotto; il quadro d'insieme
   nel README della repo.
*/
/* ══ 1. IL BLOCCO ═══════════════════════════════════════════════════════
   Lo stesso magnete che .cape-hs-wrap ha ai suoi due bordi, qui su un
   bordo solo: l'ancora è la posizione in cui il fondo del reel si appoggia
   al fondo dello schermo. Chi arriva giù di corsa viene riseduto lì invece
   di passare oltre.

   Una differenza col rig, e non è un capriccio: là il magnete è sempre
   acceso, qui si spegne appena ha fatto il suo lavoro e si riarma solo
   quando sei risalito sopra la sezione. Deve essere così perché subito
   DOPO l'ancora comincia la salita dei riquadri (blocco 2): un magnete
   ancora acceso ti ritirerebbe all'indietro ogni volta che ti fermi a
   guardarla, e l'effetto non lo vedresti mai.                          */
(function(){
'use strict';

/* ── manopole ────────────────────────────────────────────────────────── */

var BANDA_SU  = 0.28; /* frazione di schermo: quanto PRIMA dell'ancora il
                         magnete comincia a tirare. È lo stesso 0.28 del
                         rig.                                            */
var BANDA_GIU = 0.45; /* e quanto DOPO. Più larga, perché chi arriva di
                         corsa sfonda l'ancora e va ripreso da sotto: è la
                         ragione per cui il blocco esiste.               */
var RIARMO    = 1.20; /* schermate di distanza sopra la sezione per cui il
                         magnete torna acceso. Serve solo al secondo
                         passaggio: risali sopra il reel, e ridiscendendo
                         ti riprende come la prima volta.                */
var ATTESA    = 30;   /* ms di quiete prima di tirare: finché la rotella
                         gira non ti tocca. Stesso valore del rig.       */
var DURATA    = 0.70; /* secondi della tirata. Stessa curva del rig.     */
var DA_992    = true; /* solo desktop. Su touch una scrollata programmata
                         in mezzo a un lancio di dito si sente come uno
                         strappo: il rig se lo può permettere perché lì il
                         pin è già un vincolo dichiarato, qui no.
                         Mettilo a false se lo vuoi anche sul telefono.  */


var sec = document.querySelector('[data-reel]');
if(!sec) return;
if(DA_992 && window.innerWidth < 992) return;
try{ if(matchMedia('(prefers-reduced-motion: reduce)').matches) return; }catch(e){}

var armato = true, tirando = false, attesaT = null;

/* La posizione di pagina in cui il bordo basso del reel tocca il bordo
   basso dello schermo. È anche lo zero della salita: da qui in poi comanda
   il blocco 2, e i due numeri devono restare lo stesso numero. */
function ancora(){
  var y = window.scrollY || window.pageYOffset || 0;
  return sec.getBoundingClientRect().bottom + y - (window.innerHeight || 1);
}

function finito(){ tirando = false; }

function tira(){
  if(tirando) return;

  var vh = window.innerHeight || 1;
  var y  = window.scrollY || window.pageYOffset || 0;
  var d  = y - ancora();       /* negativo: non ci sei ancora. positivo: sei oltre */

  /* Risalito bene sopra la sezione: il magnete si ricarica per la
     prossima discesa. Sotto invece non si ricarica mai — tornare su
     dentro la salita dev'essere libero come scendere.                */
  if(d < -RIARMO * vh){ armato = true; return; }
  if(!armato) return;
  if(d < -BANDA_SU * vh || d > BANDA_GIU * vh) return;

  armato = false;               /* una tirata sola per passaggio */
  if(Math.abs(d) < 6) return;   /* già seduto: non c'è niente da fare */

  tirando = true;
  var tgt = y - d;

  if(window.lenis){
    window.lenis.scrollTo(tgt, {
      duration: DURATA,
      easing: function(t){ return 1 - Math.pow(1 - t, 3); },
      onComplete: finito
    });
  } else {
    try{ window.scrollTo({ top:tgt, behavior:'smooth' }); }
    catch(e){ window.scrollTo(0, tgt); }
  }
  setTimeout(finito, DURATA * 2000);   /* rete di sicurezza se onComplete non arriva */
}

function scrollato(){
  if(tirando) return;
  clearTimeout(attesaT);
  attesaT = setTimeout(tira, ATTESA);
}

/* Lenis sta nel footer e non è detto sia già in piedi quando questo parte:
   lo si aspetta, perché attaccarsi a window.scroll mentre Lenis è vivo
   vuol dire leggere la posizione un fotogramma in ritardo. Dopo 8 secondi
   di attesa Lenis non arriverà più — è un telefono, o Firefox — e allora
   ci si attacca allo scroll vero. Stesso schema del rig. */
(function aggancia(n){
  if(window.lenis){ window.lenis.on('scroll', scrollato); return; }
  if(n < 40){ setTimeout(function(){ aggancia(n + 1); }, 200); return; }
  window.addEventListener('scroll', scrollato, { passive:true });
})(0);
})();
