/* parallassi-slider — reel-salita.js
   La scaletta del reel che si alza e si rovescia mentre scorri.
   Gira da solo: se in pagina non c'è [data-reel] esce subito e non costa niente.
   Non tocca l'Embed del reel — scrive `bottom`, lui scrive `transform`,
   `width` e `height`: proprietà diverse, si sommano invece di cancellarsi.
   Le manopole e il perché di ognuna stanno qui sotto; il quadro d'insieme
   nel README della repo.
*/
/* ══ 2. LA SALITA ═══════════════════════════════════════════════════════
   Una sola legge, e tutti e tre i disegni vengono da lì.

   La riga a cui tutto tende è il BORDO ALTO DELLO SCHERMO, non il bordo
   alto della sezione. Sono due cose diverse e la differenza è tutto: nel
   punto in cui il blocco ti ferma la sezione riempie già l'inquadratura,
   quindi il suo bordo alto esce di scena al primo pixel di scroll e una
   salita puntata lì finirebbe fuori campo, dove non la vedresti mai.
   Puntata allo schermo invece finisce davanti agli occhi. È anche quello
   che dice il disegno: il bloccone tocca IN CIMA.

   Chiamiamo B la distanza fra il bordo alto dello schermo e il fondo su
   cui i riquadri sono appoggiati, h l'altezza del riquadro, u quanto sei
   avanzato nella salita (0 = fermo sull'ancora, 1 = finita):

       bottom = u · (B − h)

   A u=0 tutti a zero: la scaletta di oggi, intatta.
   A u=1 il riquadro è alzato di tutto quello che lo separava dalla cima,
   quindi TUTTI hanno il bordo alto sulla stessa riga, che è il bordo dello
   schermo: la scaletta rovescia.
   A u=0.5, a metà strada, ognuno sta a (B−h)/2 dal fondo — che è come dire
   che il suo centro sta a B/2, cioè a metà esatta. Tutti i centri sulla
   stessa riga: il disegno di mezzo, e non l'ho messo io, esce da sé.

   Ed esce da sé anche la cosa che volevi vedere. Il riquadro piccolo ha h
   piccolo, quindi (B−h) grande: sale tanto. Il bloccone di destra è alto
   quasi quanto B, quindi (B−h) è poco: si muove appena. Non c'è nessuna
   velocità scritta da nessuna parte — i piccoli corrono perché hanno più
   strada da fare, e arrivano insieme perché la percorrono nello stesso
   tempo. Il bloccone a metà vuol dire tutti a metà, il bloccone in cima
   vuol dire tutti in cima: è la stessa u.

   Il riquadro che rinasce a sinistra grande zero non fa eccezione e non ha
   bisogno di un caso speciale: h≈0 → sale di tutta B, cioè nasce in cima
   invece che in fondo, e cresce verso il basso. Il giro si chiude uguale a
   com'è sempre stato.                                                  */
(function(){
'use strict';

/* ── manopole ────────────────────────────────────────────────────────── */

var ALLUNGA = 1.00; /* quanto dura la salita, in multipli della corsa
                       GEOMETRICA — quella che il disegno descrive da sé:
                       il bloccone parte col fondo sul fondo dello schermo e
                       finisce col bordo alto in cima, quindi la corsa è
                       "altezza dello schermo meno altezza del bloccone".
                       Non è un numero che ho scelto io: è misurato, e si
                       riadatta a ogni monitor.

                       1.00 è anche il valore oltre il quale si comincia a
                       pagare: alzandolo la salita dura di più e si legge
                       meglio scrollando piano, ma i riquadri più alti
                       arrivano in cima quando il fondo della sezione è già
                       risalito sopra il loro bordo basso, e la sezione —
                       che ritaglia — glielo taglia. Sotto 1.00 la salita è
                       più secca e finisce mentre il bloccone è ancora a
                       mezzo schermo. */

var SPINTA  = 1.00; /* quanto il testo in alto a sinistra viene spinto via
                       dalle immagini che salgono. 1 = a fine salita è
                       uscito esattamente dal bordo alto della sezione.
                       0 = sta fermo. Sopra 1 esce prima.
                       Non sposta il testo a mano: sposta il rettangolo
                       vuoto su cui il testo atterra, e il testo lo segue da
                       solo perché la consegna rilegge quel rettangolo a
                       ogni fotogramma. Una cosa spostata, non due.       */


var sec = document.querySelector('[data-reel]');
if(!sec) return;

var riquadri = [].slice.call(sec.querySelectorAll('.reel-item'));
if(!riquadri.length) return;

var slot = document.querySelector('[data-reel-slot]');

var ridotto = false;
try{ ridotto = matchMedia('(prefers-reduced-motion: reduce)').matches; }catch(e){}
if(ridotto) return;   /* chi ha chiesto meno movimento tiene la scaletta ferma,
                         che è già una composizione: la stessa scelta che fa
                         l'embed del reel poche righe più in là. */


/* ── misure ──────────────────────────────────────────────────────────── */

var STACCO = 0, CORSA = 1, VIA = 0, quieto = false, ultimo = -1;

function misura(){
  /* Si misura sempre da fermo. Se la sezione è uscita dallo schermo mentre
     la salita era a metà, il ciclo si è spento lasciando lo slot spostato:
     rientrando, le misure parlerebbero di dov'è adesso invece che di dove
     sta a riposo, e la spinta si accorcerebbe di quanto era già spinta. È
     la stessa cautela con cui la consegna fa posa(0) prima di misurarsi.
     Rimetterlo a posto non si vede: disegna() gira subito dopo. */
  if(slot && slot.style.transform) slot.style.transform = '';

  var vh = window.innerHeight || 1;
  var rs = sec.getBoundingClientRect();

  /* Il fondo che conta è quello della scatola contro cui i riquadri stanno
     con bottom:0, non quello della sezione: quasi sempre coincidono, ma è
     la scatola che decide dove cade lo zero. Se ne tiene lo SCARTO dalla
     sezione, che è una costante, così nel ciclo basta leggere un
     rettangolo solo — e per giunta lo stesso su cui è tarato il blocco 1,
     che è il motivo per cui i due parlano dello stesso zero.
     (Stesso ragionamento per cui l'embed del reel prende OX
     dall'offsetParent e non dalla sezione.) */
  var box = riquadri[0].offsetParent || sec;
  var rb  = box.getBoundingClientRect();
  STACCO  = rs.bottom - rb.bottom;

  /* La corsa geometrica: quanto scroll separa "il bloccone col fondo sul
     fondo dello schermo" da "il bloccone col bordo alto in cima". Il
     bloccone è il riquadro più alto che si vede adesso; si rilegge la sua
     altezza da quello che ci ha scritto l'embed, che è l'unico a saperla.
     Si misura qui e non nel ciclo apposta: il nastro gira sempre, il
     bloccone cresce di continuo, e una corsa che si riaccorcia sotto i
     piedi mentre scrolli farebbe respirare la salita invece di farla
     scorrere. Fermo per tutta la passata, rifatto alla prossima. */
  var hmax = 0;
  for(var i = 0; i < riquadri.length; i++){
    var h = parseFloat(riquadri[i].style.height);
    if(h > hmax) hmax = h;
  }

  /* Il pavimento serve al monitor basso e largo: lì il bloccone può venire
     più alto dello schermo, la corsa geometrica va a zero o sotto, e senza
     un minimo la salita si consumerebbe tutta in un pixel di scroll. Non
     sposta la geometria — a u=1 i bordi alti sono in cima comunque, per
     come è scritta la formula: cambia solo quanto scroll ci vuole. */
  CORSA = Math.max(vh * 0.12, (vh - hmax) * ALLUNGA);

  /* Quanto deve salire lo slot per uscire del tutto dal bordo alto della
     scatola: la distanza fra quel bordo e il fondo dello slot. */
  VIA = 0;
  if(slot){
    var rl = slot.getBoundingClientRect();
    VIA = Math.max(0, rl.bottom - rb.top);
  }
}


/* ── il disegno ──────────────────────────────────────────────────────── */

function disegna(){
  var vh = window.innerHeight || 1;

  /* L'unica lettura di layout del ciclo, e sta fuori dal for: dentro ne
     costerebbe una per riquadro. È la seconda della sezione in questo
     fotogramma — l'embed del reel ne fa già una sua — e sono due perché i
     due cicli non si conoscono. Se un giorno pesasse, la fusione da fare è
     una sola: far scrivere a quello la u in una variabile e leggerla qui. */
  var B = sec.getBoundingClientRect().bottom - STACCO;

  var u = (vh - B) / CORSA;
  if(u < 0) u = 0; else if(u > 1) u = 1;

  if(u === 0 && ultimo === 0) return;  /* fermi a riposo: non si riscrive niente */
  ultimo = u;

  /* Finita la salita il fondo continua a salire, e una B che continua a
     rimpicciolire terrebbe i riquadri incollati alla cima dello schermo
     mentre la pagina gli scorre sotto — un pin che nessuno ha chiesto e
     che si legge come un blocco. Congelando B al valore che aveva al
     traguardo, lo scarto resta quello e i riquadri se ne vanno su insieme
     alla sezione, come è giusto. */
  var Bfine = vh - CORSA;
  var Bc = B > Bfine ? B : Bfine;

  for(var i = 0; i < riquadri.length; i++){
    var el = riquadri[i];

    /* A riposo si CANCELLA la proprietà invece di scriverci 0: così il
       riquadro torna a stare sul bottom:0 del foglio di stile, e il bordo
       basso ricade sul pixel intero dove l'embed lo aveva agganciato. È il
       motivo per cui la scaletta ferma resta pulita esattamente com'è oggi.
       Durante la salita il bordo basso viaggia e un aggancio al pixel non
       avrebbe senso: lì sotto non confina con nessuno — il filo bianco
       nasce fra due riquadri VICINI, e i vicini stanno di fianco, non
       sotto. */
    if(u === 0){
      if(el.style.bottom) el.style.bottom = '';
      continue;
    }

    /* L'altezza la scrive l'embed del reel, fotogramma per fotogramma: si
       rilegge da lì invece di misurarla, che costerebbe un ricalcolo per
       riquadro. Se non c'è — l'embed non è partito — non si tocca niente:
       meglio la scaletta ferma che venti riquadri buttati in cima. */
    var h = parseFloat(el.style.height);
    if(!h) continue;

    var b = u * (Bc - h);
    el.style.bottom = (b > 0 ? b : 0).toFixed(2) + 'px';
  }

  if(slot && !quieto){
    if(u === 0){ if(slot.style.transform) slot.style.transform = ''; }
    else slot.style.transform = 'translate3d(0,' + (-u * SPINTA * VIA).toFixed(1) + 'px,0)';
  }
}


/* ── il ciclo ────────────────────────────────────────────────────────── */

var vivo = false, gira = false;

function frame(){
  if(!vivo){ gira = false; return; }
  requestAnimationFrame(frame);
  disegna();
}

function accendi(){
  if(gira) return;
  gira = true;
  requestAnimationFrame(frame);
}

misura();
disegna();

new IntersectionObserver(function(es){
  vivo = es[0].isIntersecting;
  if(vivo){ misura(); accendi(); }
}, { rootMargin:'50% 0px' }).observe(sec);

var rT = null;
window.addEventListener('resize', function(){
  /* Il blocco che consegna il testo dentro il reel misura la propria corsa
     leggendo dov'è lo slot, e lo fa 150ms dopo il resize. Se in quel
     momento lo trovasse spostato da noi, si taglierebbe la corsa da solo e
     il testo atterrerebbe corto per sempre. Quindi al primo segnale lo slot
     torna al suo posto e ci resta finché quella misura non è passata: 400 è
     scelto per stare largo oltre i suoi 150. Durante il ridimensionamento
     il testo non viene spinto — e nessuno se ne accorge, perché stai
     trascinando l'angolo della finestra. */
  quieto = true;
  if(slot) slot.style.transform = '';
  clearTimeout(rT);
  rT = setTimeout(function(){
    misura();
    quieto = false;
    ultimo = -1;
    disegna();
  }, 400);
}, { passive:true });

/* I font che si caricano e le immagini che arrivano possono cambiare le
   altezze dopo il primo giro di misure. */
window.addEventListener('load', function(){ misura(); ultimo = -1; disegna(); });
})();
