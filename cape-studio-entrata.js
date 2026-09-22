/* parallassi-slider — cape-studio-entrata.js
   L'entrata della sezione studio: bianca, poi tutto insieme.

   DA DOVE VIENE
   -------------
   Prende il posto di cape-studio-consegna.js, che faceva un'altra cosa: il
   titolo della sezione a inchiostro — "ART AND FASHION" — viaggiava dal
   centro dello schermo fino al titolo del carosello e li' si scambiava
   lettera per lettera. Quella coreografia aveva senso finche' sopra c'era
   l'inchiostro. L'inchiostro dalla pagina non c'e' piu', e quel file, non
   trovando piu' il titolo da cui partire, ripiegava sulla stringa scritta
   dentro di se': continuava a far volare "ART AND FASHION" per una sezione
   che non lo diceva piu' da nessuna parte.

   COSA SUCCEDE ADESSO
   -------------------
   1. La sezione si incolla al centro dello schermo ed e' BIANCA: titolo,
      descrizione, bottone, fotografie e barra ci sono tutti — misurabili,
      impaginati — ma spenti. Dietro di lei si apre la riserva: una schermata
      di scroll in cui non si muove niente.
   2. Consumata la riserva per SOGLIA, parte tutto insieme: il titolo sale da
      dietro il proprio bordo, le righe di testo e il bottone anche, la barra
      del carosello pure, e il velo bianco sulle fotografie se ne va con la
      scivolata inclinata con cui entra un'immagine nuova. Sotto si apre il
      riquadro con dentro la fotografia.
   3. Arrivati in fondo alla riserva, se il montaggio sta ancora girando la
      sezione ti TRATTIENE: lo scroll si ferma li' finche' l'ultima animazione
      non ha finito, poi riparte. E' la stessa idea di trattieni() nell'intro
      — una riserva che si consuma stando fermi — con una differenza: qui non
      basta la riserva, perche' il montaggio dura un tempo suo e una rotellata
      lanciata se la mangia. Quindi al fondo della riserva si prende il
      volante e si ferma davvero.
   4. Finito il montaggio la riserva SI SGANCIA: la scatola alta torna alta
      quanto la sezione, la sezione smette di essere incollata, e da li' in
      poi appena scrolli se ne va. Non resta un tratto morto da consumare da
      fermi: quello serviva a tenere ferma la sezione mentre si montava, e a
      montaggio fatto e' solo scroll a vuoto.
   5. Una volta sola, in tutta la vita della pagina. Si risale, si riscende,
      non succede piu' niente e il carosello gira all'infinito per conto suo.

   NON ANIMA NIENTE DA SOLO
   ------------------------
   I gesti sono tutti del carosello — capeStudio.tendina, entrataRighe,
   sfoglia — e li' restano. Qui si decide QUANDO, non COME: se domani cambia
   la durata di una tendina nel blocco IMPOSTAZIONI del carosello, cambia
   anche qui senza che nessuno se ne debba ricordare.

   DIPENDE DA: GSAP 3 (core), cape-studio-carousel.js (per i suoi gesti),
   window.capeScroll (il volante, per la tenuta; se manca, niente tenuta e
   tutto il resto regge).

   VA IN PAGINA: un tag <script defer> nel footer, DOPO il carosello.

   NIENTE SOTTO I 992px, e niente per chi chiede meno movimento: li' la
   sezione resta com'e' sempre stata, accesa e ferma.
*/
(function(){
'use strict';

/* ── le manopole ─────────────────────────────────────────────────────── */

var ATTESA_VH = 1.00;  /* LA RISERVA — schermate di scroll in cui la sezione
                          sta ferma e bianca. E' l'unico scroll che questa
                          entrata AGGIUNGE alla pagina, e resta li' anche
                          dopo: e' altezza, non uno stato. Alzandola l'attesa
                          si allunga; sotto 0.6 la soglia arriva addosso
                          all'ingresso e l'attesa non si legge piu'.        */

var SOGLIA    = 0;     /* 0..1 — quanta riserva si consuma bianchi prima
                          che parta tutto. A zero non si consuma niente: le
                          animazioni partono nell'istante in cui la sezione
                          si incolla al centro, che e' anche l'istante in cui
                          il muro qui sotto ti ferma. Il bianco d'attesa non
                          c'e' piu' — al suo posto c'e' il muro, che ottiene
                          la stessa cosa (guardare la sezione ferma prima che
                          cominci) senza consumare scroll.

                          A zero il confronto va fatto sul progresso GREZZO,
                          non su quello tagliato a 0: tagliato sarebbe zero
                          anche mille pixel piu' su, e tutto partirebbe con
                          la sezione ancora fuori schermo. Vedi grezza().   */

/* Il centro dove il muro inchioda. E' lo STESSO della planata che ricentra
   la sezione quando ti fermi li' vicino — meta' schermo piu' mezza barra —
   e deve restarlo: se i due non coincidessero, appena il muro molla la
   planata correggerebbe di qualche decina di pixel e si vedrebbe. Cambiando
   quei numeri nella planata, vanno cambiati anche qui. */
var NAV_SEL   = '.header-cape';
var NAV_CLEAR = 0.5;

/* ── DOVE COMINCIA TUTTO ─────────────────────────────────────────────────
   La sezione non aspetta piu' il proprio turno in fondo alla pagina: si
   mette SOPRA alla polvere, mentre quella e' ancora incollata e sta
   finendo, e li' parte.

   SOPRA_DA e' il punto della corsa della polvere in cui succede: 0.95 vuol
   dire a un ventesimo dalla fine. Si misura sulla corsa VERA, letta dal
   riquadro nel DOM — non su window.capeDust.progress, che e' riscalato
   sulla coda e arriva a 1 quando la corsa vera e' appena al 64%: scritto li'
   dentro, 0.95 vorrebbe dire tutt'altro punto.

   La sovrapposizione non si scrive a mano: si calcola ogni volta la
   distanza fra dove la polvere arriva a SOPRA_DA e dove questa sezione si
   incollerebbe da sola, e si tira su la scatola di quel tanto. Cosi' regge
   anche se in mezzo alle due sezioni compare qualcos'altro.               */
var DUST_SEL  = '.cape-dust-pin';
var SOPRA_DA  = 0.95;
var SOPRA_Z   = 8;     /* la polvere sta a 7: sopra di lei, non sotto */

var MURO_CODA = 80;    /* silenzio della rotella che vale "gesto finito"   */
var MURO_MAX  = 900;   /* e comunque il muro non tiene mai piu' di cosi'   */

var EDGE_AT   = 0.35;  /* secondi dopo la partenza in cui compare la cornice
                          del riquadro. Non a zero: prima deve essersi mosso
                          il velo, se no la cornice dice dov'e' il riquadro
                          un istante prima che si apra.                     */
var EDGE_DUR  = 0.60;

var RETE_MS   = 2200;  /* la rete della tenuta: oltre questo si chiude il
                          montaggio e si molla lo stesso, anche se non
                          avesse chiamato lui. Il montaggio misura poco piu'
                          di un secondo — la piu' lunga delle sue fette e' la
                          scivolata del velo, 0.9s — quindi qui c'e' il
                          doppio del necessario. E sta sotto la scadenza di
                          capeScroll (2500), cosi' a mollare siamo noi e non
                          la rete di un altro.                              */

var MIN_W     = 992;
var FONDO_SEZ = '#ffffff';

/* ── da qui in giu' non ci sono numeri da girare ──────────────────────── */

var SEZ     = '.studio-hero';
var TITOLO  = '.studio-headline__row';
var GUSCIO  = '.studio-headline';
var STAGE   = '.studio-stage';
var EDGE    = '.studio-stage__edge';
var PAGER   = '.studio-pager';

/* Il nome del volante, e la classe con cui si dice alla planata di stare
   ferma mentre qui si monta. La classe si chiama ancora is-consegna perche'
   e' cosi' che la planata, che sta nel custom code della pagina, la legge:
   rinominarla vorrebbe dire andare a cambiare una riga la' dentro a mano
   per non guadagnare niente. */
var VOLANTE = 'entrata-studio';
var FERMA_PLANATA = 'is-consegna';

function cl01(v){ return v < 0 ? 0 : (v > 1 ? 1 : v); }

/* ── il vestito ───────────────────────────────────────────────────────────
   Sta qui e non nel custom code della pagina per lo stesso motivo per cui ci
   stava quello della consegna: sono la meta' di un meccanismo la cui altra
   meta' e' in questo file, e tenerle in due posti — uno che si aggiorna
   cambiando uno SHA e l'altro incollando a mano — e' garantirsi che prima o
   poi non combacino piu'.

   Niente !important: se un domani vuoi sovrascrivere qualcosa dal Designer,
   deve bastarti farlo. */
function vesti(){
  if(document.getElementById('cape-entrata-css')) return;
  var st = document.createElement('style');
  st.id = 'cape-entrata-css';
  st.textContent = [
    /* La scatola alta e l'elemento incollato dentro: e' lo schema che in
       questa pagina funziona gia' tre volte. Altezze e top li scrive il JS,
       che le misure ce le ha. */
    '.stde-pin{position:relative;width:100%}',
    '.stde-stick{position:sticky;width:100%}',
    (FONDO_SEZ ? '.stde-sez{background:' + FONDO_SEZ + '}' : ''),

    /* Il velo bianco sopra le fotografie. z-index 4: sopra la cornice (3),
       che altrimenti tradirebbe con un filo di bordo dove sta il riquadro
       prima che si apra. */
    '.stde-coperta{position:absolute;inset:0;z-index:4;background:#ffffff;',
      'pointer-events:none;will-change:transform}',
    '.stde-coperta.is-via{display:none}',

    /* Le finestre che ritagliano chi sale da dietro il proprio bordo.
       Orizzontalmente sono spalancate: a ritagliare deve essere il bordo
       alto e quello basso, non i fianchi.

       Quella della barra non puo' stare sulla barra stessa: quella e' anche
       la riga flex che allinea frecce e binario, e il gap non si eredita —
       lo riscrive il JS. Quella del titolo invece e' il guscio che c'e'
       gia', e si toglie appena il titolo e' salito: da li' in poi il titolo
       e' roba del carosello, che al cambio opera lo sfoglia, e un ritaglio
       di troppo intorno a una cosa che ruota e' solo un modo di tagliarla. */
    '.stde-win{display:block;width:100%;clip-path:inset(-0.15em -100% -0.02em -100%)}',
    '.stde-ln{display:flex;width:100%;align-items:center;justify-content:center}',
    '.stde-tit-win{clip-path:inset(-0.18em -100% -0.06em -100%)}',

    /* L'attesa: la sezione bianca. Le fotografie non sono qui — quelle non
       sono spente, sono sotto il velo, ed e' per questo che quando il velo
       se ne va sembra che si apra un buco.

       opacity e non visibility: le misure devono restare. Il carosello
       impagina il titolo misurandolo, e un elemento senza misura gli
       farebbe sbagliare il corpo. In piu' il cursore su misura decide il
       proprio stato leggendo l'opacita' calcolata di quello che ha sotto,
       quindi con opacity 0 si spegne da solo. */
    '.stde-attesa .studio-headline,',
      '.stde-attesa .studio-stats,',
      '.stde-attesa [data-field="desc"],',
      '.stde-attesa .studio-info__cta,',
      '.stde-attesa .studio-stage,',
      '.stde-attesa .studio-pager{opacity:0;pointer-events:none}',

    /* Sotto i 992px e per chi chiede meno movimento il JS esce prima di
       toccare qualsiasi cosa. Questa e' la rete per chi restringe la
       finestra a sezione gia' montata. */
    '@media (max-width:991px),(prefers-reduced-motion:reduce){',
      '.stde-pin{height:auto}',
      '.stde-stick{position:static;height:auto}',
      '.stde-coperta{display:none}',
      '.stde-tit-win{clip-path:none}',
      '.stde-attesa .studio-headline,.stde-attesa .studio-stats,',
      '.stde-attesa [data-field="desc"],.stde-attesa .studio-info__cta,',
      '.stde-attesa .studio-stage,.stde-attesa .studio-pager{opacity:1;pointer-events:auto}}'
  ].join('');
  document.head.appendChild(st);
}

/* Il primo della lista che occupa spazio sullo schermo. In pagina ci sono
   DUE .studio-headline__row: il secondo sta dentro .studio-info__rule, che
   e' nascosto, e porta lo stesso data-field. querySelector prende il primo e
   finora e' andata bene per caso: basta che un domani cambi l'ordine nel
   Designer e si finisce a vestire un elemento invisibile. */
function impaginato(lista){
  for(var i = 0; i < lista.length; i++){
    var e = lista[i];
    if(e.offsetWidth || e.offsetHeight || e.getClientRects().length) return e;
  }
  return lista[0] || null;
}

function init(){
  if(window.innerWidth < MIN_W) return;
  try{ if(matchMedia('(prefers-reduced-motion: reduce)').matches) return; }catch(e){}
  if(typeof gsap === 'undefined') return;

  var sez    = document.querySelector(SEZ);
  var titolo = impaginato(document.querySelectorAll(TITOLO));
  var guscio = titolo && titolo.closest(GUSCIO);
  var stage  = document.querySelector(STAGE);
  var edge   = stage && stage.querySelector(EDGE);
  var pager  = document.querySelector(PAGER);

  if(!sez || !titolo || !guscio || !stage) return;

  window.capePatti && capePatti.dichiara('entrata studio', {
    scrivo: [[FERMA_PLANATA, 'html',
              'mentre la sezione studio si monta, la planata sta ferma']],
    leggo:  ['window.capeStudio', 'window.capeScroll']
  });

  vesti();

  var studio = window.capeStudio;
  /* L'autoplay non gira dietro il bianco: ripartira' a montaggio finito. */
  studio.sospendi();

  sez.classList.add('stde-sez', 'stde-attesa');
  guscio.classList.add('stde-tit-win');

  /* La sezione entra in una scatola piu' alta di lei, e dentro la scatola si
     incolla. Incollare direttamente .studio-hero non puo' reggere:
     position:sticky e' limitato dal riquadro del GENITORE, e il genitore qui
     e' il body — una sezione incollata al body non si stacca piu'. Con la
     scatola, la tenuta e' alta esattamente quanto la riserva e poi finisce,
     perche' finisce la scatola. */
  var pin = document.createElement('div');
  pin.className = 'stde-pin';
  var stick = document.createElement('div');
  stick.className = 'stde-stick';
  sez.parentNode.insertBefore(pin, sez);
  pin.appendChild(stick);
  stick.appendChild(sez);

  var coperta = document.createElement('div');
  coperta.className = 'stde-coperta';
  stage.appendChild(coperta);

  var pagerLn = null;
  if(pager){
    var win = document.createElement('span');
    win.className = 'stde-win';
    var ln = document.createElement('span');
    ln.className = 'stde-ln';
    while(pager.firstChild) ln.appendChild(pager.firstChild);
    win.appendChild(ln);
    pager.appendChild(win);
    pagerLn = ln;

    /* Il gap non si eredita, e un gap:inherit sull'involucro prenderebbe
       quello del padre — che adesso e' l'involucro stesso, che di gap non
       ne ha. Misurato: 21.3px -> 0, frecce e binario attaccati. Quindi si
       legge e si riscrive. */
    var gp = getComputedStyle(pager);
    var g = gp.columnGap && gp.columnGap !== 'normal' ? gp.columnGap : gp.gap;
    if(g && g !== 'normal') ln.style.gap = g;
  }

  /* ── le misure ─────────────────────────────────────────────────────── */

  var topIncollo = 0, riserva = 0, sganciata = false;

  function misura(){
    /* Sganciata, non c'e' piu' niente da misurare: la scatola e' alta quanto
       la sezione e la sezione sta nel flusso come tutte le altre. Rimisurare
       vorrebbe dire rimetterle addosso la riserva che le abbiamo appena
       tolto — e lo farebbe al primo ridimensionamento, senza dire niente. */
    if(sganciata) return;

    var h = sez.offsetHeight || window.innerHeight;
    if(window.innerWidth < MIN_W){ pin.style.height = ''; stick.style.height = ''; return; }

    /* Il centraggio puo' essere NEGATIVO, e deve poterlo essere: dentro una
       finestra di browser vera la sezione e' piu' alta dello schermo, e con
       un top bloccato a zero il taglio uscirebbe tutto dal fondo — la barra
       del carosello sotto il bordo e il titolo sopra. Con un top negativo si
       incolla centrata e il taglio si divide fra sopra e sotto, dove non c'e'
       niente da vedere. position:sticky accetta un top negativo senza fare
       storie. */
    topIncollo = Math.round((window.innerHeight - h) / 2);
    riserva    = Math.max(0, ATTESA_VH * window.innerHeight);

    stick.style.top    = topIncollo + 'px';
    stick.style.height = h + 'px';
    pin.style.height   = (h + riserva) + 'px';

    sopra();
  }

  /* Tira su la scatola finche' il momento in cui la sezione si incolla non
     cade esattamente su SOPRA_DA della corsa della polvere.

     Il margine si azzera prima di misurare: se no si misurerebbe la
     posizione che il margine di ieri ha gia' prodotto, e a ogni giro la
     sezione salirebbe ancora. */
  function sopra(){
    var dust = document.querySelector(DUST_SEL);
    if(!dust || !dust.offsetHeight){ pin.style.marginTop = ''; return; }

    pin.style.marginTop = '0px';

    var y = window.scrollY || window.pageYOffset;
    var corsaDust = dust.offsetHeight - window.innerHeight;
    if(corsaDust <= 0){ pin.style.marginTop = ''; return; }

    var yDust   = dust.getBoundingClientRect().top + y + SOPRA_DA * corsaDust;
    var yStudio = pin.getBoundingClientRect().top + y - topIncollo;
    var su      = Math.round(yStudio - yDust);

    pin.style.marginTop = (su > 0 ? -su : 0) + 'px';
    pin.style.position  = 'relative';
    pin.style.zIndex    = SOPRA_Z;
  }

  /* Quanto della riserva e' stato consumato: 0 appena la sezione si incolla,
     1 quando sta per staccarsi di nuovo andando avanti. Si misura dalla
     SCATOLA, che non si incolla mai: il suo bordo alto e' il bordo alto
     naturale della sezione, sempre e su qualunque browser. Sull'elemento
     incollato le due misure che il DOM offre non concordano dappertutto. */
  /* Dove si incolla, in coordinate di pagina: sotto questa quota la sezione
     sta ancora salendo, sopra e' incollata e la riserva si consuma. */
  function quotaIncollo(){
    var y = window.scrollY || window.pageYOffset;
    return pin.getBoundingClientRect().top + y - topIncollo;
  }

  /* Non tagliato: negativo vuol dire "non ancora incollata". Serve perche'
     con SOGLIA a zero il taglio a 0 renderebbe vero il confronto anche a
     mezzo schermo di distanza. */
  function grezza(){
    if(!(riserva > 0)) return 1;
    return ((window.scrollY || window.pageYOffset) - quotaIncollo()) / riserva;
  }

  function inRiserva(){ return cl01(grezza()); }

  /* ── l'entrata ─────────────────────────────────────────────────────── */

  var tl = null, partita = false, finita = false;

  function entra(){
    if(partita) return;
    partita = true;

    document.documentElement.classList.add(FERMA_PLANATA);

    /* Si costruisce tutto A SEZIONE ANCORA SPENTA e la si accende subito
       dopo. Non e' un dettaglio d'ordine: tendina() manda i nodi sotto il
       proprio bordo nel momento in cui la si chiama, non quando la sua fetta
       comincera' a girare. Accendendo prima ci sarebbe un fotogramma in cui
       si vedono al loro posto, prima di saltare giu' per risalire. */
    tl = gsap.timeline({ paused: true });

    /* Il titolo sale come una riga sola, con la stessa tendina delle altre:
       sfalsamento zero, perche' e' un titolo e non un elenco. */
    tl.add(studio.tendina([titolo], 0), 0);
    tl.add(studio.entrataRighe(), 0);
    if(pagerLn) tl.add(studio.tendina([pagerLn], 0), 0);

    gsap.set(coperta, { clearProps: 'opacity' });
    tl.add(studio.sfoglia(coperta, -1), 0);

    if(edge) tl.fromTo(edge, { opacity: 0 },
                             { opacity: 1, duration: EDGE_DUR, ease: 'power2.out' }, EDGE_AT);

    tl.eventCallback('onComplete', finisci);

    sez.classList.remove('stde-attesa');
    tl.play(0);
  }

  /* Montaggio finito: il velo sparisce per davvero — non basta che sia
     scivolato fuori, resterebbe una tinta piatta larga quanto il riquadro
     appoggiata li' accanto — il titolo torna in mano al carosello, la
     planata e' di nuovo libera e l'autoplay riparte. */
  function finisci(){
    if(finita) return;
    finita = true;

    coperta.classList.add('is-via');
    guscio.classList.remove('stde-tit-win');
    gsap.set(titolo, { clearProps: 'transform' });
    document.documentElement.classList.remove(FERMA_PLANATA);

    sgancia();
    molla();
    studio.riprendi();
  }

  /* ——— lo sgancio ————————————————————————————————————————————————————
     La riserva e' altezza: serve a tenere la sezione incollata mentre si
     monta, e a montaggio fatto diventa scroll a vuoto — arrivi in fondo con
     lo slider acceso e devi ancora spingere per un pezzo prima che la
     sezione si muova. Quindi si toglie.

     Togliere altezza a una pagina sotto a chi la sta guardando fa saltare
     tutto in su. Ma di quanto, si sa esattamente: tanto quanto la riserva
     gia' consumata. Si toglie quello allo scroll e la sezione resta dov'e',
     al pixel — vale mentre e' ancora incollata, e vale anche se nel
     frattempo si e' staccata e se ne sta andando, perche' li' si e' spostata
     in giu' esattamente della riserva intera.

     Quello che sta SOTTO la sezione si sposta per davvero: si alza di
     quanta riserva era rimasta da consumare. Finche' il montaggio finisce in
     fondo alla riserva non ne resta, e il conto e' zero. Piu' SOGLIA e'
     bassa, piu' capita di sganciare con della riserva ancora avanzata.

     Quanto se ne vede: la sezione e' alta 52vw (45.4 sopra i 1920), cioe'
     un filo meno di uno schermo, e si incolla centrata — quindi sotto di lei
     resta una striscia di una ventina di pixel sul bordo basso. E' li', e
     solo li', che si vede qualcosa: quella striscia passa dal fondo della
     pagina alla cima della sezione dopo. Non si sposta niente di quello che
     stai guardando.

     Lo scroll lo muove il volante, a livello CORREZIONE: e' proprio il caso
     per cui quel livello esiste — la pagina si e' accorciata, lo scroll DEVE
     seguirla, e nessuno ha il diritto di interrompere. */
  function sgancia(){
    if(sganciata) return;

    var y = window.scrollY || window.pageYOffset;
    var naturale = pin.getBoundingClientRect().top + y;
    var consumato = Math.max(0, Math.min(riserva, y - (naturale - topIncollo)));

    sganciata = true;
    riserva = 0;

    pin.style.height     = '';
    stick.style.position = 'static';
    stick.style.top      = '';
    stick.style.height   = '';

    /* Lenis tiene una sua copia dell'altezza del documento e la rilegge per
       conto suo, ma non in questo fotogramma: senza questa riga lo scroll a
       cui lo mandiamo qui sotto verrebbe tagliato sul fondo vecchio. E'
       l'unica riga di questo file che tocca Lenis direttamente, e tocca
       perche' non c'e' un modo di chiederlo al volante. */
    try{ if(window.lenis && window.lenis.resize) window.lenis.resize(); }catch(e){}

    if(consumato < 1) return;
    if(!window.capeScroll) return;
    if(!capeScroll.prendi(VOLANTE, capeScroll.CORREZIONE)) return;
    capeScroll.vaA(VOLANTE, Math.max(0, y - consumato), { immediate: true });
  }

  /* Il montaggio a fondo corsa, subito. La chiama chi sa che il momento e'
     passato: la sezione uscita dallo schermo, o la rete della tenuta.

     progress(1) non basta da solo: GSAP, quando si sposta la testina a mano,
     zittisce le callback — quindi onComplete non arriverebbe e finisci()
     resterebbe da fare, con il velo ancora li' e la planata ferma per sempre
     su una classe che nessuno toglie piu'. Si chiama a mano. */
  function chiudi(){
    if(tl && !finita && tl.progress() < 1) tl.progress(1);
    finisci();
  }

  /* ── trattieni() ───────────────────────────────────────────────────────
     La riserva da sola non basta. Il montaggio dura poco piu' di un
     secondo e una scrollata lanciata attraversa la riserva in molto meno:
     arrivati in fondo, se non ha ancora finito, si prende il volante e si
     ferma davvero.

     Con SOGLIA bassa questo capita solo a chi corre — chi scrolla piano
     arriva in fondo a montaggio gia' finito e non lo vede nemmeno. Va bene
     cosi': e' una rete, non una tappa.

     Si prende a livello MURO e non SNAP: questo non e' una planata a cui si
     puo' rinunciare, e a quel livello la planata dello studio non puo'
     togliercelo di mano mentre teniamo.

     Una volta sola. Consumata la tenuta — che sia servita o no — non si
     trattiene mai piu': risalire e riscendere non rifa' niente, ed e' tutto
     quello che serve perche' la sezione da li' in poi sia una sezione. */

  var tenutaSpesa = false, tenendo = false, reteT = null;

  function trattieni(){
    if(tenutaSpesa || tenendo || !partita) return;

    /* gia' finito prima del fondo: non c'e' niente da trattenere, e la
       tenuta si considera spesa lo stesso.

       Si guarda finita, non tl.isActive(): con una scrollata lanciata la
       soglia e il fondo cadono nello stesso fotogramma, e li' la timeline
       e' appena stata messa in moto ma non ha ancora disegnato niente —
       isActive() risponde di no, e la tenuta non scatterebbe proprio nel
       caso in cui serve di piu'. */
    if(finita || !tl){ tenutaSpesa = true; return; }

    /* senza volante non si ferma niente, e si va avanti senza tenuta: al
       peggio la sezione se ne va con il montaggio a meta', che e' quello
       che succedeva prima */
    if(!window.capeScroll || !capeScroll.prendi(VOLANTE, capeScroll.MURO)){
      tenutaSpesa = true;
      return;
    }

    tenendo = true;
    capeScroll.ferma(VOLANTE);
    clearTimeout(reteT);
    reteT = setTimeout(chiudi, RETE_MS);
  }

  /* Si molla sempre, anche se non stavamo tenendo: il volante lo prende
     anche lo sgancio, per la correzione, e capeScroll.molla() su un volante
     che non e' tuo non fa niente. Un ramo che esce prima lascerebbe la
     pagina in mano a noi fino alla scadenza. */
  function molla(){
    clearTimeout(reteT);
    reteT = null;
    tenutaSpesa = true;
    tenendo = false;
    if(window.capeScroll) capeScroll.molla(VOLANTE);
  }

  /* ── il muro d'ingresso ────────────────────────────────────────────────
     Chi arriva lanciato sulla sezione studio la supererebbe mentre le
     animazioni partono, e quelle si giocano una volta sola: chi le perde non
     le rivede. Quindi qui si sbatte.

     Si spende UNA VOLTA e solo prima che il montaggio parta — dopo non
     avrebbe piu' senso fermare niente. E' la stessa meccanica dei muri
     dell'orizzontale: si spegne la corsa, si tiene il punto e si ingoiano i
     colpi della rotella finche' ne arrivano, poi si apre. Non conta il
     tempo: conta che il gesto con cui sei arrivato sia finito. */
  var VOLANTE_MURO = 'studio-muro';
  var muroSpeso = false, yPrec = null;

  function altezzaNav(){
    var n = document.querySelector(NAV_SEL);
    if(!n) return 0;
    var cs = getComputedStyle(n);
    if(cs.position !== 'fixed' && cs.position !== 'sticky') return 0;
    if(cs.display === 'none' || cs.visibility === 'hidden') return 0;
    var r = n.getBoundingClientRect();
    return (r.top < 2 && r.height > 0) ? r.height : 0;
  }

  /* Il centro della planata, calcolato come lo calcola lei. */
  function quotaCentro(){
    var y = window.scrollY || window.pageYOffset;
    var r = sez.getBoundingClientRect();
    return y + r.top + r.height / 2 -
           (window.innerHeight / 2 + altezzaNav() * NAV_CLEAR);
  }

  function muro(){
    if(muroSpeso || partita) return;

    var meta = quotaCentro();
    var y = window.scrollY || window.pageYOffset;

    /* Solo scendendo, e solo nel fotogramma in cui il centro viene
       attraversato: piu' in la' riportare indietro sarebbe uno strappo. */
    if(yPrec === null || y < yPrec || yPrec >= meta || y < meta){ yPrec = y; return; }
    yPrec = y;

    if(!window.capeScroll || !capeScroll.prendi(VOLANTE_MURO, capeScroll.MURO)){
      muroSpeso = true;
      return;
    }
    muroSpeso = true;

    capeScroll.ferma(VOLANTE_MURO);
    capeScroll.vaA(VOLANTE_MURO, meta, { immediate: true });

    var vivoM = true, q = null, rete = null;

    function pianta(){
      if(Math.abs((window.scrollY || window.pageYOffset) - meta) < 1) return;
      window.scrollTo(0, meta);
      if(window.lenis && window.lenis.scrollTo){
        window.lenis.scrollTo(meta, { immediate: true, force: true });
      }
    }

    function apri(){
      if(!vivoM) return;
      vivoM = false;
      clearTimeout(q); clearTimeout(rete);
      removeEventListener('wheel', colpo);
      if(window.lenis && window.lenis.scrollTo){
        window.lenis.scrollTo(meta, { immediate: true, force: true });
      }
      if(window.capeScroll) capeScroll.molla(VOLANTE_MURO);
      yPrec = window.scrollY || window.pageYOffset;
    }

    function colpo(){
      if(!vivoM) return;
      clearTimeout(q);
      q = setTimeout(apri, MURO_CODA);
    }

    function tieni(){
      if(!vivoM) return;
      pianta();
      requestAnimationFrame(tieni);
    }

    addEventListener('wheel', colpo, { passive: true });
    q    = setTimeout(apri, MURO_CODA);
    rete = setTimeout(apri, MURO_MAX);
    requestAnimationFrame(tieni);
  }

  /* ── il giro ───────────────────────────────────────────────────────────
     Una lettura di layout per fotogramma, e solo mentre la sezione e' a
     tiro. A cose fatte non ne fa piu' nessuna: da li' in poi qui non c'e'
     piu' niente da decidere. */

  var vivo = false, girando = false;

  function passo(){
    girando = false;
    if(!vivo || (finita && tenutaSpesa)) return;

    var q = inRiserva();
    muro();
    if(!partita && grezza() >= SOGLIA) entra();
    if(partita && !tenutaSpesa && q >= 1) trattieni();
  }

  function sveglia(){
    if(girando || (finita && tenutaSpesa)) return;
    girando = true;
    requestAnimationFrame(passo);
  }

  misura();

  if(document.fonts && document.fonts.ready){
    document.fonts.ready.then(function(){ misura(); sveglia(); });
  }

  /* Il giro parte quando la sezione e' vicina, non prima: fra la home e qui
     ci sono nove schermate di scroll e non c'e' motivo di far girare un
     requestAnimationFrame per tutte. */
  new IntersectionObserver(function(es){
    vivo = es[0].isIntersecting;
    if(vivo) sveglia();
  }, { rootMargin: '150% 0px' }).observe(sez);

  /* Se la sezione esce davvero dallo schermo mentre il montaggio gira, il
     montaggio si chiude di colpo invece di continuare dove non lo guarda
     piu' nessuno. Con la tenuta non dovrebbe succedere — e' li' apposta —
     ma la tenuta ha bisogno del volante, e il volante potrebbe non esserci.
     Tornando indietro la sezione si trova montata e non a meta'. */
  new IntersectionObserver(function(es){
    if(es[0].isIntersecting) return;
    if(partita && !finita) chiudi();
  }, { rootMargin: '0px' }).observe(sez);

  addEventListener('scroll', sveglia, { passive: true });

  var rT = null;
  addEventListener('resize', function(){
    clearTimeout(rT);
    rT = setTimeout(function(){ misura(); sveglia(); }, 160);
  }, { passive: true });

  sveglia();
}

/* Questo file va caricato DOPO il carosello, ed e' cosi' in pagina. Ma se un
   domani qualcuno invertisse le due righe nel footer, l'unico sintomo
   sarebbe una sezione che non entra piu': nessun errore, niente in console,
   e mezz'ora buttata a cercarlo altrove. Meglio aspettarlo qualche istante e
   dirlo chiaro se non arriva. */
function avvia(tentativi){
  if(window.capeStudio){ init(); return; }
  if(tentativi > 40){
    console.warn('[entrata studio] cape-studio-carousel.js non ha esposto i suoi gesti: la sezione resta com\'era.');
    return;
  }
  setTimeout(function(){ avvia(tentativi + 1); }, 50);
}

if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function(){ avvia(0); });
else avvia(0);

})();
