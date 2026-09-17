/* =========================================================================
   camera-oscura.js — The Cape Studio, la sezione .stage-wrap
   -------------------------------------------------------------------------
   La fotografia dell'hero si brucia fino al bianco, sul bianco si scrive una
   frase e una firma, poi la stessa fotografia si sviluppa di nuovo e si
   ritira dentro la prima slide dello scroll orizzontale. Dodici fasi, una
   sola corsa di scroll.

   COME SI INCLUDE
   ---------------
   Nel footer della Home, DOPO il blocco di Lenis e dopo i due tag di GSAP:

     <script defer src="https://cdn.jsdelivr.net/gh/cash9086/parallassi-slider@SHA/camera-oscura.js"></script>

   Al posto di SHA va lo SHA per esteso del commit, mai @main ne' @latest:
   quelli jsDelivr li tiene in cache fino a 7 giorni.

   Vuole GSAP + ScrollTrigger gia' caricati, e il CSS di .stage-wrap
   nell'head della pagina. Senza GSAP esce zitto con un avviso in console.

   IL MARKUP CHE SI ASPETTA
   ------------------------
     .stage-wrap              la sezione       | se manca, esce zitto
       .stage-pin             il blocco sticky | se manca, esce con avviso
         .photo-wrap > img    la fotografia    | se manca, esce con avviso
         .stage-cut           la silhouette    | opzionale
         .veil                il velo bianco
         .quote > .quote__text la frase
         .signature .sign-s   i tratti della firma

   DOVE SI METTE MANO
   ------------------
   Tutto nelle prime cinquanta righe: la tabella delle fasi e le manopole.
   Sotto c'e' solo meccanica.
   ========================================================================= */

(function(){
'use strict';

/* ── la timeline ─────────────────────────────────────────────────────────
   Una riga per fase, misurata in schermate di scroll. Questi numeri sono la
   sola sorgente: l'altezza del wrapper, il margine negativo e la durata di
   ogni cosa escono da qui. Cambiane uno e cambia tutto, senza toccare altro.

   La fase 1 non anima niente di suo: e' la schermata in cui l'hero si sfila
   da sotto mentre il blocco e' gia' incollato con la stessa identica
   fotografia. E' per questo che il passaggio di consegne non si vede. */
var FASI = [
  ['hero',       100],  /*  1  l'hero esce, la foto e' ferma                 */
  ['pausa1',      40],  /*  2  foto piena (la silhouette si spegne qui)      */
  ['bruciatura',  80],  /*  3  brightness 1 -> 6, velo bianco nell'ultimo 30%*/
  ['frase',      100],  /*  4  la frase si riempie di inchiostro             */
  ['firma',       40],  /*  5  la penna scrive                               */
  ['pausa2',      30],  /*  6                                                */
  ['fraseVia',    30],  /*  7  la frase svanisce sul posto                   */
  ['firmaVia',    50],  /*  8  la firma resta sola, poi svanisce             */
  ['bianco',      30],  /*  9  bianco vuoto                                  */
  ['sviluppo',   120],  /* 10  il velo se ne va, il filtro torna normale     */
  ['pausa3',      40],  /* 11  foto piena                                    */
  ['ritiro',     100]   /* 12  la foto si ritira dentro la prima slide       */
];

/* ── le manopole ───────────────────────────────────────────────────────── */
var VELO_DA = 0.70;  /* dentro la bruciatura, dove entra il velo bianco      */
var BRUCIA  = 6;     /* fin dove schiarisce                                  */
var CONTRA  = 0.80;  /* il contrasto da cui la foto si sviluppa              */
var DERIVA  = 16;    /* px di discesa lenta della foto lungo tutta la corsa  */
var PALE    = 0.14;  /* l'inchiostro spento delle parole                     */
var SOVRAP  = 0.40;  /* quanto una parola parte prima che finisca la prima   */

/* Muri di ingresso e di uscita dell'orizzontale: erano nel ponte, e senza di
   loro ci si arriva lanciati. Sono gli stessi numeri di prima. */
var AGG_A = 1.00, AGG_OLTRE = 0.30, AGG_MS = 260, FERMO = 380, IDLE = 80;
var GRAZIA = 220, SNAP_DUR = 0.7, FINE_OLTRE = 0.30, FINE_SU = 0.20;

var d = document;
var stage = d.querySelector('.stage-wrap');
if(!stage) return;

if(typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined'){
  console.warn('[stage] GSAP o ScrollTrigger non caricati: la sezione resta ferma.');
  return;
}
gsap.registerPlugin(ScrollTrigger);

var pin    = stage.querySelector('.stage-pin');
var wrap   = stage.querySelector('.photo-wrap');
var foto   = wrap && wrap.querySelector('img');
var cut    = stage.querySelector('.stage-cut');
var velo   = stage.querySelector('.veil');
var quote  = stage.querySelector('.quote');
var testo  = stage.querySelector('.quote__text');
var firma  = stage.querySelector('.signature');
var tratti = [].slice.call(stage.querySelectorAll('.signature .sign-s'));

var hs     = d.querySelector('.cape-hs-wrap');
var hsStk  = d.querySelector('.cape-hs-sticky');
var meta   = d.querySelector('.cape-hs-track .image-14.cape-view.copy')
          || d.querySelector('.cape-hs-track section .image-14');

if(!pin || !wrap || !foto){
  console.warn('[stage] manca .stage-pin, .photo-wrap o la sua <img>.');
  return;
}

var ridotto = false;
try{ ridotto = matchMedia('(prefers-reduced-motion: reduce)').matches; }catch(e){}

/* Chi ha chiesto meno movimento non vuole una versione lenta della stessa
   cosa: vuole un'altra cosa. Niente bruciatura, niente deriva, niente
   sviluppo — solo dissolvenze brevi, e la corsa lunga un terzo. */
if(ridotto){
  FASI = [['hero',100],['pausa1',20],['bruciatura',30],['frase',40],
          ['firma',20],['pausa2',10],['fraseVia',20],['firmaVia',20],
          ['bianco',10],['sviluppo',30],['pausa3',20],['ritiro',40]];
  BRUCIA = 1; CONTRA = 1; DERIVA = 0; VELO_DA = 0;
}

/* ── le fasi diventano posizioni ─────────────────────────────────────────
   Il tempo della timeline e' misurato in schermate: una unita' di GSAP = un
   vh di scroll. Cosi' le durate qui sotto sono gli stessi numeri della
   tabella, e non c'e' nessuna conversione da sbagliare. */
var T = {}, TOT = 0;
FASI.forEach(function(f){ T[f[0]] = { at:TOT, dur:f[1] }; TOT += f[1]; });
function at(id){ return T[id].at; }
function dur(id){ return T[id].dur; }

/* Il wrapper e' alto quanto la corsa piu' il viewport che lo sticky si
   mangia. Il margine negativo vale la fase 1: il blocco si incolla nel
   momento esatto in cui l'hero comincia a sfilarsi. */
stage.style.height    = (TOT + 100) + 'svh';
stage.style.marginTop = (-dur('hero')) + 'svh';

/* ── le parole della frase ───────────────────────────────────────────────
   Il testo lo scrive il Designer, il taglio in parole lo fa qui: una parola
   per span, e gli spazi restano nodi di testo veri, cosi' l'a capo cade dove
   deve e il copia-incolla non si accorge di niente. */
var parole = [];
if(testo){
  var src = testo.textContent.trim().split(/\s+/);
  testo.textContent = '';
  src.forEach(function(w, i){
    var s = d.createElement('span');
    s.className = 'quote__w';
    s.textContent = w;
    testo.appendChild(s);
    parole.push(s);
    if(i < src.length - 1) testo.appendChild(d.createTextNode(' '));
  });
}

/* ── la firma ────────────────────────────────────────────────────────────
   Ogni tratto prende una fetta della fase proporzionale alla propria
   lunghezza: cosi' la mano va alla stessa velocita' su un tratto lungo e su
   uno corto, che e' come scrive una mano vera. */
var PAD = 1;
var lung = tratti.map(function(p){
  var L = 0;
  try{ L = p.getTotalLength(); }catch(e){}
  p.style.strokeDasharray  = (L + PAD).toFixed(2);
  p.style.strokeDashoffset = (L + PAD).toFixed(2);
  return L;
});
var LTOT = lung.reduce(function(a, b){ return a + b; }, 0) || 1;

/* ── la coreografia ──────────────────────────────────────────────────── */
var tl = gsap.timeline({ defaults:{ ease:'none' } });

/* La deriva. Una pausa in cui non si muove NIENTE si legge come pagina
   bloccata: qui la foto scende piano per tutta la corsa, nello stesso verso
   dell'hero, e le pause diventano respiri invece che buchi.

   Si muove object-position e non un transform apposta: a transform la foto
   uscirebbe dal proprio riquadro e lascerebbe una striscia vuota sul bordo;
   object-position sposta il ritaglio DENTRO l'immagine e si ferma da solo
   quando non c'e' piu' margine. E' lo stesso mestiere che fa gia' il
   marchio dell'hero, quindi il costo di disegno e' quello di sempre. */
var deriva = { y:0 };
if(DERIVA){
  tl.to(deriva, {
    y: DERIVA, duration: at('ritiro'),
    onUpdate: function(){
      foto.style.objectPosition = '50% calc(50% + ' + deriva.y.toFixed(1) + 'px)';
    }
  }, 0);
}

/* La silhouette si spegne durante la pausa: quando le lettere sono salite
   nella barra non serve piu', e sotto la bruciatura sarebbe solo un bordo in
   piu' che prende l'alone. */
if(cut) tl.to(cut, { autoAlpha:0, duration: dur('pausa1') }, at('pausa1'));

/* La bruciatura. Il filtro sta sul contenitore (vedi il CSS): una passata
   sola, un bordo solo. */
var luce = { b:1 };
tl.to(luce, {
  b: BRUCIA, duration: dur('bruciatura'),
  onUpdate: function(){
    wrap.style.filter = luce.b <= 1.001 ? '' : 'brightness(' + luce.b.toFixed(3) + ')';
  }
}, at('bruciatura'));

tl.fromTo(velo, { opacity:0 },
  { opacity:1, duration: dur('bruciatura') * (1 - VELO_DA) },
  at('bruciatura') + dur('bruciatura') * VELO_DA);

/* Frase e firma nascono col velo, non prima. Sono inchiostro scuro: sopra la
   fotografia si vedrebbero gia' dalla prima schermata, spente ma visibili, e
   l'effetto e' quello di una scritta dimenticata addosso alla foto. Entrano
   mentre il bianco sale, cioe' quando c'e' una carta su cui stare. */
var carta = [quote, firma].filter(Boolean);
if(carta.length){
  tl.fromTo(carta, { opacity:0 },
    { opacity:1, duration: dur('bruciatura') * (1 - VELO_DA) },
    at('bruciatura') + dur('bruciatura') * VELO_DA);
}

/* La frase. Le parole si accendono in fila, ognuna comincia quando la
   precedente e' al 60%: e' l'inchiostro che cammina, non un fade del blocco.
   I conti tornano da soli — la somma di durata e ritardi fa esattamente la
   lunghezza della fase. */
if(parole.length){
  var N = parole.length;
  var slot = N > 1 ? 1 / (N - (N - 1) * SOVRAP) : 1;
  tl.fromTo(parole, { opacity:PALE },
    { opacity: 1,
      duration: dur('frase') * slot,
      stagger:  dur('frase') * slot * (1 - SOVRAP),
      ease: 'power1.inOut' },
    at('frase'));
}

/* La penna. */
var scritto = 0;
tratti.forEach(function(p, i){
  var q = lung[i] / LTOT;
  var o = { t:0 };
  tl.to(o, {
    t: 1, duration: dur('firma') * q,
    onUpdate: function(){
      p.style.strokeDashoffset = ((lung[i] + PAD) - lung[i] * o.t).toFixed(2);
    }
  }, at('firma') + dur('firma') * scritto);
  scritto += q;
});

/* La frase se ne va sul posto: non scivola, non scala. Sparisce e basta. */
if(testo) tl.to(testo, { opacity:0, duration: dur('fraseVia') }, at('fraseVia'));

/* La firma resta sola per il primo 40% della sua fase, poi se ne va. */
if(firma) tl.to(firma, { opacity:0, duration: dur('firmaVia') * 0.6 },
                at('firmaVia') + dur('firmaVia') * 0.4);

/* Lo sviluppo. Il contrasto entra di colpo all'inizio della fase, e va
   bene: in quell'istante lo schermo e' bianco pieno: non c'e' niente da
   vedere saltare. Da li' in poi scende insieme alla luce. */
var bagno = { c:CONTRA, b:BRUCIA };
tl.to(bagno, {
  c: 1, b: 1, duration: dur('sviluppo'),
  onUpdate: function(){
    wrap.style.filter = (bagno.b <= 1.001 && bagno.c >= 0.999) ? ''
      : 'contrast(' + bagno.c.toFixed(3) + ') brightness(' + bagno.b.toFixed(3) + ')';
  }
}, at('sviluppo'));

tl.to(velo, { opacity:0, duration: dur('sviluppo') * 0.8 }, at('sviluppo'));

/* La fase 12 non e' qui: e' misurata a ogni fotogramma perche' il bersaglio
   si muove. Questo riempie il tempo, cosi' la timeline e' lunga quanto la
   corsa e le proporzioni restano quelle della tabella. */
tl.to({}, { duration: dur('ritiro') }, at('ritiro'));

/* ── fase 12: il ritiro ──────────────────────────────────────────────────
   La foto si rimpicciolisce dentro l'immagine della prima slide. Cover pieno
   e cover del riquadro sono due ritagli diversi: non si interpolano
   deformando. Una scala uniforme sull'immagine, e un clip-path che stringe
   sul contenitore. */
function cover(bw, bh, ar){
  var w = bw, h = bw / ar;
  if(h < bh){ h = bh; w = bh * ar; }
  return { w:w, h:h };
}

/* Dove sara' il riquadro quando il pannello orizzontale sara' incollato: a
   regime top vale 0 e la track e' a translateX(0), quindi lo scarto di
   adesso e' gia' quello definitivo. */
function arrivo(){
  if(!meta || !hsStk) return null;
  var r = meta.getBoundingClientRect(), s = hsStk.getBoundingClientRect();
  if(r.width < 1 || r.height < 1) return null;
  return { l:r.left - s.left, t:r.top - s.top, w:r.width, h:r.height };
}

function dolce(t){ return t * t * (3 - 2 * t); }

var nascosta = false;

function ritira(u){
  /* Al traguardo la nostra fotografia sta esattamente sopra quella della
     slide, stessa misura e stesso posto: e' li' che ci si scambia il posto.
     Non si vede proprio perche' le due combaciano. Se non ci si scambiasse,
     appena il pannello si scolla la nostra se ne andrebbe con lui e sotto
     resterebbe un buco — .image-14 e' ancora spenta da is-ponte. */
  var arrivato = u >= 0.995;

  if(u <= 0.0005 || !foto.naturalWidth){
    wrap.style.visibility = '';
    foto.style.transform  = '';
    wrap.style.clipPath   = '';
    if(nascosta && meta){ meta.classList.remove('is-ponte'); nascosta = false; }
    return;
  }

  var L = arrivo();
  if(!L) return;

  var copri = !arrivato;
  if(copri !== nascosta && meta){ meta.classList.toggle('is-ponte', copri); nascosta = copri; }
  wrap.style.visibility = arrivato ? 'hidden' : '';

  var vw = pin.clientWidth, vh = pin.clientHeight;
  var ar = foto.naturalWidth / foto.naturalHeight;
  var F  = cover(vw, vh, ar);
  var A  = cover(L.w, L.h, ar);
  var k  = A.w / F.w;
  var e  = dolce(u);

  var cx = vw / 2 + (L.l + L.w / 2 - vw / 2) * e;
  var cy = vh / 2 + (L.t + L.h / 2 - vh / 2) * e;

  foto.style.transform =
    'translate3d(' + (cx - vw / 2).toFixed(1) + 'px,' +
                     (cy - vh / 2).toFixed(1) + 'px,0) ' +
    'scale(' + (1 + (k - 1) * e).toFixed(4) + ')';

  wrap.style.clipPath = 'inset(' +
    (L.t * e).toFixed(1) + 'px ' +
    ((vw - L.l - L.w) * e).toFixed(1) + 'px ' +
    ((vh - L.t - L.h) * e).toFixed(1) + 'px ' +
    (L.l * e).toFixed(1) + 'px)';
}

/* ── l'aggancio allo scroll ──────────────────────────────────────────────
   scrub: true, non scrub: 1. Lenis gia' insegue la rotella con il suo lerp:
   mettendo un ritardo anche qui i due si sommano e l'animazione arriva dopo
   lo scroll invece che insieme. Il risultato non sembra pesante, sembra
   molle. */
var st = ScrollTrigger.create({
  trigger: stage,
  start: 'top top',
  end:   'bottom bottom',
  scrub: true,
  animation: tl,
  invalidateOnRefresh: true,
  onUpdate: function(self){
    var p = self.progress * TOT;
    var u = (p - at('ritiro')) / dur('ritiro');
    ritira(u < 0 ? 0 : (u > 1 ? 1 : u));
  },
  onLeave:     function(){ ritira(1); },
  onLeaveBack: function(){ ritira(0); }
});

/* Il file arriva con defer: quando gira, le immagini possono non essere
   ancora scaricate e il bersaglio del ritiro si misura sul layout. Una
   rimisurata a pagina caricata, e i conti nascono giusti. */
addEventListener('load', function(){ ScrollTrigger.refresh(); });

/* Il riquadro di arrivo si sposta quando il rig orizzontale cambia misura:
   una rimisurata dopo il resize basta, il resto lo rilegge ogni fotogramma. */
var rT = null;
addEventListener('resize', function(){
  clearTimeout(rT);
  rT = setTimeout(function(){ ScrollTrigger.refresh(); }, 150);
}, { passive:true });

/* Diagnostica: window.capeStage() in console dice a che punto siamo. */
window.capeStage = function(){
  var p = st.progress * TOT, fase = FASI[0][0];
  for(var i = 0; i < FASI.length; i++) if(p >= T[FASI[i][0]].at) fase = FASI[i][0];
  return {
    fase: fase,
    vh: Math.round(p),
    su: Math.round(TOT),
    progresso: +st.progress.toFixed(4),
    bersaglio: meta ? 'trovato' : 'MANCA .image-14 nella prima slide',
    ridotto: ridotto
  };
};

/* ======================================================================
   I muri dell'orizzontale
   ----------------------------------------------------------------------
   Vivevano nel ponte. Non c'entrano niente con la camera oscura — sono qui
   solo perche' il ponte non c'e' piu' e senza di loro nell'orizzontale ci si
   arriva lanciati e la track parte da sola nello stesso gesto.
   Non dipendono da niente di sopra: leggono solo .cape-hs-wrap.
   ====================================================================== */
if(hs){
  var idleT = null, agganciato = false, snapFatto = false;
  var occupato = false, muratoFine = false, yMuro = 1e9;

  /* Il controllo costa una misura del layout a ogni fotogramma. Sopra la
     camera oscura e sotto il rig non c'e' niente da murare, quindi li' si
     spegne: e' la stessa guardia che aveva il ponte. */
  var vicino = false;
  if(window.IntersectionObserver){
    new IntersectionObserver(function(es){ vicino = es[0].isIntersecting; },
      { rootMargin:'150% 0px' }).observe(hs);
  } else { vicino = true; }

  function libera(){
    occupato = false;
    if(window.lenis && window.lenis.start) window.lenis.start();
  }

  function ferma(){
    if(!window.lenis || !window.lenis.stop){ libera(); return; }
    var t = setTimeout(libera, FERMO);
    var t0 = Date.now(), colpi = 0;
    function insiste(){
      if(Date.now() - t0 < GRAZIA) return;
      if(++colpi < 2) return;
      removeEventListener('wheel', insiste);
      clearTimeout(t); libera();
    }
    addEventListener('wheel', insiste, { passive:true });
    setTimeout(function(){ removeEventListener('wheel', insiste); }, FERMO + 60);
  }

  function aggancia(subito){
    if(occupato) return;
    var vh = window.innerHeight, top = hs.getBoundingClientRect().top;

    /* Due mestieri diversi, due memorie diverse. Il MURO e' uno solo per
       ogni discesa: si spende una volta e si ricarica solo tornando sopra.
       Lo SNAP deve funzionare ogni volta che ti fermi dentro la corsa. */
    if(subito){
      if(agganciato) return;
      if(top > AGG_A * vh || top <= -AGG_OLTRE * vh) return;
      agganciato = true;
    } else {
      if(snapFatto) return;
      if(top > AGG_A * vh || top <= 0) return;
      snapFatto = true;
    }

    occupato = true;
    var dove = (window.scrollY || window.pageYOffset) + top;

    if(window.lenis && window.lenis.scrollTo){
      if(subito){
        window.lenis.stop();
        window.lenis.scrollTo(dove, { immediate:true, force:true });
        ferma();
      } else {
        window.lenis.scrollTo(dove, {
          duration: SNAP_DUR,
          easing: function(x){ return 1 - Math.pow(1 - x, 3); },
          onComplete: libera
        });
        setTimeout(libera, SNAP_DUR * 1000 + 700);
      }
    } else {
      try{ window.scrollTo({ top:dove, behavior: subito ? 'auto' : 'smooth' }); }
      catch(e){ window.scrollTo(0, dove); }
      setTimeout(libera, AGG_MS);
    }
  }

  function agganciaFine(){
    if(occupato || muratoFine) return;
    var vh = window.innerHeight, giu = hs.getBoundingClientRect().bottom - vh;
    if(giu > 0 || giu <= -FINE_OLTRE * vh) return;
    muratoFine = true;
    occupato = true;

    var dove = (window.scrollY || window.pageYOffset) + giu;

    if(window.lenis && window.lenis.scrollTo){
      window.lenis.stop();
      window.lenis.scrollTo(dove, { immediate:true, force:true });
      ferma();
    } else {
      try{ window.scrollTo({ top:dove, behavior:'auto' }); }
      catch(e){ window.scrollTo(0, dove); }
      setTimeout(libera, AGG_MS);
    }
  }

  /* Il muro si decide dentro il fotogramma: Lenis ha gia' spostato lo scroll
     ma il browser non ha ancora disegnato, quindi rimettersi in riga adesso
     non si vede. Deciderlo da un evento di scroll invece si vede: quel
     fotogramma e' gia' a schermo, ed e' il rimbalzo all'indietro. */
  gsap.ticker.add(function(){
    if(!vicino || occupato) return;
    var vh = window.innerHeight, r = hs.getBoundingClientRect();
    var yOra = window.scrollY || window.pageYOffset;
    var giuOra = yOra > yMuro; yMuro = yOra;
    if(giuOra && r.top <= 0) aggancia(1);
    if(giuOra && r.bottom - vh <= 0) agganciaFine();
  });

  addEventListener('scroll', function(){
    if(occupato) return;
    var vh = window.innerHeight, top = hs.getBoundingClientRect().top;

    if(hs.getBoundingClientRect().bottom - vh > FINE_SU * vh) muratoFine = false;
    if(top > AGG_A * vh){ agganciato = false; snapFatto = false; return; }
    if(top <= 0){ snapFatto = false; return; }
    if(snapFatto) return;

    clearTimeout(idleT);
    idleT = setTimeout(aggancia, IDLE);
  }, { passive:true });
}

})();