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
   1. La polvere finisce in un bianco a tutto schermo. Su quel bianco questa
      sezione COMPARE: non arriva scrollando dal basso, e' gia' al suo posto
      — incollata al centro — e sfuma dentro mentre la riserva si consuma.
      Finche' il montaggio non parte e' spenta, quindi quello che sfuma e' un
      riquadro vuoto: a occhio, sul bianco, non si vede niente.
   2. In cima alla riserva parte tutto insieme: il titolo sale da dietro il
      proprio bordo, le righe di testo e il bottone anche, la barra del
      carosello pure, e il velo bianco sulle fotografie se ne va con la
      scivolata inclinata con cui entra un'immagine nuova. Sotto si apre il
      riquadro con dentro la fotografia. E' l'unica entrata vera che ha.
   3. Mentre il montaggio gira la sezione ti TRATTIENE: prende il volante e
      lo scroll si ferma, se no una rotellata lanciata se lo mangia e chi
      corre non lo vede. Finito, molla. Una volta sola.
   4. Da li' in avanti la sezione RESTA: se ne va con la pagina, come una
      qualunque. La dissolvenza sta tutta dall'altra parte — risalendo verso
      la polvere svanisce prima di rimettersi in moto, e ridiscendendo
      ricompare ferma dov'era.
   5. Il montaggio, una volta sola in tutta la vita della pagina. Si risale,
      si riscende, e quello non si rigioca: la sezione va e viene in
      dissolvenza, e il carosello gira all'infinito per conto suo.

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

var ATTESA_VH = 0.35;  /* LA RISERVA: la finestra in cui la sezione sta ferma
                          al suo posto. Sta tutta dal lato della POLVERE,
                          perche' e' li' che sparisce — risalendo svanisce,
                          ridiscendendo ricompare. Andando avanti resta.    */

var FADE_Q    = 0.45;  /* quanta riserva se ne prende la dissolvenza, contata
                          dal basso. Il resto — piu' della meta' — e' il
                          margine in cui la sezione e' PIENA e ferma.

                          Serve, e serve grosso: il montaggio parte in cima
                          alla riserva, ed e' li' che ti fermi a guardare lo
                          slider. Se la dissolvenza arrivasse fin lassu',
                          staresti seduto sul suo bordo: la planata che
                          ricentra, Lenis che si assesta, una fotografia che
                          finisce di caricare — basta un nulla che muova lo
                          scroll e la sezione comincia a sbiadire mentre la
                          guardi. Con il margine, prima che l'opacita' si
                          muova devi tornare indietro sul serio.            */

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

  var topIncollo = 0, riserva = 0;

  function misura(){
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

  /* Non tagliato. Sotto zero vuol dire "non ancora incollata", sopra uno
     "gia' andata avanti", e servono tutte e due: la dissolvenza ha bisogno
     del valore vero per sapere a che punto e', e il montaggio parte a 1 —
     con la misura tagliata sarebbe 1 anche mille pixel piu' avanti, e
     ripartirebbe risalendo. */
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

    molla();
    studio.riprendi();
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

     Adesso il montaggio parte proprio in fondo alla riserva, quindi la
     tenuta cade sulla sua partenza: e' lei che ti ferma mentre guardi, ed e'
     l'unica volta che succede — si spende una volta sola.

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

  /* ── apparire e sparire, senza muoversi ───────────────────────────────
     La sezione non si vede mai mentre trasla: sotto la riserva e' a zero,
     dentro la riserva e' incollata al suo posto e sfuma, sopra e' piena.

     Una rampa sola, e sta dal lato della polvere. Risalendo verso la polvere
     la sezione svanisce prima di rimettersi in moto; ridiscendendo ricompare
     ferma dov'era. Andando avanti non sfuma niente: resta piena e se ne va
     con la pagina, come una sezione qualunque.

     La prima volta la rampa non si vede lo stesso: fino al montaggio la
     sezione e' spenta — titolo, testo, fotografie, tutto a zero — quindi
     quello che sfuma e' un riquadro vuoto sul bianco della polvere. A
     rivelarla e' il montaggio, che parte in cima alla RISERVA — non in cima
     alla rampa: fra le due c'e' il margine di FADE_Q, ed e' quello che tiene
     la sezione piena mentre te la guardi. */
  var appUlt = -1;

  function apparizione(){
    var o = Math.round(cl01(grezza() / FADE_Q) * 1000) / 1000;
    if(o === appUlt) return;
    appUlt = o;

    sez.style.opacity       = o;
    sez.style.pointerEvents = o < 0.02 ? 'none' : '';
  }

  /* ── il giro ───────────────────────────────────────────────────────────
     Una lettura di layout per fotogramma, e solo mentre la sezione e' a
     tiro. A cose fatte non ne fa piu' nessuna: da li' in poi qui non c'e'
     piu' niente da decidere. */

  var vivo = false, girando = false;

  function passo(){
    girando = false;
    if(!vivo) return;

    var q = inRiserva();
    apparizione();
    /* A riserva consumata, cioe' a dissolvenza finita: la sezione e' piena
       e ferma, ed e' li' che il montaggio ha senso. Sulla misura GREZZA,
       non su quella tagliata: tagliata sarebbe 1 anche mille pixel piu'
       avanti, e il montaggio ripartirebbe risalendo. */
    if(!partita && grezza() >= 1) entra();
    if(partita && !tenutaSpesa && q >= 1) trattieni();
  }

  function sveglia(){
    if(girando) return;
    girando = true;
    requestAnimationFrame(passo);
  }

  misura();

  /* Quanto scroll passa fra la fine della polvere e il momento in cui questa
     sezione si mostra. E' il tratto in cui non c'e' niente da vedere: se e'
     grosso, si scrolla nel bianco. Si dice una volta sola, e solo se c'e'
     davvero qualcosa da dire. */
  setTimeout(function(){
    var dust = document.querySelector('.cape-dust-pin');
    if(!dust || !dust.offsetHeight) return;
    var y  = window.scrollY || window.pageYOffset;
    var fineDust = dust.getBoundingClientRect().bottom + y - window.innerHeight;
    var vuoto = Math.round((quotaIncollo() - fineDust) / window.innerHeight * 100);
    if(vuoto > 8){
      console.info('[studio] fra la fine della polvere e la comparsa della ' +
        'sezione ci sono ' + vuoto + 'vh di scroll vuoto.');
    }
  }, 1200);

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
