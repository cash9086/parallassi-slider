/* parallassi-slider — cape-open.js
   L'ultima sezione della home: il titolo si srotola riga per riga e il
   video si apre a tendina dal bordo basso. Gira da sola: se in pagina non
   c'è .cape-open esce subito.

   Stava inline nel custom code della Home ed è stato spostato qui perché
   là lo spazio era finito. Il codice è lo stesso, meno il tag <script>.

   Il vestito — le manopole --corsa, --sosta, --w0, --w1 e il calc() che
   traduce --p in larghezza e altezza della fessura — resta nell'head
   della pagina. Qui c'è solo chi scrive --p, e chi decide quando la
   sezione si incolla in cima.

   Il quadro d'insieme nel README della repo.
*/
(function(){
  'use strict';
  var DUR     = 1000;
  var STAGGER = 150;
  var EASE    = 'cubic-bezier(.16,1,.3,1)';
  var INIZIO = 0.72;
  var sec = document.querySelector('.cape-open');
  if(!sec) return;
  var rail  = sec.querySelector('.cape-open-rail');
  var testo = sec.querySelector('.cape-open-type');
  var blocco= sec.querySelector('.cape-open-lines');
  var video = sec.querySelector('.cape-open-media');
  var righe = [].slice.call(sec.querySelectorAll('.cape-open-line'));
  var ridotto = false;
  try{ ridotto = matchMedia('(prefers-reduced-motion: reduce)').matches; }catch(e){}
  if(rail && !ridotto){
    var corsa = 1, ultimo = -1, vivo = false, girando = false, scritto = -1;
    function quanto(prop, ripiego){
      var s = getComputedStyle(sec).getPropertyValue(prop).trim();
      var n = parseFloat(s);
      if(isNaN(n)){ n = ripiego; s = 'vh'; }
      if(s.indexOf('vh') > -1) return n * window.innerHeight / 100;
      if(s.indexOf('vw') > -1) return n * window.innerWidth  / 100;
      return n;
    }
    function misura(){ corsa = Math.max(1, quanto('--corsa', 50)); }

    /* Lo stage si incolla in cima quando il binario arriva a top 0, cioe'
       quando il fondo di .cape-open-type ha risalito --anticipo. Il video
       parte quando il fondo del TESTO e' a --corsa dal basso. Fra le due
       cose ci sta il vuoto che .cape-open-type si tiene sotto il testo
       (padding + il centraggio del flex): e' quello il numero che manca,
       e cambia con l'altezza della finestra, perche' il testo e' alto in
       px e il blocco in vh. Quindi non si scrive a mano, si misura.

       Si scrive solo col binario ancora sotto il bordo basso. Cambiare
       margin-top accorcia la pagina, e se lo facessimo mentre ci sei
       dentro te la vedresti scattare sotto le dita. Li' sopra invece non
       si muove niente di visibile. */
    function calibra(){
      if(!testo || !blocco) return;
      var vh = window.innerHeight || 1;
      if(rail.getBoundingClientRect().top <= vh) return;
      var vuoto = testo.getBoundingClientRect().bottom
                - blocco.getBoundingClientRect().bottom;
      if(!(vuoto > 0)) vuoto = 0;
      var ant = Math.round(vuoto + corsa);
      if(Math.abs(ant - scritto) < 2) return;
      scritto = ant;
      sec.style.setProperty('--anticipo', ant + 'px');
    }

    /* --p e' quanto il testo ha gia' percorso dell'ultimo tratto: 0 col
       fondo di PROUDLY a --corsa dal basso, 1 quando esce dal bordo alto.
       Siccome il video passa da 0 a 100vh nello stesso tratto, e il testo
       ne fa solo --corsa, il video va 100/--corsa volte piu' svelto: a
       50vh, il doppio. E' esattamente il buco bianco sotto la parola che
       si richiude mentre la parola esce.

       Senza .cape-open-lines si ripiega sul binario, come faceva prima. */
    function render(){
      var p = blocco
        ? (corsa - blocco.getBoundingClientRect().bottom) / corsa
        : -rail.getBoundingClientRect().top / corsa;
      p = p < 0 ? 0 : (p > 1 ? 1 : p);
      if(Math.abs(p - ultimo) < 0.0004) return;
      ultimo = p;
      sec.style.setProperty('--p', p.toFixed(4));
    }
    function giro(){
      if(!vivo){ girando = false; return; }
      render();
      requestAnimationFrame(giro);
    }
    misura();
    calibra();
    render();
    new IntersectionObserver(function(es){
      vivo = es[0].isIntersecting;
      if(vivo){
        misura();
        if(!girando){ girando = true; requestAnimationFrame(giro); }
      } else {
        /* Fuori dalla sezione: il momento buono per rifare i conti. */
        misura();
        calibra();
      }
    }, { rootMargin:'100% 0px' }).observe(rail);
    /* I font arrivano dopo il primo giro di misure, e il testo e' alto
       150px a riga solo quando Glamor e' li'. */
    window.addEventListener('load', function(){
      misura(); calibra(); ultimo = -1; render();
    });
    var rT = null;
    window.addEventListener('resize', function(){
      clearTimeout(rT);
      rT = setTimeout(function(){
        misura(); calibra(); ultimo = -1; render();
      }, 150);
    }, { passive:true });
  }
  if(video){
    var muto = function(){ sec.classList.add('is-muto'); };
    var src  = video.getAttribute('src') || '';
    if(!src || src.indexOf('URL-DEL-VIDEO') > -1 || video.error) muto();
    video.addEventListener('error', muto);
    new IntersectionObserver(function(es){
      if(es[0].isIntersecting){
        var q = video.play();
        if(q && q.catch) q.catch(function(){});
      } else {
        video.pause();
      }
    }, { rootMargin:'25% 0px' }).observe(sec);
  }
  if(!righe.length || ridotto) return;
  var slitte = righe.map(function(r){
    var w = document.createElement('span');
    w.className = 'cape-ln';
    while(r.firstChild) w.appendChild(r.firstChild);
    r.appendChild(w);
    r.classList.add('cape-rise');
    return w;
  });
  var corse = [], giocate = false;
  function arma(){
    corse.forEach(function(a){ try{ a.cancel(); }catch(e){} });
    corse = [];
    giocate = false;
    sec.classList.add('is-armed');
    slitte.forEach(function(w){
      w.parentNode.classList.add('is-armed');
      w.style.transform = 'translateY(110%)';
    });
  }
  function gioca(){
    if(giocate) return;
    giocate = true;
    var resta = slitte.length;
    slitte.forEach(function(w, i){
      var a = w.animate(
        [{ transform:'translateY(110%)' }, { transform:'translateY(0)' }],
        { duration:DUR, delay:i * STAGGER, easing:EASE, fill:'both' }
      );
      corse.push(a);
      a.onfinish = function(){
        w.style.removeProperty('transform');
        try{ a.cancel(); }catch(e){}
        w.parentNode.classList.remove('is-armed');
        if(--resta === 0) sec.classList.remove('is-armed');
      };
    });
  }
  var bersaglio = blocco || righe[0].parentNode || righe[0];
  if(bersaglio.getBoundingClientRect().top > window.innerHeight) arma();
  var giu = Math.round((1 - INIZIO) * 100);
  new IntersectionObserver(function(es){
    if(es[0].isIntersecting) gioca();
  }, { rootMargin:'0px 0px -' + giu + '% 0px' }).observe(bersaglio);
  new IntersectionObserver(function(es){
    if(!es[0].isIntersecting) arma();
  }, { rootMargin:'0px' }).observe(bersaglio);
})();
