# parallassi-slider

Due comportamenti della **sezione reel** di The Cape Studio, sulla home.

| File | Cosa è | Peso |
|---|---|---|
| `reel-blocco.js` | il magnete che ti riseduta quando arrivi giù di corsa | ~5 KB |
| `reel-salita.js` | la scaletta che si alza e si rovescia mentre scorri | ~12 KB |

Sono indipendenti: puoi caricarne uno solo. Nessuno dei due ha dipendenze —
niente GSAP, niente jQuery. Se in pagina non c'è `[data-reel]` escono subito.

---

## Come si includono

Pages → Home → Settings → Custom code → *Before `</body>` tag*, **in fondo** a
quello che c'è già:

```html
<script defer src="https://cdn.jsdelivr.net/gh/cash9086/parallassi-slider@SHA/reel-blocco.js"></script>
<script defer src="https://cdn.jsdelivr.net/gh/cash9086/parallassi-slider@SHA/reel-salita.js"></script>
```

Al posto di `SHA` va lo SHA per esteso del commit, **mai `@main` né `@latest`**:
quelli li tiene jsDelivr in cache fino a 7 giorni, e dopo una modifica ti
ritrovi a guardare la versione vecchia chiedendoti perché non cambia niente.

`defer` è quello che serve: i due script cercano elementi che l'Embed dentro la
sezione ha già costruito mentre la pagina veniva letta.

---

## Il markup che si aspettano

Quello che c'è già nel Designer. Nessun elemento nuovo da creare.

| Selettore | Serve a | Se manca |
|---|---|---|
| `[data-reel]` | la sezione | escono tutti e due, zitti |
| `.reel-item` | i riquadri del nastro | esce `reel-salita` |
| `[data-reel-slot]` | il rettangolo su cui atterra il testo | la salita funziona, il testo non viene spinto |

`reel-salita` **non** sposta il testo: sposta lo slot. Il testo lo segue da
solo, perché il blocco della consegna rilegge `slot.getBoundingClientRect()` a
ogni fotogramma. Una cosa spostata invece di due, e nessuno dei due codici deve
sapere dell'altro.

---

## reel-blocco.js — il magnete

L'ancora è la posizione in cui il **fondo del reel si appoggia al fondo dello
schermo**. Chi ci arriva di corsa e la sfonda viene riportato lì con una tirata
di 0.7s. È lo stesso meccanismo che `.cape-hs-wrap` ha ai suoi due bordi, con
gli stessi numeri.

Una differenza, e non è un capriccio: là il magnete è sempre acceso, qui **si
spegne appena ha fatto il suo lavoro** e si riarma solo quando sei risalito
sopra la sezione. Deve essere così perché subito dopo l'ancora comincia la
salita: un magnete ancora acceso ti ritirerebbe indietro ogni volta che ti fermi
a guardarla, e l'effetto non lo vedresti mai.

| Manopola | Default | Cosa fa |
|---|---|---|
| `BANDA_SU` | `0.28` | frazione di schermo: quanto **prima** dell'ancora comincia a tirare |
| `BANDA_GIU` | `0.45` | e quanto **dopo**. Più larga, perché chi arriva di corsa sfonda l'ancora: è la ragione per cui il blocco esiste |
| `RIARMO` | `1.20` | schermate sopra la sezione per cui il magnete torna acceso |
| `ATTESA` | `30` | ms di quiete prima di tirare: finché la rotella gira non ti tocca |
| `DURATA` | `0.70` | secondi della tirata |
| `DA_992` | `true` | solo desktop. Su touch una scrollata programmata in mezzo a un lancio di dito si sente come uno strappo |

Usa Lenis se c'è, e lo aspetta fino a 8 secondi prima di ripiegare sullo scroll
nativo — attaccarsi a `window.scroll` mentre Lenis è vivo vuol dire leggere la
posizione un fotogramma in ritardo.

---

## reel-salita.js — la salita

Una legge sola, e i tre stati vengono da lì. Con `B` la distanza fra il bordo
alto dello schermo e il fondo su cui i riquadri sono appoggiati, `h` l'altezza
del riquadro, `u` quanto sei avanzato (0 = fermo sull'ancora, 1 = finita):

```
bottom = u · (B − h)
```

- **u = 0** — tutti a zero: la scaletta di sempre, intatta.
- **u = 0.5** — ognuno sta a `(B−h)/2` dal fondo, cioè il suo centro sta a
  `B/2`: tutti i centri sulla stessa riga.
- **u = 1** — ogni riquadro è alzato di tutto quello che lo separava dalla cima:
  tutti i bordi alti sulla stessa riga, la scala rovescia.

I riquadri piccoli sembrano correre di più, ma non c'è nessuna velocità scritta
da nessuna parte: hanno `h` piccolo, quindi `(B−h)` grande, quindi più strada da
fare nello stesso tempo. Arrivano insieme per costruzione. Il riquadro che
rinasce a sinistra grande zero non ha bisogno di un caso speciale: `h≈0` → sale
di tutta `B`, cioè nasce in cima e cresce verso il basso.

**La riga a cui tutto tende è il bordo alto dello SCHERMO, non quello della
sezione.** È la differenza che conta: nel punto in cui il magnete ti ferma la
sezione riempie già l'inquadratura, quindi il suo bordo alto esce di scena al
primo pixel di scroll, e una salita puntata lì finirebbe fuori campo.

| Manopola | Default | Cosa fa |
|---|---|---|
| `ALLUNGA` | `1.00` | quanto dura la salita, in multipli della corsa **geometrica** |
| `SPINTA` | `1.00` | quanto il testo viene spinto via. `1` = a fine salita è uscito dal bordo alto della sezione. `0` = sta fermo |

### La corsa non è un numero scelto a mano

È misurata: il bloccone parte col fondo sul fondo dello schermo e finisce col
bordo alto in cima, quindi la corsa è *altezza dello schermo meno altezza del
bloccone*. Si riadatta a ogni monitor da sola.

`ALLUNGA` è un moltiplicatore su quella. Sopra `1.00` la salita dura di più e si
legge meglio scrollando piano, ma i riquadri più alti arrivano in cima quando il
fondo della sezione è già risalito sopra il loro bordo basso, e la sezione — che
ritaglia — glielo taglia. È il prezzo, ed è graduale.

C'è un pavimento a `0.12` schermate, per il monitor basso e largo dove il
bloccone può venire più alto dello schermo e la corsa geometrica andrebbe a
zero. Non sposta la geometria: a `u=1` i bordi alti sono in cima comunque, per
come è scritta la formula. Cambia solo quanto scroll ci vuole.

---

## Note

- Finita la salita i riquadri **non restano incollati** in cima: `B` viene
  congelata al valore del traguardo, così se ne vanno su insieme alla sezione
  invece di comportarsi come un pin che nessuno ha chiesto.
- A riposo `bottom` viene **cancellata**, non messa a zero: il riquadro torna sul
  `bottom:0` del foglio di stile e il bordo basso ricade sul pixel intero dove
  l'Embed lo aveva agganciato. È per questo che la scaletta ferma resta pulita
  esattamente com'era.
- Durante un resize lo slot torna al suo posto per 400 ms: il blocco della
  consegna misura la propria corsa leggendo dov'è lo slot, e lo fa 150 ms dopo il
  resize. Se lo trovasse spostato si taglierebbe la corsa da solo.
- `prefers-reduced-motion: reduce` spegne tutti e due. La scaletta resta ferma,
  che è già una composizione.
- I cicli sono due, e due sono le letture di layout per fotogramma: questi non si
  conoscono con l'Embed del reel. Se un giorno pesasse, la fusione da fare è una
  sola — far scrivere all'Embed la `u` in una variabile e leggerla qui.
