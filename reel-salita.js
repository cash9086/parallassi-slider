/* parallassi-slider — reel-salita.js
   La sezione reel si ferma, e mentre sta ferma la scaletta si alza e si
   rovescia. Gira da sola: se in pagina non c'è [data-reel] esce subito.
   Non tocca l'Embed del reel — scrive `bottom`, lui scrive `transform`,
   `width` e `height`: proprietà diverse, si sommano invece di cancellarsi.
   Le manopole e il perché di ognuna stanno qui sotto; il quadro d'insieme
   nel README della repo.
*/
(function(){
'use strict';

/* ── manopole ────────────────────────────────────────────────────────────

   SOSTA_VH e SALITA_VH sono le due che contano. Le altre rifiniscono.  */

var SOSTA_VH  = 0.80; /* LA TENUTA — schermate di scroll in cui, arrivati in
                         fondo alla sezione, non si muove NIENTE. La sezione è
                         ferma, i riquadri sono tutti appoggiati al bordo
                         basso, e tu scrolli a vuoto finché la riserva non è
                         consumata. Per proseguire devi continuare a
                         scrollare: è il blocco.

                         È la stessa cosa che fa trattieni() nell'intro, con
                         lo stesso numero: là `SOSTA = 0.80` e la riserva si
                         aggiunge all'altezza della traccia, qui a quella
                         della scatola. Il meccanismo è quello, non una
                         copia alla lontana.

                         Scatta all'INIZIO della parallassi — riquadri tutti
                         sul bordo basso — e non alla fine.                */

var SALITA_VH = 1.00; /* schermate di scroll in cui la salita si consuma,
                         DOPO che la tenuta è finita. La sezione resta ferma
                         anche qui: a muoversi sono solo i riquadri.

                         Insieme, SOSTA + SALITA sono la riserva che viene
                         aggiunta alla sezione. È il modo giusto di
                         allungarla: alzarne l'altezza nel Designer non lo
                         sarebbe, perché l'Embed del reel ricava il suo
                         gradino da `altezza della sezione × 0.185` — una
                         sezione più alta non dà più tempo, dà riquadri più
                         grandi, e a 200vh sarebbero grandi il doppio dello
                         schermo. Qui la sezione resta alta uguale e a
                         cambiare è solo quanto scroll ci vuole per
                         attraversarla: la geometria del nastro non se ne
                         accorge.

                         Come tiene fermo: la sezione entra in una scatola
                         alta `altezza + riserva` ed è `sticky`, incollata
                         col proprio fondo sul fondo dello schermo. Lo stesso
                         schema di .cape-hs-wrap, due sezioni più su.
                         Tutte e due a 0 spengono la scatola.              */

var MORBIDEZZA = 0.10; /* 0..1 — quanto la salita insegue lo scroll invece
                          di esserci incollata. Questo è lo smorzamento
                          vero: a 1 la scaletta è rigidamente agganciata
                          alla rotella e ogni strattone si vede tale e
                          quale; a 0.10 le arriva dietro, con un peso suo, e
                          una scrollata violenta si legge come una spinta
                          invece che come uno scatto.
                          È lo stesso inseguimento che l'Embed del reel usa
                          per la sua spinta, e per lo stesso motivo.      */

var CURVA = true;      /* smussa partenza e arrivo (smoothstep). La salita
                          parte piano, prende in mezzo, si posa piano.
                          false = lineare, cioè parte e si ferma di colpo. */

var SPINTA = 1.60;     /* quanto il testo in alto a sinistra viene spinto
                          via dalle immagini che salgono, in multipli della
                          strada minima per uscire dal bordo alto.
                          1.00 = esce esattamente sul filo a salita finita:
                          troppo tardi, perché per mezza corsa i riquadri
                          gli sono già addosso. Sopra 1 sgombera prima, ed è
                          quello che fa sembrare che sia stato spinto.
                          0 lo lascia fermo.

                          Non sposta il testo a mano: sposta il rettangolo
                          vuoto su cui il testo atterra, e il testo lo segue
                          da solo perché la consegna rilegge quel rettangolo
                          a ogni fotogramma. Una cosa spostata, non due.   */

var ANTICIPO = 1.70;   /* di quanto la spinta del testo corre avanti alla
                          salita. La curva del testo è u^(1/ANTICIPO): sopra
                          1 il testo parte subito e sgombera mentre i
                          riquadri sono ancora bassi — che è il verso
                          giusto, perché una cosa spinta si muove PRIMA che
                          quella che spinge le arrivi addosso, non dopo.
                          1 = stessa curva della salita.                   */


var sec = document.querySelector('[data-reel]');
if(!sec) return;

var riquadri = [].slice.call(sec.querySelectorAll('.reel-item'));
if(!riquadri.length) return;

var slot = document.querySelector('[data-reel-slot]');

var ridotto = false;
try{ ridotto = matchMedia('(prefers-reduced-motion: reduce)').matches; }catch(e){}
if(ridotto) return;   /* chi ha chiesto meno movimento tiene la scaletta
                         ferma, che è già una composizione: la stessa
                         scelta che fa l'Embed del reel. Niente tenuta e
                         niente salita.                                   */


/* ── la tenuta ───────────────────────────────────────────────────────────
   La scatola si costruisce una volta sola, subito, prima di qualunque
   misura: da qui in poi tutto quello che si legge è già nel mondo nuovo.
   Il genitore della sezione è il <body>, che impila i figli uno sotto
   l'altro senza flex né grid: infilarci in mezzo una scatola non sposta
   niente di quello che c'è intorno.                                    */

var scatola = null;

if(SOSTA_VH + SALITA_VH > 0 && sec.parentNode){
  scatola = document.createElement('div');
  scatola.setAttribute('data-reel-tenuta','');
  sec.parentNode.insertBefore(scatola, sec);
  scatola.appendChild(sec);
  sec.style.position = 'sticky';
  /* `top` e l'altezza della scatola li scrive misura(): dipendono dallo
     schermo, e vanno rifatti a ogni resize. */
}


/* ── misure ──────────────────────────────────────────────────────────── */

var ALT = 1, VIA = 0, ATTESA = 0, CORSA = 1, quieto = false;

function misura(){
  /* Si misura sempre da fermo. Se la sezione è uscita dallo schermo mentre
     la salita era a metà, il ciclo si è spento lasciando lo slot spostato:
     rientrando, le misure parlerebbero di dov'è adesso invece che di dove
     sta a riposo, e la spinta si accorcerebbe di quanto era già spinta. È
     la stessa cautela con cui la consegna fa posa(0) prima di misurarsi. */
  if(slot && slot.style.transform) slot.style.transform = '';

  var vh = window.innerHeight || 1;
  var H  = sec.offsetHeight || vh;

  if(scatola){
    /* La sezione si incolla col PROPRIO FONDO sul fondo dello schermo: è lì
       che il disegno vuole la scaletta, ed è lo stesso punto in cui il
       blocco ti fa sedere. Se la sezione è più alta dello schermo il numero
       viene negativo, ed è ancora giusto: sporge in alto e si incolla col
       fondo lo stesso. */
    sec.style.top = (vh - H) + 'px';

    /* La riserva, come in trattieni(): tanta altezza in più quanto scroll
       vogliamo poter consumare stando fermi. Il primo pezzo è la tenuta —
       tratto morto, non si muove niente — il secondo è la salita. */
    ATTESA = Math.max(0, SOSTA_VH * vh);
    CORSA  = Math.max(1, SALITA_VH * vh);
    scatola.style.height = (H + ATTESA + CORSA) + 'px';
  } else {
    ATTESA = 0;
    CORSA  = Math.max(1, vh * 0.30);
  }

  /* Il fondo su cui i riquadri sono appoggiati è quello della scatola
     contro cui stanno con bottom:0, non quello della sezione: quasi sempre
     coincidono, ma è quella a decidere dove cade lo zero — stesso
     ragionamento per cui l'Embed prende OX dall'offsetParent. */
  var box = riquadri[0].offsetParent || sec;
  var rb  = box.getBoundingClientRect();
  ALT = rb.height || H;

  /* La strada perché il TESTO esca dal bordo alto della scatola.

     Non basta misurare lo slot: lo slot è un rettangolo vuoto messo lì per
     dire dove atterrare, e il blocco che ci atterra sopra — .studio-info —
     è alto quanto titolo, descrizione, prezzo e bottone messi insieme,
     cioè quasi sempre molto di più. Spingendo per la sola altezza dello
     slot, il rettangolo sparisce e il testo resta lì a metà: era questo il
     motivo per cui non sembrava spinto da niente.

     Si legge l'altezza del blocco, non il suo fondo: al momento della
     misura può ancora essere fermo sull'hero, e il suo fondo parlerebbe di
     lassù. Il suo fondo da posato è `cima dello slot + la sua altezza`. */
  VIA = 0;
  if(slot){
    var rl    = slot.getBoundingClientRect();
    var basso = rl.bottom;
    var info  = document.querySelector('.studio-info');
    if(info){
      var ri = info.getBoundingClientRect();
      if(ri.height) basso = Math.max(basso, rl.top + ri.height);
    }
    VIA = Math.max(0, basso - rb.top);
  }
}


/* ── dove siamo ──────────────────────────────────────────────────────────
   Una lettura di layout per fotogramma, fuori da ogni ciclo.

   Con la tenuta: la scatola comincia a scorrere sotto la sezione incollata
   quando il suo bordo alto passa `vh − H`, e ha finito quando il suo fondo
   arriva al fondo dello schermo. Fra quei due istanti la sezione non si
   muove di un pixel, e tutto quello che si vede muoversi è la salita.

   Senza tenuta: si ripiega sul fondo della sezione, come prima.        */

function dove(){
  var vh = window.innerHeight || 1;
  if(!scatola) return (vh - sec.getBoundingClientRect().bottom) / CORSA;

  /* Quanto scroll è passato da quando la sezione si è incollata. I primi
     ATTESA pixel sono la tenuta: il conto resta negativo, viene tagliato a
     zero dal chiamante, e per tutto quel tratto i riquadri non si muovono di
     un pixel. È lì che sei bloccato. */
  var percorso = (vh - sec.offsetHeight) - scatola.getBoundingClientRect().top;
  return (percorso - ATTESA) / CORSA;
}


/* ── il disegno ──────────────────────────────────────────────────────────
   Con la sezione ferma, la riga a cui tutto tende è il bordo alto della
   scatola dei riquadri. Con `h` l'altezza del riquadro e `e` la salita:

       bottom = e · (ALT − h)

   A e=0 tutti a zero: la scaletta di sempre.
   A e=1 ognuno è alzato di tutto quello che lo separava dalla cima, quindi
   tutti i bordi alti sulla stessa riga: la scala rovescia.
   A e=0.5 ognuno sta a (ALT−h)/2 dal fondo, cioè col centro a ALT/2: tutti
   i centri sulla stessa riga. Il disegno di mezzo esce da sé.

   I riquadri piccoli sembrano correre di più, ma non c'è nessuna velocità
   scritta da nessuna parte: hanno `h` piccolo, quindi (ALT−h) grande,
   quindi più strada da fare nello stesso tempo.                        */

var ultimo = -1;

function disegna(u){
  if(u === 0 && ultimo === 0) return;   /* fermi a riposo: non si riscrive niente */
  ultimo = u;

  /* Smoothstep: derivata nulla ai due estremi, quindi la salita non parte
     con uno strappo e non si inchioda all'arrivo. */
  var e = CURVA ? u * u * (3 - 2 * u) : u;

  for(var i = 0; i < riquadri.length; i++){
    var el = riquadri[i];

    /* A riposo si CANCELLA la proprietà invece di scriverci 0: così il
       riquadro torna sul bottom:0 del foglio di stile e il bordo basso
       ricade sul pixel intero dove l'Embed lo aveva agganciato. È per
       questo che la scaletta ferma resta pulita esattamente com'era.
       Durante la salita il bordo basso viaggia e un aggancio al pixel non
       avrebbe senso: lì sotto non confina con nessuno — il filo bianco
       nasce fra due riquadri VICINI, e i vicini stanno di fianco. */
    if(e === 0){
      if(el.style.bottom) el.style.bottom = '';
      continue;
    }

    /* L'altezza la scrive l'Embed, fotogramma per fotogramma: si rilegge da
       lì invece di misurarla, che costerebbe un ricalcolo per riquadro. Se
       non c'è — l'Embed non è partito — non si tocca niente: meglio la
       scaletta ferma che venti riquadri buttati in cima. */
    var h = parseFloat(el.style.height);
    if(!h) continue;

    var b = e * (ALT - h);
    el.style.bottom = (b > 0 ? b : 0).toFixed(2) + 'px';
  }

  if(slot && !quieto){
    if(e === 0){
      if(slot.style.transform) slot.style.transform = '';
    } else {
      /* Il testo corre avanti alla salita: si sposta PRIMA che i riquadri
         gli arrivino addosso, che è come si comporta una cosa spinta. */
      var s = (ANTICIPO === 1) ? e : Math.pow(e, 1 / ANTICIPO);
      slot.style.transform = 'translate3d(0,' + (-s * SPINTA * VIA).toFixed(1) + 'px,0)';
    }
  }
}


/* ── il ciclo ────────────────────────────────────────────────────────────
   Fra lo scroll e la salita c'è un inseguimento, non un aggancio rigido.
   Il passo è corretto sul tempo trascorso, così a 30 e a 120 fotogrammi al
   secondo il peso si sente uguale: un inseguimento a passo fisso sarebbe il
   doppio più lento sul monitor lento, ed è l'errore classico.          */

var liscia = 0, vivo = false, gira = false, ultimoT = 0;

function frame(ora){
  if(!vivo){ gira = false; return; }
  requestAnimationFrame(frame);

  var dt = (ora - ultimoT) / 1000;
  ultimoT = ora;
  if(dt > 0.05)  dt = 0.05;    /* tornati da un'altra scheda: niente salti */
  if(dt < 0.004) dt = 0.004;

  var u = dove();
  if(u < 0) u = 0; else if(u > 1) u = 1;

  liscia += (u - liscia) * (1 - Math.pow(1 - MORBIDEZZA, dt * 60));

  /* Senza questo la coda non arriva mai esattamente a zero, e il ritorno
     alla scaletta pulita — quello che cancella `bottom` — non scatterebbe
     mai. */
  if(Math.abs(u - liscia) < 0.0005) liscia = u;

  disegna(liscia);
}

function accendi(){
  if(gira) return;
  gira    = true;
  ultimoT = performance.now();
  requestAnimationFrame(frame);
}

misura();
liscia = Math.max(0, Math.min(1, dove()));   /* niente scivolata all'avvio se
                                                la pagina apre già qui dentro */
disegna(liscia);

new IntersectionObserver(function(es){
  vivo = es[0].isIntersecting;
  if(vivo){ misura(); accendi(); }
}, { rootMargin:'50% 0px' }).observe(scatola || sec);

var rT = null;
window.addEventListener('resize', function(){
  /* Il blocco che consegna il testo dentro il reel misura la propria corsa
     leggendo dov'è lo slot, e lo fa 150ms dopo il resize. Se in quel
     momento lo trovasse spostato da noi si taglierebbe la corsa da solo, e
     il testo atterrerebbe corto per sempre. Quindi al primo segnale lo slot
     torna al suo posto e ci resta finché quella misura non è passata: 400 è
     scelto per stare largo oltre i suoi 150. Durante il ridimensionamento
     il testo non viene spinto, e nessuno se ne accorge: stai trascinando
     l'angolo della finestra. */
  quieto = true;
  if(slot) slot.style.transform = '';
  clearTimeout(rT);
  rT = setTimeout(function(){
    misura();
    quieto = false;
    ultimo = -1;
    disegna(liscia);
  }, 400);
}, { passive:true });

/* I font che si caricano e le immagini che arrivano possono cambiare le
   altezze dopo il primo giro di misure. */
window.addEventListener('load', function(){ misura(); ultimo = -1; disegna(liscia); });
})();
