/* parallassi-slider — cape-surfista.js
   Il surfista del footer, a matita e in stop-motion.

   COSA SUCCEDE
   1. Il disegno c'è da sempre, già in movimento: il footer è un foglio fermo
      che il video scopre salendo, e quello che c'è sotto il foglio non si
      disegna, si trova. Appena il bordo del video ne lascia scoperto un
      pezzo, il film gira.
   2. È un film a passo uno: otto fotogrammi al secondo circa, e a ogni
      fotogramma la mano ripassa le linee in modo appena diverso, così le
      linee "bollono". Il surfista sale e scende sull'onda e si inclina un
      poco, le onde ondeggiano una dopo l'altra, gli spruzzi frizzano. Un
      giro dura 3.2 secondi.
   3. Quando il footer è coperto o fuori schermo, o la scheda non è in vista,
      il film si ferma e non costa niente. Riparte dal fotogramma in cui si
      era fermato.

   IL DISEGNO È UN RICALCO dell'immagine del footer (il PNG del surfista, 1296
   per 1296), fatto una volta sola fuori dal sito: le linee sono qui sotto, in
   coordinate di quell'immagine. L'immagine vera resta nel documento, trasparente,
   e tiene il posto: è lei che decide dove e quanto grande si disegna. Se un
   giorno cambi immagine nel Designer, questo ricalco va rifatto.

   NIENTE DIPENDENZE. Niente sotto i 992px e niente per chi chiede meno
   movimento: lì resta l'immagine com'è.

   VA IN PAGINA: un tag <script defer> nel footer, in PARTE 2.
*/
(function(){
'use strict';

/* ── le manopole ─────────────────────────────────────────────────────── */

var FPS        = 7.5;   /* fotogrammi al secondo: il passo del film           */
var GIRO       = 24;    /* fotogrammi in un giro: 24 a 7.5 fanno 3.2 secondi  */
var VARIANTI   = 3;     /* quante versioni della stessa linea si alternano:
                           è il "bollire". 3 è il classico dei disegni animati */
var TRATTO_PX  = 1.25;  /* spessore della matita sullo schermo, in pixel       */
var MANO       = 3;     /* quanto trema la mano, in pixel dell'immagine        */

/* il movimento, in pixel e gradi dell'immagine originale (1296 di lato) */
var SURF_SU    = 9;     /* di quanto il surfista sale e scende                 */
var SURF_GIRA  = 1.8;   /* di quanti gradi si inclina                          */
var ONDA_GIRA  = 2.2;   /* di quanti gradi ondeggia ogni linea d'onda          */
var ONDA_VA    = 7;     /* e di quanto scivola                                 */
var SPRUZZI_VA = 6;     /* di quanto frizzano gli spruzzi                      */

var MIN_W      = 992;

/* ── da qui in giù non ci sono numeri da girare ──────────────────────── */

var IMG   = '.cape-fondo .cape-fondo-marchio';
var LATO  = 1296;
var INK   = '#141416';
var PERNO = [600, 520];   /* dove il surfista poggia sulla tavola */

/* Le linee: [gruppo, segni, x, y, x, y, ...]. Gruppo 0 il surfista con la
   tavola, 1 gli spruzzi, 2 le onde. Segni: 1 giro chiuso, 2 tratteggio. */
var LINEE = [[2,0,847,526,838,540,833,558,832,585,836,595],[0,0,702,428,698,425,697,414,691,400,674,378],[0,0,695,325,694,329,702,338],[2,0,612,697,609,675],[1,0,61,769,54,771,36,781],[0,0,543,337,547,341,566,351,577,360,583,363,586,372,586,383,587,384,585,393],[2,0,559,816,574,840],[1,0,326,412,334,418,344,418,350,415,353,415],[1,0,98,704,100,714,108,724,112,726,121,725,140,705,169,667,180,649,181,643,180,638],[1,0,167,485,178,481,184,481,189,483,194,488],[2,0,878,806,876,806,871,802,859,789,845,767,843,763,843,758],[2,0,781,957,763,935,749,921,725,893,719,882,704,869,700,868],[1,0,179,588,194,577],[1,0,201,453,210,452],[2,0,1048,980,1033,972,1006,954,997,947,980,930,932,875,903,844,881,815,879,807],[2,0,1196,565,1198,580,1204,600,1211,615,1220,629,1239,647,1255,657,1286,673],[1,0,94,541,79,555,66,571],[1,0,106,616,113,611],[1,0,100,536,127,511,129,506],[1,0,237,521,235,516,238,513,242,512],[2,0,646,589,643,594,643,597],[1,0,163,633,161,632,143,643,132,652,110,674,99,678],[2,0,973,887,960,874],[1,0,168,770,155,783,143,790,136,790,122,785,112,786,93,793,83,794,67,786],[2,0,1202,1032,1205,1030,1211,1029,1223,1030],[1,0,200,753,197,757,198,766],[1,0,446,439,437,440,423,451],[2,0,844,757,851,758,858,765,885,797,887,804],[0,0,711,439,717,440,720,442,745,445,755,448,776,459,783,466,782,473,776,480,741,504,708,519,690,526,687,526,685,529],[1,0,508,323,490,317,488,318],[1,0,456,297,442,292,428,285,401,268,398,262],[0,0,392,519,426,530,431,531,439,530,442,527,451,506,453,498,453,490,451,486],[1,0,124,618,130,616,146,606],[1,0,108,440,101,442,100,440],[1,0,509,432,507,432,502,437,490,451,486,458],[1,0,160,754,158,752,145,747,130,743,108,743,97,747,81,756,79,755],[0,0,538,466,535,469,533,474,533,488,536,494,541,499,569,512,574,513,578,516],[0,0,410,538,420,543,442,548,458,555,503,560,606,551,618,548,642,538,648,538],[2,0,198,768,200,770,201,781,207,800,219,826,230,842,247,860],[2,0,590,597,581,606,571,620,553,656,545,689,543,723,547,744,559,786,579,830,591,849,592,855],[2,0,601,661,601,668,608,674],[2,0,1198,697,1180,685,1151,656,1145,646,1144,641,1138,633,1131,619,1128,609,1122,597,1114,584,1108,560,1106,559],[2,0,330,927,310,907,303,898],[1,0,96,657,98,677],[1,0,254,466,251,465,249,466,241,473],[2,0,888,805,911,821,914,824,918,832],[2,0,946,457,951,461,967,459,970,457,993,457,1005,453,1025,450,1034,447,1045,447,1049,449,1049,455,1052,459,1061,459,1070,456,1077,456,1085,461,1101,460,1106,464,1113,466,1129,466,1130,465,1132,466],[2,0,1105,558,1104,551,1105,530,1113,509,1126,492],[1,0,376,507,387,503,390,499],[1,0,498,421,493,423,461,451],[1,0,176,521,169,527,168,531,146,553,119,574,103,590,101,595,94,602,88,604],[1,0,152,586,164,579,173,569,193,557,201,550],[1,0,96,455,94,458,93,466],[2,0,608,706,608,701,611,698],[1,0,492,292,492,294,496,296,499,296,500,294],[2,0,613,698,617,702,618,708,620,711,624,732,655,795,678,835,691,850,695,858,695,861,699,867],[1,0,438,410,447,413,458,412,473,405,479,404,489,398,501,387,503,383,502,379,496,371],[2,0,239,831,236,820,233,792,233,763],[2,0,888,488,909,475],[0,0,679,513,682,502,692,480,692,457,694,447],[1,0,451,303,442,299,412,292,408,290],[2,0,945,457,942,458,938,455,927,456],[2,0,642,598,633,606,626,615,622,623,615,644,612,671,609,674],[1,0,445,463,432,476],[2,0,1133,466,1136,468,1146,468,1155,471],[1,0,82,766,111,763,155,762,160,760,160,755],[1,0,202,512,205,508,222,500,226,495],[1,0,450,485,444,486,437,491,435,491,431,497],[1,0,378,446,376,445,378,438,392,425,404,424,422,420,436,410],[1,0,222,739,226,721,231,708,231,679,232,678],[1,0,492,306,497,310,505,311,507,313],[1,0,216,766,215,773,213,776],[1,0,353,462,367,457,369,458,390,458,394,454,393,450,391,448,384,447],[1,0,66,656,64,656,52,667],[1,0,57,629,48,635],[0,0,510,491,510,497,514,507,523,515,536,521,547,524,567,524,573,522,578,516],[2,0,1199,698,1202,704,1212,714,1220,718,1288,781],[2,0,792,520,798,510,812,495,813,492],[1,0,188,766,197,767],[1,0,229,545,214,562,210,563],[1,0,194,731,193,730,194,707],[0,0,639,354,635,356,625,356,622,358],[1,0,278,478,270,490],[2,0,843,757,833,748,831,741,819,730,817,725,806,711,796,692,795,682,792,675,789,652,790,623,795,596,801,578],[2,0,427,557,407,563,389,572,381,578,371,588,369,592,353,610,333,630,325,641,322,649,314,661,304,696,297,731,295,749,295,767],[1,0,345,321,347,326,341,335,343,343,339,348,326,352,305,356,277,365,268,369,262,375,262,377,266,381,280,386,291,393,293,401,292,406,288,409,271,408,239,422,215,422,207,419,199,419,180,423,169,428],[2,0,1025,722,1046,749,1081,785,1087,789,1106,807,1146,833,1157,837,1170,846,1188,849,1207,857,1239,867,1261,881,1267,887,1268,890],[1,0,95,433,98,434,101,432,114,430,124,434,143,435],[1,0,250,543,245,554,240,559,221,572,219,575],[2,0,453,586,452,587,448,586,438,590,408,617,403,619,393,629,391,634,370,658,357,682,350,701,345,721,342,746,343,784,348,812,355,836,366,859,378,876,389,887,407,899,418,904,426,913,443,924],[1,0,451,484,456,479,472,470],[2,0,957,451,951,451,946,456],[1,0,281,496,294,495,298,493,306,493,323,500,352,504,360,500,364,494,363,486,357,480,353,479],[1,0,447,438,448,429],[1,0,448,439,454,445],[1,0,69,457,63,457,54,462],[2,0,592,856,603,872,612,882,618,892,632,908,644,918,669,943,671,948,678,955,687,960,709,982],[2,0,242,839,249,846,257,848],[1,0,432,244,431,260,441,272,453,275,465,280,486,283,488,286],[0,0,682,366,687,365,688,357],[2,0,1104,559,1100,564,1101,590,1106,604,1117,622],[1,0,60,528,89,515],[2,0,1199,697,1203,694,1208,694,1238,706],[0,0,541,319,544,322,551,324,558,328,571,333,575,333,592,344],[1,0,129,506,148,497,161,497],[1,0,120,457,131,452,135,447,140,445],[2,0,978,892,1006,924,1030,947],[1,0,130,471,119,476],[0,0,556,421,542,421],[1,1,374,278,368,274,370,271,362,263,362,261,362,254,364,252,396,260,398,264,397,268,392,270,392,274,389,278,384,274,380,274],[1,1,403,292,388,286,386,283,390,280,388,277,391,274,398,278,406,285,406,288],[1,1,497,294,492,292,492,289,491,288,488,287,488,285,488,282,500,276,504,276,506,278,508,282,500,290,500,293],[1,1,357,312,350,310,348,309,348,304,352,297,362,287,364,284,366,282,369,284,372,286,372,295,374,299,366,304],[0,1,669,376,662,368,655,366,652,363,654,351,651,348,648,348,641,354,638,354,636,352,636,348,635,346,631,346,622,351,624,355,620,358,612,356,604,352,592,345,592,343,592,341,596,339,594,335,590,330,585,330,581,334,578,330,580,325,580,319,571,320,569,318,566,315,564,310,581,298,590,294,618,290,628,288,656,290,674,298,676,300,672,306,656,306,638,321,639,322,641,322,646,320,651,320,655,322,662,329,664,336,664,351,672,360,678,364,680,366,678,368,674,371,674,374],[0,2,567,314,583,298],[0,2,575,317,597,295],[0,2,581,322,611,292],[0,2,582,332,623,291],[0,2,594,331,635,290],[0,2,594,342,645,291],[0,2,600,347,632,315],[0,2,638,309,655,292],[0,2,607,351,663,295],[0,2,614,355,648,321],[0,2,665,304,671,298],[0,2,635,345,655,325],[0,2,639,352,660,331],[0,2,654,348,663,339],[0,2,653,360,663,350],[0,2,659,365,667,357],[0,2,666,369,672,363],[1,1,487,318,474,314,456,308,454,304,455,302,458,301,456,299,459,296,480,304,491,306,492,310,488,312,488,314,488,316],[1,1,537,338,510,324,508,321,511,320,512,317,508,314,506,312,513,304,515,304,518,304,520,307,520,311,522,314,540,319,542,323,538,324,538,326,542,330,542,333],[0,1,691,328,679,328,667,324,662,322,662,320,662,317,665,314,677,316,678,314,678,310,683,306,694,323,694,325],[0,1,691,354,686,351,686,342,688,340,693,338,695,334,698,336,702,340,702,343],[0,1,567,440,562,436,562,434,562,427,558,423,558,420,568,416,576,405,578,399,582,396,585,398,588,401,584,417,580,424],[1,1,510,432,507,432,504,429,506,425,500,423,500,420,500,417,510,414,520,414,524,416,526,419,526,422,523,424,522,424,517,424],[1,1,533,434,528,427,526,425,526,422,529,418,538,420,540,422,538,426,538,430],[1,1,156,442,151,442,147,440,144,436,146,433,163,428,166,431,166,434,160,440],[0,1,698,446,692,442,694,430,698,428,701,428,702,430,702,433,708,437,706,440,701,442],[1,1,71,456,69,456,66,453,68,451,64,449,66,442,71,442,93,434,95,434,98,436,96,439,99,440,100,442,98,444,94,446,96,450,92,454,88,450,82,450],[0,1,594,514,592,514,588,510,588,507,596,499,612,478,625,464,655,440,665,434,668,436,670,440,672,456,666,460,662,458,662,455,661,454,656,456,623,482,608,502],[1,1,544,466,542,466,538,461,540,459,540,454,534,442,538,438,541,436,544,438,548,446,552,446,557,444,562,448,560,452,552,460,547,462],[1,1,453,462,450,462,446,457,446,455,450,450,450,447,453,446,455,450,458,448,460,451,460,454],[0,1,656,524,652,518,646,516,646,513,652,498,654,484,660,467,662,457,666,456,672,459,672,472,662,501,662,520],[1,1,509,488,501,480,487,474,478,472,476,467,484,458,488,460,489,464,501,468,512,472,514,476,514,485],[1,1,351,480,343,478,340,475,342,469,344,465,346,464,350,464,352,467,352,471,354,476],[1,1,403,504,398,504,390,500,392,496,400,487,400,484,409,478,427,476,432,482,422,491,428,492,430,493,430,496,430,499,425,502,409,502],[1,1,98,500,92,496,94,488,101,480,110,478,112,481,112,483,102,493,100,498],[1,1,184,522,178,517,178,514,186,506,186,502,182,498,184,494,188,494,193,488,200,497,194,504,195,506,201,506,202,511,201,514,190,518],[1,1,235,544,233,544,230,540,232,536,231,534,226,534,222,529,232,520,235,520,236,522,237,526,239,528,242,526,250,518,248,513,244,511,249,506,262,496,268,490,271,490,272,494,277,494,280,500,270,508,268,512,268,520,264,524,256,539,253,542,250,540,248,539,248,536,246,536,242,540],[1,1,101,516,93,516,90,513,94,504,94,501,99,498,102,502,109,504,112,507,108,512],[0,1,676,538,670,534,670,528,674,518,677,516,682,519,682,524,685,524,686,528],[0,1,657,546,652,544,652,541,648,536,658,526,664,529,664,534,662,541],[0,1,659,570,654,570,652,568,654,553,657,552,658,554,662,554,669,546,672,548,676,551,674,562,670,566],[1,1,204,590,198,586,198,580,197,578,195,580,194,576,208,564,211,564,214,567,214,572,217,572,220,577,208,586],[1,1,193,612,188,609,190,607,188,606,185,606,182,604,182,601,197,586,200,586,204,590,204,592,196,608],[1,1,93,654,89,648,84,648,82,644,82,642,84,644,86,642,85,640,82,640,82,637,86,633,88,628,88,625,85,622,80,624,69,632,66,628,62,630,58,624,71,614,82,608,86,604,89,604,92,608,92,614,94,618,102,621,98,630,99,632,102,632,104,635,98,641,98,650],[1,1,175,636,170,634,165,634,162,629,166,625,174,612,178,606,184,610,182,612,184,614,186,612,188,614,188,618,178,627,178,633],[1,1,71,656,68,656,64,653,70,641,74,638,82,638,84,640,82,641,82,643,85,642,86,644,86,647,81,652],[1,1,95,702,90,695,90,692,92,686,95,684,100,688,100,698],[1,1,195,752,192,748,188,748,186,747,186,744,192,739,192,734,196,732,198,736,204,738,204,742,200,746,200,750],[1,1,216,764,210,760,212,747,208,744,208,742,211,740,217,740,219,738,222,741,222,755,220,761],[1,1,170,770,167,770,166,768,166,764,162,762,160,760,162,757,165,754,171,756,176,754,182,748,185,748,186,750,188,764,186,766,175,766],[1,1,69,770,64,767,64,764,77,756,80,759,80,763,82,764,82,766,78,768]];


/* ══ la mano, da cape-rotta ═════════════════════════════════════════════ */

function prng(seme){
  return function(){
    seme |= 0; seme = seme + 0x6D2B79F5 | 0;
    var t = Math.imul(seme ^ seme >>> 15, 1 | seme);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function f1(n){ return Math.round(n * 10) / 10; }

function lunghezza(P){
  var L = 0;
  for(var i = 1; i < P.length; i++) L += Math.hypot(P[i][0] - P[i-1][0], P[i][1] - P[i-1][1]);
  return L;
}

function ricampiona(P, chiuso, passo){
  var Q = P.slice();
  if(chiuso) Q.push(P[0]);
  var acc = [0];
  for(var i = 1; i < Q.length; i++) acc.push(acc[i-1] + Math.hypot(Q[i][0] - Q[i-1][0], Q[i][1] - Q[i-1][1]));
  var L = acc[acc.length - 1];
  if(!(L > 0)) return { p: P.slice(), len: 0 };
  var n = Math.max(chiuso ? 6 : 2, Math.round(L / passo)), out = [], j = 0;
  for(var k = 0; k < (chiuso ? n : n + 1); k++){
    var t = L * k / n;
    while(j < acc.length - 2 && acc[j + 1] < t) j++;
    var u = (t - acc[j]) / ((acc[j + 1] - acc[j]) || 1);
    out.push([Q[j][0] + (Q[j+1][0] - Q[j][0]) * u, Q[j][1] + (Q[j+1][1] - Q[j][1]) * u]);
  }
  return { p: out, len: L };
}

function sfoltisci(P, eps){
  if(P.length < 3) return P;
  var tieni = new Uint8Array(P.length), pila = [[0, P.length - 1]];
  tieni[0] = tieni[P.length - 1] = 1;
  while(pila.length){
    var s = pila.pop(), a = P[s[0]], b = P[s[1]], dx = b[0] - a[0], dy = b[1] - a[1];
    var dl = Math.hypot(dx, dy) || 1, max = 0, idx = -1;
    for(var i = s[0] + 1; i < s[1]; i++){
      var d = Math.abs((P[i][0] - a[0]) * dy - (P[i][1] - a[1]) * dx) / dl;
      if(d > max){ max = d; idx = i; }
    }
    if(max > eps && idx > 0){ tieni[idx] = 1; pila.push([s[0], idx], [idx, s[1]]); }
  }
  return P.filter(function(_, i){ return tieni[i]; });
}

/* Come in cape-rotta: la linea pulita diventa passate a mano libera, che
   tremano un poco e sforano ai capi. Qui le passate sono due e non tre: le
   linee sono tante, e a otto fotogrammi al secondo una terza passata si
   legge come sporco, non come matita. */
function schizzo(P, chiuso, amp, passate, rnd){
  var base = ricampiona(P, chiuso, 3);
  var Q0 = base.p, L = base.len, out = [];
  if(Q0.length < 2 || !(L > 0)) return out;
  var cx0 = 0, cy0 = 0;
  Q0.forEach(function(a){ cx0 += a[0]; cy0 += a[1]; });
  cx0 /= Q0.length; cy0 /= Q0.length;
  var oltreMax = Math.min(10, L * 0.12), onda = 60;

  for(var ps = 0; ps < passate; ps++){
    var A = amp * (ps === 0 ? 0.55 : 1);
    var dx = ps ? (rnd() - 0.5) * 1.6 * amp : 0, dy = ps ? (rnd() - 0.5) * 1.6 * amp : 0;
    var w1 = 2 * Math.PI / (onda * (0.8 + rnd() * 0.7)), w2 = 2 * Math.PI / (onda * (0.25 + rnd() * 0.2));
    var h1 = rnd() * 6.28, h2 = rnd() * 6.28, Q = [];

    if(chiuso){
      var n = Q0.length, start = Math.floor(rnd() * n);
      var oltre = Math.round(n * Math.min(ps ? 0.06 + rnd() * 0.08 : 0.025, oltreMax / L));
      for(var k = 0; k <= n + oltre; k++) Q.push(Q0[(start + k) % n]);
    } else {
      var e = ps ? oltreMax * (0.3 + rnd() * 0.7) : oltreMax * 0.2;
      var a0 = Q0[0], a1 = Q0[1], b0 = Q0[Q0.length - 1], b1 = Q0[Q0.length - 2];
      var u0 = [a0[0] - a1[0], a0[1] - a1[1]], l0 = Math.hypot(u0[0], u0[1]) || 1;
      var u1 = [b0[0] - b1[0], b0[1] - b1[1]], l1 = Math.hypot(u1[0], u1[1]) || 1;
      var e1 = e * (0.4 + rnd());
      Q.push([a0[0] + u0[0] / l0 * e, a0[1] + u0[1] / l0 * e]);
      Q = Q.concat(Q0);
      Q.push([b0[0] + u1[0] / l1 * e1, b0[1] + u1[1] / l1 * e1]);
    }

    var R = [], s = 0;
    for(var i = 0; i < Q.length; i++){
      if(i) s += Math.hypot(Q[i][0] - Q[i-1][0], Q[i][1] - Q[i-1][1]);
      var pa = Q[Math.max(0, i - 1)], pb = Q[Math.min(Q.length - 1, i + 1)];
      var nx = -(pb[1] - pa[1]), ny = pb[0] - pa[0], nl = Math.hypot(nx, ny) || 1;
      var off = A * (0.7 * Math.sin(s * w1 + h1) + 0.3 * Math.sin(s * w2 + h2));
      R.push([Q[i][0] + dx + nx / nl * off, Q[i][1] + dy + ny / nl * off]);
    }
    R = sfoltisci(R, 0.5);
    var d = 'M' + f1(R[0][0]) + ',' + f1(R[0][1]);
    for(var j = 1; j < R.length; j++) d += 'L' + f1(R[j][0]) + ',' + f1(R[j][1]);
    out.push({ d: d, len: lunghezza(R), ps: ps });
  }
  return out;
}


/* ══ le linee ═══════════════════════════════════════════════════════════ */

function leggi(){
  return LINEE.map(function(r, i){
    var P = [];
    for(var k = 2; k + 1 < r.length; k += 2) P.push([r[k], r[k + 1]]);
    var cx = 0, cy = 0, top = P[0];
    P.forEach(function(p){ cx += p[0]; cy += p[1]; if(p[1] < top[1]) top = p; });
    return { i: i, g: r[0], chiuso: !!(r[1] & 1), tratteggio: !!(r[1] & 2), p: P,
             cx: cx / P.length, cy: cy / P.length, top: top, len: lunghezza(P) };
  });
}

/* Chi si muove con chi. Il surfista è un pezzo solo. Ogni linea d'onda è un
   pezzo suo, perché ognuna ondeggia col proprio ritardo. Gli spruzzi vanno a
   fasce verticali: frizzano a gruppi, non uno per uno, se no sembrano
   moscerini. */
function pezzoDi(l){
  if(l.g === 0) return 's';
  if(l.g === 2) return 'o' + l.i;
  return 'p' + Math.min(5, Math.floor(l.cx / 95));
}


/* ══ il meccanismo ══════════════════════════════════════════════════════ */

var NS = 'http://www.w3.org/2000/svg';

function vesti(){
  if(document.getElementById('cape-surfista-css')) return;
  var st = document.createElement('style');
  st.id = 'cape-surfista-css';
  st.textContent =
    '.cape-fondo-marchio.is-matita{opacity:0}' +
    '.cape-surfista{position:absolute;overflow:visible;pointer-events:none;z-index:1}' +
    '.cape-surfista .cs-strato{display:none}' +
    '.cape-surfista .cs-strato.is-su{display:inline}';
  document.head.appendChild(st);
}

function init(){
  var img = document.querySelector(IMG);
  if(!img) return;
  try{ if(matchMedia('(prefers-reduced-motion: reduce)').matches) return; }catch(e){}
  if(window.innerWidth < MIN_W) return;

  vesti();

  var linee = leggi();

  /* ── la costruzione: VARIANTI strati uguali, a mano diversa ─────────
     Dentro ogni strato ogni pezzo ha il suo <g>, ed è il <g> che si muove.
     A ogni fotogramma se ne accende uno solo. */
  var svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('class', 'cape-surfista');
  svg.setAttribute('viewBox', '0 0 ' + LATO + ' ' + LATO);
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');

  var strati = [], pezzi = {}, ordine = [];

  for(var v = 0; v < VARIANTI; v++){
    var gs = {}, html = '';
    linee.forEach(function(l){
      var id = pezzoDi(l);
      if(!gs[id]) gs[id] = '';
      var rnd = prng(7919 * (l.i + 1) + 104729 * v);
      schizzo(l.p, l.chiuso, l.tratteggio ? MANO * 0.5 : MANO, l.tratteggio ? 1 : 2, rnd).forEach(function(t){
        gs[id] += '<path d="' + t.d + '"' + (t.ps ? ' class="cs-r" opacity="0.75"' : '') + '/>';
      });
    });
    Object.keys(gs).forEach(function(id){ html += '<g data-p="' + id + '">' + gs[id] + '</g>'; });
    var g = document.createElementNS(NS, 'g');
    g.setAttribute('class', 'cs-strato' + (v === 0 ? ' is-su' : ''));
    g.setAttribute('fill', 'none');
    g.setAttribute('stroke', INK);
    g.setAttribute('stroke-linecap', 'round');
    g.setAttribute('stroke-linejoin', 'round');
    g.innerHTML = html;
    svg.appendChild(g);
    strati.push(g);
    [].forEach.call(g.children, function(c){
      var id = c.getAttribute('data-p');
      (pezzi[id] || (pezzi[id] = [])).push(c);
    });
  }

  /* chi sa come si muove ogni pezzo: il perno e il ritardo */
  Object.keys(pezzi).forEach(function(id){
    var l = null;
    if(id.charAt(0) === 'o') l = linee[+id.slice(1)];
    ordine.push({ id: id, gs: pezzi[id], l: l, fascia: id.charAt(0) === 'p' ? +id.slice(1) : 0 });
  });

  img.parentNode.insertBefore(svg, img.nextSibling);
  img.classList.add('is-matita');

  /* ── la misura: l'SVG si posa esattamente sull'immagine ──────────── */
  var tratto = 0;
  function posa(){
    var piccolo = window.innerWidth < MIN_W;
    svg.style.display = piccolo ? 'none' : '';
    img.classList.toggle('is-matita', !piccolo);
    if(piccolo) return;
    var w = img.offsetWidth, h = img.offsetHeight;
    svg.style.left   = img.offsetLeft + 'px';
    svg.style.top    = img.offsetTop + 'px';
    svg.style.width  = w + 'px';
    svg.style.height = h + 'px';
    var fit = getComputedStyle(img).objectFit;
    svg.setAttribute('preserveAspectRatio', fit === 'fill' ? 'none' : (fit === 'cover' ? 'xMidYMid slice' : 'xMidYMid meet'));
    var scala = (fit === 'cover' ? Math.max(w, h) : Math.min(w, h)) / LATO;
    if(!(scala > 0)) return;
    var t = TRATTO_PX / scala;
    if(Math.abs(t - tratto) < 0.01) return;
    tratto = t;
    strati.forEach(function(g){
      g.setAttribute('stroke-width', f1(t));
      [].forEach.call(g.querySelectorAll('.cs-r'), function(p){ p.setAttribute('stroke-width', f1(t * 0.65)); });
    });
  }
  posa();
  if(window.ResizeObserver) new ResizeObserver(posa).observe(img);
  addEventListener('resize', posa, { passive: true });

  /* ── quando si vede ─────────────────────────────────────────────────
     Il footer sta fermo in fondo allo schermo e lo scopre il bordo basso del
     video che sale. Il film gira appena il video ne ha scoperto un pezzo, e
     solo finché l'immagine è almeno in parte dentro lo schermo. */
  function video(){
    var sec = document.querySelector('.cape-open');
    return sec && (sec.querySelector('.cape-open-stage') || sec);
  }
  function inVista(){
    if(svg.style.display === 'none' || document.hidden) return false;
    var r = img.getBoundingClientRect(), vh = window.innerHeight;
    if(r.height < 10 || r.bottom <= 0 || r.top >= vh) return false;
    var b = video();
    return !b || b.getBoundingClientRect().bottom < r.bottom - 4;
  }

  /* ── il film ────────────────────────────────────────────────────────
     Un fotogramma ogni 1/FPS di secondo, non uno per ogni giro del browser:
     è il passo a scatti che lo fa sembrare fatto a mano. Il tempo si conta
     solo mentre il film gira, così quando riparte riprende dal fotogramma in
     cui si era fermato. */
  var fotogramma = 0, suo = 0, ultimo = 0, girando = false;

  function scatta(){
    var fi = 2 * Math.PI * (fotogramma % GIRO) / GIRO;

    strati[suo].classList.remove('is-su');
    suo = fotogramma % VARIANTI;
    strati[suo].classList.add('is-su');

    ordine.forEach(function(o){
      var tr;
      if(o.id === 's'){
        tr = 'translate(0 ' + f1(SURF_SU * Math.sin(fi)) + ') rotate(' +
             f1(SURF_GIRA * Math.sin(fi + 0.9)) + ' ' + PERNO[0] + ' ' + PERNO[1] + ')';
      } else if(o.l){
        var psi = fi + o.l.cx / LATO * 2 * Math.PI * 0.9;
        tr = 'translate(' + f1(ONDA_VA * Math.sin(psi + 0.5)) + ' ' + f1(ONDA_VA * 0.4 * Math.cos(psi)) + ') rotate(' +
             f1(ONDA_GIRA * Math.sin(psi)) + ' ' + o.l.top[0] + ' ' + o.l.top[1] + ')';
      } else {
        var ps = fi * 2 + o.fascia * 1.1;
        tr = 'translate(' + f1(-SPRUZZI_VA * (0.5 + 0.5 * Math.sin(ps))) + ' ' + f1(-SPRUZZI_VA * 0.6 * Math.sin(ps + 1.3)) + ')';
      }
      o.gs[suo].setAttribute('transform', tr);
    });
    fotogramma++;
  }

  function giro(ora){
    girando = false;
    if(!inVista()){ ultimo = 0; return; }
    if(!ultimo || ora - ultimo >= 1000 / FPS){
      ultimo = ora;
      scatta();
    }
    sveglia();
  }

  function sveglia(){
    if(girando) return;
    girando = true;
    requestAnimationFrame(giro);
  }

  /* Il film si ferma da solo quando non è in vista; a risvegliarlo ci pensano
     lo scroll, il resize e il ritorno sulla scheda. */
  addEventListener('scroll', sveglia, { passive: true });
  addEventListener('resize', sveglia, { passive: true });
  document.addEventListener('visibilitychange', sveglia);
  sveglia();

  window.capePatti && capePatti.dichiara('surfista', {
    leggo: [['.cape-open-stage', '', 'il bordo basso del video che sale dice quando il surfista è scoperto']]
  });

  window.capeSurfista = {
    stato: function(){
      return { inVista: inVista(), fotogramma: fotogramma, linee: linee.length, pezzi: ordine.length };
    }
  };
}

if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();

})();
