/* parallassi-slider — cape-fondo.js
   Il footer della home. Non e' una sezione che scorre: sta FERMO, appeso al
   bordo basso dello schermo e sotto al video di .cape-open, ed e' il bordo
   basso del video che salendo lo scopre — come sollevare un foglio da un
   tavolo.

   E' alto meno di uno schermo (--alto, nell'head). E' tutto li' il motivo:
   arrivati in fondo alla pagina il video e' salito di --alto e non di piu',
   quindi non esce mai del tutto e in cima ne resta sempre una striscia viva.

   Il footer e' bianco dal primo istante. C'era un velo nero che si ritirava
   dentro le lettere: non stava in piedi — i rettangoli si leggevano come
   fasce, non come scrittura che assorbe — ed e' stato tolto. Sta nella
   storia della repo al commit e4a175b.

   Quindi qui dentro c'e' una cosa sola, e non e' il posizionamento: quello
   lo fa il CSS, in tre righe. Qui c'e' chi decide QUANDO sganciare il footer
   dal flusso, perche' un elemento fisso appeso li' fin dalla prima riga
   della pagina si vedrebbe spuntare da sotto ogni sezione senza fondo pieno.

   Il quadro d'insieme nel README della repo.
*/
(function(){
  'use strict';

  /* Quanto prima il footer si sgancia. E' una percentuale di schermata: 80%
     vuol dire che si appende quando il suo posto e' ancora otto decimi di
     schermo sotto il bordo basso. Li' siamo dentro la --sosta di .cape-open,
     col video aperto a pieno schermo che copre tutto: lo scambio non si vede
     e non c'e' niente da cui spuntare.

     Il posto non cambia altezza fra i due stati, quindi la pagina non si
     accorcia e non salta sotto le dita. */
  var VICINO = '80%';

  var d     = document;
  var posto = d.querySelector('.cape-fondo-posto');
  var fondo = posto && posto.querySelector('.cape-fondo');
  if(!posto || !fondo) return;

  /* Chi ha chiesto meno movimento non prende una versione lenta di questa
     cosa: prende un footer. Bianco, fermo, in fondo alla pagina, con tutto
     gia' al suo posto. E' esattamente lo stato in cui il CSS lo lascia senza
     questo file, quindi non c'e' niente da fare: si esce. E' anche quello
     che si vede se il file non si carica. */
  var ridotto = false;
  try{ ridotto = matchMedia('(prefers-reduced-motion: reduce)').matches; }catch(e){}
  if(ridotto) return;

  new IntersectionObserver(function(es){
    fondo.classList.toggle('is-appesa', es[0].isIntersecting);
  }, { rootMargin: VICINO + ' 0px' }).observe(posto);

  /* Il referto, da chiamare in console. "scoperto" e' la cosa da guardare se
     qualcosa non torna: 0 col video ancora a pieno schermo, 1 a fondo pagina
     col footer tutto in vista. Se non arriva a 1, il posto e il footer non
     sono alti uguale. */
  window.capeFondo = function(){
    var sec   = d.querySelector('.cape-open');
    var bordo = (sec && sec.querySelector('.cape-open-stage')) || sec;
    var vh    = window.innerHeight || 1;
    var alto  = fondo.getBoundingClientRect().height || 1;
    var giu   = bordo ? bordo.getBoundingClientRect().bottom : null;
    return {
      appesa:   fondo.classList.contains('is-appesa'),
      alto:     Math.round(alto),
      posto:    Math.round(posto.getBoundingClientRect().height),
      scoperto: giu === null ? null
                : +Math.max(0, Math.min(1, (vh - giu) / alto)).toFixed(3),
      video:    giu === null ? null : Math.round(giu),
      schermo:  vh
    };
  };

  window.capePatti && capePatti.dichiara('footer della home', {
    scrivo: [['is-appesa', '.cape-fondo',
              'il footer si sgancia dal flusso e si appende al bordo basso'],
             ['window.capeFondo', '',
              'il referto del footer, da chiamare in console']],
    leggo:  [['.cape-open-stage', '',
              'il bordo basso del video e\' quello che scopre il footer']]
  });
})();
