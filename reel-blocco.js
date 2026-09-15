/* parallassi-slider — reel-blocco.js
   Arrivato in fondo alla sezione reel lo scroll si FERMA per qualche
   centinaio di millisecondi. Non è uno snap e non ti sposta di un pixel:
   ti toglie la corsa. Per proseguire devi ricominciare a scrollare.
   Gira da solo: se in pagina non c'è [data-reel] esce subito.
   Le manopole e il perché di ognuna stanno qui sotto; il quadro d'insieme
   nel README della repo.
*/
(function(){
'use strict';

/* ── manopole ────────────────────────────────────────────────────────── */

var MS      = 420;  /* quanto dura il blocco, in millisecondi. Sotto ~200 non
                       si legge come una pausa, si legge come un incespicare.
                       Sopra ~700 comincia a sembrare che il sito sia
                       impallato.                                          */

var SOGLIA  = 0.00; /* dove scatta, in schermate oltre il fondo della
                       sezione. 0 = esattamente quando la sezione ha finito
                       di passare, cioè a salita completata. Positivo lo
                       sposta più avanti, negativo più indietro.           */

var RIARMO  = 0.60; /* schermate da risalire perché il blocco torni carico.
                       Scatta una volta per passaggio: se si riarmasse
                       subito, fermarsi sulla soglia vorrebbe dire prenderlo
                       a ripetizione.                                      */

var DA_992  = true; /* solo desktop. Su touch il dito è già staccato dallo
                       schermo quando la pagina scorre per inerzia, e
                       togliergli la corsa in quel momento si sente come un
                       aggancio rotto, non come una pausa voluta.
                       Mettilo a false se lo vuoi anche sul telefono.      */


var sec = document.querySelector('[data-reel]');
if(!sec) return;
if(DA_992 && window.innerWidth < 992) return;
try{ if(matchMedia('(prefers-reduced-motion: reduce)').matches) return; }catch(e){}


/* ── il fermo ────────────────────────────────────────────────────────────
   Con Lenis basta chiedere: stop() smette di animare E azzera la velocità.
   È quest'ultima cosa a fare l'effetto — alla ripartenza non c'è nessuna
   corsa residua da riprendere, quindi la pagina resta ferma finché non
   tocchi di nuovo la rotella. Un semplice "ignora gli eventi per N ms"
   invece lascerebbe l'inerzia intatta e la pagina ripartirebbe da sola.

   Senza Lenis — telefono, Firefox — la stessa cosa va fatta a mano: si
   rifiuta ogni rotella e ogni dito, e se qualcosa scorre lo stesso
   (tastiera, barra di scorrimento) lo si rimette dov'era. `passive:false`
   qui è obbligatorio: senza, preventDefault viene ignorato.             */

var bloccato = false;

function nativo(y){
  function fermo(e){ if(e.cancelable) e.preventDefault(); }
  function rimetti(){ window.scrollTo(0, y); }

  window.addEventListener('wheel',     fermo,   { passive:false });
  window.addEventListener('touchmove', fermo,   { passive:false });
  window.addEventListener('scroll',    rimetti, { passive:true  });

  setTimeout(function(){
    window.removeEventListener('wheel',     fermo,   { passive:false });
    window.removeEventListener('touchmove', fermo,   { passive:false });
    window.removeEventListener('scroll',    rimetti, { passive:true  });
    bloccato = false;
  }, MS);
}

function blocca(){
  if(bloccato) return;
  bloccato = true;

  if(window.lenis && window.lenis.stop){
    try{
      window.lenis.stop();
      setTimeout(function(){
        try{ window.lenis.start(); }catch(e){}
        bloccato = false;
      }, MS);
      return;
    }catch(e){ /* se Lenis fa i capricci si ripiega sotto */ }
  }

  nativo(window.scrollY || window.pageYOffset || 0);
}


/* ── quando ──────────────────────────────────────────────────────────────
   La soglia è il fondo della SCATOLA, non della sezione: se reel-salita.js
   ha costruito la tenuta, la sezione ci sta incollata dentro e il suo
   fondo resta immobile per tutta la salita — prenderlo come riferimento
   vorrebbe dire non scattare mai. Il fondo della scatola invece continua a
   salire, e arriva in cima proprio quando la salita è finita. Se la tenuta
   non c'è, scatola e sezione sono la stessa cosa e il conto non cambia. */

var precedente = null, armato = true;

function scatola(){ return document.querySelector('[data-reel-tenuta]') || sec; }

function guarda(){
  var vh = window.innerHeight || 1;
  var d  = vh - scatola().getBoundingClientRect().bottom;

  if(precedente === null){ precedente = d; return; }
  var scendendo = d > precedente;
  var soglia    = SOGLIA * vh;
  var passata   = precedente < soglia && d >= soglia;
  precedente    = d;

  /* Risalito bene sopra: il blocco si ricarica per la prossima discesa. */
  if(d < -RIARMO * vh){ armato = true; return; }

  if(!armato || bloccato) return;
  if(scendendo && passata){ armato = false; blocca(); }
}


/* Lenis sta nel footer e non è detto sia già in piedi quando questo parte:
   lo si aspetta, perché attaccarsi a window.scroll mentre Lenis è vivo vuol
   dire leggere la posizione un fotogramma in ritardo — e un fotogramma di
   ritardo su una soglia significa mancarla quando scrolli forte. Dopo 8
   secondi Lenis non arriverà più e ci si attacca allo scroll vero. Stesso
   schema del rig. */
(function aggancia(n){
  if(window.lenis && window.lenis.on){ window.lenis.on('scroll', guarda); return; }
  if(n < 40){ setTimeout(function(){ aggancia(n + 1); }, 200); return; }
  window.addEventListener('scroll', guarda, { passive:true });
})(0);
})();
