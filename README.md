# parallassi-slider

Gli script di scroll della home di The Cape Studio che non stanno più nel
custom code della pagina, perché là lo spazio è finito.

| File | Cosa è | Peso |
|---|---|---|
| `reel-salita.js` | la sezione reel: la tenuta e la salita | ~16 KB |
| `cape-open.js` | la sezione `.cape-open`: la tendina del video e le righe del titolo | ~6 KB |
| `camera-oscura.js` | la sezione `.stage-wrap`: bruciatura, frase, firma, sviluppo, ritiro | ~21 KB |
| `cape-studio-consegna.js` | il titolo della sezione a inchiostro diventa il titolo dello slider studio | ~24 KB |

`reel-salita.js` e `cape-open.js` non hanno dipendenze — niente GSAP, niente
jQuery. `camera-oscura.js` vuole GSAP e ScrollTrigger già caricati.
`cape-studio-consegna.js` vuole GSAP (solo il core) e, unico in questa repo,
**non è indipendente**: chiama i gesti che `cape-studio-carousel.js` espone su
`window.capeStudio`, e va caricato dopo di lui. Se non lo trova aspetta due
secondi e poi lo dice in console invece di restare zitto. Legge anche, se c'è,
la mappa di arrivo dell'inchiostro su `window.inkSection`: se non c'è, ripiega
e funziona lo stesso.

Ognuno controlla da solo se la sua sezione è in pagina, e se non c'è esce
subito senza costare niente.

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

## `cape-studio-consegna.js` — la consegna

La scritta gigante della sezione a inchiostro e il titolo dello slider studio
erano due scritte diverse in due sezioni diverse. Adesso sono **la stessa
scritta**: quella dell'inchiostro scende, si mette al posto del titolo dello
slider, e lì diventa il titolo dell'opera.

### Cosa succede, nell'ordine

1. **Lo scambio.** L'inchiostro finisce e al centro dello schermo resta
   `ART AND FASHION` — che non è testo, è il buco che l'inchiostro non ha
   riempito. Quel buco è dipinto dentro il canvas e col canvas se ne andrebbe,
   quindi il canvas viene coperto da un velo bianco — invisibile, perché sotto
   è già tutto bianco — e al suo posto compare un clone di testo vero, fermo
   sullo schermo, nello stesso punto e della stessa misura. Sotto una
   dissolvenza di 180 ms.
2. **Il viaggio.** La sezione studio sale da sotto, il clone la insegue. La
   destinazione viene **riletta a ogni fotogramma** dal rettangolo vero di
   `.studio-headline__row`: l'atterraggio è esatto a qualunque misura di
   schermo e con qualunque impaginazione, anche dopo il prossimo ritocco nel
   Designer.
3. **Il montaggio**, tutto nello stesso istante: l'onda di luce sul titolo,
   la tendina di descrizione e bottone, la tendina della barra, e il velo
   bianco sul riquadro che se ne va con la scivolata del cambio immagine —
   sotto si apre il buco con dentro la fotografia.
4. **L'uscita.** Scrollando in su tutto svanisce in dissolvenza e il titolo
   rifà il viaggio al contrario, fino a riconsegnarsi all'inchiostro.
   Rientrando, la coreografia si rifà e il carosello riprende dall'opera su
   cui era rimasto.

### L'onda di luce

Non ha una fisica sua: **è la fisica dell'inchiostro**. Per ogni lettera
chiede a `window.inkSection.arrivalAt(u, v)` — la stessa mappa che ha appena
dipinto la sezione sopra — a che punto della corsa il fluido sarebbe arrivato
in quel punto dello schermo. Le lettere quindi non si accendono da sinistra a
destra: si accendono nell'ordine irregolare, a grumi, in cui quel fluido le
avrebbe raggiunte.

Non costa niente: la mappa è già cotta e il modulo la tiene in cache dopo la
prima lettura, che qui viene fatta apposta all'inizio del viaggio invece che a
metà dell'onda.

Se `window.inkSection` non c'è — niente WebGL2 su quella macchina, o il file
dell'inchiostro non caricato — l'onda ripiega su un ordine da sinistra a
destra con un filo di disordine. Non è la stessa cosa, ma la sezione non resta
senza titolo.

### Le manopole

Tutte in cima al file. Le due che contano sono le stesse due di
`reel-salita.js`, e vogliono dire la stessa cosa.

| Manopola | Default | Cosa fa |
|---|---|---|
| `VIAGGIO_VH` | `1.00` | schermate di scroll in cui il titolo viaggia. È una finestra **ritagliata sulla salita naturale** della sezione, non scroll aggiunto |
| `SOSTA_VH` | `1.00` | la tenuta: schermate in cui, a titolo arrivato, la sezione sta ferma incollata mentre le animazioni girano. È **l'unico scroll che questa coreografia aggiunge alla pagina** |
| `MORBIDEZZA` | `0.14` | quanto il viaggio insegue lo scroll invece di esserci incollato |
| `CURVA` | `true` | smussa partenza e arrivo del viaggio |
| `SCAMBIO` | `0.18` | secondi della dissolvenza con cui il clone prende il posto del buco. Sotto 0.10 lo scambio comincia a vedersi |
| `LUCE_DUR` | `1.15` | secondi dell'onda di luce |
| `LUCE_ORLO` | `0.30` | larghezza del fronte di luce, in frazione dell'onda. Stretto = un lampo che corre; largo = mezzo titolo acceso insieme |
| `USCITA` | `0.45` | secondi della dissolvenza scrollando in su |
| `MIN_W` | `992` | sotto questa larghezza non fa niente |

I tempi delle tendine e della scivolata **non sono qui**: li chiede al
carosello (`capeStudio.tendina`, `entrataRighe`, `sfoglia`). Se un domani
cambia la durata della tendina nel suo blocco `IMPOSTAZIONI`, cambia anche
qui, da sola.

**Il CSS sta dentro questo file**, non nel custom code della pagina: il campo
*Inside head tag* della Home è già lungo quindicimila caratteri, e un `<style>`
troncato non dà errore — si porta via in silenzio tutto quello che viene dopo.
E queste regole sono metà di un meccanismo la cui altra metà è qui: tenerle in
due posti, uno che si aggiorna cambiando uno SHA e l'altro incollando a mano, è
garantirsi che prima o poi non combacino più.

### Cosa si aggiunge alla pagina

Quattro nodi, tutti creati dal JS — **niente da fare nel Designer**:

| Nodo | Dove | A cosa serve |
|---|---|---|
| `.cnsg-pin` + `.cnsg-stick` | attorno a `.studio-hero` | la scatola e l'elemento incollato: la tenuta |
| `.cnsg-velo` | dentro `.ink-stick` | copre le lettere del canvas durante lo scambio |
| `.cnsg-titolo` | in fondo al `<body>` | il clone che viaggia |
| `.cnsg-coperta` | dentro `.studio-stage` | il velo bianco sulle fotografie |

Più il contenuto di `.studio-pager`, che viene avvolto in una finestra perché
possa salire da dietro il proprio bordo.

Lo stile di tutti e quattro sta nel custom code della head della Home, blocco
*la consegna*. Se quel blocco non c'è, il JS gira ma non si vede niente.

### Trappole

- **La sezione diventa `position: sticky`.** Il `top` lo scrive il JS
  misurando l'altezza vera. Lo script che ricentra la sezione quando lo scroll
  si ferma vicino sta fermo durante il montaggio: aveva già l'interruttore,
  `html.is-consegna`, e questo file lo usa.
- **Il punto in cui la sezione si incolla si misura dalla riserva, non dalla
  sezione.** Su un elemento incollato il rettangolo sullo schermo e la catena
  degli `offsetTop` non concordano su tutti i browser; la riserva è un div
  fermo e non ha quel problema.
- **Il clone sta su una riga sola.** Il titolo dell'inchiostro, sotto i
  ~1300px, va a capo: lì il clone si ferma al 94% della larghezza dello
  schermo invece di riprodurre un'impaginazione che è scritta nello shader e
  non nel CSS. Sopra i 1400px la misura è identica all'inchiostro.
- **Il centro è quello delle maiuscole, non quello della riga.** Il motore
  dell'inchiostro centra così, e un titolo tutto maiuscolo centrato sulla riga
  siede basso. Se le due cose non combaciassero, allo scambio la scritta
  salterebbe — di pochi pixel, ma nell'unico fotogramma in cui la si sta
  guardando.


### Cosa è costato impararlo

Due cose misurate sul banco di prova, e vale la pena che restino scritte.

**Lo smorzamento non arriva mai.** Un inseguimento esponenziale si avvicina al
bersaglio e basta: finché il bersaglio si muove è proprio il peso che si vuole,
ma quando si ferma a fondo corsa l'ultimo due per cento — che l'occhio non vede
— costava **1204 px di scroll** con il titolo già fermo al suo posto e la
sezione ancora vuota. Adesso agli estremi si chiude: `1204 px → 289 px`.

**Il `gap` non si eredita.** `gap: inherit` sull'involucro della barra prendeva
quello del padre, che è l'involucro stesso, che di gap non ne ha: `21.3px → 0`,
frecce e binario attaccati. Si legge dal pager e si riscrive.


### Quello che il video ha fatto vedere, e il banco ha misurato

**Il testo non si centra quando sborda.** Il clone aveva una larghezza imposta
e `text-align:center`. Quando il testo è più largo della scatola, il browser
non lo centra: lo allinea al bordo di partenza e lo fa sbordare tutto
dall'altra parte. Misurato: **217 px fuori centro**, che moltiplicati per la
scala 1,65 del viaggio diventano **358 px**. La scritta compariva spostata di
mezzo schermo rispetto al buco nell'inchiostro, e per un istante se ne
vedevano due. Adesso la scatola si stringe sul testo e tutto passa dalla
trasformazione: **scarto 0**, verificato sovrapponendo un riferimento disegnato
con lo stesso identico conto dello shader.

**La sezione è più alta della finestra.** `.studio-hero` è alta 52vw: dentro
una finestra di browser vera — 1918 × 870 — sono 997 px in 870. Con il
centraggio bloccato a zero la sezione si incollava in cima e quei 127 px
uscivano tutti dal fondo: la barra del carosello finiva a `top: 898`, sotto il
bordo, e il titolo a `-17`, sopra. **La sezione sembrava vuota mentre era
intera, solo fuori dallo schermo.** Il centraggio adesso può essere negativo.

**La riserva era troppo corta.** Il montaggio dura quasi due secondi e una
schermata di riserva si consuma in poco più di uno: la sezione se ne andava a
metà coreografia, con le fotografie ancora sotto il velo. `SOSTA_VH` da 1.00 a
1.60, e un secondo osservatore che, se la sezione esce davvero dallo schermo a
coreografia in corso, la porta a fondo corsa — così tornando indietro la si
trova montata e non a metà.


### Il rig: scatola e incollato, non sezione incollata

La prima versione faceva `position: sticky` direttamente su `.studio-hero`.
Non può reggere: **sticky è limitato dal riquadro del genitore**, e il genitore
qui è il `body`. Una sezione incollata al body non si stacca più — resta
appesa per tutto il resto della pagina — e quello che si vede è una sezione
che non sta né ferma né insieme alle altre.

Adesso la sezione entra in una scatola più alta di lei e dentro la scatola si
incolla: `.cnsg-pin > .cnsg-stick > .studio-hero`. È lo schema di
`.ink-pin > .ink-stick` e di `.cape-hs-wrap > .cape-hs-sticky`, cioè quello
che in questa pagina funziona già tre volte. La tenuta è alta esattamente
quanto la riserva e poi finisce, perché finisce la scatola.

Misurato: **1704 px di tenuta** su 1740 attesi, montaggio che parte 48 px dopo
l'inizio della tenuta e finisce dentro.

### La scala si misura, non si deduce

Sul corpo di `.ink-title` ci sono **due regole in gara** — quella del custom
code della pagina (`clamp(44px, 13vw, 200px)`) e quella che
`cape-title-ink.js` inietta a runtime (`150px`) — e chi vince dipende
dall'ordine in cui i file finiscono di caricare. Leggere un numero da lì vuol
dire scommettere su una gara, ed è il motivo per cui allo scambio le due
scritte erano di grandezze visibilmente diverse.

Adesso si misura la **larghezza resa**, con la stessa API che usa lo shader
(`measureText`, carattere per carattere, stessa spaziatura), e la scala del
clone è il rapporto fra quella larghezza e la sua. Due scritte larghe uguale
sono grandi uguale, qualunque cosa dicano i fogli di stile.

Misurato allo scambio: inchiostro 1392 px, clone 1384 px — **0,6% di scarto** —
e i due centri coincidono al pixel.

### Il peso non deve costare l'arrivo

Lo smorzamento serve mentre il viaggio è in corso. Quando il bersaglio è a
fondo corsa non serve più e costa soltanto: dopo una scrollata veloce il
titolo continuava a scendere per **840 px** dopo che la sezione era già ferma,
e la coreografia partiva con la tenuta quasi consumata. Adesso agli estremi il
`tau` si stringe, il ritardo ha un tetto (0.20, lo stesso freno che
`ink-transition.js` mette al suo scrub) e l'ultimo 3% si chiude.


### Il breakpoint che cambia tutto

`.studio-hero` ha un layout completamente diverso al breakpoint **xl (≥1440px)**,
che è quello che gira sulla maggior parte degli schermi: `.studio-info` passa a
sinistra ed è larga 55vw invece di 15, e `.studio-headline__row` prende
`width: 80%` e PP Editorial New. Leggere solo il breakpoint base — come ho fatto
per tre giri — vuol dire lavorare su una geometria che sullo schermo non esiste.

Da qui due conseguenze scritte nel codice:

**La destinazione sono le lettere, non la scatola.** Con `width: 80%` il
rettangolo di `.studio-headline__row` è largo ottocento pixel buoni e con la
scritta dentro non c'entra niente. Il clone ci atterrava sopra spostato. Adesso
si misura l'unione dei rettangoli dei `.studio-char` — che *è* la scritta — e si
atterra su quella.

**L'allineamento si riconosce, non si assume.** Il clone e il titolo dell'opera
sono due stringhe di lunghezza diversa: se la sezione allinea a sinistra devono
cominciare nello stesso punto, se centra devono avere lo stesso centro. Lo dice
il confronto fra il rettangolo delle lettere e quello della scatola, non il
foglio di stile — che andrebbe riletto a ogni breakpoint. Verificato sui tre
casi: bordi a 0 px con `left`, centri a 0 px con `center`, bordi destri a 0 px
con `right`.

**E la tipografia non si tocca.** Al breakpoint xl il titolo è già PP Editorial
New, messo nel Designer. La regola che questo file iniettava vinceva per
specificità e si portava dietro anche la spaziatura: `-0.02em` diventava
`.02em`, e la crenatura cambiava senza che nessuno l'avesse chiesto. `FONT_TITOLO`
adesso è vuoto.

### Lo scambio si fa mentre l'inchiostro è ancora fermo

Fra l'istante in cui l'inchiostro finisce e quello in cui comincia il viaggio ci
sono una settantina di pixel di scroll, e in quei pixel la sezione a inchiostro
si è già sfilata portandosi via le sue lettere. La dissolvenza avveniva così fra
due scritte che non erano più nello stesso posto: si vedeva la vecchia scivolare
in su mentre la nuova stava ferma — il doppio titolo.

Adesso il clone si accende appena l'inchiostro è a fondo corsa (progresso 0.995,
misurato: dodici pixel prima che si sfili), al centro dello schermo, esattamente
sopra le lettere che il fluido sta ancora dipingendo. Verificato: centro a 959
su 959, centro delle maiuscole a 436 su 438, e fermo lì per tutta la dissolvenza.
