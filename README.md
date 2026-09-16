# parallassi-slider

Gli script di scroll della home di The Cape Studio che non stanno più nel
custom code della pagina, perché là lo spazio è finito.

| File | Cosa è | Peso |
|---|---|---|
| `reel-salita.js` | la sezione reel: la tenuta e la salita | ~16 KB |
| `cape-open.js` | la sezione `.cape-open`: la tendina del video e le righe del titolo | ~6 KB |

Nessuna dipendenza — niente GSAP, niente jQuery. Ognuno controlla da solo se la
sua sezione è in pagina, e se non c'è esce subito senza costare niente. Sono
indipendenti: nessuno dei due sa dell'altro.

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
