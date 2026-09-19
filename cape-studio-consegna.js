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
                          secondi — onda, tendine, scivolata del velo — e una
                          schermata di riserva si consuma in poco piu' di
                          uno. La sezione se ne andava a meta' coreografia,
                          con le fotografie ancora sotto il velo.

                          E' la manopola da girare per prima se la sezione
                          ti sembra che si fermi troppo: portala a 1.4 e
                          accorcia LUCE_DUR nella stessa misura.            */

var MORBIDEZZA = 0.14; /* 0..1 — quanto il viaggio insegue lo scroll invece
                          di esserci incollato. E' lo stesso inseguimento
                          della salita del reel, e per lo stesso motivo: a 1
                          ogni strattone di rotella si legge tale e quale, a
                          0.14 il titolo arriva dietro, con un peso suo.    */

var CURVA      = true; /* smussa partenza e arrivo del viaggio (smoothstep).
                          false = il titolo parte e si ferma di colpo.      */

var SCAMBIO    = 0.18; /* secondi della dissolvenza con cui il clone prende
                          il posto del buco nell'inchiostro. Sotto i 0.10 lo
                          scambio comincia a vedersi come uno stacco.       */

var LUCE_DUR   = 0.95; /* secondi dell'onda di luce sul titolo.             */

var LUCE_ORLO  = 0.30; /* larghezza del fronte di luce, in frazione
                          dell'onda. Stretto = un lampo netto che corre;
                          largo = mezzo titolo acceso insieme. Sotto 0.12 la
                          lettera non fa in tempo ad accendersi.            */

var LUCE_COL   = [255, 247, 226];  /* il colore della luce, RGB.            */
var TESTO_COL  = [37, 42, 34];     /* #252a22, il colore del titolo a riposo*/

var USCITA     = 0.45; /* secondi della dissolvenza in uscita, scrollando in
                          su.                                              */

var MIN_W      = 992;  /* sotto questa larghezza non si fa niente.          */

/* ——— le due scelte di aspetto ————————————————————————————————————
   Non sono plumbing, sono decisioni, e stanno qui dove si vedono.

   CARATTERE: il titolo dell'inchiostro e quello dello slider erano due
   caratteri diversi. Siccome adesso la stessa scritta passa dall'uno
   all'altro senza mai sparire, un cambio a meta' strada si leggerebbe come
   un errore. Il nome e' quello con cui Webflow ha registrato il font, hash
   compreso: all'upload se lo ricava dal nome del file. Sembra un refuso e
   non lo e' — scritto "PP Editorial New" il titolo resta senza font. E' la
   stessa riga che sta in cape-title-ink.js.
   A stringa vuota, il titolo dello slider resta con il suo carattere.

   FONDO: il motore dell'inchiostro dipinge #ffffff pieno. Con il #fbfaf7
   della sezione, sul raccordo si vedrebbe un gradino di colore proprio
   mentre il titolo ci passa sopra. */
var FONT_TITOLO = '"Ppeditorialnew Bf 644 B 21500 D 0 C 0", Georgia, serif';
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
  function bersaglio(){
    var y = window.scrollY || window.pageYOffset;
    /* dalla SCATOLA, che non si incolla mai: il suo bordo alto e' il bordo
       alto naturale della sezione, sempre e su qualunque browser */
    var naturale = pin.getBoundingClientRect().top + y;
    var inizio = naturale - topIncollo - viaggio;
    return clamp01((y - inizio) / viaggio);
  }

  /* ——— il viaggio ————————————————————————————————————————————————— */
  var p = 0, armato = false, montata = false, tlMontaggio = null;
  var cloneChars = [], vivo = false, girando = false, ultimo = 0, primo = true;

  function vestiClone(){
    var cs = getComputedStyle(titolo);
    clone.style.fontFamily    = cs.fontFamily;
    clone.style.fontWeight    = cs.fontWeight;
    clone.style.fontStyle     = cs.fontStyle;
    clone.style.fontSize      = cs.fontSize;
    clone.style.lineHeight    = cs.lineHeight;
    clone.style.letterSpacing = cs.letterSpacing;
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
    inkMis = { largo: w, corpo: F };
    return inkMis;
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
  function piazza(q){
    var B  = titolo.getBoundingClientRect();
    if(!B.width || !B.height) return;
    var cs = getComputedStyle(titolo);
    var F  = parseFloat(cs.fontSize) || 1;
    var L  = parseFloat(cs.lineHeight) || F;

    var perno = centroMaiuscole(F, L);          /* dal bordo alto della scatola */

    /* La scala e' il rapporto fra la larghezza RESA dall'inchiostro e quella
       del clone, non fra due corpi dichiarati. Vedi misuraInk(). */
    var largo = clone.offsetWidth || B.width || 1;
    var mis   = misuraInk();
    var k     = mis ? (mis.largo / largo) : 1;

    /* Il tetto: lo shader manda a capo al 94% della larghezza, il clone sta
       su una riga sola. Oltre quella soglia si ferma invece di uscire. */
    var tetto = (window.innerWidth * 0.94) / largo;
    if(k > tetto) k = tetto;
    if(!(k > 0)) k = 1;

    var cx = B.left + B.width / 2;              /* dove arriva: centro del titolo */
    var cy = B.top + perno;                     /* ...e centro delle sue maiuscole */
    var dx = window.innerWidth / 2  - cx;       /* da dove parte: centro schermo   */
    var dy = window.innerHeight / 2 - cy;
    var u  = 1 - q;

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
    clone.style.transform =
      'translate3d(' + (cx + dx * u).toFixed(2) + 'px,' + (cy + dy * u).toFixed(2) + 'px,0)' +
      ' scale(' + (1 + (k - 1) * u).toFixed(4) + ')' +
      ' translate(-50%,' + (-perno).toFixed(2) + 'px)';
  }

  /* ——— l'onda di luce ————————————————————————————————————————————
     Per ogni lettera: a che punto della corsa l'inchiostro sarebbe arrivato
     li'. E' la mappa della sezione sopra, letta nel punto dello schermo dove
     la lettera si trova adesso. Torna null finche' la mappa non e' cotta, o
     se l'inchiostro su questa macchina non c'e' proprio: in quel caso si
     ripiega su un ordine da sinistra a destra con un filo di disordine, che
     non e' la stessa cosa ma non lascia la sezione senza titolo. */
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

  /* Il colore a un dato grado di luce. Precalcolato su 33 gradini: un titolo
     lungo sono quaranta lettere per sessanta fotogrammi, e comporre duemila
     stringhe al secondo per una differenza che l'occhio non vede e' lavoro
     buttato. */
  var SCALINI = 32;
  var TINTE = (function(){
    var out = [], i, t, j, c = [];
    for(i = 0; i <= SCALINI; i++){
      t = i / SCALINI;
      for(j = 0; j < 3; j++) c[j] = Math.round(TESTO_COL[j] + (LUCE_COL[j] - TESTO_COL[j]) * t);
      out.push('rgb(' + c[0] + ',' + c[1] + ',' + c[2] + ')');
    }
    return out;
  })();

  function accendi(span, luce, opacita){
    var i = luce <= 0 ? 0 : (luce >= 1 ? SCALINI : Math.round(luce * SCALINI));
    if(span._luce !== i){
      span._luce = i;
      span.style.color = TINTE[i];
      span.style.textShadow = i === 0 ? 'none'
        : '0 0 ' + (0.10 + luce * 0.42).toFixed(3) + 'em rgba(' + LUCE_COL[0] + ',' + LUCE_COL[1] + ',' + LUCE_COL[2] + ',' + (luce * 0.85).toFixed(3) + ')'
        + ', 0 0 ' + (0.30 + luce * 1.10).toFixed(3) + 'em rgba(' + LUCE_COL[0] + ',' + LUCE_COL[1] + ',' + LUCE_COL[2] + ',' + (luce * 0.45).toFixed(3) + ')';
    }
    var o = opacita < 0 ? 0 : (opacita > 1 ? 1 : opacita);
    if(span._op !== o){ span._op = o; span.style.opacity = o; }
  }

  function spegni(span){
    span._luce = undefined; span._op = undefined;
    span.style.color = ''; span.style.textShadow = ''; span.style.opacity = '';
  }

  function onda(vecchie, nuove){
    var tV = tempiDiArrivo(vecchie), tN = tempiDiArrivo(nuove);
    var corsa = 1 - LUCE_ORLO;
    var prog = { t: 0 };
    var i;

    for(i = 0; i < nuove.length; i++) accendi(nuove[i], 1, 0);

    return gsap.timeline().to(prog, {
      t: 1, duration: LUCE_DUR, ease: 'none',
      onUpdate: function(){
        var q = prog.t, j, t;
        /* la vecchia: si accende fino a meta' fronte, poi se ne va accesa */
        for(j = 0; j < vecchie.length; j++){
          t = clamp01((q - tV[j] * corsa) / LUCE_ORLO);
          accendi(vecchie[j], t < 0.5 ? t / 0.5 : 1, t < 0.5 ? 1 : 1 - (t - 0.5) / 0.5);
        }
        /* la nuova: arriva accesa un po' dopo, e si raffredda */
        for(j = 0; j < nuove.length; j++){
          t = clamp01((q - tN[j] * corsa) / LUCE_ORLO);
          t = clamp01((t - 0.42) / 0.58);
          accendi(nuove[j], 1 - t, t);
        }
      },
      onComplete: function(){
        for(var j = 0; j < vecchie.length; j++) accendi(vecchie[j], 0, 0);
        for(j = 0; j < nuove.length; j++) spegni(nuove[j]);
      }
    });
  }

  /* ——— il montaggio ——————————————————————————————————————————————— */
  function monta(){
    if(montata) return;
    montata = true;

    var nuove = studio.lettere();
    if(nuove.length) gsap.set(nuove, { opacity: 0 });

    /* La timeline si costruisce PRIMA di scoprire la sezione, e in pausa.
       Costruirla applica gia' lo stato di partenza — righe sotto il bordo,
       cornice spenta, lettere nuove a zero — quindi quando la sezione si
       scopre non c'e' nessun fotogramma in cui si vede qualcosa al posto
       sbagliato. E' l'ordine che conta: prima si prepara, poi si alza il
       sipario. */
    if(tlMontaggio) tlMontaggio.kill();
    tlMontaggio = gsap.timeline({ paused: true, onComplete: montato });

    if(cloneChars.length && nuove.length) tlMontaggio.add(onda(cloneChars, nuove), 0);
    tlMontaggio.add(studio.entrataRighe(), 0);
    if(pagerLn) tlMontaggio.add(studio.tendina([pagerLn]), 0);
    tlMontaggio.add(studio.sfoglia(coperta, -1), 0);
    if(edge) tlMontaggio.fromTo(edge, { opacity: 0 }, { opacity: 1, duration: 0.6, ease: 'power2.out' }, 0.35);

    sez.classList.remove('cnsg-attesa');
    tlMontaggio.play(0);
  }

  function montato(){
    document.documentElement.classList.remove('is-consegna');
    coperta.classList.add('is-via');
    studio.riprendi();
  }

  /* Scrollando in su: svanisce quello che era comparso, il titolo riprende il
     viaggio al contrario. Non si riavvolge la coreografia — e' una
     dissolvenza, come deve essere in uscita. */
  function smonta(){
    if(!montata) return;
    montata = false;
    if(tlMontaggio){ tlMontaggio.kill(); tlMontaggio = null; }
    /* Si torna al viaggio, quindi la planata torna ferma — l'aveva liberata
       la fine del montaggio. Senza questa riga, appena il fade e' finito
       scatterebbe e riporterebbe la sezione al centro, annullando lo scroll
       in su che l'utente ha appena fatto. Si libera di nuovo in disarma(),
       quando il titolo e' tornato all'inchiostro. */
    document.documentElement.classList.add('is-consegna');
    studio.sospendi();

    var nuove = studio.lettere();
    var roba = [info, pager, edge].filter(Boolean);

    if(roba.length){
      gsap.killTweensOf(roba);
      gsap.to(roba, { opacity: 0, duration: USCITA, ease: 'power2.out', onComplete: riposa });
    } else {
      riposa();
    }
    if(nuove.length){
      gsap.killTweensOf(nuove);
      gsap.to(nuove, { opacity: 0, duration: USCITA * 0.6, ease: 'power2.out' });
    }

    /* Il titolo dell'inchiostro deve tornare leggibile per rifare il
       viaggio al contrario, ma non puo' ricomparire di scatto mentre quello
       dell'opera sta ancora svanendo: per un terzo di secondo si vedrebbero
       due scritte diverse sovrapposte. Rientra con la stessa dissolvenza con
       cui l'altro se ne va. */
    if(cloneChars.length){
      var rit = { o: 0 };
      gsap.to(rit, {
        o: 1, duration: USCITA, ease: 'power2.out',
        onUpdate: function(){
          for(var i = 0; i < cloneChars.length; i++) accendi(cloneChars[i], 0, rit.o);
        },
        onComplete: function(){
          for(var i = 0; i < cloneChars.length; i++) spegni(cloneChars[i]);
        }
      });
    }
  }

  /* Rimette la sezione nello stato in cui la consegna la trova: tutto spento,
     il velo di nuovo sul riquadro, le righe di nuovo sotto il proprio bordo.
     Si ripulisce ogni stile scritto a mano invece di ricordarsi quali: una
     lista da tenere aggiornata e' una lista che un giorno non lo e'. */
  function riposa(){
    if(montata) return;
    sez.classList.add('cnsg-attesa');
    coperta.classList.remove('is-via');
    coperta.style.transform = '';
    var spenti = [info, pager].filter(Boolean);
    if(spenti.length) gsap.set(spenti, { clearProps: 'opacity' });
    if(edge) gsap.set(edge, { clearProps: 'opacity' });
    var nuove = studio.lettere(), i;
    for(i = 0; i < nuove.length; i++) spegni(nuove[i]);
    if(nuove.length) gsap.set(nuove, { clearProps: 'opacity' });
  }

  /* ——— il giro ————————————————————————————————————————————————————— */
  function giro(t){
    if(!vivo){ girando = false; return; }

    var dt = ultimo ? Math.min(0.1, (t - ultimo) / 1000) : 0.016;
    ultimo = t;

    var b = bersaglio();

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

    if(p > 0.0015) arma(); else if(p <= 0.0005) disarma();

    if(armato) piazza(CURVA ? morbida(p) : p);

    /* La soglia di smontaggio non e' 0.999 per non essere in balia di un
       colpo di trackpad: sotto i 0.93 vuol dire che la sezione ha davvero
       ricominciato a scendere, non che la rotella ha tremato. */
    if(p >= 0.9995) monta(); else if(p <= 0.93) smonta();

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
    if(tlMontaggio && montata && tlMontaggio.progress() < 1){
      tlMontaggio.progress(1);
    }
  }, { rootMargin: '0px' }).observe(sez);

  var rT = null;
  window.addEventListener('resize', function(){
    clearTimeout(rT);
    rT = setTimeout(function(){
      if(window.innerWidth < MIN_W){ misura(); return; }
      met = metriche();
      inkMis = null;
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
