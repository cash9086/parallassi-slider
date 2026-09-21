/* parallassi-slider — cape-fondo.js
   Il footer della home. Due cose, e la seconda e' quella che costa.

   LA PRIMA: il footer non si muove. Se ne sta appeso al bordo basso dello
   schermo, sotto al video di .cape-open, e viene SCOPERTO dal bordo basso
   del video che sale. E' alto meno di uno schermo (--alto), ed e' per
   questo che a fondo pagina il video non esce mai del tutto: ne resta
   sempre una striscia viva in cima. Di questa parte, qui dentro, c'e'
   pochissimo — il posizionamento lo fa il CSS. Qui c'e' solo chi decide
   QUANDO sganciarlo dal flusso, perche' un elemento fisso appeso li' dalla
   prima riga della pagina si vedrebbe spuntare da sotto le sezioni
   trasparenti.

   LA SECONDA: il nero. Finche' il footer e' scoperto per meno di --soglia
   e' nero pieno; da li' in poi il nero si ritira dentro le lettere e dentro
   la linea, e quando ha finito resta il bianco con sopra la scritta nera.

   Non e' una dissolvenza, ed e' per questo che serve del codice: sono N
   rettangoli neri, uno per ogni lettera, uno per ogni parola, uno per la
   linea. Partono tutti grandi quanto TUTTO il footer — quindi coincidono, e
   al primo istante e' nero pieno senza una fessura — e ognuno si stringe sul
   proprio bersaglio. Piu' si stringono, piu' si aprono i vuoti: prima fra il
   contenuto e i margini, poi fra una riga e l'altra, poi fra una parola e
   l'altra, alla fine fra una lettera e l'altra. Il nero non se ne va: si
   raccoglie.

   Il vestito sta nell'head della pagina — --alto, --soglia, il velo, le
   gocce. Qui c'e' solo chi misura e chi scrive --p.

   Non sa niente di cosa ci sia scritto dentro il footer: il contenuto lo si
   mette nel Designer quando si vuole, e questo codice lo trova da solo. Il
   quadro d'insieme nel README della repo.
*/
(function(){
  'use strict';

  /* ——— le manopole che non stanno nel CSS ——————————————————————————
     Quelle che si toccano davvero — --alto e --soglia — stanno nell'head,
     accanto al resto del vestito. Qui restano le due che descrivono la
     forma del gesto, non la sua misura. */

  /* Da qui in poi i rettangoli svaniscono. A 0.82 sono gia' stretti quanto
     l'inchiostro della lettera: quello che si dissolve non e' il nero, e'
     l'alone che gli resta intorno. Piu' in basso e il nero sfuma prima di
     essersi raccolto; piu' in alto e l'ultimo tratto diventa uno scatto. */
  var FADE_DA = 0.82;

  /* Smussa partenza e arrivo. A false il nero si ritira a velocita'
     costante, e si legge come un cursore che scorre invece che come una
     cosa che viene assorbita. */
  var CURVA = true;

  /* Quanto prima il footer si sgancia dal flusso. E' una percentuale di
     schermata: 80% vuol dire che si appende quando il suo posto e' ancora
     otto decimi di schermo sotto il bordo basso. Li' siamo dentro la
     --sosta di .cape-open, col video aperto a pieno schermo che copre
     tutto: lo scambio non si vede, e non c'e' sezione trasparente da cui il
     footer possa spuntare. */
  var VICINO = '80%';

  /* Quanto dell'altezza di riga e' inchiostro, quando il browser non sa
     dirlo. Per un maiuscolo e' circa il 72% del corpo. E' solo un ripiego:
     la misura vera la da' measureText, vedi inchiostro(). */
  var OCCHIO = 0.72;

  var SOGLIA_RIPIEGO = 0.45;

  var d     = document;
  var posto = d.querySelector('.cape-fondo-posto');
  var fondo = posto && posto.querySelector('.cape-fondo');
  if(!posto || !fondo) return;

  var marchio = fondo.querySelector('.cape-fondo-marchio');
  var riga    = fondo.querySelector('.cape-fondo-riga');
  var info    = fondo.querySelector('.cape-fondo-info');

  /* Chi sale e scopre il footer. Lo stage e' il blocco incollato che porta
     il video: finche' e' incollato il suo bordo basso sta sul fondo dello
     schermo, e appena si scolla comincia a salire. E' quel bordo la cosa da
     guardare. Senza stage si ripiega sulla sezione, che finisce nello
     stesso punto. */
  var sec   = d.querySelector('.cape-open');
  var stage = sec && sec.querySelector('.cape-open-stage');
  var bordo = stage || sec;

  var ridotto = false;
  try{ ridotto = matchMedia('(prefers-reduced-motion: reduce)').matches; }catch(e){}

  /* Chi ha chiesto meno movimento non prende una versione lenta di questa
     cosa: prende un footer. Bianco, fermo, in fondo alla pagina, con la
     scritta nera gia' li'. E' esattamente lo stato in cui il CSS lo lascia
     se questo file non gira, quindi non c'e' niente da fare: si esce. */
  if(ridotto) return;

  function cl(v){ return v < 0 ? 0 : (v > 1 ? 1 : v); }
  function dolce(t){ return CURVA ? t * t * (3 - 2 * t) : t; }

  function manopola(nome, ripiego){
    var n = parseFloat(getComputedStyle(fondo).getPropertyValue(nome));
    return isNaN(n) ? ripiego : n;
  }

  /* ——— spezzare il testo ————————————————————————————————————————
     Si cammina sui soli nodi di testo, non sugli elementi: cosi' i link,
     gli <a>, i <br> e qualunque cosa il Designer ci mettera' domani restano
     dove sono e continuano a funzionare. I pezzi sono <span> inline e non
     inline-block apposta — un inline-block romperebbe l'andare a capo delle
     informazioni, e quelle vanno a capo per forza su un telefono. */
  function spezza(radice, aLettera){
    if(!radice || radice.querySelector('.cape-fondo-pz')) return;
    var nodi = [], w, n;
    try{ w = d.createTreeWalker(radice, NodeFilter.SHOW_TEXT, null); }catch(e){ return; }
    while((n = w.nextNode())) if(n.nodeValue && n.nodeValue.trim()) nodi.push(n);
    nodi.forEach(function(nodo){
      var pezzi = aLettera ? nodo.nodeValue.split('')
                           : nodo.nodeValue.split(/(\s+)/);
      var frag = d.createDocumentFragment();
      pezzi.forEach(function(t){
        if(!t) return;
        if(!t.trim()){ frag.appendChild(d.createTextNode(t)); return; }
        var s = d.createElement('span');
        s.className = 'cape-fondo-pz';
        s.textContent = t;
        frag.appendChild(s);
      });
      nodo.parentNode.replaceChild(frag, nodo);
    });
  }

  function boxTesto(el){
    try{
      var rg = d.createRange();
      rg.selectNodeContents(el);
      var r = rg.getBoundingClientRect();
      if(r.width > 0 && r.height > 0) return r;
    }catch(e){}
    return el.getBoundingClientRect();
  }

  /* ——— THE CAPE da bordo a bordo ————————————————————————————————
     Il corpo che serve non si scrive a mano. La larghezza del testo e'
     proporzionale al corpo, quindi basta misurare una volta e moltiplicare:
     se a 200px la scritta e' larga 900 e il posto e' 1440, il corpo giusto
     e' 200 x 1440/900. Due passate perche' la crenatura e un'eventuale
     interlettera in px non sono perfettamente proporzionali; alla seconda
     l'errore e' sotto il pixel e il ciclo esce da solo.

     Il valore inline si cancella prima di misurare: senza, alla seconda
     finestra si partirebbe dal corpo calcolato per la prima e la scritta
     non potrebbe piu' tornare grande. */
  function adatta(){
    if(!marchio) return;
    marchio.style.removeProperty('font-size');
    for(var giro = 0; giro < 2; giro++){
      var cs = getComputedStyle(marchio);
      var largo = marchio.clientWidth
                - (parseFloat(cs.paddingLeft)  || 0)
                - (parseFloat(cs.paddingRight) || 0);
      var corpo = parseFloat(cs.fontSize) || 0;
      var r = boxTesto(marchio);
      if(!(largo > 0) || !(corpo > 0) || !(r.width > 0)) return;
      var nuovo = corpo * (largo / r.width);
      if(Math.abs(nuovo - corpo) < 0.3) return;
      marchio.style.fontSize = nuovo.toFixed(2) + 'px';
    }
  }

  /* ——— il bersaglio di una goccia ————————————————————————————————
     Non e' la scatola della lettera. Una riga di testo e' alta quanto
     l'interlinea, e un rettangolo alto cosi', fermo sopra una maiuscola, si
     legge come una fascia e non come la lettera: il nero sembrerebbe
     raccogliersi in barrette, non in scrittura.

     Serve l'inchiostro vero, e quello lo sa dire measureText: fontBoundingBox
     da' dove cade la linea di base dentro la scatola, actualBoundingBox da'
     quanto l'inchiostro sale e scende da quella linea. Si prende solo la
     misura verticale — l'orizzontale resta quella del DOM, perche'
     measureText non conosce l'interlettera del foglio di stile e darebbe una
     larghezza sbagliata proprio dove l'interlettera e' grande, cioe' su THE
     CAPE.

     Se il browser non risponde si ripiega su OCCHIO, che sbaglia di qualche
     pixel e nessuno se ne accorge. Sulla linea invece non si tocca niente:
     e' gia' alta un pixel, e il bersaglio e' lei. */
  var tela = null, pen = null, penFatto = false;

  function pennello(){
    if(penFatto) return pen;
    penFatto = true;
    try{
      tela = d.createElement('canvas');
      pen  = tela.getContext && tela.getContext('2d');
    }catch(e){ pen = null; }
    return pen;
  }

  function inchiostro(el, f){
    var r  = el.getBoundingClientRect();
    var cs = getComputedStyle(el);
    var ls = parseFloat(cs.letterSpacing) || 0;
    var b  = {
      x: r.left - f.left,
      y: r.top  - f.top,
      /* l'interlettera dell'ultima lettera sporge a destra e non e'
         inchiostro: toglierla evita una goccia sempre un filo larga */
      w: Math.max(1, r.width - (ls > 0 ? ls : 0)),
      h: r.height
    };
    if(el === riga) return b;

    var c = pennello();
    if(c){
      try{
        c.font = cs.fontStyle + ' ' + cs.fontWeight + ' ' +
                 cs.fontSize  + ' ' + cs.fontFamily;
        var m = c.measureText(el.textContent || '');
        var salita  = m.fontBoundingBoxAscent;
        var discesa = m.fontBoundingBoxDescent;
        var su      = m.actualBoundingBoxAscent;
        var giu     = m.actualBoundingBoxDescent;
        if(salita >= 0 && discesa >= 0 && su >= 0 && giu >= 0){
          var base = b.y + (b.h - (salita + discesa)) / 2 + salita;
          var alt  = su + giu;
          if(alt > 0 && alt <= b.h + 2){
            b.y = base - su;
            b.h = alt;
            return b;
          }
        }
      }catch(e){}
    }
    var occhio = (parseFloat(cs.fontSize) || 0) * OCCHIO;
    if(occhio > 0 && occhio < b.h){
      b.y += (b.h - occhio) / 2;
      b.h  = occhio;
    }
    return b;
  }

  /* ——— il velo ————————————————————————————————————————————————
     Una goccia per bersaglio, messa alla misura d'arrivo e poi ingrandita
     col transform fino a coprire tutto il footer. In questo verso e non
     nell'altro: le gocce sono rettangoli pieni, quindi lo scale e' gratis e
     non c'e' niente da ridisegnare, e a ogni fotogramma si scrive una sola
     proprieta' per goccia invece di quattro.

     transform-origin sta in alto a sinistra perche' il conto qui sotto
     parte da li'. Con origine 0 0, scale(sx,sy) porta la scatola da (x,y,w,h)
     a (x,y,W,H), e translate(-x,-y) la riporta sull'angolo del footer. */
  var velo = null, gocce = [];

  function costruisci(){
    if(!velo){
      velo = d.createElement('div');
      velo.className = 'cape-fondo-velo';
      velo.setAttribute('aria-hidden', 'true');
      fondo.appendChild(velo);
    }
    velo.textContent = '';
    gocce = [];

    var f = fondo.getBoundingClientRect();
    var W = f.width, H = f.height;
    if(!(W > 0 && H > 0)) return;

    var lista = [].slice.call(fondo.querySelectorAll('.cape-fondo-pz'));
    if(riga) lista.push(riga);

    lista.forEach(function(el){
      var b = inchiostro(el, f);
      if(!(b.w > 0 && b.h > 0)) return;
      var g = d.createElement('i');
      g.className = 'cape-fondo-goccia';
      g.style.left   = b.x.toFixed(1) + 'px';
      g.style.top    = b.y.toFixed(1) + 'px';
      g.style.width  = b.w.toFixed(1) + 'px';
      g.style.height = b.h.toFixed(1) + 'px';
      velo.appendChild(g);
      gocce.push({ el:g, sx:W/b.w, sy:H/b.h, dx:-b.x, dy:-b.y, t:'', o:'' });
    });
  }

  function vesti(p){
    var e  = dolce(cl(p));
    var op = p < FADE_DA ? 1 : cl(1 - (p - FADE_DA) / (1 - FADE_DA));
    var os = op >= 1 ? '' : op.toFixed(3);
    for(var i = 0; i < gocce.length; i++){
      var g  = gocce[i];
      var t  = 'translate(' + (g.dx * (1 - e)).toFixed(2) + 'px,' +
                              (g.dy * (1 - e)).toFixed(2) + 'px) scale(' +
                              (g.sx + (1 - g.sx) * e).toFixed(5) + ',' +
                              (g.sy + (1 - g.sy) * e).toFixed(5) + ')';
      if(t !== g.t){ g.t = t; g.el.style.transform = t; }
      if(os !== g.o){ g.o = os; g.el.style.opacity = os; }
    }
  }

  /* ——— quanto ————————————————————————————————————————————————————
     rivelato = quanta parte del footer il video ha gia' scoperto, 0 a 1. Si
     misura sul bordo basso del video contro il bordo alto del footer, e il
     footer e' appeso al fondo dello schermo, quindi il suo bordo alto sta a
     (schermo - alto). Nessun numero scritto a mano: --alto si legge dal
     footer vero, cosi' cambiarlo nell'head basta e avanza.

     --p e' quel numero rimappato sul tratto che ci interessa: sta a zero
     finche' non si e' scoperto --soglia, e poi corre fino a uno. */
  var soglia = SOGLIA_RIPIEGO, alto = 1;

  function misura(){
    soglia = cl(manopola('--soglia', SOGLIA_RIPIEGO));
    if(soglia > 0.95) soglia = 0.95;
    alto = fondo.getBoundingClientRect().height || 1;
  }

  function quanto(){
    if(!bordo) return 0;
    var vh  = window.innerHeight || 1;
    var riv = cl((vh - bordo.getBoundingClientRect().bottom) / alto);
    return cl((riv - soglia) / (1 - soglia));
  }

  /* ——— il giro ——————————————————————————————————————————————————
     Gira solo mentre il footer e' appeso, cioe' nell'ultimo pezzo di pagina.
     Fuori di li' non c'e' un fotogramma da spendere: l'osservatore lo
     riaccende quando serve. */
  var vivo = false, girando = false, ultimo = -1;

  function giro(){
    if(!vivo){ girando = false; return; }
    var p = quanto();
    if(Math.abs(p - ultimo) > 0.0006){
      ultimo = p;
      fondo.style.setProperty('--p', p.toFixed(4));
      vesti(p);
    }
    requestAnimationFrame(giro);
  }

  function rifai(){
    misura();
    adatta();
    misura();            /* adatta() cambia il corpo, e con lui l'altezza */
    costruisci();
    ultimo = -1;
    var p = quanto();
    fondo.style.setProperty('--p', p.toFixed(4));
    vesti(p);
  }

  function appendi(s){
    if(s === fondo.classList.contains('is-appesa')) return;
    fondo.classList.toggle('is-appesa', s);
    vivo = s;
    if(s){
      rifai();
      if(!girando){ girando = true; requestAnimationFrame(giro); }
    }
  }

  spezza(marchio, true);
  spezza(info,   false);
  rifai();

  new IntersectionObserver(function(es){
    appendi(es[0].isIntersecting);
  }, { rootMargin: VICINO + ' 0px' }).observe(posto);

  /* I font arrivano dopo il primo giro di misure, e THE CAPE e' largo quanto
     lo schermo solo quando Editorial New e' li'. */
  window.addEventListener('load', rifai);
  if(d.fonts && d.fonts.ready) d.fonts.ready.then(rifai, function(){});

  var rT = null;
  window.addEventListener('resize', function(){
    clearTimeout(rT);
    rT = setTimeout(rifai, 150);
  }, { passive:true });

  window.capeFondo = function(){
    return {
      p:        +cl(ultimo).toFixed(3),
      appesa:   fondo.classList.contains('is-appesa'),
      alto:     Math.round(alto),
      soglia:   soglia,
      gocce:    gocce.length,
      corpo:    marchio ? getComputedStyle(marchio).fontSize : null,
      video:    bordo ? Math.round(bordo.getBoundingClientRect().bottom) : null,
      schermo:  window.innerHeight
    };
  };

  window.capePatti && capePatti.dichiara('footer della home', {
    scrivo: [['is-appesa', '.cape-fondo',
              'il footer si sgancia dal flusso e si appende al bordo basso'],
             ['--p', '.cape-fondo',
              'quanto il nero si e\' gia\' ritirato dentro le lettere, 0 -> 1'],
             ['window.capeFondo', '',
              'il referto del footer, da chiamare in console']],
    leggo:  [['.cape-open-stage', '',
              'il bordo basso del video e\' quello che scopre il footer']]
  });
})();
