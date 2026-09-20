/* parallassi-slider — cape-studio-consegna.js
   La consegna: il titolo della sezione a inchiostro diventa il titolo del
   carosello studio.

   COSA SUCCEDE, NELL'ORDINE
   1. L'inchiostro finisce: lo schermo e' bianco pieno e al centro resta
      "ART AND FASHION", che non e' testo ma il buco che l'inchiostro non ha
      riempito.
   2. Da li' in avanti quel buco non puo' piu' servire: e' dipinto dentro il
      canvas e col canvas scorrerebbe via. Quindi il canvas viene coperto da
      un velo bianco — invisibile, perche' sotto e' gia' tutto bianco — e al
      posto del buco compare un clone di testo vero, fermo sullo schermo,
      nello stesso punto e della stessa misura. Lo scambio dura un fotogramma
      e passa sotto una dissolvenza di 180ms: anche se fosse fuori di un
      pixel, non si vedrebbe.
   3. La sezione studio sale da sotto. Il clone la insegue: viaggia dal centro
      dello schermo fino al posto esatto del titolo del carosello, che intanto
      si muove anche lui. La destinazione viene RILETTA a ogni fotogramma, non
      calcolata una volta: cosi' l'atterraggio e' esatto a qualunque misura di
      schermo e con qualunque impaginazione, oggi e dopo il prossimo ritocco
      nel Designer.
   4. Titolo arrivato: parte tutto insieme. Un'onda di luce attraversa il
      titolo e dove passa le lettere vecchie si spengono e restano quelle
      dell'opera; descrizione e bottone salgono da dietro il proprio bordo;
      la barra del carosello sale con la stessa tendina; il velo bianco che
      copre il riquadro se ne va con la scivolata del cambio immagine, e sotto
      si apre il buco con dentro la fotografia.
   5. Scrollando in su, tutto quello che e' comparso svanisce in dissolvenza e
      il titolo rifa' il viaggio al contrario: torna al centro e si riconsegna
      all'inchiostro. La scritta e' sempre una sola, non sparisce e riappare.

   L'ONDA DI LUCE non ha una fisica sua. Legge la mappa di arrivo
   dell'inchiostro — window.inkSection.arrivalAt(u, v), la stessa che ha
   appena dipinto la sezione sopra — e chiede, per ogni lettera, a che punto
   della corsa l'inchiostro sarebbe arrivato li'. Le lettere quindi non si
   accendono da sinistra a destra: si accendono nell'ordine irregolare in cui
   quel fluido le avrebbe raggiunte. E' la stessa fisica perche' e' la stessa
   simulazione, non una che le somiglia. Non costa niente: la mappa e' gia'
   cotta e il modulo la tiene in cache dopo la prima lettura.

   DIPENDE DA: GSAP 3 (core), cape-studio-carousel.js (per i suoi gesti),
   ink-transition.js + cape-title-ink.js (per la mappa di arrivo; se mancano,
   l'onda ripiega su un ordine da sinistra a destra e tutto il resto regge).

   VA IN PAGINA: un tag <script defer> nel footer, DOPO il carosello. Il CSS
   che gli serve sta nel custom code della head, blocco "la consegna".

   NIENTE SOTTO I 992px: li' il ponte e' spento e l'inchiostro ripiega gia'
   per conto suo, quindi la sezione resta com'e' sempre stata.
*/
(function(){
'use strict';

/* ── manopole ─────────────────────────────────────────────────────────────

   VIAGGIO_VH e SOSTA_VH sono le due che contano; sono gli stessi due numeri
   di reel-salita.js, e vogliono dire la stessa cosa.                       */

var VIAGGIO_VH = 1.00; /* schermate di scroll in cui il titolo viaggia dal
                          centro dello schermo al suo posto nello slider.
                          E' una finestra RITAGLIATA sulla salita naturale
                          della sezione, non scroll aggiunto: la sezione sale
                          comunque, qui si decide solo in quale ultimo tratto
                          della salita il titolo si muove. Piu' corta = il
                          titolo resta fermo al centro piu' a lungo e poi
                          scatta giu' in fretta.                            */

var SOSTA_VH   = 2.00; /* LA TENUTA — schermate di scroll in cui, a titolo
                          arrivato, la sezione sta ferma incollata mentre le
                          animazioni girano. E' l'unico scroll che questa
                          coreografia AGGIUNGE alla pagina.

                          Era 1.00 e non bastava: il montaggio dura quasi due
                          secondi — scambio delle lettere, tendine, scivolata
                          del velo — e una schermata di riserva si consuma in
                          poco piu' di uno. La sezione se ne andava a meta'
                          coreografia, con le fotografie ancora sotto il velo.

                          E' la manopola da girare per prima se la sezione ti
                          sembra che si fermi troppo: portala a 1.4 e accorcia
                          SCAMBIO_DUR nella stessa misura.                  */

var MORBIDEZZA = 0.14; /* 0..1 — quanto il viaggio insegue lo scroll invece
                          di esserci incollato. E' lo stesso inseguimento
                          della salita del reel, e per lo stesso motivo: a 1
                          ogni strattone di rotella si legge tale e quale, a
                          0.14 il titolo arriva dietro, con un peso suo.    */

var CURVA      = true; /* smussa partenza e arrivo del viaggio (smoothstep).
                          false = il titolo parte e si ferma di colpo.      */

var SCAMBIO    = 0;    /* secondi della dissolvenza con cui il clone prende
                          il posto del buco nell'inchiostro. ZERO, ed e' la
                          scelta giusta adesso che le due scritte sono nello
                          stesso punto e della stessa misura al pixel.

                          Una dissolvenza qui non serve a niente e fa danno:
                          dura piu' dei pochi pixel in cui l'inchiostro e'
                          ancora incollato, quindi per tutto il resto della
                          sua durata la scritta vecchia scivola via mentre la
                          nuova sta ferma. E' il distacco che si vedeva. Uno
                          scambio in un fotogramma non ha nessuna finestra in
                          cui le due possano separarsi.                     */

var SCAMBIO_DUR = 0.55; /* secondi del riposizionamento di una lettera. */

var SCAMBIO_SPAZZATA = 0.45; /* secondi fra la prima lettera che si muove e
                          l'ultima. Non e' un passo fisso: l'ordine lo detta
                          la mappa dell'inchiostro, questo e' solo quanto la
                          si allarga nel tempo. A zero partono tutte insieme
                          e si legge come un taglio; a 0.45 si legge come un
                          movimento, e i grumi del fluido si vedono.       */

var SCAMBIO_SALTO = 1.15; /* di quanto una lettera esce in alto e la sua
                          sostituta entra dal basso, in altezze di lettera.
                          Sopra 1 vuol dire che esce di scena per davvero
                          prima che l'altra arrivi al suo posto.           */

var SCAMBIO_EASE = 'power3.inOut'; /* stessa curva per chi si sposta, chi
                          esce e chi entra: e' un movimento solo.          */

var FILO_INK   = 0.06;  /* ——— IL FILO CHE ASSOTTIGLIA ————————————————
                          Le lettere dipinte dall'inchiostro escono un filo
                          piu' magre di quelle vere: passano per una maschera
                          e per una simulazione, e ci lasciano una frazione
                          di pixel per lato. Misurato al banco: 1.4% di area
                          coperta in meno, a geometria ormai identica al
                          pixel. E' tutto quello che resta del distacco.

                          Questo e' un contorno del colore del fondo, in
                          pixel, che il clone porta quando e' a grandezza
                          d'inchiostro e perde man mano che rimpicciolisce:
                          mangia da fuori esattamente quello che la maschera
                          mangiava. A zero e' spento, e il valore si trova
                          misurando — non a occhio, e sulla PAGINA, non sul
                          banco: li' l'inchiostro e' un canvas 2D e non il
                          fluido vero, e la resa non e' la stessa.

                          Il conto viene dal video. Senza filo, le lettere
                          dipinte coprivano l'1.1% in piu' del clone; con il
                          filo a 0.1 il clone e' finito lo 0.7% sotto. Cioe'
                          un decimo di pixel vale circa l'1.8%, e per
                          chiudere l'1.1% ne servono sei centesimi.

                          Resta un margine di un mezzo per cento, che e'
                          dentro il rumore di una misura fatta su un video
                          compresso: se a occhio si vedesse ancora, e' questa
                          la manopola, e si gira di due centesimi.          */

var USCITA_R   = 0.35; /* quanta TENUTA si tiene da parte per il ritorno del
                          titolo, in frazione della riserva.

                          Ci deve stare tutto il riavvolgimento dello scambio
                          — SCAMBIO_DUR piu' SCAMBIO_SPAZZATA, cioe' un
                          secondo — mentre la sezione e' ancora incollata e
                          il titolo ancora fermo al suo posto. A 0.35 di due
                          schermate sono seicento pixel: a rotellata normale,
                          piu' di un secondo.

                          Se lo scambio si allunga, questa va allungata con
                          lui. Se no il viaggio comincia a lettere ancora per
                          aria, ed e' il difetto che si vedeva risalendo.  */

var MIN_W      = 992;  /* sotto questa larghezza non si fa niente.          */

/* ——— le due scelte di aspetto ————————————————————————————————————
   Non sono plumbing, sono decisioni, e stanno qui dove si vedono.

   CARATTERE: sta a zero, e deve restarci. Al breakpoint xl il titolo dello
   slider e' GIA' PP Editorial New, messo nel Designer. Un'altra regola qui
   che dice la stessa cosa vincerebbe per specificita' e si porterebbe dietro
   anche peso e spaziatura — cioe' -0.02em che diventa .02em, e la crenatura
   del titolo cambia senza che nessuno l'abbia chiesto. Si riempie solo se un
   domani quel font sparisce dal Designer.

   FONDO: il motore dell'inchiostro dipinge #ffffff pieno. Con il #fbfaf7
   della sezione, sul raccordo si vedrebbe un gradino di colore proprio
   mentre il titolo ci passa sopra. */
var FONT_TITOLO = '';   /* vuoto = non si tocca. Vedi la nota qui sopra. */
var PESO_TITOLO = '200';
var SPAZ_TITOLO = '.02em';
var FONDO_SEZ   = '#ffffff';

/* ── da qui in giu' non ci sono numeri da girare ───────────────────────── */

var SEZ     = '.studio-hero';
var TITOLO  = '.studio-headline__row';
var GUSCIO  = '.studio-headline';
var INFO    = '.studio-info';
var PAGER   = '.studio-pager';
var STAGE   = '.studio-stage';
var EDGE    = '.studio-stage__edge';
var PIN_INK = '.ink-pin';
var STK_INK = '.ink-stick';
var TIT_INK = '.ink-title';

function clamp01(v){ return v < 0 ? 0 : (v > 1 ? 1 : v); }
function morbida(t){ return t * t * (3 - 2 * t); }

/* ── il vestito ───────────────────────────────────────────────────────────
   Sta qui e non nel custom code della pagina, per due motivi.

   Il primo: il campo "Inside head tag" della Home e' gia' lungo quindicimila
   caratteri. Aggiungerci un blocco da novemila vuol dire mettersi in mano a
   un limite che non si vede finche' non taglia — e un <style> tagliato a
   meta' non da' errore, si porta via in silenzio tutto quello che viene
   dopo.

   Il secondo: queste regole sono la meta' di un meccanismo la cui altra
   meta' e' in questo file. Tenerle in due posti diversi, uno dei quali si
   aggiorna cambiando uno SHA e l'altro incollando a mano, e' garantirsi che
   prima o poi non combacino piu'.

   Niente !important: se un domani vuoi sovrascrivere qualcosa dal Designer o
   dal custom code, deve bastarti farlo. */
function vesti(){
  if(document.getElementById('cape-consegna-css')) return;
  var st = document.createElement('style');
  st.id = 'cape-consegna-css';
  st.textContent = [
    /* La scatola alta e l'elemento incollato dentro: e' lo schema di
       .ink-pin > .ink-stick e di .cape-hs-wrap > .cape-hs-sticky, cioe'
       quello che in questa pagina funziona gia' tre volte. Altezze e top li
       scrive il JS, che le misure ce le ha. */
    '.cnsg-pin{position:relative;width:100%}',
    '.cnsg-stick{position:sticky;width:100%}',
    (FONDO_SEZ ? '.cnsg-sez{background:' + FONDO_SEZ + '}' : ''),

    /* Il titolo dello slider prende il carattere dell'inchiostro. Spaziatura
       e peso sono quelli dell'inchiostro, non quelli che aveva il Bodoni:
       -0.035em era una crenatura giusta per un carattere con le grazie
       piene, su un ultralight stringe le lettere fino a farle toccare. */
    (FONT_TITOLO ? '.cnsg-sez .studio-headline__row{font-family:' + FONT_TITOLO +
      ';font-weight:' + PESO_TITOLO + ';letter-spacing:' + SPAZ_TITOLO + '}' : ''),


    /* Il velo sul canvas dell'inchiostro. Serve a coprire le LETTERE, non il
       bianco: il bianco sotto c'e' gia', ed e' per questo che accendersi non
       si vede. z-index 2 perche' .ink-title sta a 1. */
    '.cnsg-velo{position:absolute;inset:0;z-index:2;background:#ffffff;opacity:0;',
      'pointer-events:none;transition:opacity .18s linear}',
    '.cnsg-velo.is-on{opacity:1}',

    /* Il clone che viaggia. z-index 7 come .ink-pin, e viene dopo nel
       documento: a parita' di z-index vince chi sta piu' in basso nel
       codice, quindi sta sopra l'inchiostro senza dover alzare il numero e
       finire davanti a qualcos'altro. */
    /* left/top a zero e tutto affidato alla trasformazione: la scatola non
       ha una larghezza imposta, quindi — essendo fissa con width:auto — si
       stringe sul testo. E' la cosa che conta.

       Con una larghezza imposta e text-align:center il testo NON si centra:
       quando e' piu' largo della scatola il browser lo allinea al bordo di
       partenza e lo fa sbordare tutto dall'altra parte. Misurato: 217 px
       fuori centro, che moltiplicati per la scala 1,65 del viaggio
       diventavano 358 px — la scritta compariva spostata di mezzo schermo
       rispetto al buco nell'inchiostro, e per un istante si vedevano due
       titoli. Una scatola che si stringe sul testo non puo' avere quel
       problema: il suo centro E' il centro del testo. */
    '.cnsg-titolo{position:fixed;left:0;top:0;z-index:7;margin:0;white-space:nowrap;',
      'transform-origin:0 0;pointer-events:none;opacity:0;',
      'transition:opacity .18s linear;will-change:transform}',
    '.cnsg-titolo.is-on{opacity:1}',
    '.cnsg-titolo .cnsg-char{display:inline-block}',
    '.cnsg-titolo .cnsg-spazio{display:inline-block;white-space:pre}',

    /* Il velo bianco sopra le fotografie. z-index 4: sopra la cornice (3),
       che altrimenti tradirebbe con un filo di bordo dove sta il riquadro
       prima che si apra. */
    '.cnsg-coperta{position:absolute;inset:0;z-index:4;background:#ffffff;',
      'pointer-events:none;will-change:transform}',
    '.cnsg-coperta.is-via{display:none}',

    /* La barra sale da dietro il proprio bordo. La finestra non puo' stare
       sulla barra: quella e' anche la riga flex che allinea frecce e
       binario. Il gap lo riscrive il JS. */
    '.cnsg-pager-win{display:block;width:100%;clip-path:inset(-0.15em -100% -0.02em -100%)}',
    '.cnsg-pager-ln{display:flex;width:100%;align-items:center;justify-content:center}',

    /* Lo stato di attesa. Le fotografie non sono qui: quelle non sono
       nascoste, sono sotto il velo — ed e' per questo che quando il velo se
       ne va sembra che si apra un buco.

       opacity e non visibility: il cursore su misura decide il proprio stato
       leggendo l'opacita' calcolata di quello che ha sotto, quindi con
       opacity 0 si spegne da solo. E le misure restano: il carosello
       impagina il titolo misurandolo, e un elemento senza misura gli
       farebbe sbagliare il corpo. */
    '.cnsg-attesa .studio-headline,.cnsg-attesa .studio-info,',
      '.cnsg-attesa .studio-pager{opacity:0;pointer-events:none}',
    '.cnsg-attesa .studio-stage__edge{opacity:0}',

    /* Sotto i 992px il ponte e' gia' spento e l'inchiostro ripiega da solo:
       qui non c'e' niente da consegnare. Il JS esce prima di toccare
       qualsiasi cosa; questa e' la rete per chi restringe la finestra a
       sezione gia' montata. */
    '@media (max-width:991px),(prefers-reduced-motion:reduce){',
      '.cnsg-pin{height:auto}',
      '.cnsg-stick{position:static;height:auto}',
      '.cnsg-velo,.cnsg-titolo,.cnsg-coperta{display:none}',
      '.cnsg-attesa .studio-headline,.cnsg-attesa .studio-info,',
      '.cnsg-attesa .studio-pager,.cnsg-attesa .studio-stage__edge{',
      'opacity:1;pointer-events:auto}}'
  ].join('');
  document.head.appendChild(st);
}

function init(){
  if(window.innerWidth < MIN_W) return;
  try{ if(matchMedia('(prefers-reduced-motion: reduce)').matches) return; }catch(e){}
  if(typeof gsap === 'undefined') return;

  var sez    = document.querySelector(SEZ);
  var titolo = document.querySelector(TITOLO);
  var guscio = document.querySelector(GUSCIO);
  var info   = document.querySelector(INFO);
  var pager  = document.querySelector(PAGER);
  var stage  = document.querySelector(STAGE);
  var edge   = stage && stage.querySelector(EDGE);
  var pinInk = document.querySelector(PIN_INK);
  var stkInk = pinInk && pinInk.querySelector(STK_INK);
  var titInk = document.querySelector(TIT_INK);

  if(!sez || !titolo || !guscio || !stage) return;

  /* Il footer tiene un registro dei patti fra blocchi: chi scrive una classe
     e chi la legge. Finche' questo file non si dichiarava, capePatti() dava
     is-consegna per "nessuno lo scrive" — un falso allarme su un patto che
     invece regge tutta la consegna. Si dichiara qui e non piu' in alto
     perche' e' qui che il patto esiste davvero: se la sezione non c'e', o si
     e' sotto i 992, nessuno scrive niente e l'allarme e' giusto. */
  window.capePatti && capePatti.dichiara('consegna dall\'inchiostro', {
    scrivo: [['is-consegna', 'html',
              'mentre il titolo viaggia dall\'inchiostro allo slider la planata sta ferma']],
    leggo:  ['window.capeStudio', 'window.inkSection']
  });

  vesti();

  var studio = window.capeStudio;
  studio.sospendi();

  /* ——— il rig ————————————————————————————————————————————————————
     La sezione si incolla al centro dello schermo e dietro di lei si apre la
     riserva: e' la stessa scatola di .cape-hs-wrap e della salita del reel,
     solo che qui non serve un involucro perche' la sezione puo' incollarsi
     da sola. Un involucro avrebbe voluto dire riappendere un nodo che il
     Designer possiede, e ogni volta che qualcuno lo tocca la' dentro il
     rig si sfascerebbe in silenzio. */
  sez.classList.add('cnsg-sez', 'cnsg-attesa');

  /* La sezione entra in una scatola piu' alta di lei, e dentro la scatola si
     incolla. La prima versione incollava direttamente .studio-hero, senza
     scatola, e non poteva reggere: position:sticky e' limitato dal riquadro
     del GENITORE, e il genitore qui e' il body. Una sezione incollata al body
     non si stacca piu' — resta appesa per tutto il resto della pagina — e
     quello che si vede e' una sezione che non sta ne' ferma ne' insieme alle
     altre.

     Con la scatola, la tenuta e' alta esattamente quanto la riserva e poi
     finisce, perche' finisce la scatola. */
  var pin = document.createElement('div');
  pin.className = 'cnsg-pin';
  var stick = document.createElement('div');
  stick.className = 'cnsg-stick';
  sez.parentNode.insertBefore(pin, sez);
  pin.appendChild(stick);
  stick.appendChild(sez);

  /* Il velo bianco sull'inchiostro. Sta DENTRO .ink-stick, non fisso sullo
     schermo: cosi' copre esattamente il canvas, scorre via insieme a lui, e
     non puo' finire davanti all'header — che e' il guaio classico di un
     pannello fisso a z-index alto messo li' a coprire qualcosa. */
  var velo = null;
  if(stkInk){
    velo = document.createElement('div');
    velo.className = 'cnsg-velo';
    velo.style.transitionDuration = SCAMBIO + 's';
    stkInk.appendChild(velo);
  }

  /* Il clone: testo vero, fisso sullo schermo, impaginato ogni fotogramma
     sopra il titolo del carosello e poi riportato indietro dov'era
     l'inchiostro. A viaggio finito la trasformazione e' l'identita' e il
     clone sta esattamente sul titolo vero — che e' il motivo per cui
     l'atterraggio non puo' sbagliare di un pixel. */
  var clone = document.createElement('div');
  clone.className = 'cnsg-titolo';
  clone.setAttribute('aria-hidden', 'true');
  clone.style.transitionDuration = SCAMBIO + 's';
  document.body.appendChild(clone);

  /* Il velo sul riquadro delle fotografie. */
  var coperta = document.createElement('div');
  coperta.className = 'cnsg-coperta';
  stage.appendChild(coperta);

  /* La barra del carosello sale da dietro il proprio bordo come le righe di
     testo. Le serve una finestra che la ritagli: il ritaglio non puo' stare
     sulla barra stessa, perche' quella e' anche il contenitore flex che
     tiene in riga frecce e binario. */
  var pagerLn = null;
  if(pager){
    var win = document.createElement('span');
    win.className = 'cnsg-pager-win';
    var ln = document.createElement('span');
    ln.className = 'cnsg-pager-ln';
    while(pager.firstChild) ln.appendChild(pager.firstChild);
    win.appendChild(ln);
    pager.appendChild(win);
    pagerLn = ln;

    /* Il gap non si eredita: non e' una proprieta' ereditabile, e un
       gap:inherit sull'involucro prenderebbe quello del padre — che adesso
       e' l'involucro stesso, che di gap non ne ha. Misurato: 21.3px -> 0,
       frecce e binario attaccati. Quindi si legge e si riscrive. */
    var gp = getComputedStyle(pager);
    var g = gp.columnGap && gp.columnGap !== 'normal' ? gp.columnGap : gp.gap;
    if(g && g !== 'normal') ln.style.gap = g;
  }

  /* ——— le metriche del carattere ——————————————————————————————————
     Il motore dell'inchiostro NON centra il titolo sulla riga: lo centra
     sull'altezza delle maiuscole, perche' con un titolo tutto maiuscolo
     centrare sulla riga lo fa sedere basso. Se il clone si centrasse sulla
     riga, allo scambio la scritta salterebbe di qualche pixel — poco, ma
     esattamente nell'unico fotogramma in cui si sta guardando quella.
     Quindi qui si misura dove cade la linea di base e dove l'altezza delle
     maiuscole, e si allinea quella. */
  var met = null;
  function metriche(){
    var cs = getComputedStyle(titolo);
    var c;
    try{ c = document.createElement('canvas').getContext('2d'); }catch(e){ return null; }
    if(!c) return null;
    c.font = cs.fontStyle + ' ' + cs.fontWeight + ' 100px ' + cs.fontFamily;
    var mH = c.measureText('H'), mX = c.measureText('Hxg');
    var cap = mH.actualBoundingBoxAscent || 70;
    var fa  = mX.fontBoundingBoxAscent  || cap;
    var fd  = mX.fontBoundingBoxDescent || 25;
    return { cap: cap / 100, fa: fa / 100, fd: fd / 100 };
  }

  /* Quanto sta sotto il bordo alto della scatola il centro delle maiuscole,
     per un corpo F e un'interlinea L. Il mezzo-interlinea puo' essere
     negativo (line-height minore di 1): la formula regge lo stesso. */
  function centroMaiuscole(F, L){
    if(!met) return L / 2;
    var base = (L - (met.fa + met.fd) * F) / 2 + met.fa * F;
    return base - (met.cap * F) / 2;
  }

  /* ——— misure del binario ————————————————————————————————————————— */
  var topIncollo = 0, viaggio = 1, sosta = 0;

  function misura(){
    var h = sez.offsetHeight || window.innerHeight;
    if(window.innerWidth < MIN_W){ pin.style.height = ''; stick.style.height = ''; return; }
    /* Il centraggio puo' essere NEGATIVO, e deve poterlo essere.

       La sezione e' alta 52vw. Su uno schermo 16:9 pieno ci sta; dentro una
       finestra di browser vera — 1918 x 870, con la barra degli indirizzi e
       le schede — sono 997 px in 870, e non ci sta per 127.

       Con un top bloccato a zero la sezione si incollava in cima e quei 127
       px uscivano tutti dal fondo: la barra del carosello finiva a 898, sotto
       il bordo, e il titolo a -17, sopra. La sezione sembrava vuota mentre in
       realta' era intera, solo fuori dallo schermo.

       Con un top negativo si incolla centrata e il taglio si divide fra sopra
       e sotto: meta' per uno, dove non c'e' niente da vedere. position:sticky
       accetta un top negativo senza fare storie. */
    topIncollo = Math.round((window.innerHeight - h) / 2);
    viaggio  = Math.max(1, VIAGGIO_VH * window.innerHeight);
    sosta    = Math.max(0, SOSTA_VH * window.innerHeight);

    stick.style.top    = topIncollo + 'px';
    stick.style.height = h + 'px';
    pin.style.height   = (h + sosta) + 'px';
    met = met || metriche();
  }

  /* A che punto dello scroll la sezione si incolla. Si misura dalla SCATOLA,
     che non si incolla mai: il suo bordo alto e' il bordo alto naturale della
     sezione, sempre e su qualunque browser. Sull'elemento incollato invece le
     due misure che il DOM offre — il rettangolo sullo schermo e la catena
     degli offsetTop — non concordano dappertutto.

     Si rifa' a ogni fotogramma apposta: costa una misura e vale contro tutto
     quello che sopra puo' ancora cambiare altezza — un'immagine che arriva,
     un font che si sostituisce, l'inchiostro che rimisura. Un valore preso
     una volta sola diventerebbe sbagliato senza dare segno. */
  /* Quanto della riserva e' stato consumato: 0 appena la sezione si
     incolla, 1 quando sta per staccarsi di nuovo andando avanti. */
  function inRiserva(){
    if(!(sosta > 0)) return 1;
    var y = window.scrollY || window.pageYOffset;
    var naturale = pin.getBoundingClientRect().top + y;
    return clamp01((y - (naturale - topIncollo)) / sosta);
  }

  function bersaglio(){
    var y = window.scrollY || window.pageYOffset;
    /* dalla SCATOLA, che non si incolla mai: il suo bordo alto e' il bordo
       alto naturale della sezione, sempre e su qualunque browser */
    var naturale = pin.getBoundingClientRect().top + y;
    var inizio = naturale - topIncollo - viaggio;
    return clamp01((y - inizio) / viaggio);
  }

  /* ——— il viaggio ————————————————————————————————————————————————— */
  var p = 0, armato = false, montata = false;
  var cloneChars = [], vivo = false, girando = false, ultimo = 0, primo = true;
  /* Due timeline, due vite diverse. tlSezione gira una volta sola in tutta la
     pagina — sezioneFatta se lo ricorda. tlScambio invece va avanti e
     indietro, una volta per ogni passata del titolo. */
  var tlSezione = null, tlScambio = null, sezioneFatta = false;
  /* la fetta di tenuta si arma solo dopo esserne usciti; e usciti che si e',
     il montaggio resta chiuso. Vedi le due guardie in giro(). */
  var assestata = false, uscito = false;
  /* le lettere del titolo per cui tlScambio e' stata costruita: se cambiano,
     la timeline non vale piu' */
  var firmaScambio = '';
  /* il punto da cui il titolo parte, congelato appena si stacca: vedi
     piazza(). Si azzera a ogni nuova misura, che e' quando puo' cambiare. */
  var partenza = null;
  /* e dove va a posarsi, misurato a lettere ferme: vedi piazza() */
  var arrivo = null;

  function vestiClone(){
    var cs = getComputedStyle(titolo);
    var F = parseFloat(cs.fontSize) || 1;
    var L = parseFloat(cs.lineHeight) || F;
    clone.style.fontFamily    = cs.fontFamily;
    clone.style.fontWeight    = cs.fontWeight;
    clone.style.fontStyle     = cs.fontStyle;
    clone.style.fontSize      = F + 'px';
    /* interlinea come RAPPORTO, non in pixel: il corpo del clone cambia a
       ogni fotogramma e la scatola deve seguirlo, se no il centro delle
       maiuscole si sposta mentre la scritta cresce */
    clone.style.lineHeight    = (L / F).toFixed(4);
    /* La spaziatura si tiene in multipli del corpo e si interpola lungo il
       viaggio, perche' i due estremi non hanno la stessa: l'inchiostro
       scrive a .02em, il titolo dello slider a -0.02em. Erano quattro
       centesimi di em per lettera, e su quindici lettere fanno il 5% di
       larghezza: siccome io accordavo le due scritte sulla LARGHEZZA
       TOTALE, il clone compensava allargando il corpo. Stessa larghezza,
       lettere piu' grosse — il 13% di inchiostro in piu', misurato. */
    spazioTit = (cs.letterSpacing === 'normal' ? 0 : (parseFloat(cs.letterSpacing) || 0)) / F;
    clone.style.letterSpacing = spazioTit.toFixed(5) + 'em';
    largoBase = 0;
    capClone = 0;
  }

  /* Le lettere del clone, una <span> ciascuna: l'onda le accende una per una
     e per farlo deve poterle toccare separatamente. */
  function spezza(testo){
    clone.textContent = '';
    var out = [], i, ch, s;
    for(i = 0; i < testo.length; i++){
      ch = testo[i];
      s = document.createElement('span');
      s.className = ch === ' ' ? 'cnsg-spazio' : 'cnsg-char';
      s.textContent = ch === ' ' ? ' ' : ch;
      clone.appendChild(s);
      if(ch !== ' ') out.push(s);
    }
    return out;
  }

  /* ——— quanto e' grande, sullo schermo, la scritta che l'inchiostro dipinge
     Non si deduce dal corpo dichiarato. Sul corpo di .ink-title ci sono due
     regole in gara — quella del custom code della pagina e quella che
     cape-title-ink.js inietta a runtime — e chi vince dipende dall'ordine in
     cui i file finiscono di caricare. Leggere un numero da li' vuol dire
     scommettere su una gara.

     Quindi si misura la LARGHEZZA RESA, con la stessa API che usa lo shader
     (measureText, carattere per carattere, con la stessa spaziatura) sullo
     stesso elemento e con lo stesso testo. La scala del clone diventa il
     rapporto fra quella larghezza e la sua: due scritte larghe uguale sono
     grandi uguale, qualunque cosa dicano i fogli di stile.

     E' il motivo per cui allo scambio le due scritte erano di grandezze
     visibilmente diverse. */
  var inkMis = null;
  var largoBase = 0, corpoBase = 0, spazioTit = 0;

  /* Quanto e' larga la scritta del clone a un corpo noto. Si misura una
     volta per corpo e non a ogni fotogramma: leggere offsetWidth subito dopo
     aver scritto il font-size costringe il browser a rifare l'impaginazione
     li' sul posto, e farlo sessanta volte al secondo si sente. */
  function larghezzaBase(F){
    if(largoBase && corpoBase === F) return largoBase;
    clone.style.fontSize = F + 'px';
    clone.style.letterSpacing = spazioTit.toFixed(5) + 'em';
    largoBase = clone.offsetWidth || 1;
    corpoBase = F;
    return largoBase;
  }

  /* Il corpo scritto nel CSS non e' quello che si vede.

     L'inchiostro non impagina il titolo: se lo ridisegna dentro la propria
     griglia, e per farlo lo riscala. In cape-ink-title.js, dentro scoglio():

         k = w / rect.width          w = larghezza della griglia in celle
                                     rect = il riquadro di .ink-title
         corpo = fontSize * k

     e poi la griglia viene stirata sul canvas, che sta a inset:0 dentro
     .ink-stick. Mettendo insieme i due passaggi, quello che finisce sullo
     schermo e'

         corpo visto = fontSize * larghezza-canvas / larghezza-.ink-title

     cioe' il corpo del CSS SOLO SE i due riquadri coincidono. Se il titolo
     e' un filo piu' largo del suo pilastro, la scritta dipinta esce piu'
     piccola di quanto il CSS dica — e il clone, che il CSS lo legge e basta,
     esce piu' grande di quella frazione esatta. Sovrapponendo le due scritte
     la differenza misurata era dell'1.3% in larghezza e dell'1.3% in altezza:
     un ingrandimento uniforme, la firma di un rapporto di riquadri.

     Qui quel rapporto si rimette dentro la misura, una volta sola. */
  function scalaInk(){
    if(!titInk || !stkInk) return 1;
    var cv = stkInk.querySelector('canvas');
    if(!cv) return 1;
    var wc = cv.getBoundingClientRect().width;
    var wt = titInk.getBoundingClientRect().width;
    if(!(wc > 0) || !(wt > 0)) return 1;
    var k = wc / wt;
    /* Se il rapporto e' lontano da uno non e' lo scarto di cui sopra: e' un
       titolo dentro una colonna, o un canvas che non e' quello. Fidarsene
       farebbe un danno piu' grosso di quello che ripara. */
    return (k > 0.8 && k < 1.25) ? k : 1;
  }

  /* Il centro di cio' che l'inchiostro dipinge, adesso. Si rilegge a ogni
     fotogramma apposta: il pilastro si muove, e il punto d'arrivo del
     viaggio deve muoversi con lui. */
  /* L'inchiostro e' ancora incollato? Finche' lo e', le sue lettere stanno
     ferme nello schermo e il titolo puo' inseguirle; quando il suo pilastro
     finisce se ne vanno su, e da li' in poi inseguirle vorrebbe dire curvare
     dietro a qualcosa che non si vede nemmeno piu'. */
  /* La sezione e' arrivata al suo posto? Lo si chiede allo stick, che e'
     quello che si incolla: finche' scorre, il suo bordo alto sta dove sta il
     pilastro; quando si incolla resta a topIncollo mentre il pilastro
     continua a salire, e i due si staccano. */
  function incollata(){
    return stick.getBoundingClientRect().top <= topIncollo + 0.5;
  }

  function inkIncollato(){
    if(!pinInk) return false;
    var r = pinInk.getBoundingClientRect();
    return r.top <= 1 && r.bottom >= window.innerHeight - 1;
  }

  function centroInk(){
    var cv = stkInk && stkInk.querySelector('canvas');
    if(cv){
      var r = cv.getBoundingClientRect();
      if(r.width > 0 && r.height > 0)
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    }
    return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  }

  function misuraInk(){
    if(inkMis) return inkMis;
    if(!titInk) return null;
    var c;
    try{ c = document.createElement('canvas').getContext('2d'); }catch(e){ return null; }
    if(!c) return null;
    var cs = getComputedStyle(titInk);
    var F = parseFloat(cs.fontSize) || 150;
    c.font = cs.fontStyle + ' ' + cs.fontWeight + ' ' + F + 'px ' + cs.fontFamily;
    var testo = testoInk();
    var sp = cs.letterSpacing === 'normal' ? 0 : (parseFloat(cs.letterSpacing) || 0);
    var w = 0, i;
    for(i = 0; i < testo.length; i++) w += c.measureText(testo[i]).width + sp;
    if(testo.length) w -= sp;
    if(!(w > 0)) return null;
    /* Tutto quello che e' una LUNGHEZZA va portato da com'e' scritto nel CSS
       a com'e' dipinto sullo schermo. La spaziatura no: e' gia' espressa in
       multipli del corpo, e corpo e spaziatura si riscalano insieme. */
    var k = scalaInk();
    inkMis = {
      largo: w * k,
      corpo: F * k,
      /* l'altezza delle maiuscole: e' QUESTA la misura che l'occhio legge
         come "quanto e' grande la scritta", e l'unica indipendente dalla
         spaziatura */
      cap: (c.measureText('H').actualBoundingBoxAscent || F * 0.7) * k,
      /* la spaziatura in multipli del corpo, per poterla prestare al clone */
      spEm: sp / F
    };
    return inkMis;
  }

  /* L'altezza delle maiuscole del CLONE, per unita' di corpo. Dipende solo
     da famiglia e peso, quindi si misura una volta. */
  var capClone = 0;
  function capitaliClone(){
    if(capClone) return capClone;
    var c;
    try{ c = document.createElement('canvas').getContext('2d'); }catch(e){ return 0.7; }
    if(!c) return 0.7;
    var cs = getComputedStyle(clone);
    c.font = cs.fontStyle + ' ' + cs.fontWeight + ' 100px ' + cs.fontFamily;
    capClone = (c.measureText('H').actualBoundingBoxAscent || 70) / 100;
    return capClone;
  }

  function testoInk(){
    var t = titInk ? (titInk.textContent || '').replace(/\s+/g, ' ').trim() : '';
    return t || 'ART AND FASHION';
  }

  function arma(){
    if(armato) return;

    /* Il velo e' bianco pieno e opaco. Se si accendesse mentre l'inchiostro
       sta ancora coprendo, sbiancherebbe di colpo gli angoli che il fluido
       non ha raggiunto — che sono scuri, non bianchi. Su uno schermo alto e
       una sezione bassa la finestra del viaggio comincia un po' prima che
       l'inchiostro sia a fondo corsa, ed e' esattamente li' che succede.
       Quindi prima si guarda a che punto e': se non ha finito, si aspetta.
       Senza inchiostro in pagina non c'e' niente da aspettare. */
    var ink = window.inkSection;
    if(ink && typeof ink.progress === 'number' && ink.ready && ink.progress < 0.92) return;

    /* Se il blocco di testo e' in prestito al reel, non e' roba nostra: la
       sezione ha due consegne, e quella che porta il blocco giu' ha la
       precedenza perche' e' gia' cominciata. */
    if(studio.inPrestito && studio.inPrestito()) return;

    armato = true;

    /* Da qui in avanti la planata — lo script che ricentra la sezione quando
       lo scroll si ferma vicino — deve stare ferma, e non solo durante il
       montaggio: durante il VIAGGIO la sezione e' a meta' schermo e il rig
       orizzontale e' gia' passato, cioe' esattamente le condizioni in cui
       quella scatta. Scattando, porterebbe la sezione al centro in sette
       decimi di secondo e il viaggio del titolo finirebbe li', tutto
       insieme, senza che nessuno abbia scrollato. L'interruttore lo aveva
       gia': sta fermo finche' il documento porta is-consegna.

       A montaggio finito si toglie: li' la sezione e' incollata al centro,
       la planata calcola una distanza di zero e non fa niente comunque. */
    document.documentElement.classList.add('is-consegna');

    inkMis = null;
    partenza = null;
    arrivo = null;
    /* Qui sotto spezza() butta via le lettere del clone e ne fa di nuove: la
       timeline dello scambio punterebbe a nodi che non sono piu' in pagina.
       Si puo' buttare senza pensarci — a questo punto del viaggio il titolo
       e' all'inchiostro e lo scambio e' comunque a zero. */
    if(tlScambio){ tlScambio.kill(); tlScambio = null; }
    firmaScambio = '';
    vestiClone();
    cloneChars = spezza(testoInk());
    clone.classList.add('is-on');
    if(velo) velo.classList.add('is-on');

    /* La prima lettura della mappa di arrivo scarica una texture dalla
       scheda video, e da li' in poi il modulo la tiene in cache. Si paga
       adesso, mentre il titolo comincia il viaggio, e non a meta' dell'onda
       di luce — dove sarebbe un fotogramma saltato nel punto peggiore. */
    var s = window.inkSection;
    if(s && s.ready && typeof s.arrivalAt === 'function'){ try{ s.arrivalAt(0.5, 0.5); }catch(e){} }
  }

  /* L'inchiostro ha finito di coprire? Senza inchiostro in pagina la
     domanda non ha senso e si torna a decidere col solo viaggio. */
  function inkAFondo(){
    var s = window.inkSection;
    if(!s || typeof s.progress !== 'number' || !s.ready) return false;
    return s.progress >= 0.99;
  }

  function disarma(){
    if(!armato) return;
    armato = false;
    document.documentElement.classList.remove('is-consegna');
    clone.classList.remove('is-on');
    if(velo) velo.classList.remove('is-on');
  }

  /* Il clone impaginato sul titolo vero, e poi riportato indietro dov'era
     l'inchiostro. Il punto fermo della scala e' il centro delle maiuscole:
     cosi' ingrandire non sposta la scritta, la ingrandisce e basta. */
  /* ——— dove stanno DAVVERO le lettere del titolo dello slider —————————
     Non il rettangolo dell'elemento: quello, al breakpoint xl, ha
     width:80% — una scatola larga ottocento pixel buoni che con il testo
     dentro non c'entra niente, e il cui centro non e' il centro della
     scritta. Il clone ci atterrava sopra spostato di una cinquantina di
     pixel, ed e' il salto che si vede a fine viaggio.

     Il carosello spezza il titolo in .studio-char: l'unione dei loro
     rettangoli e' la scritta, esattamente. Misurare quella toglie di mezzo
     width, text-align, breakpoint e qualunque cosa il Designer decida
     domani. Se le lettere non ci sono ancora, si ripiega sulla scatola. */
  function scatolaTitolo(){
    var ch = titolo.querySelectorAll('.studio-char');
    if(!ch.length) return titolo.getBoundingClientRect();
    var l = Infinity, r = -Infinity, t = Infinity, i, q;
    for(i = 0; i < ch.length; i++){
      q = ch[i].getBoundingClientRect();
      if(!q.width && !q.height) continue;
      if(q.left < l) l = q.left;
      if(q.right > r) r = q.right;
      if(q.top < t) t = q.top;
    }
    if(!(r > l)) return titolo.getBoundingClientRect();
    return { left: l, top: t, width: r - l, height: 0 };
  }

  /* ——— com'e' allineata la scritta dentro la sua scatola ————————————
     Lo dice il confronto fra i due rettangoli, non il foglio di stile: un
     valore letto dal CSS andrebbe riletto a ogni breakpoint, e i breakpoint
     di questa sezione cambiano il layout da cima a fondo.

     Serve perche' il clone e il titolo dell'opera sono due stringhe di
     lunghezza diversa — ART AND FASHION contro TRACE OF A VISAGE. Se la
     sezione allinea a sinistra devono cominciare nello stesso punto; se
     centra devono avere lo stesso centro. Sbagliare vuol dire vedere la
     scritta saltare di lato proprio nell'istante in cui si posa.

     Torna 0 per sinistra, 0.5 per centrato, 1 per destra. */
  function ancora(){
    var box = titolo.getBoundingClientRect();
    var L = scatolaTitolo();
    var spazio = box.width - L.width;
    if(!(L.width > 0) || spazio < 2) return 0.5;   /* riempie: si equivalgono */
    var a = (L.left - box.left) / spazio;
    return a < 0.25 ? 0 : (a > 0.75 ? 1 : 0.5);
  }

  function piazza(q){
    var B  = scatolaTitolo();
    if(!B.width) return;
    var cs = getComputedStyle(titolo);
    var F  = parseFloat(cs.fontSize) || 1;
    var L  = parseFloat(cs.lineHeight) || F;

    var rapp  = L / F;                          /* interlinea, in multipli del corpo */
    var largo = larghezzaBase(F);               /* la scritta al corpo del titolo   */
    var u     = 1 - q;

    /* ——— IL CORPO SI ANIMA, NON SI SCALA ————————————————————————————
       Una scala CSS su del testo lo fa rasterizzare alla misura di
       IMPAGINAZIONE e poi ingrandire come un'immagine. Alla fine del
       viaggio la mega scritta era una bitmap da novanta pixel tirata al
       165%: sgranata, e diversa da quella che l'inchiostro dipinge — e'
       insieme il "problema di risoluzione" quando si riscrolla in su e
       meta' del distacco che si vede allo scambio.

       Cambiando il CORPO, il browser ridisegna i glifi a ogni misura e la
       scritta e' nitida a tutte e due le estremita'. Costa un ricalcolo di
       impaginazione per fotogramma, ma il clone e' fisso e fuori flusso:
       quel ricalcolo riguarda lui e basta, una riga di testo. */
    /* ——— IL CORPO SI ACCORDA SULLE MAIUSCOLE, NON SULLA LARGHEZZA ————
       Accordare le larghezze totali sembra la cosa ovvia e non lo e': le due
       scritte hanno spaziature diverse, quindi per arrivare alla stessa
       larghezza il clone allargava il corpo — stessa larghezza, lettere piu'
       grosse. L'altezza delle maiuscole invece non dipende dalla spaziatura,
       ed e' la misura che l'occhio legge come "quanto e' grande".

       Poi la spaziatura si interpola anche lei, dall'una all'altra: cosi'
       all'estremo dell'inchiostro il clone ha lo stesso corpo E lo stesso
       tracciamento, e la larghezza torna a combaciare da sola. */
    var mis   = misuraInk();
    var capCl = capitaliClone();
    var Fink  = (mis && capCl > 0) ? (mis.cap / capCl) : F;

    /* Lo shader manda a capo al 94% della larghezza; il clone sta su una
       riga sola, quindi oltre quella soglia si rimpicciolisce. */
    var tetto = window.innerWidth * 0.94;
    if(mis && mis.largo > tetto) Fink *= tetto / mis.largo;
    if(!(Fink > 0)) Fink = F;

    var Fq     = F + (Fink - F) * u;                 /* il corpo adesso        */

    /* ——— IL TRACCIAMENTO NON SI INTERPOLA ————————————————————————
       Le due scritte non hanno la stessa spaziatura: l'inchiostro scrive a
       .02em, il titolo dell'opera a -0.02em. Prima si passava dall'una
       all'altra lungo il viaggio, e sembrava la cosa ovvia da fare.

       Ma una scritta che cambia tracciamento mentre rimpicciolisce non e'
       un rimpicciolimento: e' un rimpicciolimento piu' una deformazione, il
       7% di larghezza a parita' di corpo. E una deformazione fa uscire le
       lettere dalla retta — sono i quarantanove pixel che restavano dopo
       aver fermato i due estremi, e il conto torna al pixel: il 7% di
       millequattrocento, diviso due perche' ancorato al centro.

       Quindi il viaggio tiene il tracciamento dell'inchiostro dal primo
       all'ultimo fotogramma. Largo ∝ corpo, ingrandimento puro, ogni lettera
       su una retta.

       Il conto non torna piu' all'arrivo — il clone resta un 7% piu' largo
       del titolo vero — e va benissimo: a chiudere quella differenza ci
       pensa lo scambio, che ogni lettera la porta al suo posto misurato, uno
       per uno. Quel 7% non e' un errore da correggere prima, e' esattamente
       il "riposizionarsi pronte per il titolo". */
    var spQ    = mis ? mis.spEm : spazioTit;
    var perno  = centroMaiuscole(Fq, rapp * Fq);     /* il suo centro maiuscole*/

    /* Dove arriva: il punto in cui si poserebbe una scritta larga come la
       nostra, allineata come sono allineate le altre. */
    /* ——— IL PUNTO CHE SI GUARDA ————————————————————————————————————
       Non e' il centro della scritta: e' il punto da cui la riga si legge.
       Con un titolo allineato a sinistra e' il suo inizio, a destra la sua
       fine, centrato il centro — ed e' esattamente quello che dice ancora().

       Serve perche' il tracciamento delle due scritte non e' lo stesso —
       l'inchiostro scrive a .02em, il titolo a -0.02em — e lungo il viaggio
       si interpola. Quindi la scritta non rimpicciolisce e basta: cambia
       anche un pelo di forma, il 7% di larghezza a parita' di corpo. Quel
       poco non si puo' togliere, perche' e' proprio cio' che fa combaciare i
       due estremi. Ma si puo' scegliere DOVE farlo cadere: ancorando al
       centro si spalmava meta' per parte, e l'inizio della riga — il punto
       che l'occhio insegue — descriveva un arco di ottantotto pixel. E' la
       curva che si vedeva.

       Ancorando invece al punto di lettura, quel punto scorre su una retta e
       il gioco del tracciamento resta tutto in coda, dove nessuno lo segue. */
    /* ——— IL BERSAGLIO SI MISURA A LETTERE FERME —————————————————
       Il bersaglio sono le lettere del titolo. Ma lo scambio LE MUOVE: le
       porta al loro posto, le fa uscire in alto, le fa entrare dal basso. Se
       il bersaglio si rileggesse mentre lo scambio sta girando, il titolo
       inseguirebbe le lettere che lui stesso sta spostando — e infatti
       nell'ultimo fotogramma del viaggio saltava di cinquanta pixel.

       Quindi si misura solo quando sono ferme, e per il resto si tiene il
       numero. Tanto e' una posizione A RIPOSO: non dipende dallo scroll, e
       cambia solo se cambia il titolo o la finestra. */
    var ferme = !montata && (!tlScambio || !tlScambio.isActive());
    if(!arrivo || ferme){
      /* ——— A CHE ALTEZZA SI POSA ——————————————————————————————
         A riposo, chi sta a topIncollo e' il CONTENITORE che si incolla, non
         la sezione: fra i due ci puo' stare un margine, e in pagina ce n'e'
         uno. Misurando dalla sezione, la previsione sbagliava di quel
         margine — settantatre pixel, misurati sul video: il titolo si posava
         un rigo abbondante sotto il suo posto e le lettere nuove entravano
         da un'altra altezza.

         Si misura quindi dallo stick, che e' l'unico elemento di cui si sa
         con certezza dove sta a riposo: ce lo mette position:sticky, per
         definizione, al valore di top che gli abbiamo dato. Qualunque cosa
         ci sia in mezzo finisce dentro lo scarto misurato.

         E quando la sezione e' DAVVERO incollata non si prevede piu' niente:
         si legge, e la lettura batte la previsione. Cosi' se un domani salta
         fuori un altro margine, un altro bordo o un'altra scatola, il titolo
         si posa lo stesso dove deve. */
      var yRiposo;
      if(incollata()) yRiposo = B.top;
      else yRiposo = topIncollo + (B.top - stick.getBoundingClientRect().top);
      arrivo = { anc: ancora(), x: 0, y: yRiposo };
      arrivo.x = B.left + arrivo.anc * B.width;
    }
    var anc = arrivo.anc;
    var cx0 = arrivo.x;

    /* ——— IL BERSAGLIO STA FERMO ———————————————————————————————————
       Qui c'era B.top, cioe' dove il titolo si trova ADESSO. Ed e' da li'
       che veniva la curva.

       Durante il viaggio la sezione studio non e' ancora incollata: sta
       ancora salendo con lo scroll, un'intera schermata. Quindi il titolo
       puntava a un bersaglio in movimento, e la somma di un rimpicciolimento
       dritto e di un bersaglio che scappa non e' una retta — e' un arco.
       Misurato: ottantaquattro pixel di pancia, e a meta' strada la scritta
       tornava perfino indietro in su. Cambiare il modo di interpolare non
       serviva a niente (l'ho provato: da 84 a 88), perche' il problema non
       era l'interpolazione.

       Adesso si punta a dove il titolo SARA' quando la sezione si sara'
       fermata: il bordo alto della sezione a riposo e' topIncollo, e dentro
       la sezione il titolo sta sempre alla stessa altezza. Due punti fermi
       nello schermo, uno all'inizio e uno alla fine, e in mezzo una retta.
       All'arrivo le due cose coincidono di nuovo, perche' li' la sezione e'
       davvero ferma a topIncollo. */
    var cy0 = arrivo.y + centroMaiuscole(F, L);
    /* E da dove parte: NON il centro dello schermo — il centro del canvas.
       Sono la stessa cosa solo finche' il pilastro dell'inchiostro e'
       incollato, e proprio nell'istante dello scambio puo' non esserlo piu':
       lo scambio aspetta che il fluido sia a fondo corsa, che con la coda di
       fabbrica cade sull'ultimo pixel della sezione — cioe' esattamente dove
       il pilastro comincia a sfilarsi. Da li' in poi le lettere dipinte
       salgono con lui e il clone resta fermo a meta' schermo: al banco sono
       trenta pixel di scarto verticale. Si legge il riquadro vero, che e'
       anche la definizione che usa chi dipinge (centrato in w/2, h/2 della
       griglia, e la griglia sta a inset:0 nello stick). */
    /* ——— E ANCHE LA PARTENZA STA FERMA ——————————————————————————
       Stesso discorso del bersaglio, dall'altro capo. Il punto di partenza e'
       il canvas dell'inchiostro, che sta incollato — ma non per sempre: il
       suo pilastro a un certo punto finisce e se ne va su. Se succede mentre
       il titolo e' per strada, anche la partenza diventa un bersaglio in
       movimento, e la retta torna a essere un arco.

       Quindi: finche' il titolo e' ADDOSSO all'inchiostro lo si insegue, ed
       e' quello che tiene le due scritte sovrapposte al pixel nell'istante
       dello scambio. Appena parte, il punto si congela. Da li' in poi sono
       due punti fermi e in mezzo una retta.

       Il 0.995 non e' delicato: e' "il titolo e' ancora sopra l'inchiostro". */
    if(inkIncollato() || !partenza){
      var Cink = centroInk();
      partenza = { x: Cink.x + (anc - 0.5) * (mis ? mis.largo : largo), y: Cink.y };
    }
    var C = partenza;

    /* Fermi i due estremi, la posizione e' una retta e basta. (Ci avevo
       messo in mezzo un'omotetia attorno a un punto fermo: siccome il corpo
       e' gia' lineare in u, quel conto da' esattamente questi stessi numeri.
       Trenta righe per dire lerp.) */
    var cx = cx0 + (C.x - cx0) * u;
    var cy = cy0 + (C.y - cy0) * u;

    /* Le lettere dell'inchiostro sono #141416 — e' il colore della slide che
       si vede attraverso, non una scelta — e il titolo del carosello
       #252a22. Due grigi quasi uguali: il clone ci passa in mezzo lungo il
       viaggio invece di cambiare colore di scatto all'arrivo. */
    clone.style.color = 'rgb(' + Math.round(20 + 17 * q) + ',' + Math.round(20 + 22 * q) + ',' + Math.round(22 + 12 * q) + ')';

    /* Si legge da destra a sinistra, che e' l'ordine in cui si applicano:
       1. translate(-50%, -perno) porta il CENTRO DELLE MAIUSCOLE del clone
          sull'origine — da li' in poi il punto che si muove e' quello che
          l'occhio guarda, non un angolo della scatola;
       2. scale ingrandisce attorno a quel punto, che quindi non si sposta;
       3. l'ultima translate lo porta dove deve stare.
       Con l'origine a 0 0 non c'e' nessuna percentuale da interpretare. */
    /* Il filo del colore del fondo che pareggia lo spessore con le lettere
       dipinte: pieno a grandezza d'inchiostro, via via niente mentre la
       scritta rimpicciolisce, perche' all'arrivo il titolo dell'opera deve
       essere il titolo dell'opera e nient'altro. */
    if(FILO_INK > 0){
      var filo = FILO_INK * u;
      if(clone._filo !== filo){
        clone._filo = filo;
        clone.style.webkitTextStrokeWidth = filo.toFixed(3) + 'px';
        clone.style.webkitTextStrokeColor = FONDO_SEZ;
      }
    }

    if(Math.abs(parseFloat(clone.style.fontSize) - Fq) > 0.05) clone.style.fontSize = Fq.toFixed(2) + 'px';
    if(Math.abs(parseFloat(clone.style.letterSpacing) / Fq - spQ) > 0.0005) clone.style.letterSpacing = spQ.toFixed(5) + 'em';
    clone.style.transform =
      'translate3d(' + cx.toFixed(2) + 'px,' + cy.toFixed(2) + 'px,0)' +
      ' translate(' + (-anc * 100).toFixed(1) + '%,' + (-perno).toFixed(2) + 'px)';
  }

  /* ——— LO SCAMBIO DELLE LETTERE ——————————————————————————————————
     Arrivato in fondo al viaggio il clone e' esattamente sopra il titolo
     dell'opera: stesso corpo, stessa riga di base, stesso punto di partenza.
     Ma dice un'altra cosa — ART AND FASHION contro, per dire, TRACE OF A
     VISAGE — quindi le sue lettere non stanno dove quelle del titolo devono
     stare.

     Lo scambio lavora per POSTI, non per parole. Il posto i-esimo del titolo
     e la lettera i-esima del clone (gli spazi non contano, li' non c'e'
     niente da muovere):

       stessa lettera  ->  non esce e non rientra. Si sposta e basta, dal
                           punto dov'e' al punto dove serve. Una R che resta
                           una R non ha motivo di andarsene e tornare.

       lettera diversa ->  quella che c'e' va comunque verso il suo posto, e
                           intanto se ne esce dall'alto; quella che serve
                           entra dal basso, nello stesso posto, nello stesso
                           momento. E' il movimento dei tabelloni delle
                           stazioni, ed e' leggibile perche' la riga di
                           mezzo — il posto — non si muove mai.

     Le lettere del clone che avanzano escono in alto senza sostituta; i
     posti del titolo che il clone non copre si riempiono dal basso senza
     che nessuno debba uscire.

     La timeline torna intera e si riavvolge: e' questo che permette al
     titolo di tornare indietro scrollando in su senza che il resto della
     sezione debba muovere un dito. */

  /* ——— L'ORDINE: QUELLO DELL'INCHIOSTRO ————————————————————————
     Per ogni posto: a che punto della corsa il fluido sarebbe arrivato li'.
     E' la mappa della sezione sopra, letta nel punto dello schermo dove il
     posto si trova. Normalizzata, perche' una riga di titolo sta dentro
     pochi centesimi di corsa e senza normalizzare partirebbero tutte
     insieme: si tiene l'ORDINE e i grumi — la fisica — e si butta la scala.

     Le lettere non si muovono da sinistra a destra, quindi: si muovono nello
     stesso ordine irregolare in cui l'inchiostro le aveva bagnate. Senza
     inchiostro in pagina si ripiega su sinistra-destra con un filo di
     disordine, che non e' la stessa cosa ma non lascia il titolo fermo. */
  function tempiDiArrivo(spans){
    var s = window.inkSection;
    var ok = !!(s && s.ready && typeof s.arrivalAt === 'function');
    var out = [], i, r, u, v, a;

    for(i = 0; i < spans.length; i++){
      r = spans[i].getBoundingClientRect();
      u = clamp01((r.left + r.width / 2) / window.innerWidth);
      v = clamp01((r.top + r.height / 2) / window.innerHeight);
      a = ok ? s.arrivalAt(u, v) : null;
      if(a === null || a === undefined){
        a = u * 0.88 + (Math.sin(i * 12.9898) * 0.5 + 0.5) * 0.12;
      }
      out.push(a);
    }

    /* Normalizzata: la mappa dell'inchiostro, in una striscia larga quanto un
       titolo, puo' stare tutta dentro pochi centesimi di corsa. Senza questa
       riga l'onda sarebbe un lampo unico. Normalizzare tiene l'ORDINE e i
       grumi — cioe' la fisica — e butta via solo la scala. */
    var mn = Infinity, mx = -Infinity;
    for(i = 0; i < out.length; i++){ if(out[i] < mn) mn = out[i]; if(out[i] > mx) mx = out[i]; }
    var d = mx - mn;
    for(i = 0; i < out.length; i++){
      out[i] = d > 1e-4 ? (out[i] - mn) / d : (out.length > 1 ? i / (out.length - 1) : 0);
    }
    return out;
  }
  /* La lettera che si VEDE. textContent puo' essere minuscolo con un
     text-transform sopra che lo rende maiuscolo: confrontare i due testi
     grezzi direbbe "diverse" su due lettere identiche sullo schermo, e lo
     scambio le farebbe uscire e rientrare per niente. */
  function lettera(span){
    return ((span && span.textContent) || '').trim().toUpperCase();
  }

  function scambio(vecchie, nuove){
    var tl = gsap.timeline();
    if(!nuove.length && !vecchie.length) return tl;

    /* I rettangoli si leggono PRIMA di scrivere qualunque cosa, e da uno
       stato pulito: se restasse addosso una traslazione del giro precedente
       la si misurerebbe come se fosse impaginazione, e al giro dopo la si
       sommerebbe di nuovo. */
    gsap.set(vecchie, { clearProps: 'transform,opacity' });
    gsap.set(nuove,   { clearProps: 'transform' });
    gsap.set(nuove,   { opacity: 0 });

    var rv = [], rn = [], i;
    for(i = 0; i < vecchie.length; i++) rv.push(vecchie[i].getBoundingClientRect());
    for(i = 0; i < nuove.length;   i++) rn.push(nuove[i].getBoundingClientRect());

    /* Di quanto si esce e si entra. Si misura sulla lettera, non su un
       numero fisso: la stessa coreografia deve funzionare al breakpoint in
       cui il titolo e' la meta'. */
    var alt = 0;
    for(i = 0; i < rn.length; i++) if(rn[i].height > alt) alt = rn[i].height;
    for(i = 0; i < rv.length; i++) if(rv[i].height > alt) alt = rv[i].height;
    var salto = (alt || 40) * SCAMBIO_SALTO;

    var n = Math.max(vecchie.length, nuove.length);

    /* Il posto i-esimo si muove quando l'inchiostro ci sarebbe arrivato. Si
       legge la mappa dove l'azione avviene: sul posto del titolo, e sulla
       lettera del clone solo per quelle che avanzano e non hanno un posto. */
    var dove = [];
    for(i = 0; i < n; i++) dove.push(nuove[i] || vecchie[i]);
    var quando = tempiDiArrivo(dove);

    for(i = 0; i < n; i++){
      var v = vecchie[i], w = nuove[i], t = quando[i] * SCAMBIO_SPAZZATA;

      if(v && w && lettera(v) === lettera(w)){
        tl.to(v, { x: rn[i].left - rv[i].left,
                   y: rn[i].top  - rv[i].top,
                   duration: SCAMBIO_DUR, ease: SCAMBIO_EASE }, t);
        /* Lo scambio fra le due copie avviene a movimento finito, quando
           sono sovrapposte: due glifi uguali, stesso carattere e stesso
           corpo, nello stesso punto. Non si vede niente perche' non c'e'
           niente da vedere. */
        tl.set(w, { opacity: 1 }, t + SCAMBIO_DUR);
        tl.set(v, { opacity: 0 }, t + SCAMBIO_DUR);
      } else {
        if(v) tl.to(v, { x: w ? rn[i].left - rv[i].left : 0,
                         y: -salto, opacity: 0,
                         duration: SCAMBIO_DUR, ease: SCAMBIO_EASE }, t);
        if(w) tl.fromTo(w, { y: salto, opacity: 0 },
                           { y: 0, opacity: 1,
                             duration: SCAMBIO_DUR, ease: SCAMBIO_EASE }, t);
      }
    }
    return tl;
  }

  /* ——— il montaggio, UNA VOLTA SOLA —————————————————————————————
     La coreografia della sezione — le righe a tendina, la barra che sale, il
     velo che scivola via dalle fotografie, la cornice che si accende — e' un
     arrivo. Un arrivo si fa una volta.

     Prima si disfaceva e si rifaceva a ogni passata, e rivedere la stessa
     entrata per la terza volta non la fa sembrare curata: la fa sembrare
     bloccata. Adesso gira al primo scroll e poi la sezione resta com'e' per
     il resto della vita della pagina.

     Quello che continua ad andare avanti e indietro e' il titolo, e basta:
     e' lui il ponte fra le due sezioni, e deve poter tornare al suo posto in
     cima se si risale. Da qui le due timeline separate — tlSezione, che gira
     una volta e non si tocca piu', e tlScambio, che si riavvolge. */
  function monta(){
    if(montata) return;
    montata = true;

    document.documentElement.classList.add('is-consegna');
    studio.sospendi();

    var nuove = studio.lettere(), i, firma = '';
    for(i = 0; i < nuove.length; i++) firma += lettera(nuove[i]);

    /* Se il titolo e' ancora quello di prima si RIPRENDE la stessa timeline
       da dove la risalita l'aveva lasciata, invece di rifarla da capo.
       Conta perche' cambiare idea a meta' e' la cosa piu' normale del mondo:
       si risale di poco, le lettere sono a mezz'aria, si ridiscende. Rifarla
       vorrebbe dire rimisurare dei rettangoli che in quell'istante sono
       sballati dalle traslazioni in corso, e far saltare tutto di scatto.

       Se invece l'opera e' cambiata sotto — l'autoplay gira — i posti sono
       altri e la timeline va rifatta: la firma del titolo se ne accorge. */
    if(tlScambio && firma === firmaScambio){
      /* gia' arrivata in fondo: non c'e' niente da riprendere, ma il
         carosello e la planata aspettano ancora il via */
      if(tlScambio.progress() >= 1) scambiato();
      else tlScambio.play();
    } else {
      if(tlScambio) tlScambio.kill();
      firmaScambio = firma;
      tlScambio = scambio(cloneChars, nuove);
      tlScambio.eventCallback('onComplete', scambiato);
      tlScambio.play(0);
    }

    if(sezioneFatta) return;

    /* La sezione, solo la prima volta. La timeline si costruisce PRIMA di
       scoprirla, e in pausa: costruirla applica gia' lo stato di partenza —
       righe sotto il bordo, cornice spenta — quindi quando si alza il
       sipario non c'e' nessun fotogramma con qualcosa al posto sbagliato. */
    sezioneFatta = true;
    if(tlSezione) tlSezione.kill();
    tlSezione = gsap.timeline({ paused: true });

    tlSezione.add(studio.entrataRighe(), 0);
    if(pagerLn) tlSezione.add(studio.tendina([pagerLn]), 0);
    gsap.set(coperta, { clearProps: 'opacity' });
    tlSezione.add(studio.sfoglia(coperta, -1), 0);
    if(edge) tlSezione.fromTo(edge, { opacity: 0 }, { opacity: 1, duration: 0.6, ease: 'power2.out' }, 0.35);
    tlSezione.eventCallback('onComplete', function(){ coperta.classList.add('is-via'); });

    sez.classList.remove('cnsg-attesa');
    tlSezione.play(0);
  }

  /* Titolo consegnato: la planata torna libera — qui la sezione e' incollata
     al centro, quindi calcola una distanza di zero e non fa niente comunque —
     e il carosello riprende a girare. */
  function scambiato(){
    document.documentElement.classList.remove('is-consegna');
    studio.riprendi();
  }

  /* ——— e l'uscita, che adesso e' solo il titolo ————————————————————
     Scrollando in su non svanisce piu' niente: la sezione resta esattamente
     com'e', con le sue fotografie, le sue righe e la sua cornice. Torna
     indietro il titolo, e ci torna riavvolgendo lo scambio — le lettere del
     titolo se ne riscendono da dove erano venute, quelle dell'inchiostro
     rientrano da sopra e si rimettono in fila. Poi il viaggio lo riporta in
     cima, grande com'era.

     Riavvolgere invece di rifare al contrario non e' un dettaglio: una
     seconda animazione "di ritorno" sarebbe un secondo posto dove sbagliare
     i numeri, e i due movimenti non combacerebbero mai del tutto. */
  function smonta(){
    if(!montata) return;
    montata = false;
    document.documentElement.classList.add('is-consegna');
    studio.sospendi();
    if(tlScambio) tlScambio.reverse();
  }

  /* ——— il giro ————————————————————————————————————————————————————— */
  function giro(t){
    if(!vivo){ girando = false; return; }

    var dt = ultimo ? Math.min(0.1, (t - ultimo) / 1000) : 0.016;
    ultimo = t;

    var b = bersaglio();

    /* ——— IL VIAGGIO ASPETTA LE LETTERE ———————————————————————————
       Lo scambio va girato col titolo fermo al suo posto: e' li' che le
       lettere si scambiano, e se intanto la scritta vola via si vedono due
       cose scollegate che si muovono ognuna per conto suo.

       La fetta di tenuta basta a rotellata normale, ma non e' una garanzia:
       una scrollata lanciata la consuma in meno di quanto duri lo scambio.
       Questa riga la garanzia la da': finche' lo scambio gira, il viaggio
       resta a fondo corsa, punto. Al peggio si vede il titolo stare fermo un
       attimo piu' del dovuto mentre si scrolla — che e' esattamente cio' che
       la tenuta e' li' a fare. */
    if(tlScambio && tlScambio.isActive()) b = 1;

    /* Il primissimo fotogramma non insegue: ci si mette. Chi ricarica la
       pagina gia' dentro la sezione — o ci arriva con un'ancora — altrimenti
       vedrebbe il titolo partire dal centro dello schermo e volare al suo
       posto senza aver scrollato di un pixel. Da li' in poi lo smorzamento
       vale come sempre. */
    if(primo){ primo = false; p = b; }

    /* Il peso serve MENTRE il viaggio e' in corso. Quando il bersaglio e'
       a fondo corsa — la sezione si e' incollata, il titolo non ha piu'
       dove andare — non serve piu' a niente e costa soltanto: dopo una
       scrollata veloce il titolo continuava a scendere per quasi una
       schermata dopo che la sezione era gia' ferma, e la coreografia
       partiva con la tenuta quasi consumata. Misurato: 840 px di ritardo.
       Agli estremi quindi si stringe. */
    var tau = (b >= 1 || b <= 0) ? 0.05 : (0.02 + (1 - MORBIDEZZA) * 0.16);

    /* E comunque non si resta indietro piu' di tanto. Senza un tetto, il
       ritardo cresce con la velocita' dello scroll: a rotellata lanciata il
       titolo si trovava mezzo viaggio dietro. E' lo stesso freno che
       ink-transition.js mette al suo scrub, e per lo stesso motivo. */
    if(b - p >  0.20) p = b - 0.20;
    else if(b - p < -0.20) p = b + 0.20;

    p = p + (b - p) * (1 - Math.exp(-dt / tau));

    /* Un inseguimento esponenziale non arriva mai: ci si avvicina e basta.
       L'ultimo due per cento non si vede — su un viaggio di ottocento pixel
       sono sedici — ma se lo si aspetta costa mezzo secondo di sezione
       ferma e vuota. Agli estremi si chiude. */
    if(b >= 1 && p > 0.97) p = 1;
    else if(b <= 0 && p < 0.03) p = 0;
    else if(Math.abs(b - p) < 0.0015) p = b;

    /* Lo scambio va fatto MENTRE l'inchiostro e' ancora incollato, non
       quando comincia il viaggio: fra i due momenti ci sono una settantina
       di pixel di scroll, e in quei pixel la sezione a inchiostro si e' gia'
       sfilata portandosi via le sue lettere. La dissolvenza da 180 ms
       avveniva cosi' fra due scritte che non erano piu' nello stesso posto —
       si vedeva la vecchia scivolare in su mentre la nuova stava ferma, ed
       e' il doppio titolo che si legge nel video.

       Armandosi appena l'inchiostro e' a fondo corsa, il clone si accende al
       centro dello schermo — q e' ancora 0 — cioe' esattamente sopra le
       lettere che il fluido sta ancora dipingendo. La dissolvenza passa fra
       due scritte sovrapposte, e non si vede. */
    var finito = inkAFondo();
    if(p > 0.0015 || finito) arma();
    else if(p <= 0.0005 && !finito) disarma();

    if(armato) piazza(CURVA ? morbida(p) : p);

    /* ——— QUANDO SI RIAVVOLGE ————————————————————————————————————
       Lo scambio delle lettere deve girare tutto mentre il titolo sta FERMO
       al suo posto. In discesa e' automatico: il montaggio scatta a viaggio
       finito e il titolo resta parcheggiato li' per tutta la tenuta.

       In salita no, e si vedeva. Legare il riavvolgimento a p voleva dire
       farlo partire quando il viaggio era GIA' cominciato: le lettere del
       titolo tornavano indietro verso un clone che nel frattempo era volato
       via, e sullo schermo c'erano due scritte staccate di quattrocento
       pixel che si muovevano ognuna per conto suo. E' il "parte
       completamente a caso".

       Quindi il riavvolgimento lo fa scattare la TENUTA: si consuma una
       fetta di riserva mentre la sezione e' ancora incollata e il titolo
       ancora fermo, lo scambio si chiude li' dentro, e solo dopo comincia il
       viaggio. La fetta si arma solo dopo esserne usciti almeno una volta,
       se no scatterebbe nell'istante stesso del montaggio.

       'uscito' tiene chiuso il montaggio dopo l'uscita: il viaggio e' ancora
       a fondo corsa — p vale 1 — quindi senza guardia si rimonterebbe al
       fotogramma dopo. Si riapre rientrando nella tenuta o tornando al
       viaggio. */
    var r = inRiserva();
    if(p <= 0.93 || r > USCITA_R + 0.12) uscito = false;
    if(r > USCITA_R + 0.12) assestata = true;

    /* La soglia di smontaggio non e' 0.999 per non essere in balia di un
       colpo di trackpad: sotto 0.93 il titolo ha davvero ricominciato a
       scendere, non e' la rotella che ha tremato. */
    if(p >= 0.9995){ if(!uscito) monta(); }
    else if(p <= 0.93) smonta();

    if(montata && assestata && r < USCITA_R){ uscito = true; smonta(); }

    requestAnimationFrame(giro);
  }

  function sveglia(){
    if(girando) return;
    girando = true;
    ultimo = 0;
    requestAnimationFrame(giro);
  }

  misura();
  if(document.fonts && document.fonts.ready){
    document.fonts.ready.then(function(){ met = metriche(); misura(); });
  }

  /* Il giro parte quando la sezione e' vicina, non prima: fra la home e qui
     ci sono nove schermate di scroll e non c'e' motivo di far girare un
     requestAnimationFrame per tutte. */
  new IntersectionObserver(function(es){
    vivo = es[0].isIntersecting;
    if(vivo) sveglia();
  }, { rootMargin: '150% 0px' }).observe(sez);

  /* Un secondo osservatore, questo stretto: se la sezione esce davvero dallo
     schermo mentre il montaggio sta ancora girando, il montaggio si chiude
     di colpo invece di continuare dove non lo guarda piu' nessuno.

     Serve perche' la coreografia dura un tempo suo, slegato dallo scroll:
     una rotellata lunga puo' sempre scavalcarla, per quanto si allunghi la
     riserva. Se succede, l'importante e' che tornando indietro la sezione si
     trovi montata e non a meta' — con le fotografie ancora sotto il velo e
     mezzo titolo spento.

     E' lo stesso rimedio che il carosello usa gia' per il cambio opera:
     chiudiSubito() porta a fondo corsa quello che stava girando. */
  new IntersectionObserver(function(es){
    if(es[0].isIntersecting) return;
    if(tlSezione && tlSezione.progress() < 1) tlSezione.progress(1);
    if(tlScambio && montata && tlScambio.progress() < 1) tlScambio.progress(1);
  }, { rootMargin: '0px' }).observe(sez);

  var rT = null;
  window.addEventListener('resize', function(){
    clearTimeout(rT);
    rT = setTimeout(function(){
      if(window.innerWidth < MIN_W){ misura(); return; }
      met = metriche();
      inkMis = null;
      largoBase = 0;
      capClone = 0;
      misura();
      if(armato) piazza(CURVA ? morbida(p) : p);
    }, 160);
  }, { passive: true });
}

/* Questo file va caricato DOPO il carosello, ed e' cosi' in pagina. Ma se un
   domani qualcuno invertisse le due righe nel footer, l'unico sintomo
   sarebbe una sezione che non entra piu': nessun errore, niente in console,
   e mezz'ora buttata a cercarlo altrove. Meglio aspettarlo qualche istante e
   dirlo chiaro se non arriva. */
function avvia(tentativi){
  if(window.capeStudio){ init(); return; }
  if(tentativi > 40){
    console.warn('[consegna] cape-studio-carousel.js non ha esposto i suoi gesti: la sezione resta com\'era.');
    return;
  }
  setTimeout(function(){ avvia(tentativi + 1); }, 50);
}

if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function(){ avvia(0); });
else avvia(0);

})();
