# parallassi-slider

Gli script di scroll della home di The Cape Studio che non stanno più nel
custom code della pagina, perché là lo spazio è finito.

| File | Cosa è | Peso |
|---|---|---|
| `reel-salita.js` | la sezione reel: la tenuta e la salita | ~16 KB |
| `cape-open.js` | la sezione `.cape-open`: la tendina del video e le righe del titolo | ~6 KB |
| `camera-oscura.js` | la sezione `.stage-wrap`: bruciatura, frase, firma, sviluppo, ritiro | ~21 KB |
| `cape-studio-entrata.js` | la sezione studio: bianca, poi tutto insieme, una volta sola | ~15 KB |

`reel-salita.js` e `cape-open.js` non hanno dipendenze — niente GSAP, niente
jQuery. `camera-oscura.js` vuole GSAP e ScrollTrigger già caricati.
`cape-studio-entrata.js` vuole GSAP e `cape-studio-carousel.js`, e va caricato
**dopo** di lui. Ognuno controlla da solo se la sua sezione è in pagina, e se
non c'è esce subito senza costare niente.

---

## Come si include

Pages → Home → Settings → Custom code → *Before `</body>` tag*, **in fondo** a
quello che c'è già:

```html
<script defer src="https://cdn.jsdelivr.net/gh/cash9086/parallassi-slider@SHA/reel-salita.js"></script>
```

Al posto di `SHA` va lo SHA per esteso del commit, **mai `@main` né `@latest`**:
quelli li tiene jsDelivr in cache fino a 7 giorni, e dopo una modifica ti
ritrovi a guardare la versione vecchia chiedendoti perché non cambia niente.

---

## Il markup che si aspetta

Quello che c'è già nel Designer. Nessun elemento nuovo da creare.

| Selettore | Serve a | Se manca |
|---|---|---|
| `[data-reel]` | la sezione | esce, zitto |
| `.reel-item` | i riquadri del nastro | esce, zitto |
| `[data-reel-slot]` | il rettangolo su cui atterra il testo | la salita va, il testo non viene spinto |
| `.studio-info` | il testo che ci atterra sopra | la spinta si calcola sul solo slot, e resta corta |

Il testo **non** viene spostato a mano: viene spostato lo slot, e il testo lo
segue da solo perché il blocco della consegna rilegge
`slot.getBoundingClientRect()` a ogni fotogramma. Una cosa spostata invece di
due, e nessuno dei due codici deve sapere dell'altro.

---

## La tenuta

`SOSTA_VH` — schermate di scroll in cui, arrivati in fondo alla sezione, **non
si muove niente**. La sezione è ferma, i riquadri sono tutti appoggiati al bordo
basso, e tu scrolli a vuoto finché la riserva non è consumata. Per proseguire
devi continuare a scrollare: è il blocco.

È lo stesso meccanismo di `trattieni()` nell'intro, con lo stesso numero —
`0.80`. Là la riserva si aggiunge all'altezza della traccia:

```js
var RISERVA = MAX_HOLD * window.innerHeight;
track.style.height = (track.offsetHeight + RISERVA) + 'px';
```

qui a quella della scatola che contiene la sezione. Stessa idea: tanta altezza
in più quanto scroll vogliamo poter consumare stando fermi.

**Scatta all'inizio della parallassi** — riquadri tutti sul bordo basso, la
scaletta com'è sempre stata — e non alla fine.

Una differenza voluta: `trattieni()` si sgancia una volta sola (`yRil` resta
impostato per sempre), perché nell'intro la tendina si apre e basta. Qui la
tenuta non ha stato: è un tratto morto della corsa, quindi la trovi uguale anche
risalendo, e non c'è niente da riarmare né da desincronizzare.

---

## La salita

`SALITA_VH` — schermate in cui la salita si consuma, **dopo** che la tenuta è
finita. La sezione resta ferma anche qui: a muoversi sono solo i riquadri.

Con `ALT` l'altezza della scatola dei riquadri, `h` l'altezza del riquadro e `e`
quanto sei avanzato:

```
bottom = e · (ALT − h)
```

- **e = 0** — tutti a zero: la scaletta di sempre, intatta.
- **e = 0.5** — ognuno sta a `(ALT−h)/2` dal fondo, cioè col centro a `ALT/2`:
  tutti i centri sulla stessa riga.
- **e = 1** — ognuno è alzato di tutto quello che lo separava dalla cima: tutti
  i bordi alti sulla stessa riga, la scala rovescia.

I riquadri piccoli sembrano correre di più, ma non c'è nessuna velocità scritta
da nessuna parte: hanno `h` piccolo, quindi `(ALT−h)` grande, quindi più strada
da fare nello stesso tempo. Arrivano insieme per costruzione. Il riquadro che
rinasce a sinistra grande zero non ha bisogno di un caso speciale: `h≈0` → sale
di tutta `ALT`, cioè nasce in cima e cresce verso il basso.

Con la sezione ferma niente viene tagliato: la corsa può durare quanto vuoi.

---

## Le manopole

| Manopola | Default | Cosa fa |
|---|---|---|
| `SOSTA_VH` | `0.80` | la tenuta: schermate in cui non si muove niente |
| `SALITA_VH` | `1.60` | schermate in cui la salita si consuma |
| `MORBIDEZZA` | `0.10` | quanto la salita **insegue** lo scroll invece di esserci incollata |
| `CURVA` | `true` | smussa partenza e arrivo (smoothstep) |
| `SPINTA` | `1.60` | quanto il testo viene spinto oltre il bordo alto |
| `ANTICIPO` | `1.70` | di quanto la spinta del testo corre avanti alla salita |

### Perché non si alza l'altezza della sezione nel Designer

`SOSTA_VH + SALITA_VH` è la riserva aggiunta alla sezione, ed è il modo giusto
di darle più respiro. Alzarne l'altezza non lo sarebbe: l'Embed del reel ricava
il suo gradino da `altezza della sezione × 0.185`, quindi una sezione più alta
non dà più tempo — dà **riquadri più grandi**, e a 200vh sarebbero grandi il
doppio dello schermo. Qui la sezione resta alta uguale e a cambiare è solo
quanto scroll ci vuole per attraversarla: la geometria del nastro non se ne
accorge.

Come tiene fermo: la sezione entra in una scatola alta `altezza + riserva` ed è
`sticky`, incollata col proprio fondo sul fondo dello schermo. È lo stesso
schema di `.cape-hs-wrap`, che sta due sezioni più su. Tutte e due le manopole a
`0` spengono la scatola e la sezione torna a scorrere.

### Lo smorzamento

`MORBIDEZZA` è la manopola che toglie la nevrosi. A `1` la scaletta è
rigidamente agganciata alla rotella e ogni strattone si vede tale e quale; a
`0.10` le arriva dietro, con un peso suo, e una scrollata violenta si legge come
una spinta invece che come uno scatto. È lo stesso inseguimento che l'Embed del
reel usa per la sua spinta, e per lo stesso motivo. Il passo è corretto sul
tempo trascorso, così a 30 e a 120 fotogrammi al secondo il peso si sente
uguale.

### La spinta del testo

`SPINTA` si misura sul **testo**, non sullo slot. Lo slot è un rettangolo vuoto
messo lì per dire dove atterrare; il blocco che ci atterra sopra —
`.studio-info` — è alto quanto titolo, descrizione, prezzo e bottone messi
insieme, cioè quasi sempre molto di più. Misurando il solo slot, il rettangolo
sparisce e il testo resta lì a metà.

`ANTICIPO` dà alla spinta una curva sua, `e^(1/ANTICIPO)`. Sopra `1` il testo
parte subito e sgombera mentre i riquadri sono ancora bassi — che è il verso
giusto, perché una cosa spinta si muove **prima** che quella che spinge le
arrivi addosso, non dopo. Con i default il testo è già fuori dallo schermo a
metà salita.

---

## Note

- A riposo `bottom` viene **cancellata**, non messa a zero: il riquadro torna sul
  `bottom:0` del foglio di stile e il bordo basso ricade sul pixel intero dove
  l'Embed lo aveva agganciato. È per questo che la scaletta ferma resta pulita
  esattamente com'era — ed è tutto quello che si vede durante la tenuta.
- La scatola si infila fra `<body>` e la sezione. Il body impila i figli uno
  sotto l'altro senza flex né grid, quindi non sposta niente di quello che c'è
  intorno.
- Durante un resize lo slot torna al suo posto per 400 ms: il blocco della
  consegna misura la propria corsa leggendo dov'è lo slot, e lo fa 150 ms dopo il
  resize. Se lo trovasse spostato si taglierebbe la corsa da solo.
- `prefers-reduced-motion: reduce` spegne tutto: niente scatola, niente tenuta,
  niente salita. La scaletta resta ferma, che è già una composizione.
- C'era anche un `reel-blocco.js` che fermava lo scroll a tempo con
  `lenis.stop()`. Era una funzione inventata da zero, e la tenuta la rende
  inutile: è stato tolto. Sta nella storia della repo al commit `e877be9`.

---

## `cape-open.js`

L'ultima sezione: il titolo (THE ART / WE CRAFT / PROUDLY) si srotola riga per
riga, e poi il video si apre a tendina dal bordo basso dello schermo.

### Il markup che si aspetta

| Selettore | Serve a | Se manca |
|---|---|---|
| `.cape-open` | la sezione | esce, zitto |
| `.cape-open-type` | il blocco alto 100vh che contiene il titolo | niente calibrazione, resta il valore CSS |
| `.cape-open-lines` | il blocco delle tre righe | si ripiega sul binario, come faceva prima |
| `.cape-open-rail` | il binario | niente tendina, restano solo le righe che salgono |
| `.cape-open-media` | il `<video>` | niente riproduzione; se l'indirizzo non c'è la tendina sparisce |
| `.cape-open-line` | le singole righe | niente srotolamento |

Il vestito sta nell'head della pagina: le manopole `--corsa`, `--sosta`, `--w0`,
`--w1`, e il `calc()` che traduce `--p` in larghezza e altezza della fessura.
Qui c'è solo chi scrive `--p`.

### `--p` si legge dal testo, non dal binario

    p = (--corsa − fondo di .cape-open-lines) / --corsa

Il binario è un oggetto invisibile che comincia dove gli dice `--anticipo`; il
fondo di PROUDLY è la cosa che guardi. Legando il video al secondo invece che al
primo, il traguardo del video e quello del testo cadono insieme per costruzione,
su qualunque schermo, e nessuno dei due deve indovinare dov'è l'altro.

Siccome in quel tratto il testo percorre `--corsa` e il video ne percorre 100vh,
quella manopola è anche il rapporto fra le due velocità:

| `--corsa` | cosa fa |
|---|---|
| `100vh` | il video sale insieme al testo: il bordo alto resta incollato al fondo della parola |
| `50vh` | il doppio. Parte a metà schermo, arriva in cima insieme al testo, e per strada ricuce il mezzo schermo di bianco che si era lasciato sotto |
| `33vh` | il triplo: parte tardi e recupera di scatto |

### Perché `--anticipo` lo calcola il codice

`--anticipo` decide quando `.cape-open-stage` si incolla in cima. Deve essere già
incollato quando il video parte, altrimenti la tendina si aprirebbe sotto il
bordo basso dello schermo e non la vedresti. Il numero giusto è

    --anticipo = (vuoto sotto il testo dentro .cape-open-type) + --corsa

e quel vuoto non è una costante: il testo è alto in px (150px per riga) e il
blocco che lo contiene è alto in vh, quindi su una finestra bassa il vuoto è
~18vh e su una alta ~30vh. Un numero scritto nel CSS sarebbe giusto su un
monitor solo. Si misura, e si riscrive **solo col binario ancora sotto il bordo
basso**: cambiare `margin-top` accorcia la pagina, e farlo mentre ci sei dentro
te la farebbe scattare sotto le dita. Il valore nel CSS resta come ripiego per
il caso in cui il codice non parta.

### Note

- Le righe del titolo si riarmano ogni volta che la sezione esce dallo schermo,
  come fa `.cape-hs-wrap`: risalendo la trovi di nuovo pronta.
- `prefers-reduced-motion: reduce` spegne binario e srotolamento. Il video resta
  aperto e il titolo è già lì — è l'head a vestirlo così.
- Se il `<video>` non ha indirizzo o non si carica, la sezione prende `is-muto` e
  la tendina sparisce del tutto: meglio niente che un buco nero in mezzo alla
  pagina.

---

## `camera-oscura.js`

La sezione fra l'hero e lo scroll orizzontale. Sostituisce due cose che prima
erano separate: il pannello bianco che si apriva a fessura (`.section-intro`) e
il ponte a tessere (`.cape-bridge`).

La fotografia dell'hero si brucia fino al bianco; sul bianco si riempie una
frase e si scrive una firma; poi la stessa fotografia si sviluppa di nuovo e si
ritira dentro l'immagine della prima slide dell'orizzontale. Dodici fasi, una
sola corsa di scroll, un solo blocco `sticky`.

### Come si include

Nel footer della Home, **dopo** Lenis e **dopo** i due tag di GSAP:

```html
<script defer src="https://cdn.jsdelivr.net/gh/cash9086/parallassi-slider@SHA/camera-oscura.js"></script>
```

Vuole anche il CSS di `.stage-wrap` nell'head della pagina — quello è rimasto
lì, perché un foglio di stile caricato da fuori arriva dopo il primo disegno e
per un istante si vedrebbero i quattro strati impilati uno sotto l'altro.

### La tabella delle fasi

È la sola sorgente dei numeri: da lì escono l'altezza del wrapper, il margine
negativo e la durata di ogni cosa. Il tempo della timeline è misurato in
schermate — **una unità di GSAP = un vh di scroll** — quindi i numeri nel file
sono gli stessi che leggi qui, senza conversioni da sbagliare.

| # | fase | vh | cosa succede |
|---|---|---|---|
| 1 | `hero` | 100 | l'hero si sfila da sotto, la foto è ferma |
| 2 | `pausa1` | 40 | foto piena, la silhouette si spegne |
| 3 | `bruciatura` | 80 | `brightness` 1→6, velo bianco nell'ultimo 30% |
| 4 | `frase` | 100 | le parole si accendono in fila |
| 5 | `firma` | 40 | la penna scrive |
| 6 | `pausa2` | 30 | |
| 7 | `fraseVia` | 30 | la frase svanisce sul posto |
| 8 | `firmaVia` | 50 | la firma resta sola, poi svanisce |
| 9 | `bianco` | 30 | bianco vuoto |
| 10 | `sviluppo` | 120 | il velo se ne va, il filtro torna normale |
| 11 | `pausa3` | 40 | foto piena |
| 12 | `ritiro` | 100 | la foto si ritira dentro la prima slide |

Totale 760vh, e il wrapper è alto 100vh di più: quelli se li mangia lo sticky.

### Perché la fase 1 non anima niente

È la schermata in cui l'hero esce mentre il blocco è **già** incollato, con la
stessa identica fotografia. Il margine negativo del wrapper vale esattamente
quella fase: il blocco si incolla nell'istante in cui l'hero comincia a
sfilarsi, e siccome il punto d'arrivo della foto dell'hero (`object-position:
50% 50%`, `brightness(1)`) è il punto di partenza di questa, il passaggio di
consegne non si vede.

### Le manopole

| Manopola | Default | Cosa fa |
|---|---|---|
| `VELO_DA` | `0.70` | dove entra il velo bianco, dentro la bruciatura |
| `BRUCIA` | `6` | fin dove schiarisce |
| `CONTRA` | `0.80` | il contrasto da cui la foto si sviluppa |
| `DERIVA` | `16` | px di discesa lenta della foto lungo tutta la corsa |
| `PALE` | `0.14` | l'inchiostro spento delle parole |
| `SOVRAP` | `0.40` | quanto una parola parte prima che finisca la precedente |

### Tre cose che non si deducono leggendo

- **Il filtro sta sul contenitore, non sulle immagini.** La silhouette
  scontornata e la foto sotto sono due ritagli dello stesso soggetto:
  bruciandole separatamente il pixel di bordo prende la schiaritura due volte e
  resta un alone lungo il perimetro. Un contenitore, un filtro, una passata.
- **La deriva muove `object-position`, non un `transform`.** A transform la
  foto uscirebbe dal proprio riquadro e lascerebbe una striscia vuota sul
  bordo: con `cover` il margine non c'è su tutti e due gli assi.
  `object-position` sposta il ritaglio *dentro* l'immagine e si ferma da solo
  quando il margine finisce.
- **Alla fine del ritiro le due fotografie si scambiano il posto.** Al
  traguardo la nostra combacia con quella della slide; lì la nostra si nasconde
  e `.image-14` si riaccende. Senza lo scambio, appena il blocco si scolla la
  nostra se ne andrebbe con lui e sotto resterebbe un buco, perché `.image-14`
  è ancora spenta da `is-ponte`.

### I muri dell'orizzontale

In fondo al file c'è un blocco che con la camera oscura non c'entra niente:
i muri di ingresso e di uscita di `.cape-hs-wrap`, quelli che impediscono di
arrivare lanciati dentro lo scroll laterale. Vivevano nell'Embed del ponte, e
il ponte non c'è più. Leggono solo `.cape-hs-wrap`: se un giorno trovano una
casa migliore, si spostano da soli senza toccare il resto.

### `prefers-reduced-motion`

Non una versione lenta della stessa cosa: un'altra cosa. Niente bruciatura,
niente deriva, niente sviluppo — solo dissolvenze brevi, e la corsa lunga un
terzo.

---

## `cape-studio-entrata.js`

L'entrata della sezione studio. Prende il posto di `cape-studio-consegna.js`,
che faceva un'altra cosa: il titolo della sezione a inchiostro — *ART AND
FASHION* — viaggiava dal centro dello schermo fino al titolo del carosello e lì
si scambiava lettera per lettera.

L'inchiostro dalla pagina non c'è più. E quel file, non trovando più il titolo
da cui partire, ripiegava sulla stringa scritta dentro di sé: continuava a far
volare *ART AND FASHION* per una sezione che non lo diceva più da nessuna
parte. Era questo il residuo che si vedeva.

### Cosa succede

1. La sezione si incolla al centro dello schermo ed è **bianca**: titolo,
   descrizione, bottone, fotografie e barra ci sono tutti — misurabili,
   impaginati — ma spenti. Dietro di lei si apre la riserva: una schermata di
   scroll in cui non si muove niente.
2. Consumata la riserva per `SOGLIA`, **parte tutto insieme**: il titolo sale
   da dietro il proprio bordo, le righe di testo e il bottone anche, la barra
   del carosello pure, e il velo bianco sulle fotografie se ne va con la
   scivolata inclinata con cui entra un'immagine nuova.
3. Arrivati in fondo alla riserva, se il montaggio sta ancora girando la
   sezione ti **trattiene**: lo scroll si ferma lì finché l'ultima animazione
   non ha finito, poi riparte.
4. Finito il montaggio la riserva **si sgancia**: la scatola torna alta quanto
   la sezione, la sezione smette di essere incollata, e da lì in poi appena
   scrolli se ne va. Vedi *Lo sgancio* qui sotto.
5. **Una volta sola**, in tutta la vita della pagina. Da lì in poi si risale e
   si riscende senza che succeda niente, e il carosello gira all'infinito per
   conto suo.

### Non anima niente da solo

I gesti sono tutti del carosello — `capeStudio.tendina`, `entrataRighe`,
`sfoglia` — e lì restano. Qui si decide **quando**, non **come**: se domani
cambia la durata di una tendina nel blocco `IMPOSTAZIONI` del carosello, cambia
anche qui senza che nessuno se ne debba ricordare.

### Lo sgancio

La riserva è **altezza**, non uno stato: serve a tenere la sezione incollata
mentre si monta. A montaggio fatto diventa scroll a vuoto — arrivi in fondo con
lo slider acceso e tutto al suo posto, e devi ancora spingere per un pezzo prima
che la sezione si muova. Quindi si toglie: la scatola torna alta quanto la
sezione e la sezione torna nel flusso.

Togliere altezza a una pagina sotto a chi la sta guardando fa saltare tutto in
su. Di quanto, però, si sa esattamente: **tanto quanto la riserva già
consumata**. Si toglie quello allo scroll e la sezione resta dov'è, al pixel.
Vale mentre è ancora incollata, e vale anche se nel frattempo si è staccata e se
ne sta andando. Quello che sta *sotto* la sezione si sposta per davvero, ma sta
sotto il bordo basso dello schermo: la sezione è alta quanto la finestra e anche
di più.

Lo scroll lo muove `capeScroll` a livello `CORREZIONE` — è precisamente il caso
per cui quel livello esiste.

### La tenuta

È lo stesso `trattieni()` dell'intro — una riserva che si consuma stando fermi
— con una differenza che qui è obbligata. Fra `SOGLIA` e il fondo della riserva
ci sono tre decimi di schermata, e il montaggio dura poco più di un secondo:
una rotellata normale se li mangia. Quindi la riserva non basta,
e arrivati in fondo si prende il volante (`capeScroll`, a livello `MURO`) e si
ferma davvero, finché la timeline non chiama.

Senza `capeScroll` in pagina la tenuta non c'è e tutto il resto regge: al
peggio la sezione se ne va con il montaggio a metà, che è quello che succedeva
prima.

### Le manopole

| Manopola | Default | Cosa fa |
|---|---|---|
| `ATTESA_VH` | `1.00` | schermate di scroll bianco. È l'unico scroll che questa entrata **aggiunge** alla pagina, e resta lì anche dopo: è altezza, non uno stato |
| `SOGLIA` | `0.70` | quanta riserva si consuma bianchi prima che parta tutto |
| `EDGE_AT` / `EDGE_DUR` | `0.35` / `0.60` | quando compare la cornice del riquadro, e quanto ci mette. Non a zero: prima deve essersi mosso il velo |
| `RETE_MS` | `2200` | la rete della tenuta. Sta sotto la scadenza di `capeScroll` (2500), così a mollare siamo noi |

### Il markup che si aspetta

Quello che c'è già nel Designer, più i gesti del carosello.

| Selettore | Obbligatorio | A cosa serve |
|---|---|---|
| `.studio-hero` | sì | la sezione. Riceve `.stde-sez` e, durante l'attesa, `.stde-attesa` |
| `.studio-headline__row` | sì | il titolo, che sale a tendina. Il suo guscio `.studio-headline` fa da finestra |
| `.studio-stage` | sì | il palco. Ci viene appeso il velo bianco |
| `.studio-stage__edge` | no | la cornice del riquadro |
| `.studio-pager` | no | la barra, che sale con la stessa tendina |

### Una classe che si chiama ancora `is-consegna`

Mentre il montaggio gira, sul tag `html` compare `is-consegna`: è così che la
planata dello studio — che sta nel custom code della pagina — sa di dover stare
ferma. Il nome è quello vecchio apposta: rinominarla vorrebbe dire andare a
cambiare una riga là dentro a mano per non guadagnare niente.
