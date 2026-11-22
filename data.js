/* Inhalte für „Max & Schmanny“ – alles in Silben getrennt (Bindestrich = Silbengrenze).
   {N} wird durch den Namen ersetzt. [Wort] markiert die Lücke in Lückensätzen. */
window.APPDATA = (function () {
  // Reihenfolge wie in vielen Fibeln. in:true = Laut steckt im Wort (nicht am Anfang).
  const LETTERS = [
    { g: 'M', w: 'Maus', e: '🐭', c: ['N', 'W'] },
    { g: 'A', w: 'Affe', e: '🐒', c: ['E', 'O'] },
    { g: 'I', w: 'Igel', e: '🦔', c: ['L', 'E'] },
    { g: 'O', w: 'Ohr', e: '👂', c: ['U', 'A'] },
    { g: 'L', w: 'Löwe', e: '🦁', c: ['I', 'T'] },
    { g: 'E', w: 'Elefant', e: '🐘', c: ['A', 'F'] },
    { g: 'S', w: 'Sonne', e: '☀️', c: ['Z', 'Sch'] },
    { g: 'R', w: 'Rakete', e: '🚀', c: ['N', 'K'] },
    { g: 'N', w: 'Nase', e: '👃', c: ['M', 'U'] },
    { g: 'U', w: 'Uhr', e: '⏰', c: ['O', 'N'] },
    { g: 'T', w: 'Tiger', e: '🐯', c: ['D', 'F'] },
    { g: 'H', w: 'Hund', e: '🐕', c: ['N', 'K'] },
    { g: 'F', w: 'Fisch', e: '🐟', c: ['W', 'T'] },
    { g: 'D', w: 'Delfin', e: '🐬', c: ['B', 'T'] },
    { g: 'W', w: 'Wal', e: '🐳', c: ['V', 'M'] },
    { g: 'B', w: 'Ball', e: '⚽', c: ['D', 'P'] },
    { g: 'K', w: 'Katze', e: '🐈', c: ['G', 'H'] },
    { g: 'P', w: 'Pinguin', e: '🐧', c: ['B', 'D'] },
    { g: 'G', w: 'Giraffe', e: '🦒', c: ['K', 'B'] },
    { g: 'Ei', w: 'Eis', e: '🍦', c: ['Ie', 'Eu'] },
    { g: 'Au', w: 'Auto', e: '🚗', c: ['Eu', 'Ei'] },
    { g: 'Sch', w: 'Schaf', e: '🐑', c: ['S', 'Ch'] },
    { g: 'Z', w: 'Zebra', e: '🦓', c: ['S', 'C'] },
    { g: 'J', w: 'Jacke', e: '🧥', c: ['I', 'G'] },
    { g: 'Ch', w: 'Buch', e: '📖', c: ['Sch', 'K'], in: true },
    { g: 'Eu', w: 'Eule', e: '🦉', c: ['Au', 'Ei'] },
    { g: 'St', w: 'Stern', e: '⭐', c: ['Sp', 'Sch'] },
    { g: 'Sp', w: 'Spinne', e: '🕷️', c: ['St', 'Sch'] },
    { g: 'Pf', w: 'Pferd', e: '🐴', c: ['F', 'P'] },
    { g: 'Ä', w: 'Äpfel', e: '🍎', c: ['A', 'Ö'] },
    { g: 'Ö', w: 'Löwe', e: '🦁', c: ['O', 'Ü'], in: true },
    { g: 'Ü', w: 'Überraschung', e: '🎁', c: ['U', 'Ö'] },
    { g: 'V', w: 'Vogel', e: '🐦', c: ['F', 'W'] },
    { g: 'Ie', w: 'Biene', e: '🐝', c: ['Ei', 'I'], in: true },
    { g: 'C', w: 'Clown', e: '🤡', c: ['G', 'O'] },
    { g: 'X', w: 'Hexe', e: '🧙', c: ['Z', 'K'], in: true },
    { g: 'Y', w: 'Yoga', e: '🧘', c: ['J', 'V'] },
    { g: 'Qu', w: 'Quietscheente', e: '🦆', c: ['K', 'Pf'] },
    { g: 'ß', w: 'Fuß', e: '🦶', c: ['S', 'B'], in: true },
    { g: 'Äu', w: 'Mäuse', e: '🐭', c: ['Eu', 'Au'], in: true }
  ];

  // sight:true = Merkwort (Namen), braucht keine bekannten Buchstaben
  const WORDS = [
    { w: 'Ma-ma', e: '👩', sim: ['O-ma', 'Pa-pa'] },
    { w: 'O-ma', e: '👵', sim: ['O-pa', 'Ma-ma'] },
    { w: 'O-pa', e: '👴', sim: ['O-ma', 'Pa-pa'] },
    { w: 'Max', e: '🐶', sight: true, sim: ['Mais', 'Mix'] },
    { w: 'Na-se', e: '👃', sim: ['Ha-se', 'Va-se'] },
    { w: 'Ha-se', e: '🐰', sim: ['Na-se', 'Ho-se'] },
    { w: 'Ho-se', e: '👖', sim: ['Ro-se', 'Do-se'] },
    { w: 'Ro-se', e: '🌹', sim: ['Ho-se', 'Do-se'] },
    { w: 'So-fa', e: '🛋️' },
    { w: 'Eis', e: '🍦', sim: ['Reis', 'heiß'] },
    { w: 'I-gel', e: '🦔', sim: ['E-gel', 'Na-gel'] },
    { w: 'Au-to', e: '🚗', sim: ['Au-ge', 'Ot-to'] },
    { w: 'Maus', e: '🐭', sim: ['Haus', 'Laus'] },
    { w: 'Haus', e: '🏠', sim: ['Maus', 'raus'] },
    { w: 'Hund', e: '🐕', sim: ['Mund', 'rund'] },
    { w: 'Mund', e: '👄', sim: ['Hund', 'Mond'] },
    { w: 'Mond', e: '🌙', sim: ['Mund', 'blond'] },
    { w: 'Ball', e: '⚽', sim: ['Fall', 'Stall'] },
    { w: 'Son-ne', e: '☀️', sim: ['Ton-ne', 'Wan-ne'] },
    { w: 'Ti-ger', e: '🐯' },
    { w: 'La-ma', e: '🦙', sim: ['Ma-ma', 'Lo-ma'] },
    { w: 'Ki-wi', e: '🥝' },
    { w: 'Ra-ke-te', e: '🚀' },
    { w: 'To-ma-te', e: '🍅' },
    { w: 'Ba-na-ne', e: '🍌' },
    { w: 'Me-lo-ne', e: '🍉' },
    { w: 'Kä-se', e: '🧀', sim: ['Va-se', 'Ha-se'] },
    { w: 'Lö-we', e: '🦁', sim: ['Mö-we', 'Lo-se'] },
    { w: 'Baum', e: '🌳', sim: ['Raum', 'Schaum'] },
    { w: 'Hut', e: '👒', sim: ['gut', 'Mut'] },
    { w: 'Kro-ne', e: '👑', sim: ['Boh-ne', 'Zo-ne'] },
    { w: 'Wel-pe', e: '🐶' },
    { w: 'En-te', e: '🦆', sim: ['Ern-te', 'Tan-te'] },
    { w: 'Wan-ne', e: '🛁', sim: ['Kan-ne', 'Tan-ne'] },
    { w: 'Was-ser', e: '💧', sim: ['Mes-ser', 'bes-ser'] },
    { w: 'tan-zen', e: '💃', sim: ['tan-ken', 'ran-ken'] },
    { w: 'Zahn', e: '🦷', sim: ['Hahn', 'Kahn'] },
    { w: 'Ei', e: '🥚', sim: ['Eis', 'Hai'] },
    { w: 'Hai', e: '🦈', sim: ['Ei', 'Heu'] },
    { w: 'Eu-le', e: '🦉', sim: ['Keu-le', 'Beu-le'] },
    { w: 'Fisch', e: '🐟', sim: ['Tisch', 'frisch'] },
    { w: 'Schaf', e: '🐑', sim: ['Schal', 'Schiff'] },
    { w: 'Schal', e: '🧣', sim: ['Schaf', 'Saal'] },
    { w: 'Schuh', e: '👟', sim: ['Kuh', 'Schuss'] },
    { w: 'Kuh', e: '🐄', sim: ['Schuh', 'Ku-li'] },
    { w: 'Buch', e: '📖', sim: ['Tuch', 'Bach'] },
    { w: 'Ku-chen', e: '🍰', sim: ['Ko-chen', 'su-chen'] },
    { w: 'Kno-chen', e: '🦴' },
    { w: 'Pfo-te', e: '🐾' },
    { w: 'Pferd', e: '🐴' },
    { w: 'Ap-fel', e: '🍎' },
    { w: 'Stern', e: '⭐', sim: ['gern', 'Stirn'] },
    { w: 'Am-pel', e: '🚦' },
    { w: 'Ro-bo-ter', e: '🤖' },
    { w: 'Mu-sik', e: '🎵' },
    { w: 'Piz-za', e: '🍕' },
    { w: 'Chi-li', e: '🌶️', sight: true },
    { w: 'Eis-lau-fen', e: '⛸️' },
    { w: 'Scho-ki', e: '🍫', sim: ['Scho-ko', 'Sho-gi'] },
    { w: 'Ten-nis-ball', e: '🎾' },
    { w: 'Bru-der', e: '👦', sim: ['Lu-der', 'Bu-de'] },
    { w: 'Kleid', e: '👗', sim: ['Kleie', 'Leid'] },
    { w: 'Glit-zer', e: '✨', sim: ['Git-ter', 'Glät-te'] },
    { w: 'Lip-pen-stift', e: '💄' },
    { w: 'Na-gel-lack', e: '💅' },
    { w: 'Ring', e: '💍', sim: ['Ding', 'Rind'] },
    { w: 'Ta-sche', e: '👜', sim: ['Ta-sse', 'Wä-sche'] },
    { w: 'Lied', e: '🎶', sim: ['Lid', 'Leid'] },
    { w: 'Kopf-hö-rer', e: '🎧' }
  ];

  // q: true = stimmt, false = Quatsch (r = Erklärung). [Wort] = Lücke, o = falsche Wahlwörter.
  const SENTENCES = [
    { t: 'Max ist ein [Hund].', q: true, e: '🐕', o: ['Fisch', 'Mond'] },
    { t: 'Max ist ein Wel-pe.', q: true, e: '🐶' },
    { t: 'Schman-ny ist ei-ne [Kat-ze].', q: true, e: '🐈', o: ['Ku-chen', 'Wan-ne'] },
    { t: 'Schman-ny bellt laut.', q: false, r: 'Katzen bellen nicht. Schmanny macht Miau!', e: '🐈' },
    { t: 'Max sagt Mi-au.', q: false, r: 'Max ist ein Hund. Hunde machen Wau!', e: '🐶' },
    { t: 'Chi-li ist [scharf].', q: true, e: '🌶️', o: ['blau', 'lei-se'] },
    { t: 'Chi-li ist süß.', q: false, r: 'Chili ist scharf! Frag mal Kevin.', e: '🌶️' },
    { t: 'Ke-vin gibt mir Chi-li.', e: '🌶️' },
    { t: 'Ke-vin hat mich rein-ge-legt.', e: '😂' },
    { t: 'Ich le-cke an der Chi-li. Au-a!', e: '🥵' },
    { t: 'Pa-blo ist ei-ne Chi-li.', q: true, e: '🌶️' },
    { t: 'Pa-blo hat ei-nen Bart.', q: true, e: '🌶️' },
    { t: 'Pa-blo schum-melt gern.', q: true, e: '😏' },
    { t: '{N} [tanzt] gern.', q: true, e: '💃', o: ['bellt', 'schläft'] },
    { t: '{N} kann Eis lau-fen.', q: true, e: '⛸️' },
    { t: '{N} schwimmt wie ein [Fisch].', q: true, e: '🏊', o: ['Stein', 'Ball'] },
    { t: 'Eis ist [kalt].', q: true, e: '🍦', o: ['heiß', 'rot'] },
    { t: 'Eis ist heiß.', q: false, r: 'Eis ist kalt! Sonst schmilzt es.', e: '🍦' },
    { t: 'Ein Ball ist [rund].', q: true, e: '⚽', o: ['lang', 'sau-er'] },
    { t: 'Max hat [vier] Pfo-ten.', q: true, e: '🐾', o: ['zehn', 'null'] },
    { t: 'Max hat drei Oh-ren.', q: false, r: 'Max hat zwei Ohren.', e: '🐶' },
    { t: 'Ein Fisch fährt Rad.', q: false, r: 'Fische schwimmen. Rad fahren können sie nicht!', e: '🐟' },
    { t: 'Der Mond ist aus Kä-se.', q: false, r: 'Der Mond ist aus Stein.', e: '🌙' },
    { t: 'Die Son-ne ist [gelb].', q: true, e: '☀️', o: ['blau', 'grün'] },
    { t: 'Ba-na-nen sind blau.', q: false, r: 'Bananen sind gelb!', e: '🍌' },
    { t: 'Ein Wal ist win-zig.', q: false, r: 'Ein Wal ist riesig!', e: '🐳' },
    { t: 'Ke-vin ist dein Bru-der.', q: true, e: '👦' },
    { t: 'Max frisst ei-nen [Kno-chen].', e: '🦴', o: ['Mond', 'Stern'] },
    { t: 'Schman-ny tanzt Bal-lett.', q: false, r: 'Katzen tanzen kein Ballett. Oder doch?', e: '🐈' },
    { t: 'Max wa-ckelt mit dem Po.', e: '🐶' },
    { t: 'Im Was-ser ist es [nass].', q: true, e: '💧', o: ['tro-cken', 'laut'] },
    { t: 'Ei-ne En-te schwimmt in der Wan-ne.', q: true, e: '🦆' },
    { t: 'Ein Hund kann flie-gen.', q: false, r: 'Hunde können nicht fliegen. Nur Pablo glaubt das.', e: '🐕' },
    { t: 'Pa-blo tanzt wie ver-rückt.', e: '🌶️' },
    { t: 'Schnee ist [weiß].', q: true, e: '❄️', o: ['rot', 'li-la'] },
    { t: 'Ein Pin-guin lebt im Eis.', q: true, e: '🐧' },
    { t: 'Kat-zen ha-ben Fe-dern.', q: false, r: 'Katzen haben Fell. Vögel haben Federn.', e: '🐈' },
    // Ich-Sätze: über sie selbst
    { t: 'Hal-lo, ich bin [{N}].', e: '👋', o: ['Pa-blo', 'Max'] },
    { t: 'Ich mag [Scho-ki].', e: '🍫', o: ['Stei-ne', 'Sei-fe'] },
    { t: 'Ich ha-be ei-nen Hund. Er heißt [Max].', e: '🐶', o: ['Pa-blo', 'Ke-vin'] },
    { t: 'Mei-ne Kat-ze heißt [Schman-ny].', e: '🐈', o: ['Max', 'Pa-blo'] },
    { t: 'Mein Bru-der heißt [Ke-vin].', e: '👦', o: ['Max', 'Schman-ny'] },
    { t: 'Max spielt gern mit dem [Ball].', e: '🎾', o: ['Mond', 'So-fa'] },
    { t: 'Ich tan-ze sehr gern.', e: '💃' },
    { t: 'Ich kann Eis lau-fen und schwim-men.', e: '⛸️' },
    { t: 'Ich ba-de gern in der Wan-ne.', e: '🛁' },
    { t: 'Ich spre-che Deutsch und Rus-sisch.', q: true, e: '🗣️' },
    { t: 'Ich mag Scho-ki, a-ber kei-ne Chi-li!', e: '🌶️' },
    { t: 'Ich bin {N}, und ich bin su-per!', e: '⭐' },
    { t: 'Ich bin ei-ne Chi-li.', q: false, r: 'Quatsch! Du bist {N}. Pablo ist die Chili!', e: '🌶️' },
    { t: 'Max ist ei-ne Kat-ze.', q: false, r: 'Max ist ein Hund! Schmanny ist die Katze.', e: '🐶' },
    { t: 'Ke-vin ist ein Ba-by.', q: false, r: 'Quatsch! Kevin ist dein großer Bruder.', e: '👶' },
    // Musik, Mode, Make-up
    { t: 'Ich hö-re gern [Mu-sik].', e: '🎧', o: ['Re-gen', 'Stau-be'] },
    { t: 'Ich tan-ze zu mei-nem Lieb-lings-lied.', e: '💃' },
    { t: 'Mein Kleid hat viel [Glit-zer].', e: '✨', o: ['Ma-yo', 'Matsch'] },
    { t: 'Ich ma-le mir die Nä-gel bunt an.', e: '💅' },
    { t: 'Max trägt ro-ten Lip-pen-stift.', q: false, r: 'Hunde tragen keinen Lippenstift! Oder doch, wenn du ihn anziehst?', e: '💄' },
    { t: 'Schman-ny la-ckiert sich die Kral-len.', q: false, r: 'Quatsch! Schmanny ist viel zu faul dafür.', e: '💅' },
    { t: 'Beim Eis-lau-fen tra-ge ich Schlitt-schu-he.', q: true, e: '⛸️' },
    { t: 'Pa-blo singt ein Lied. Es ist sehr scharf!', e: '🎤' }
  ];

  const STORY = [
    { ti: 'Max', lines: ['Das ist {N}.', 'Und das ist Max.', 'Max ist ein Wel-pe.', 'Max ist noch ganz klein.', 'Da ruft je-mand: Hal-lo!'],
      end: 'Wer ist das? Mor-gen geht es wei-ter!',
      q: { t: 'Wer ist Max?', a: ['ein Wel-pe', 'ei-ne Kat-ze', 'ei-ne Chi-li'], e: ['🐶', '🐈', '🌶️'] } },
    { ti: 'Pablo', lines: ['Es ist Pa-blo, die Chi-li!', 'Pa-blo hat ei-nen Bart.', 'Pa-blo lacht: Ha-ha-ha!', 'Ich bin sehr scharf!'],
      end: 'Was hat Pa-blo nur vor?',
      q: { t: 'Was hat Pa-blo?', a: ['ei-nen Bart', 'ei-nen Hut', 'ei-nen Ball'], e: ['🧔', '👒', '⚽'] } },
    { ti: 'Schmanny', lines: ['Schman-ny liegt auf dem So-fa.', 'Schman-ny gähnt.', 'Pa-blo ruft: Kommt mit!', 'Wir ge-hen Eis lau-fen!'],
      end: 'Kommt Schman-ny mit?',
      q: { t: 'Wo-hin wol-len sie?', a: ['Eis lau-fen', 'schla-fen', 'ein-kau-fen'], e: ['⛸️', '🛏️', '🛒'] } },
    { ti: 'Rutsch!', lines: ['Max steht auf dem Eis.', 'Max rutscht. Rutsch!', 'Bums! Max fällt auf den Po.', '{N} hilft Max hoch.'],
      end: 'Schafft Max es noch?',
      q: { t: 'Wer fällt auf den Po?', a: ['Max', 'Schman-ny', 'Ke-vin'], e: ['🐶', '🐈', '👦'] } },
    { ti: 'Die Pirouette', lines: ['{N} kann gut Eis lau-fen.', 'Sie dreht sich im Kreis.', 'Ei-ne Pi-rou-et-te!', 'Max staunt. Pa-blo will das auch.'],
      end: 'Kann Pa-blo das?',
      q: { t: 'Was macht {N}?', a: ['sie dreht sich', 'sie schläft', 'sie isst'], e: ['💫', '😴', '🍽️'] } },
    { ti: 'Schwindelig', lines: ['Pa-blo dreht sich.', 'Und dreht sich. Und dreht sich!', 'Pa-blo ist ganz schwin-de-lig.', 'Er rollt vom Eis bis ins Schwimm-bad!'],
      end: 'Oh nein, Pa-blo!',
      q: { t: 'Wo-hin rollt Pa-blo?', a: ['ins Schwimm-bad', 'auf den Mond', 'ins Bett'], e: ['🏊', '🌙', '🛏️'] } },
    { ti: 'Platsch!', lines: ['Platsch! Pa-blo ist im Was-ser.', 'Max springt hin-ter-her.', 'Schman-ny bleibt lie-ber am Rand.', 'Schman-ny mag kein Was-ser.'],
      end: 'Wer ret-tet Pa-blo?',
      q: { t: 'Wer springt ins Was-ser?', a: ['Max', 'Schman-ny', 'der Mond'], e: ['🐶', '🐈', '🌙'] } },
    { ti: 'Wie ein Fisch', lines: ['{N} springt ins Was-ser.', 'Sie schwimmt wie ein Fisch.', 'Sie holt Pa-blo raus.', 'Pa-blo blub-bert: Dan-ke!'],
      end: 'Da kommt je-mand ...',
      q: { t: 'Wer holt Pa-blo raus?', a: ['{N}', 'Schman-ny', 'ein Hai'], e: ['🏊', '🐈', '🦈'] } },
    { ti: 'Kevins Dose', lines: ['Da kommt Ke-vin.', 'Ke-vin hat ei-ne Do-se.', 'Er sagt: Wer will was Le-cke-res?', '{N} denkt nach. Ist das ein Trick?'],
      end: 'Was ist in der Do-se?',
      q: { t: 'Was hat Ke-vin?', a: ['ei-ne Do-se', 'ei-nen Ball', 'ein Buch'], e: ['🥫', '⚽', '📖'] } },
    { ti: 'Chili-Alarm', lines: ['In der Do-se ist ... Chi-li!', 'Ha-ha, Ke-vin!', 'Das kennt {N} schon.', 'Sie leckt nicht dran!'],
      end: 'Jetzt hat {N} ei-ne I-dee ...',
      q: { t: 'Was ist in der Do-se?', a: ['Chi-li', 'Eis', 'Ku-chen'], e: ['🌶️', '🍦', '🍰'] } },
    { ti: 'Die Rache', lines: ['{N} gibt Ke-vin die Chi-li.', 'Ke-vin leckt dran.', 'Au-a! Ist das scharf!', 'Ke-vin wird rot wie ei-ne To-ma-te!'],
      end: 'Al-le la-chen ...',
      q: { t: 'Wer wird rot wie ei-ne To-ma-te?', a: ['Ke-vin', 'Max', 'Schman-ny'], e: ['👦', '🐶', '🐈'] } },
    { ti: 'Party', lines: ['Al-le la-chen laut.', 'Max wa-ckelt mit dem Po.', 'Pa-blo macht Mu-sik.', 'Zeit für ei-ne Tanz-par-ty!'],
      end: 'Wer tanzt am bes-ten?',
      q: { t: 'Wo-für ist jetzt Zeit?', a: ['Tanz-par-ty', 'Schu-le', 'schla-fen'], e: ['🎉', '🏫', '😴'] } },
    { ti: 'Der Tanz', lines: ['{N} zeigt ih-ren Tanz.', 'Max tanzt mit.', 'Schman-ny tanzt nicht. Sie schaut nur.', 'A-ber heim-lich wa-ckelt sie mit dem Schwanz.'],
      end: 'Psst! Nicht wei-ter-sa-gen!',
      q: { t: 'Was macht Schman-ny heim-lich?', a: ['sie wa-ckelt mit dem Schwanz', 'sie bellt', 'sie schwimmt'], e: ['🐈', '🐕', '🏊'] } },
    { ti: 'Gute Nacht', lines: ['Am A-bend ist Max mü-de.', 'Er legt sich in sein Körb-chen.', '{N} sagt: Gu-te Nacht, Max!', 'Pa-blo flüs-tert: Mor-gen gibt es ein neu-es A-ben-teu-er ...'],
      end: 'En-de. Frag Ke-vin nach neu-en Ka-pi-teln!',
      q: { t: 'Wer ist mü-de?', a: ['Max', 'Pa-blo', 'Ke-vin'], e: ['🐶', '🌶️', '👦'] } }
  ];

  const DANCES = [
    'Dreh dich zwei-mal im Kreis, wie beim Eis-lau-fen!',
    'Wa-ckel mit dem Po, wie Max mit dem Schwanz!',
    'Mach fünf Ham-pel-män-ner!',
    'Tu so, als ob du schwimmst: Krau-len!',
    'Steh auf ei-nem Bein wie ein Fla-min-go!',
    'Spring 2 · 3 mal hoch!',
    'Mach den Ro-bo-ter-tanz!',
    'Klatsch 2 · 5 mal in die Hän-de!',
    'Lauf auf der Stel-le, so schnell du kannst!',
    'Mach dich groß wie ei-ne Gi-raf-fe und klein wie ei-ne Maus!',
    'Schüt-tel dich wie Max nach dem Ba-den!',
    'Mach ei-nen Kat-zen-bu-ckel wie Schman-ny!',
    'Tanz wie Pa-blo, wenn es rich-tig scharf ist!',
    'Er-fin-de ei-nen ei-ge-nen Tanz-schritt und zeig ihn Ke-vin!',
    'Tu so, als ob du Schlitt-schuh läufst: links, rechts, links!',
    'Frier ein wie ei-ne Eis-fi-gur! Nicht be-we-gen!'
  ];

  const STICKERS = [
    { id: 'krone', e: '👑', n: 'Krone', s: 'head' },
    { id: 'skates', e: '⛸️', n: 'Schlittschuhe', s: 'feet' },
    { id: 'brille', e: '🕶️', n: 'Sonnenbrille', s: 'eyes' },
    { id: 'ente', e: '🦆', n: 'Badeente', s: 'hand' },
    { id: 'schal', e: '🧣', n: 'Schal', s: 'neck' },
    { id: 'zylinder', e: '🎩', n: 'Zylinder', s: 'head' },
    { id: 'ballett', e: '🩰', n: 'Ballettschuhe', s: 'feet' },
    { id: 'taucher', e: '🥽', n: 'Taucherbrille', s: 'eyes' },
    { id: 'chili', e: '🌶️', n: 'Chili (scharf!)', s: 'hand' },
    { id: 'medaille', e: '🏅', n: 'Medaille', s: 'neck' },
    { id: 'kappe', e: '🧢', n: 'Kappe', s: 'head' },
    { id: 'ballon', e: '🎈', n: 'Luftballon', s: 'hand' },
    { id: 'knochen', e: '🦴', n: 'Knochen', s: 'hand' },
    { id: 'schleife', e: '🎀', n: 'Schleife', s: 'head' },
    { id: 'eis', e: '🍦', n: 'Eis', s: 'hand' },
    { id: 'mikro', e: '🎤', n: 'Mikrofon', s: 'hand' },
    { id: 'sonnenhut', e: '👒', n: 'Sonnenhut', s: 'head' },
    { id: 'stern', e: '🌟', n: 'Glitzerstern', s: 'head' },
    { id: 'tennis', e: '🎾', n: 'Tennisball', s: 'hand' },
    { id: 'pokal', e: '🏆', n: 'Test-Pokal', s: 'hand' },
    { id: 'kleid', e: '👗', n: 'Glitzerkleid', s: 'body' },
    { id: 'lippe', e: '💄', n: 'Lippenstift', s: 'hand' },
    { id: 'nagel', e: '💅', n: 'Nagellack', s: 'hand' },
    { id: 'tasche', e: '👜', n: 'Handtasche', s: 'hand' },
    { id: 'kopfhoerer', e: '🎧', n: 'Kopfhörer', s: 'head' },
    { id: 'diamant', e: '💎', n: 'Glitzerstein', s: 'neck' },
    { id: 'ring', e: '💍', n: 'Ring', s: 'hand' },
    { id: 'tshirt', e: '👚', n: 'Shirt', s: 'body' },
    { id: 'perlen', e: '📿', n: 'Perlenkette', s: 'neck', k: 'lux' },
    { id: 'heels', e: '👠', n: 'High Heels', s: 'feet', k: 'lux' },
    { id: 'stiefel', e: '👢', n: 'Lederstiefel', s: 'feet', k: 'lux' },
    { id: 'mantel', e: '🧥', n: 'Edler Mantel', s: 'body', k: 'lux' },
    { id: 'boerse', e: '👛', n: 'Designer-Börse', s: 'hand', k: 'lux' },
    { id: 'shopping', e: '🛍️', n: 'Shoppingtüten', s: 'hand', k: 'lux' },
    { id: 'parfum', e: '🧴', n: 'Parfüm', s: 'hand', k: 'lux' },
    { id: 'kimono', e: '👘', n: 'Seidenkimono', s: 'body', k: 'lux' },
    { id: 'konfetti', e: '🎉', n: 'Konfetti', s: 'hand', k: 'party' },
    { id: 'konfettikugel', e: '🎊', n: 'Konfettikugel', s: 'hand', k: 'party' },
    { id: 'maske', e: '🎭', n: 'Party-Maske', s: 'eyes', k: 'party' },
    { id: 'gitarre', e: '🎸', n: 'E-Gitarre', s: 'hand', k: 'party' },
    { id: 'trompete', e: '🎺', n: 'Trompete', s: 'hand', k: 'party' },
    { id: 'glitzer', e: '✨', n: 'Glitzerregen', s: 'head', k: 'party' },
    { id: 'festkleid', e: '🥻', n: 'Festkleid', s: 'body', k: 'party' },
    { id: 'krawatte', e: '👔', n: 'Hemd & Krawatte', s: 'body', k: 'buero' },
    { id: 'koffer', e: '💼', n: 'Aktenkoffer', s: 'hand', k: 'buero' },
    { id: 'lesebrille', e: '👓', n: 'Lesebrille', s: 'eyes', k: 'buero' },
    { id: 'laptop', e: '💻', n: 'Laptop', s: 'hand', k: 'buero' },
    { id: 'kaffee', e: '☕', n: 'Kaffee (für Max: Kakao)', s: 'hand', k: 'buero' },
    { id: 'handy', e: '📱', n: 'Handy', s: 'hand', k: 'buero' },
    { id: 'doktorhut', e: '🎓', n: 'Doktorhut', s: 'head', k: 'buero' },
    { id: 'fueller', e: '🖊️', n: 'Füller', s: 'hand', k: 'buero' },
    { id: 'kamera', e: '📸', n: 'Kamera', s: 'hand', k: 'model' },
    { id: 'blumen', e: '💐', n: 'Blumenstrauß', s: 'hand', k: 'model' },
    { id: 'rose', e: '🌹', n: 'Rose', s: 'hand', k: 'model' },
    { id: 'schmetterling', e: '🦋', n: 'Schmetterling', s: 'head', k: 'model' },
    { id: 'bluete', e: '🌸', n: 'Blüte', s: 'head', k: 'model' },
    { id: 'jeans', e: '👖', n: 'Jeans', s: 'body', k: 'model' },
    { id: 'sneaker', e: '👟', n: 'Sneaker', s: 'feet', k: 'model' },
    { id: 'schirm', e: '☂️', n: 'Regenschirm', s: 'hand', k: 'model' },
    { id: 'boxen', e: '🥊', n: 'Boxhandschuh', s: 'hand', k: 'sport' },
    { id: 'fussball', e: '⚽', n: 'Fußball', s: 'hand', k: 'sport' },
    { id: 'socken', e: '🧦', n: 'Kuschelsocken', s: 'feet', k: 'spass' }
  ];
  // Kategorien zum Filtern beim Anziehen (alte Sachen ohne k bekommen sie hier)
  const STICKER_CATS = [['alle', 'Alles'], ['lux', '💎 Luxus'], ['party', '🎉 Party'], ['buero', '💼 Büro'], ['model', '📸 Model'], ['sport', '⚽ Sport'], ['spass', '😜 Spaß']];
  const OLD_K = { krone: 'lux', tasche: 'lux', diamant: 'lux', ring: 'lux', zylinder: 'party', ballon: 'party', mikro: 'party', stern: 'party', kleid: 'party', kopfhoerer: 'party', brille: 'model', schleife: 'model', sonnenhut: 'model', lippe: 'model', nagel: 'model', skates: 'sport', ballett: 'sport', taucher: 'sport', medaille: 'sport', kappe: 'sport', tennis: 'sport', pokal: 'sport' };
  STICKERS.forEach((x) => { if (!x.k) x.k = OLD_K[x.id] || 'spass'; });

  // Sprach-Clips: Kevin spricht sie ein. Bis dahin liest die Gerätestimme.
  const PROMPTS = {
    'p:hallo': 'Hallo! Schön, dass du da bist!',
    'p:wohin': 'Wohin willst du heute? Eisbahn, Schwimmbad oder beides?',
    'p:eisbahn': 'Ab auf die Eisbahn! Wir rechnen!',
    'p:schwimmbad': 'Ab ins Schwimmbad! Wir lesen!',
    'p:mix': 'Alles gemischt! Los geht’s!',
    'p:anlaut': 'Womit fängt das Wort an?',
    'p:innen': 'Welchen Buchstaben hörst du in dem Wort?',
    'p:klein': 'Finde den kleinen Buchstaben!',
    'p:gross': 'Finde den großen Buchstaben!',
    'p:laut': 'Welcher Buchstabe ist das?',
    'p:silbe': 'Hör genau! Welche Silbe war das?',
    'p:wortbild': 'Lies das Wort. Welches Bild passt?',
    'p:hoeren': 'Hör genau! Welches Wort war das?',
    'p:bauen': 'Bau das Wort aus den Silben!',
    'p:vorlesen': 'Lies es Max laut vor!',
    'p:hoermal': 'Hör mal, so klingt es.',
    'p:ehrlich': 'Hast du es richtig gelesen?',
    'p:quatsch': 'Lies den Satz. Stimmt das, oder ist das Quatsch?',
    'p:luecke': 'Welches Wort fehlt?',
    'p:pfoten': 'Wie viele Pfoten sind das?',
    'p:tippen': 'Rechne aus und tipp das Ergebnis ein!',
    'p:pablo': 'Pablo sagt ein Ergebnis. Stimmt das, oder schummelt er?',
    'p:fehlt': 'Welche Zahl fehlt?',
    'p:geschichte': 'Hör gut zu und rechne!',
    'p:tanz': 'Tanz-Pause! Steh auf!',
    'p:fertig': 'Geschafft! Du warst super!',
    'p:sticker': 'Überraschung! Ein Geschenk für Max!',
    'p:muede': 'Max ist müde. Morgen geht’s weiter!',
    'p:kapitel': 'Ein neues Kapitel wartet auf dich!',
    'p:erwischt': 'Erwischt! Pablo hat geschummelt!',
    'p:reingelegt': 'Oh nein, Pablo hat dich reingelegt!',
    'p:wau': 'Wau! Wau!',
    'p:miau': 'Miau. Ich bin Schmanny. Ich bin nicht beeindruckt.',
    'p:pablohi': 'Ich bin Pablo! Ich bin sooo scharf!'
  };
  // Lob: kurz, abwechslungsreich, eher aufs Tun bezogen als auf „schlau sein“
  // Kevins frei gesprochene Lob-Clips (Anzahl = Aufnahmen)
  const mk = (pre, n, name) => [...Array(n)].map((_, k) => ({ id: `${pre}:${k + 1}`, t: `${name} ${k + 1}` }));
  const PRAISE_CLIPS = mk('lob', 14, 'Lob allgemein');
  const PRAISE_MATH = mk('lobm', 7, 'Lob Rechnen');
  const PRAISE_READ = mk('lobl', 5, 'Lob Lesen');
  const PRAISE_RETRY = mk('lobw', 7, 'Nach Fehler jetzt richtig');
  const PRAISE_STREAK = mk('serie', 4, '5 richtig hintereinander');
  const OOPS_CLIPS = mk('fehl', 6, 'Trost');
  const REWARD_CLIPS = [{ id: 'p:stufe', t: 'Neue Stufe freigeschaltet!' }, { id: 'p:stern', t: 'Ein neuer Stern! Das kannst du jetzt sicher.' }];
  const PRAISE_TEXT = [
    'Richtig! Max wedelt so doll, dass er fast umkippt.',
    'Mega! Du hast genau hingeschaut.',
    'Stark! Schmanny tut so, als wäre sie nicht beeindruckt. Ist sie aber.',
    'Jawoll! Pablo ärgert sich. Du bist zu schlau für ihn.',
    'Richtig! Gut überlegt.',
    'Bäm! Das war schärfer als Kevins Chili.',
    'Super! Max macht einen Freudensprung.',
    'Genau! Du wirst immer sicherer.',
    'Treffer! Max bellt: Wau-wau-wau!',
    'Richtig! Schmanny gähnt vor Neid.'
  ];
  const OOPS_TEXT = [
    'Fast! Schau mal, so geht’s:',
    'Nicht schlimm, Fehler machen schlau. So geht’s:',
    'Hoppla! Pablo kichert. Merk dir das:',
    'Knapp daneben! Schau genau:'
  ];
  const MATH_STORIES = {
    2: { t: '{a} Kinder fahren Schlittschuh. Jedes Kind hat 2 Schlittschuhe. Wie viele Schlittschuhe sind das?', e: '⛸️' },
    3: { t: '{N} dreht {a} Runden auf dem Eis. In jeder Runde macht sie 3 Pirouetten. Wie viele Pirouetten sind das?', e: '💫' },
    4: { t: '{a} Hunde wie Max spielen im Garten. Jeder Hund hat 4 Pfoten. Wie viele Pfoten sind das?', e: '🐾' },
    5: { t: '{a} Hände klatschen zum Tanz. Jede Hand hat 5 Finger. Wie viele Finger sind das?', e: '🖐️' },
    10: { t: 'Pablo hat {a} Tüten. In jeder Tüte sind 10 Chilis. Wie viele Chilis sind das?', e: '🌶️' }
  };
  const CAT_COLORS = {
    bkh: { n: 'Britisch Blau', fur: '#7d8394', dark: '#555a69', light: '#979dad', eye: '#e8962c', ring: '#b8701c', wh: '#e2e5ea', nose: '#5a6070', inner: '#a98e9b', paw: '#878d9e', chestOp: 0.55, muzOp: 0.75, faint: true },
    grau: { n: 'Grau', fur: '#9aa0ab', dark: '#5d636e', light: '#eceef2', eye: '#9ccc4a', wh: '#4a4f58' },
    getigert: { n: 'Rot getigert', fur: '#e39a4b', dark: '#a8642a', light: '#fae6cd', eye: '#8bc34a', wh: '#7a4a20', stripes: true },
    graugetigert: { n: 'Grau getigert', fur: '#a3a7ae', dark: '#5b5f67', light: '#eceef2', eye: '#d8b13a', wh: '#4a4f58', stripes: true },
    schwarz: { n: 'Schwarz', fur: '#2b2b31', dark: '#141417', light: '#3d3d45', eye: '#f2c230', wh: '#cfcfd6' },
    schwarzweiss: { n: 'Schwarz-weiß', fur: '#2b2b31', dark: '#141417', light: '#f6f3ec', eye: '#9ccc4a', wh: '#cfcfd6' },
    weiss: { n: 'Weiß', fur: '#f5f2ea', dark: '#c9c2b3', light: '#ffffff', eye: '#5aa9e6', wh: '#9a9384' },
    braun: { n: 'Braun', fur: '#8a5a3b', dark: '#5a3822', light: '#e8cdb4', eye: '#d8b13a', wh: '#3d2616' }
  };

  // Russisch: nur hören und sprechen. g:true = keine „Это …?“-Frage möglich.
  const RU_WORDS = [
    { ru: 'Привет', de: 'Hallo', e: '👋', c: 'hallo', g: true },
    { ru: 'Пока', de: 'Tschüss', e: '🙋', c: 'hallo', g: true },
    { ru: 'Спасибо', de: 'Danke', e: '🙏', c: 'hallo', g: true },
    { ru: 'Да', de: 'Ja', e: '👍', c: 'hallo', g: true },
    { ru: 'Нет', de: 'Nein', e: '👎', c: 'hallo', g: true },
    { ru: 'Пожалуйста', de: 'Bitte', e: '🎁', c: 'hallo', g: true },
    { ru: 'собака', de: 'Hund', e: '🐕', c: 'tiere' },
    { ru: 'кошка', de: 'Katze', e: '🐈', c: 'tiere' },
    { ru: 'щенок', de: 'Welpe', e: '🐶', c: 'tiere' },
    { ru: 'рыба', de: 'Fisch', e: '🐟', c: 'tiere' },
    { ru: 'птица', de: 'Vogel', e: '🐦', c: 'tiere' },
    { ru: 'лошадь', de: 'Pferd', e: '🐴', c: 'tiere' },
    { ru: 'шоколад', de: 'Schokolade', e: '🍫', c: 'essen' },
    { ru: 'мороженое', de: 'Eis', e: '🍦', c: 'essen' },
    { ru: 'яблоко', de: 'Apfel', e: '🍎', c: 'essen' },
    { ru: 'хлеб', de: 'Brot', e: '🍞', c: 'essen' },
    { ru: 'молоко', de: 'Milch', e: '🥛', c: 'essen' },
    { ru: 'вода', de: 'Wasser', e: '💧', c: 'essen' },
    { ru: 'банан', de: 'Banane', e: '🍌', c: 'essen' },
    { ru: 'сыр', de: 'Käse', e: '🧀', c: 'essen' },
    { ru: 'мама', de: 'Mama', e: '👩', c: 'familie' },
    { ru: 'папа', de: 'Papa', e: '👨', c: 'familie' },
    { ru: 'бабушка', de: 'Oma', e: '👵', c: 'familie' },
    { ru: 'дедушка', de: 'Opa', e: '👴', c: 'familie' },
    { ru: 'брат', de: 'Bruder', e: '👦', c: 'familie' },
    { ru: 'сестра', de: 'Schwester', e: '👧', c: 'familie' },
    { ru: 'мяч', de: 'Ball', e: '🎾', c: 'sachen' },
    { ru: 'дом', de: 'Haus', e: '🏠', c: 'sachen' },
    { ru: 'солнце', de: 'Sonne', e: '☀️', c: 'sachen' },
    { ru: 'снег', de: 'Schnee', e: '❄️', c: 'sachen' },
    { ru: 'книга', de: 'Buch', e: '📖', c: 'sachen' },
    { ru: 'машина', de: 'Auto', e: '🚗', c: 'sachen' },
    { ru: 'красный', de: 'rot', col: '#e53935', c: 'farben' },
    { ru: 'синий', de: 'blau', col: '#1e63d6', c: 'farben' },
    { ru: 'зелёный', de: 'grün', col: '#2e9d4f', c: 'farben' },
    { ru: 'жёлтый', de: 'gelb', col: '#ffd02b', c: 'farben' },
    { ru: 'белый', de: 'weiß', col: '#ffffff', c: 'farben' },
    { ru: 'чёрный', de: 'schwarz', col: '#1b1b1f', c: 'farben' },
    { ru: 'один', de: 'eins', n: 1, c: 'zahlen' },
    { ru: 'два', de: 'zwei', n: 2, c: 'zahlen' },
    { ru: 'три', de: 'drei', n: 3, c: 'zahlen' },
    { ru: 'четыре', de: 'vier', n: 4, c: 'zahlen' },
    { ru: 'пять', de: 'fünf', n: 5, c: 'zahlen' },
    { ru: 'шесть', de: 'sechs', n: 6, c: 'zahlen' },
    { ru: 'семь', de: 'sieben', n: 7, c: 'zahlen' },
    { ru: 'восемь', de: 'acht', n: 8, c: 'zahlen' },
    { ru: 'девять', de: 'neun', n: 9, c: 'zahlen' },
    { ru: 'десять', de: 'zehn', n: 10, c: 'zahlen' },
    { ru: 'рука', de: 'Hand', e: '✋', c: 'koerper' },
    { ru: 'нога', de: 'Bein', e: '🦵', c: 'koerper' },
    { ru: 'глаза', de: 'Augen', e: '👀', c: 'koerper' },
    { ru: 'нос', de: 'Nase', e: '👃', c: 'koerper' },
    { ru: 'ухо', de: 'Ohr', e: '👂', c: 'koerper' },
    { ru: 'рот', de: 'Mund', e: '👄', c: 'koerper' },
    { ru: 'танцевать', de: 'tanzen', e: '💃', c: 'machen', g: true },
    { ru: 'плавать', de: 'schwimmen', e: '🏊', c: 'machen', g: true },
    { ru: 'кататься на коньках', de: 'Schlittschuh laufen', e: '⛸️', c: 'machen', g: true },
    { ru: 'спать', de: 'schlafen', e: '😴', c: 'machen', g: true },
    { ru: 'играть', de: 'spielen', e: '🧸', c: 'machen', g: true }
  ];
  // Kleine Gespräche: Frage hören, laut antworten. {RN} = Name auf Russisch.
  const RU_PHRASES = [
    { q: 'Как тебя зовут?', a: 'Меня зовут {RN}.', dq: 'Wie heißt du?', da: 'Ich heiße {N}.', e: '👋' },
    { q: 'Как дела?', a: 'Хорошо, спасибо!', dq: 'Wie geht’s dir?', da: 'Gut, danke!', e: '🙂' },
    { q: 'Ты любишь шоколад?', a: 'Да, я люблю шоколад!', dq: 'Magst du Schokolade?', da: 'Ja, ich mag Schokolade!', e: '🍫' },
    { q: 'Как зовут твою собаку?', a: 'Мою собаку зовут Макс.', dq: 'Wie heißt dein Hund?', da: 'Mein Hund heißt Max.', e: '🐶' },
    { q: 'Как зовут твою кошку?', a: 'Мою кошку зовут Шманни.', dq: 'Wie heißt deine Katze?', da: 'Meine Katze heißt Schmanny.', e: '🐈' },
    { q: 'Кто это?', a: 'Это Кевин, мой брат.', dq: 'Wer ist das?', da: 'Das ist Kevin, mein Bruder.', e: '👦' },
    { q: 'Где Макс?', a: 'Макс здесь!', dq: 'Wo ist Max?', da: 'Max ist hier!', e: '🐕' },
    { q: 'Что это?', a: 'Это мяч.', dq: 'Was ist das?', da: 'Das ist ein Ball.', e: '🎾' },
    { q: 'Хочешь мороженое?', a: 'Да, хочу!', dq: 'Willst du ein Eis?', da: 'Ja, will ich!', e: '🍦' },
    { q: 'Ты умеешь плавать?', a: 'Да, я умею плавать!', dq: 'Kannst du schwimmen?', da: 'Ja, ich kann schwimmen!', e: '🏊' },
    { q: 'Ты любишь танцевать?', a: 'Да, я люблю танцевать!', dq: 'Tanzt du gern?', da: 'Ja, ich tanze gern!', e: '💃' },
    { q: 'Ты умеешь кататься на коньках?', a: 'Да, умею!', dq: 'Kannst du Schlittschuh laufen?', da: 'Ja, kann ich!', e: '⛸️' },
    { q: 'Ты хочешь спать?', a: 'Нет, я хочу играть!', dq: 'Willst du schlafen?', da: 'Nein, ich will spielen!', e: '😴' },
    { q: 'Спасибо!', a: 'Пожалуйста!', dq: 'Danke!', da: 'Bitte!', e: '🙏' },
    { q: 'Доброе утро!', a: 'Доброе утро!', dq: 'Guten Morgen!', da: 'Guten Morgen!', e: '☀️' },
    { q: 'Спокойной ночи!', a: 'Спокойной ночи!', dq: 'Gute Nacht!', da: 'Gute Nacht!', e: '🌙' }
  ];
  const RU_EXTRA = [
    { id: 'ru:eto', t: 'Это', hint: 'für „Это …?“-Fragen' },
    { id: 'ru:molodez', t: 'Молодец!', hint: 'Lob' }
  ];
  // Neue Anleitungen (eigene Gruppe, damit die alte Liste gleich bleibt)
  const PROMPTS2 = {
    'p:russisch': 'Ab zum Russisch-Reden!',
    'p:ruhoeren': 'Hör zu! Was ist das?',
    'p:rusagen': 'Wie heißt das auf Russisch? Sag es laut!',
    'p:rukontrolle': 'Hör mal, so heißt es. Hast du es richtig gesagt?',
    'p:rujanein': 'Hör gut zu! Stimmt das?',
    'p:runach': 'Hör zu und sprich nach!',
    'p:ruantwort': 'Antworte auf Russisch!',
    'p:test': 'Test-Zeit! Zeig, was du kannst!',
    'p:urkunde': 'Super! Hier ist deine Urkunde!'
  };

  // Neue Sprach-Clips (eigene Gruppe, alte Liste bleibt gleich)
  const PROMPTS3 = {
    'p:zeigen': 'Schau aufs Bild und rechne!',
    'p:blitz': 'Blitz-Aufgabe! Schau genau, gleich ist sie weg!',
    'p:blitzblick': 'Blitzblick! Wie viele Punkte waren das?',
    'p:umkehr': 'Erst die Plus-Aufgabe, dann die Minus-Aufgabe!',
    'p:maxfehler': 'Oje, Max hat sich verrechnet! Was ist richtig?',
    'p:erklaer': 'Erklär Max laut, wie du gerechnet hast!',
    'p:maxdanke': 'Danke! Jetzt hab ich’s verstanden!',
    'p:tipp': 'Hier ist ein Tipp für dich!',
    'p:abschreiben': 'Schreib es mit dem Stift ab!',
    'p:merkschreiben': 'Merk dir das Wort! Gleich ist es weg.',
    'p:vergleich': 'Vergleiche! Ist es gleich? Zeig es auch Mama!',
    'p:blitzwort': 'Blitzlesen! Schau genau hin!',
    'p:post': 'Du hast Post von Kevin!',
    'p:mission': 'Hier ist deine Russisch-Mission!',
    'p:tanzneu': 'Erfinde deinen eigenen Tanz!',
    'p:deintanz': 'Jetzt kommt dein eigener Tanz!',
    'plus': 'plus', 'minus': 'minus'
  };
  // Post von Kevin: Entwürfe, Kevin kann sie ändern lassen und selbst einsprechen. tag = so viele Übungstage nötig.
  const POSTS = [
    { tag: 1, t: 'Hallo {N}, Post von mir! Ich hoffe, dir geht es gerade gut und du übst fleißig. Ich bin stolz auf dich, wie du übst und nicht aufgibst. Egal, ob es falsch ist oder richtig: Ich finde es super, dass du es immer und immer weiter versuchst. Grüß Schmanny und Max von mir und Mama und Andreas. Пока! Paka Schopa Popa!' },
    { tag: 3, t: 'Naaaaaaaa? Ich sehe, du übst super fleißig und kannst schon so viel. Ich freue mich, wenn wir uns wiedersehen. Hoffentlich ist es schon bald. Ich war heute im Kino. Der Film war super. Es hat 16 Jahre gedauert, bis er fertig wurde! Iss nicht so viele Süßigkeiten und tanz ein bisschen mehr. Hehe!' },
    { tag: 6, t: 'Popa! Bonjour, ça va, {N}? Ich habe heute Amogus gesehen. Er hat mir gesagt, du übst klasse. Er spielt auch heimlich auf deinem Tablet, isst dabei Eis und kuschelt mit Max. Aber er löscht immer seinen Spielstand, damit es nicht auffällt. Was für ein Bursche! Ich hoffe, es geht dir gut. Ruf mich an, wenn du Lust hast, dann quatschen wir. Du kannst mich immer anrufen, ich rufe zurück. Hehehehe. Tschau!' }
  ];
  const RU_MISSIONS = [
    { ru: 'Спокойной ночи!', de: 'Sag heute Abend zu Mama: Gute Nacht!' },
    { ru: 'Доброе утро!', de: 'Sag morgen früh zu Mama: Guten Morgen!' },
    { ru: 'Спасибо!', de: 'Sag heute beim Essen auf Russisch: Danke!' },
    { ru: 'Как дела?', de: 'Frag Mama heute: Wie geht’s dir?' },
    { ru: 'Я тебя люблю!', de: 'Sag Mama heute: Ich hab dich lieb!' },
    { ru: 'Где Макс?', de: 'Frag Mama: Wo ist Max?' },
    { ru: 'Хочу мороженое!', de: 'Sag Mama: Ich will ein Eis!' },
    { ru: 'Какой красивый день!', de: 'Sag heute: Was für ein schöner Tag!' }
  ];
  const DANCE_A = ['Glitzer', 'Pablo', 'Max', 'Schmanny', 'Eis', 'Disco', 'Chili', 'Wackel', 'Super', 'Blitz'];
  const DANCE_B = ['Hüpfer', 'Dreher', 'Wackler', 'Sprung', 'Schritt', 'Tanz', 'Pirouette', 'Zappler'];
  const PM_STORIES = {
    '+': ['{N} hat {a} Glitzersteine. Sie bekommt {b} dazu. Wie viele hat sie jetzt?', '{a} Kinder fahren Schlittschuh. Dann kommen {b} dazu. Wie viele sind es jetzt?', 'Max hat {a} Bälle. Kevin schenkt ihm noch {b}. Wie viele Bälle hat Max jetzt?'],
    '−': ['{N} hat {a} Glitzersteine. Sie klebt {b} auf ihr Kleid. Wie viele hat sie noch?', 'Im Schwimmbad sind {a} Enten. {b} schwimmen weg. Wie viele sind noch da?', 'Pablo hat {a} Chilis. Er isst {b} davon. Wie viele hat er noch?']
  };
  const TRICKS = {
    kraft5: { n: 'Kraft der 5', d: 'Denk an deine Hand: 5 Finger und noch ein paar. 5 + 3 = 8.' },
    groesser: { n: 'Groß zuerst', d: 'Fang bei der größeren Zahl an: 2 + 7 rechnest du als 7 + 2.' },
    doppel: { n: 'Verdoppeln', d: 'Gleiche Zahlen kennst du schnell: 6 + 6 = 12. Und 6 + 7 ist dann eins mehr: 13.' },
    bis10: { n: 'Erst bis zur 10', d: '8 + 5: Erst 8 + 2 = 10, dann noch 3 dazu = 13.' },
    zurueck10: { n: 'Erst zurück zur 10', d: '13 − 5: Erst 13 − 3 = 10, dann noch 2 weg = 8.' },
    umkehr: { n: 'Minus ist Plus rückwärts', d: '9 − 4 = ? Frag dich: 4 + wie viel = 9? Genau, 5!' },
    einer: { n: 'Nur die Einer', d: '17 − 4: Die 10 bleibt. Rechne nur 7 − 4 = 3. Also 13.' },
    zehner: { n: 'Zehner sind wie Einer', d: '30 + 40 ist wie 3 + 4, nur mit Zehnern: 70.' },
    vollzehner: { n: 'Zum vollen Zehner', d: '38 + 5: Erst bis 40 (plus 2), dann noch 3 dazu = 43.' },
    tausch: { n: 'Tausch-Trick', d: '3 · 7 ist dasselbe wie 7 · 3. Du musst nur die Hälfte lernen!' },
    bett: { n: 'Bett-Trick für b und d', d: 'Mach zwei Fäuste, Daumen hoch: Links ist ein b, rechts ein d. Zusammen sieht es aus wie ein Bett.' },
    langsam: { n: 'Langsam sprechen', d: 'Sprich das Wort ganz langsam, zum Beispiel Mmmaaauuus. Was hörst du zuerst?' }
  };

  return {
    PROMPTS3, POSTS, RU_MISSIONS, DANCE_A, DANCE_B, PM_STORIES, TRICKS,
    RU_WORDS, RU_PHRASES, RU_EXTRA, PROMPTS2,
    LETTERS, WORDS, SENTENCES, STORY, DANCES, STICKERS, STICKER_CATS, PROMPTS, PRAISE_CLIPS, OOPS_CLIPS, PRAISE_MATH, PRAISE_READ, PRAISE_RETRY, PRAISE_STREAK, REWARD_CLIPS,
    PRAISE_TEXT, OOPS_TEXT, MATH_STORIES, CAT_COLORS,
    REIHEN: [2, 10, 5, 1, 4, 3, 6, 9, 8, 7],
    FACT_ORDER: [1, 2, 10, 5, 3, 4, 6, 9, 8, 7],
    CONSONANTS: ['M', 'L', 'S', 'R', 'N', 'T', 'H', 'F', 'D', 'W', 'B', 'K', 'P', 'G', 'Z'],
    VOWELS: ['A', 'E', 'I', 'O', 'U']
  };
})();

// ---------- Stoff 2. Klasse (Deutsch + Mathe) ----------
(function () {
  const NOUNS = [
    ['der', 'Hund', 'Hunde', '🐕'], ['die', 'Katze', 'Katzen', '🐈'], ['das', 'Haus', 'Häuser', '🏠'], ['der', 'Ball', 'Bälle', '⚽'],
    ['die', 'Maus', 'Mäuse', '🐭'], ['das', 'Buch', 'Bücher', '📖'], ['der', 'Baum', 'Bäume', '🌳'], ['die', 'Blume', 'Blumen', '🌸'],
    ['das', 'Auto', 'Autos', '🚗'], ['der', 'Fisch', 'Fische', '🐟'], ['das', 'Ei', 'Eier', '🥚'], ['der', 'Apfel', 'Äpfel', '🍎'],
    ['die', 'Banane', 'Bananen', '🍌'], ['das', 'Kind', 'Kinder', '🧒'], ['der', 'Stern', 'Sterne', '⭐'], ['die', 'Tasche', 'Taschen', '👜'],
    ['das', 'Kleid', 'Kleider', '👗'], ['der', 'Schuh', 'Schuhe', '👟'], ['die', 'Hose', 'Hosen', '👖'], ['das', 'Pferd', 'Pferde', '🐴'],
    ['der', 'Vogel', 'Vögel', '🐦'], ['die', 'Ente', 'Enten', '🦆'], ['das', 'Schaf', 'Schafe', '🐑'], ['der', 'Hut', 'Hüte', '🎩'],
    ['die', 'Uhr', 'Uhren', '⏰'], ['das', 'Bett', 'Betten', '🛏️'], ['der', 'Zahn', 'Zähne', '🦷'], ['die', 'Tomate', 'Tomaten', '🍅'],
    ['das', 'Glas', 'Gläser', '🥛'], ['der', 'Mond', 'Monde', '🌙'], ['die', 'Kerze', 'Kerzen', '🕯️'], ['das', 'Lied', 'Lieder', '🎵'],
    ['der', 'Stift', 'Stifte', '✏️'], ['die', 'Nase', 'Nasen', '👃'], ['der', 'Kuchen', 'Kuchen', '🍰'], ['die', 'Schule', 'Schulen', '🏫']
  ].map(([a, s, p, e]) => ({ a, s, p, e }));
  const VERBS = ['laufen', 'tanzen', 'schwimmen', 'lesen', 'schreiben', 'singen', 'springen', 'essen', 'schlafen', 'malen', 'rechnen', 'spielen', 'lachen', 'bellen', 'fliegen'];
  const ADJS = ['groß', 'klein', 'rot', 'schnell', 'langsam', 'kalt', 'heiß', 'lustig', 'müde', 'süß', 'scharf', 'laut', 'leise', 'nass', 'weich'];
  const RHYMES = [['Maus', 'Haus'], ['Hand', 'Sand'], ['Katze', 'Tatze'], ['Hose', 'Rose'], ['Tisch', 'Fisch'], ['Mund', 'Hund'], ['Nase', 'Hase'], ['Baum', 'Traum'], ['Schnee', 'See'], ['Ziege', 'Fliege'], ['Bein', 'Schwein'], ['Kuchen', 'suchen'], ['Wal', 'Schal'], ['Tanz', 'Schwanz'], ['Bär', 'Meer'], ['Kanne', 'Wanne']];
  const PUNCT = [['Max bellt ganz laut', '.'], ['Wo ist Schmanny', '?'], ['Pass auf, Pablo', '!'], ['Diana tanzt gern', '.'], ['Magst du Schoki', '?'], ['Hilfe, das ist scharf', '!'], ['Kevin hat eine Dose', '.'], ['Wie spät ist es', '?'], ['Komm schnell her', '!'], ['Das Eis ist kalt', '.'], ['Wer hat geschummelt', '?'], ['Hurra, wir haben Ferien', '!'], ['Schmanny schläft auf dem Sofa', '.'], ['Kannst du schwimmen', '?'], ['Stopp, nicht bewegen', '!']];
  const SACH = [
    ['+', 'Max hat {a} Bälle. Er findet {b} dazu. Wie viele Bälle hat Max jetzt?'],
    ['−', 'Diana hat {a} Sticker. Sie schenkt Kevin {b}. Wie viele Sticker hat sie noch?'],
    ['+', 'Auf dem Eis sind {a} Kinder. Dann kommen {b} Kinder dazu. Wie viele Kinder sind jetzt auf dem Eis?'],
    ['−', 'Im Schwimmbad sind {a} Enten. {b} Enten fliegen weg. Wie viele Enten bleiben?'],
    ['+', 'Schmanny schläft {a} Stunden am Morgen und {b} Stunden am Abend. Wie viele Stunden schläft sie?'],
    ['−', 'Pablo hat {a} Chilis. Er isst {b}. Wie viele Chilis hat er noch?'],
    ['+', 'Diana tanzt {a} Minuten. Dann tanzt sie noch {b} Minuten. Wie lange tanzt sie?'],
    ['−', 'Kevin hat {a} Euro. Er kauft ein Eis für {b} Euro. Wie viel Geld hat er noch?']
  ];
  Object.assign(window.APPDATA, {
    NOUNS, VERBS, ADJS, RHYMES, PUNCT, SACH,
    PROMPTS4: {
      'p2:form': 'Wie heißt diese Form?', 'p2:vgl': 'Größer, kleiner oder gleich?', 'p2:dop': 'Verdopple die Zahl!', 'p2:hal': 'Halbiere die Zahl!',
      'p2:uhr': 'Wie spät ist es?', 'p2:len': 'Wie lang ist der Stift?', 'p2:sach': 'Lies die Aufgabe und rechne!', 'p2:geld': 'Wie viel Geld ist das?',
      'p2:vor': 'Welche Zahl kommt davor?', 'p2:nach': 'Welche Zahl kommt danach?', 'p2:zs': 'Welche Zahl zeigt der Pfeil?', 'p2:hz': 'Welche Zahl ist das? Zehner und Einer!',
      'p2:art': 'Der, die oder das?', 'p2:mz': 'Was ist die Mehrzahl?', 'p2:wa': 'Welche Wortart ist das?', 'p2:gk': 'Schreibt man das Wort groß oder klein?',
      'p2:abc': 'Welcher Buchstabe kommt danach?', 'p2:sz': 'Wie viele Silben hat das Wort? Klatsch mit!', 'p2:reim': 'Was reimt sich?', 'p2:zz': 'Welches Satzzeichen fehlt?',
      'p2:dik': 'Hör gut zu und bau das Wort!', 'p2:diks': 'Hör gut zu und schreib das Wort mit dem Stift!'
    }
  });
  window.APPDATA.TRICKS.malgeteilt = { n: 'Geteilt ist Mal rückwärts', d: 'Frag dich: Wie oft passt die Zahl hinein? Denk an die Mal-Aufgabe.' };
  window.APPDATA.TRICKS.krokodil = { n: 'Das Krokodil', d: 'Das Krokodil > hat Hunger und frisst immer die größere Zahl. Sein Maul zeigt zur großen Zahl.' };
  window.APPDATA.TRICKS.nomen = { n: 'Namenwörter groß', d: 'Kannst du der, die oder das davor sagen? Dann ist es ein Namenwort und wird groß geschrieben.' };
})();

// ---------- Lese-Training: häufigste Wörter + Wiederhol-Texte ----------
(function () {
  const HFW = ['und', 'die', 'der', 'das', 'ist', 'ein', 'eine', 'ich', 'du', 'er', 'sie', 'es', 'wir', 'ihr', 'in', 'im', 'an', 'am', 'auf', 'mit', 'zu', 'von', 'für', 'aus', 'bei', 'nach', 'nicht', 'auch', 'so', 'da', 'hier', 'wo', 'wie', 'was', 'wer', 'ja', 'nein', 'mein', 'dein', 'kann', 'will', 'hat', 'sind', 'war', 'hab', 'gibt', 'geht', 'kommt', 'macht', 'sagt', 'mag', 'gut', 'groß', 'klein', 'viel', 'alle', 'dann', 'jetzt', 'heute', 'schon', 'noch', 'nur', 'oder', 'aber', 'weil', 'wenn', 'immer', 'wieder', 'sehr', 'gern', 'mal', 'den', 'dem', 'des', 'einen', 'mich', 'dich', 'sich', 'uns', 'zum', 'zur', 'vor', 'unter', 'über', 'um', 'bis', 'ohne', 'ganz', 'neu', 'alt', 'Mama', 'Papa', 'Kind', 'Haus', 'Tag', 'Zeit', 'lacht', 'spielt', 'sieht', 'ruft'];
  const LTEXTS = [
    { n: 'Max im Schnee', t: 'Max rennt in den Schnee. Er bellt laut. Der Schnee ist kalt. Max hat ei-ne wei-ße Na-se. Di-a-na lacht. Dann rennt Max wie-der ins Haus.', q: 'Was hat Max im Schnee?', a: 'Eine weiße Nase', w: ['Einen roten Hut', 'Eine Chili'] },
    { n: 'Schmanny schläft', t: 'Schman-ny liegt auf dem So-fa. Sie schläft und schnurrt. Max will spie-len. A-ber Schman-ny macht nur ein Au-ge auf. Dann schläft sie wei-ter.', q: 'Wo liegt Schmanny?', a: 'Auf dem Sofa', w: ['Im Bett', 'Im Garten'] },
    { n: 'Pablo und die Chili', t: 'Pa-blo fin-det ei-ne ro-te Chi-li. Er beißt hi-nein. Oh nein! Die Chi-li ist sehr scharf. Pa-blo wird ganz rot. Er trinkt ein Glas Milch.', q: 'Was trinkt Pablo?', a: 'Milch', w: ['Saft', 'Wasser'] },
    { n: 'Auf dem Eis', t: 'Di-a-na geht auf die Eis-bahn. Sie dreht sich im Kreis. Ein-mal fällt sie hin. Das ist nicht schlimm. Sie steht auf und fährt wei-ter.', q: 'Was macht Diana, als sie hinfällt?', a: 'Sie steht auf', w: ['Sie weint', 'Sie geht nach Hause'] },
    { n: 'Der neue Tanz', t: 'Di-a-na hat ei-nen neu-en Tanz. Sie dreht sich und springt. Max tanzt mit. Er wa-ckelt mit dem Po. Al-le la-chen laut.', q: 'Wer tanzt mit?', a: 'Max', w: ['Schmanny', 'Pablo'] },
    { n: 'Im Schwimmbad', t: 'Im Schwimm-bad ist das Was-ser warm. Di-a-na springt hi-nein. Platsch! Sie taucht bis zum Bo-den. Dann schwimmt sie schnell zum Rand.', q: 'Wie ist das Wasser?', a: 'Warm', w: ['Kalt', 'Grün'] },
    { n: 'Kevin und die Dose', t: 'Ke-vin hat ei-ne Do-se. Was ist da drin? Di-a-na macht sie auf. In der Do-se ist ei-ne Chi-li. Ke-vin lacht. Di-a-na lacht auch.', q: 'Was ist in der Dose?', a: 'Eine Chili', w: ['Ein Ball', 'Schoki'] },
    { n: 'Max und der Ball', t: 'Max hat ei-nen gel-ben Ball. Di-a-na wirft den Ball weit weg. Max rennt los. Er bringt den Ball zu-rück. Er will noch mal!', q: 'Welche Farbe hat der Ball?', a: 'Gelb', w: ['Rot', 'Blau'] },
    { n: 'Schoki', t: 'Di-a-na mag Scho-ki. Ma-ma gibt ihr ein Stück. Max will auch ein Stück. A-ber Scho-ki ist nicht gut für Hun-de. Max be-kommt ei-nen Keks.', q: 'Was bekommt Max?', a: 'Einen Keks', w: ['Schoki', 'Eine Wurst'] },
    { n: 'Make-up', t: 'Di-a-na malt sich die Lip-pen rot. Sie hat ein Glit-zer-kleid an. Schman-ny sieht zu. Di-a-na malt auch Schman-ny an. Schman-ny läuft weg.', q: 'Was macht Schmanny?', a: 'Sie läuft weg', w: ['Sie tanzt', 'Sie schläft'] },
    { n: 'Pablo ist weg', t: 'Wo ist Pa-blo? Di-a-na sucht im Bett. Sie sucht un-ter dem Tisch. Da ist er! Pa-blo sitzt im Schrank und isst Kek-se.', q: 'Wo sitzt Pablo?', a: 'Im Schrank', w: ['Im Bett', 'Unter dem Tisch'] },
    { n: 'Musik', t: 'Di-a-na macht Mu-sik an. Die Mu-sik ist laut. Max heult mit. Schman-ny hält sich die Oh-ren zu. Di-a-na tanzt und singt.', q: 'Was macht Max?', a: 'Er heult mit', w: ['Er schläft', 'Er isst'] }
  ];
  // Lesetext-Stufen: 1 = kurz (~25 Wörter), 2 = ~45, 3 = ~65 mit wörtlicher Rede und Warum-Fragen, 4 = ~90 ohne Silbenbögen.
  // Bindestriche = Silbenbögen (werden beim Vorlesen entfernt). Clip-IDs: Stufe 1 'lt:i', sonst 'lt<Stufe>:i'.
  const LTEXTS2 = [
    { n: 'Max beim Tierarzt', t: 'Max muss heu-te zum Tier-arzt. Er hat Angst und zit-tert. Di-a-na sitzt ne-ben ihm und strei-chelt sei-nen Kopf. Die Ärz-tin ist sehr nett. Sie schaut in sei-ne Oh-ren und auf die Pfo-ten. Max ist ge-sund! Zur Be-loh-nung be-kommt er ei-nen Hun-de-keks.', q: 'Was bekommt Max zur Belohnung?', a: 'Einen Hundekeks', w: ['Eine Wurst', 'Einen Ball'] },
    { n: 'Der Schneemann', t: 'Heu-te hat es viel ge-schneit. Di-a-na und Ke-vin bau-en ei-nen Schnee-mann. Er be-kommt ei-ne Mö-hre als Na-se und zwei Stei-ne als Au-gen. Max springt um den Schnee-mann he-rum und bellt. Dann klaut er die Mö-hre und rennt weg!', q: 'Wer klaut die Möhre?', a: 'Max', w: ['Schmanny', 'Kevin'] },
    { n: 'Schmanny und der Vogel', t: 'Schman-ny sitzt am Fens-ter. Drau-ßen auf dem Baum sitzt ein klei-ner Vo-gel. Schman-ny macht ganz gro-ße Au-gen. Ihr Schwanz zuckt hin und her. Doch das Fens-ter ist zu. Der Vo-gel singt ein Lied und fliegt weg.', q: 'Warum fängt Schmanny den Vogel nicht?', a: 'Das Fenster ist zu', w: ['Sie schläft', 'Der Vogel ist zu groß'] },
    { n: 'Die Eisprinzessin', t: 'Di-a-na zieht ihr Glit-zer-kleid an. Heu-te gibt es ei-ne Show auf der Eis-bahn. Sie fährt ei-nen gro-ßen Kreis. Dann springt sie hoch und dreht sich in der Luft. Al-le Leu-te klat-schen. Ma-ma ist sehr stolz auf sie.', q: 'Was macht Diana in der Luft?', a: 'Sie dreht sich', w: ['Sie singt', 'Sie winkt'] },
    { n: 'Pablo backt', t: 'Pa-blo will ei-nen Ku-chen ba-cken. Er nimmt Mehl, Ei-er, Zu-cker und But-ter. Dann hat er ei-ne I-dee: Chi-li kommt auch hi-nein! Der Ku-chen sieht le-cker aus. A-ber kei-ner will ihn es-sen. Nur Pa-blo isst ihn ganz al-lein.', q: 'Was tut Pablo noch in den Kuchen?', a: 'Chili', w: ['Schoki', 'Äpfel'] },
    { n: 'Regentag', t: 'Drau-ßen reg-net es schon den gan-zen Tag. Max will nicht raus. Er legt sich un-ter den Tisch. Di-a-na malt ein Bild von Max und Schman-ny. Dann macht sie Mu-sik an und tanzt durch das Zim-mer. Am A-bend scheint die Son-ne wie-der.', q: 'Wo liegt Max?', a: 'Unter dem Tisch', w: ['Auf dem Sofa', 'Im Garten'] },
    { n: 'Der rote Schuh', t: 'Di-a-na fin-det ih-ren ro-ten Schuh nicht. Sie sucht im Flur und im Bad. Ma-ma sucht in der Kü-che. Dann hö-ren sie ein lei-ses Knur-ren. Max liegt in sei-nem Korb. Er hat den Schuh im Maul und kaut da-rauf he-rum.', q: 'Wer hat den Schuh?', a: 'Max', w: ['Mama', 'Schmanny'] },
    { n: 'Kevin ruft an', t: 'Das Te-le-fon klin-gelt. Es ist Ke-vin! Er wohnt in Ham-burg. Di-a-na er-zählt ihm von der Schu-le. Ke-vin er-zählt von sei-ner Ar-beit. Dann sa-gen sie zu-sam-men: Pa-ka, Scho-pa, Po-pa! Bei-de la-chen laut.', q: 'Wo wohnt Kevin?', a: 'In Hamburg', w: ['In Berlin', 'In Paris'] },
    { n: 'Badetag für Max', t: 'Max war im Matsch und ist ganz schmut-zig. Di-a-na stellt ihn in die Wan-ne. Max mag kein Was-ser. Er schüt-telt sich, und al-les wird nass. Jetzt ist Di-a-na nass und Max ist sau-ber. Schman-ny sitzt oben auf dem Re-gal und bleibt schön tro-cken.', q: 'Warum wird Diana nass?', a: 'Max schüttelt sich', w: ['Es regnet', 'Sie springt ins Wasser'] },
    { n: 'Der Wackelzahn', t: 'Di-a-nas Zahn wa-ckelt schon seit Ta-gen. Sie beißt in ei-nen Ap-fel. Knack! Der Zahn ist raus. Di-a-na legt ihn un-ter ihr Kis-sen. Am Mor-gen liegt da ein klei-ner Glit-zer-stein. Wer war das wohl?', q: 'Wohin legt Diana den Zahn?', a: 'Unter ihr Kissen', w: ['In den Schrank', 'In die Dose'] }
  ];
  const LTEXTS3 = [
    { n: 'Das Geschenk', t: 'Mor-gen hat Ma-ma Ge-burts-tag. Di-a-na will ihr et-was schen-ken, a-ber sie hat kein Geld. Da hat sie ei-ne I-dee. Sie malt ein gro-ßes Bild mit Ma-ma, An-dre-as, Max und Schman-ny. Da-rü-ber schreibt sie: Ich hab dich lieb! Am nächs-ten Mor-gen gibt sie Ma-ma das Bild. Ma-ma hat Trä-nen in den Au-gen. „Das ist das schöns-te Ge-schenk“, sagt sie.', q: 'Warum hat Mama Tränen in den Augen?', a: 'Sie freut sich sehr', w: ['Sie ist traurig', 'Sie hat Schnupfen'] },
    { n: 'Max ist weg', t: 'Die Gar-ten-tür steht of-fen. Wo ist Max? Di-a-na ruft: „Max! Max, komm her!“ A-ber Max kommt nicht. Sie sucht hin-ter dem Haus und am Zaun. Dann holt sie die Do-se mit den Le-cker-lis. Sie schüt-telt die Do-se ganz laut. Ra-schel, ra-schel! Da kommt Max aus der He-cke ge-rannt. Er ist vol-ler Blät-ter und wa-ckelt mit dem Schwanz.', q: 'Warum kommt Max am Ende?', a: 'Er hört die Leckerli-Dose', w: ['Er hat Angst', 'Mama ruft ihn'] },
    { n: 'Schwimmtag', t: 'In der Schu-le ist heu-te Schwimm-tag. Al-le Kin-der ste-hen am Be-cken-rand. Di-a-na ist ein biss-chen auf-ge-regt. Dann pfeift der Leh-rer. Platsch! Di-a-na springt ins Was-ser und schwimmt los. Sie ist nicht die Schnells-te, a-ber sie gibt nicht auf. Am En-de be-kommt sie ei-ne Ur-kun-de. Sie hält sie ganz stolz hoch.', q: 'Was bekommt Diana am Ende?', a: 'Eine Urkunde', w: ['Ein Eis', 'Einen Pokal'] },
    { n: 'Pablos Geheimnis', t: 'Pa-blo hat ein Ge-heim-nis. Je-de Nacht, wenn al-le schla-fen, schleicht er in die Kü-che. Dort öff-net er lei-se den Kühl-schrank. Er sucht nicht nach Kä-se o-der Wurst. Er sucht nach Chi-lis! Ei-nes Nachts geht das Licht an. Ma-ma steht in der Tür und schaut ihn an. Pa-blo hat ei-ne Chi-li im Mund und wird knall-rot.', q: 'Warum geht Pablo nachts in die Küche?', a: 'Er sucht Chilis', w: ['Er hat Durst', 'Er will Käse'] },
    { n: 'Das Konzert', t: 'Di-a-na und ih-re Freun-din wol-len ein Kon-zert ge-ben. Sie stel-len Stüh-le ins Wohn-zim-mer. Ma-ma, An-dre-as und Max sind die Zu-schau-er. Schman-ny will nicht zu-hö-ren und geht in den Flur. Die Mäd-chen sin-gen zwei Lie-der und tan-zen da-zu. Beim drit-ten Lied heult Max laut mit. Da müs-sen al-le so la-chen, dass das Kon-zert vor-bei ist.', q: 'Warum ist das Konzert vorbei?', a: 'Alle lachen über Max', w: ['Der Strom ist weg', 'Mama geht schlafen'] },
    { n: 'Ein Brief von Kevin', t: 'Im Brief-kas-ten liegt ein Brief. Auf dem Um-schlag steht: Für Di-a-na. Den hat Ke-vin ge-schickt! Di-a-na öff-net ihn ganz vor-sich-tig. In dem Brief ist ein Bild von ei-nem Hund mit Son-nen-bril-le. Da-run-ter steht: So sieht Max im Som-mer aus. Di-a-na muss la-chen. Sie hängt das Bild an ih-re Tür.', q: 'Was ist auf dem Bild?', a: 'Ein Hund mit Sonnenbrille', w: ['Eine Katze mit Hut', 'Ein Schneemann'] },
    { n: 'Schmanny im Schrank', t: 'Ma-ma legt die fri-schen Hand-tü-cher in den Schrank. Dann ruft sie: „Wo ist ei-gent-lich Schman-ny?“ Al-le su-chen die Kat-ze. Sie ist nicht auf dem So-fa und nicht im Bett. Nach ei-ner Stun-de hört Di-a-na ein lei-ses Mi-au. Es kommt aus dem Schrank! Schman-ny liegt zwi-schen den war-men Hand-tü-chern und schläft.', q: 'Warum liegt Schmanny im Schrank?', a: 'Die Handtücher sind warm', w: ['Sie hat Angst vor Max', 'Sie sucht Futter'] },
    { n: 'Rückwärts fahren', t: 'Rück-wärts fah-ren ist schwer. Di-a-na übt es die gan-ze Wo-che auf der Eis-bahn. Am Mon-tag fällt sie drei-mal hin. Am Mitt-woch fällt sie nur noch ein-mal hin. Am Frei-tag fährt sie ei-ne gan-ze Run-de rück-wärts, oh-ne hin-zu-fal-len! Der Trai-ner klatscht in die Hän-de. „Siehst du“, sagt er, „Ü-ben hilft!“', q: 'Wann schafft Diana eine ganze Runde?', a: 'Am Freitag', w: ['Am Montag', 'Am Mittwoch'] },
    { n: 'Das Wettrennen', t: 'Max und Schman-ny ma-chen ein Wett-ren-nen. Max ist schnell, a-ber er rennt nicht ge-ra-de-aus. Er schnüf-felt an je-dem Baum und je-dem Stein. Schman-ny läuft lang-sam, a-ber im-mer wei-ter. Am En-de ist Schman-ny zu-erst am Ziel. Max kommt viel spä-ter an. Er hat ei-nen Stock im Maul und ist trotz-dem glück-lich.', q: 'Warum gewinnt Schmanny?', a: 'Sie läuft immer weiter', w: ['Sie ist schneller als Max', 'Max schläft ein'] },
    { n: 'Zug nach Hamburg', t: 'Di-a-na fährt mit dem Zug nach Ham-burg. Sie be-sucht Ke-vin. Der Zug fährt sehr schnell. Durch das Fens-ter sieht sie Kü-he, Wäl-der und klei-ne Dör-fer. Nach ei-ner Stun-de ist sie da. Ke-vin war-tet schon am Bahn-steig. Er hält ein Schild in der Hand. Da-rauf steht: Herz-lich will-kom-men, Po-pa!', q: 'Wo wartet Kevin?', a: 'Am Bahnsteig', w: ['Zu Hause', 'Im Kino'] }
  ];
  const LTEXTS4 = [
    { n: 'Schneefrei', t: 'In der Nacht hat es so viel geschneit, dass die Schule ausfällt. Diana jubelt und zieht sofort ihre dicke Jacke an. Draußen ist alles weiß und ganz still. Max springt in den hohen Schnee und versinkt bis zum Bauch. Nur sein Kopf schaut noch heraus. Diana muss so lachen, dass sie selbst in den Schnee fällt. Zusammen bauen sie eine Höhle aus Schnee. Schmanny bleibt lieber drinnen am warmen Ofen. Am Nachmittag gibt es heißen Kakao. Das war der beste Tag im ganzen Winter.', q: 'Warum hat Diana keine Schule?', a: 'Es hat zu viel geschneit', w: ['Es sind Ferien', 'Sie ist krank'] },
    { n: 'Pablo im Supermarkt', t: 'Mama geht einkaufen und nimmt Diana mit. Pablo darf auch mit, aber nur, wenn er sich benimmt. Im Supermarkt ist es voll. Mama sucht Milch, Brot und Äpfel. Diana schiebt den Wagen. Plötzlich ist Pablo verschwunden. Sie finden ihn beim Gemüse. Er steht vor einem großen Berg mit roten Chilis und hat schon drei Stück in seinen Taschen versteckt. „Pablo!“, ruft Mama streng. Pablo legt zwei Chilis zurück. Die dritte darf er behalten, weil er ehrlich war.', q: 'Warum darf Pablo eine Chili behalten?', a: 'Weil er ehrlich war', w: ['Weil sie billig ist', 'Weil Mama Chili mag'] },
    { n: 'Die Aufführung', t: 'Seit Wochen übt Diana mit ihrer Tanzgruppe für die große Aufführung. Heute ist es endlich so weit. Hinter der Bühne ist sie sehr aufgeregt. Ihr Bauch kribbelt, und ihre Hände sind ganz kalt. Dann geht der Vorhang auf. Die Musik beginnt, und plötzlich ist die Angst weg. Diana tanzt jeden Schritt genau so, wie sie ihn geübt hat. Nur einmal dreht sie sich in die falsche Richtung. Niemand merkt es. Am Ende verbeugen sich alle Kinder, und das Publikum klatscht lange.', q: 'Wie fühlt sich Diana hinter der Bühne?', a: 'Aufgeregt', w: ['Müde', 'Wütend'] },
    { n: 'Der Kater vom Nachbarn', t: 'Beim Nachbarn wohnt ein großer, grauer Kater. Er heißt Bruno und sitzt jeden Tag auf dem Zaun. Max findet das gar nicht gut. Sobald er Bruno sieht, bellt er wie verrückt. Bruno gähnt nur und putzt sich die Pfoten. Eines Tages springt Bruno vom Zaun direkt in den Garten. Max rennt sofort hin. Doch dann bleibt er stehen. Bruno faucht ihn an, und Max läuft mit eingezogenem Schwanz zurück zu Diana. Seitdem bellt er etwas leiser.', q: 'Wer hat am Ende Angst?', a: 'Max', w: ['Bruno', 'Diana'] },
    { n: 'Am Meer', t: 'Am Sonntag fahren alle zusammen an die Ostsee. Am Strand weht ein kalter Wind, aber die Sonne scheint. Diana sammelt Muscheln und kleine Steine. Andreas zeigt ihr einen Stein mit einem Loch in der Mitte. „Das ist ein Hühnergott“, sagt er. „Der bringt Glück.“ Max rennt den Möwen hinterher, aber er fängt keine einzige. Zum Mittag gibt es Fischbrötchen. Diana nimmt den Stein mit nach Hause und legt ihn auf ihr Fensterbrett.', q: 'Was ist ein Hühnergott?', a: 'Ein Stein mit Loch', w: ['Ein Vogel', 'Eine Muschel'] },
    { n: 'Die Nacht im Zelt', t: 'Im Sommer darf Diana mit Andreas im Garten zelten. Sie nehmen Schlafsäcke, Taschenlampen und Kekse mit. Als es dunkel wird, hören sie viele Geräusche. Etwas raschelt im Gebüsch. Diana hält die Luft an. Andreas leuchtet mit der Taschenlampe hin. Zwei kleine Augen funkeln. Es ist nur ein Igel, der Käfer sucht. Diana flüstert: „Gute Nacht, Igel.“ Dann kuschelt sie sich in ihren Schlafsack und schläft sofort ein. Max schnarcht vor dem Zelt.', q: 'Was raschelt im Gebüsch?', a: 'Ein Igel', w: ['Max', 'Ein Fuchs'] },
    { n: 'Das Armband', t: 'Diana hat ein Armband aus bunten Perlen. Sie hat es selbst gemacht und trägt es jeden Tag. Nach dem Sport ist es plötzlich weg. Sie sucht in der Turnhalle, in der Umkleide und auf dem Schulhof. Nichts. Zu Hause ist sie traurig und will nicht einmal tanzen. Am nächsten Morgen kommt ihre Freundin zu ihr. Sie hält etwas in der Hand. „Das lag unter der Bank“, sagt sie. Diana fällt ihr um den Hals. Dann macht sie für ihre Freundin auch ein Armband.', q: 'Warum macht Diana ihrer Freundin ein Armband?', a: 'Als Dankeschön', w: ['Weil sie zwei hat', 'Weil Mama es sagt'] },
    { n: 'Leseprofi', t: 'Kevin hat ein Spiel für Diana gebaut. Darin gibt es einen Hund, eine Katze und einen frechen Pablo. Diana kann darin lesen, rechnen und sogar Russisch lernen. Am Anfang findet sie manche Aufgaben langweilig. Doch dann merkt sie etwas: Die Texte werden immer länger, und sie kann sie trotzdem lesen. Früher hat sie für einen kurzen Text eine Minute gebraucht. Heute schafft sie einen langen Text in der gleichen Zeit. Sie schickt Kevin eine Nachricht: „Ich bin jetzt Leseprofi!“', q: 'Was merkt Diana?', a: 'Sie kann lange Texte lesen', w: ['Das Spiel ist kaputt', 'Pablo schummelt'] }
  ];
  const LSTUFEN = [
    { n: 'Stufe 1 · kurz', syl: true, texts: LTEXTS },
    { n: 'Stufe 2 · mittel', syl: true, texts: LTEXTS2 },
    { n: 'Stufe 3 · lang, mit Rede', syl: true, texts: LTEXTS3 },
    { n: 'Stufe 4 · lang, ohne Silbenbögen', syl: false, texts: LTEXTS4 }
  ];
  Object.assign(window.APPDATA, { HFW, LTEXTS, LSTUFEN });
  window.APPDATA.PROMPTS4['p2:hw'] = 'Blitzwort! Welches Wort war das?';
})();

// ---------- Einführung (Kevin erklärt die App) ----------
window.APPDATA.TOUR = [
  { id: 'tour:0', sel: null, t: 'Hallo Diana! Hier ist Kevin. Deine App hat ein Update bekommen. Ich zeige dir kurz, was es alles gibt.' },
  { id: 'tour:1', sel: null, t: 'Mit dieser App wirst du jeden Tag ein bisschen besser im Lesen und Rechnen. Dann wird die Schule viel leichter.' },
  { id: 'tour:2', sel: '#go-lese', t: 'Das ist das Lese-Training. Mach es jeden Tag, das dauert nur fünf Minuten. Das ist das Wichtigste.' },
  { id: 'tour:3', sel: '#go-math', t: 'Auf der Eisbahn rechnest du.' },
  { id: 'tour:4', sel: '#go-read', t: 'Im Schwimmbad liest und schreibst du.' },
  { id: 'tour:5', sel: '#go-ru', t: 'Hier übst du Russisch sprechen und verstehen.' },
  { id: 'tour:6', sel: '#go-mix', t: 'Hier kommt alles gemischt.' },
  { id: 'tour:7', sel: '.days', t: 'Hier siehst du, an welchen Tagen du geübt hast. Jeder Tag bekommt eine Pfote.' },
  { id: 'tour:8', sel: '.scene', t: 'Tipp Max, Schmanny und Pablo an. Die haben dir was zu sagen.' },
  { id: 'tour:9', sel: 'nav.minor', t: 'Hier unten findest du die Geschichte, Sachen zum Anziehen für Max, deinen Weg, Post von mir, deine Tänze und das Trickbuch.' },
  { id: 'tour:10', sel: null, t: 'Wenn eine Aufgabe zu schwer ist, tipp auf die Glühbirne. Dann bekommst du einen Tipp. Und jetzt los, fang mit dem Lese-Training an!' }
];

// ---------- Abwechslung: Begrüßungen beim Öffnen, kurze Starts bei Übungen ----------
window.APPDATA.GREETS = ['Hallo Diana, schön, dass du da bist!', 'Da ist ja meine Lieblingsschwester!', 'Hi Diana! Alle haben schon auf dich gewartet.', 'Na?', 'Diana ist da!', 'Bonjour, ça va?', 'Hü-hü! Schmanny ist sogar wach geworden für dich.', 'Na …', 'Moin moin!', 'Bonjour!', 'Привет, Popa!', 'Alleeee …'].map((t, i) => ({ id: 'gruss:' + (i + 1), t }));
window.APPDATA.STARTS = ['Let’s go!', 'Los geht’s!', 'Auf geht’s!', 'Bereit? Los!', 'Na dann, zeig mal, was du kannst!', 'Und los!', 'Woohoo!'].map((t, i) => ({ id: 'start:' + (i + 1), t }));

// ---------- Erklärungen beim ersten Öffnen (Kevin spricht sie ein: Clip-ID 'erk:<key>') ----------
window.APPDATA.EXPLAIN = {
  lese: { n: '📖 Lese-Training', t: 'Das ist dein Lese-Training. Es hat drei Teile. Erst kommt der Silbenteppich: Lies die Silben laut und tipp jede an, 30 Sekunden lang. Dann kommen Blitzwörter: Ein Wort blitzt kurz auf, und du tippst, welches es war. Zum Schluss liest du einen kleinen Text zweimal laut und beantwortest eine Frage. Wenn du gut liest, werden die Texte länger, und du bekommst einen Stern mehr.' },
  math: { n: '⛸️ Eisbahn', t: 'Willkommen auf der Eisbahn! Hier rechnest du. Tipp auf die richtige Antwort. Wenn du nicht weiterweißt, tipp auf die Glühbirne, dann bekommst du einen Tipp. In der Mitte jeder Runde gibt es eine Tanz-Pause.' },
  read: { n: '🏊 Schwimmbad', t: 'Das ist das Schwimmbad. Hier übst du Buchstaben, Silben, Wörter und Sätze. Manchmal hörst du etwas und tippst es an, manchmal liest du Max laut vor. Sag ehrlich, ob es geklappt hat. So lernst du am meisten.' },
  ru: { n: '🗣️ Russisch', t: 'Hier lernst du Russisch sprechen und verstehen. Hör gut zu und sag die Wörter laut nach. Danach tippst du, ob du es richtig gesagt hast. Schreiben musst du hier nichts.' },
  mix: { n: '🎲 Alles gemischt', t: 'Hier kommt alles gemischt: Lesen, Rechnen und Russisch. Meistens Lesen, weil das gerade am wichtigsten ist.' },
  test: { n: '🏅 Test', t: 'Test-Zeit! Hier zeigst du, was du schon kannst. Es gibt keine Tipps, aber das ist nicht schlimm. Gib einfach dein Bestes. Am Ende siehst du, wie viel du geschafft hast.' },
  story: { n: '📖 Geschichte', t: 'Hier ist deine Geschichte. Lies erst selbst ein Kapitel. Wenn du ein Wort nicht schaffst, tipp es an, dann hörst du es. Danach lese ich dir das Kapitel vor. Neue Kapitel bekommst du, wenn du übst.' },
  album: { n: '🎀 Anziehen', t: 'Hier kannst du Max und Schmanny anziehen. Oben wählst du, wen du anziehst. Mit den Knöpfen suchst du Luxus, Party, Büro oder Model-Sachen aus. Tipp eine Sache an, dann wird sie angezogen. Neue Sachen gibt es als Geschenk nach dem Üben. Und tipp auf Laufsteg, dann macht Max eine Modenschau!' },
  map: { n: '⭐ Mein Weg', t: 'Das ist dein Weg. Hier siehst du, wie weit du schon gekommen bist. Jeder Stern zeigt, was du schon sicher kannst.' },
  post: { n: '📮 Post', t: 'Hier bekommst du Post von mir! Wenn du ein paar Tage geübt hast, kommt ein neuer Brief. Tipp auf den Brief, dann kannst du ihn lesen, oder ich lese ihn dir vor.' },
  dances: { n: '💃 Meine Tänze', t: 'Das ist dein Tanzbuch. Hier erfindest du eigene Tänze. Deine Tänze kommen dann in der Tanz-Pause dran, und du tanzt sie!' },
  newdance: { n: '✏️ Tanz malen', t: 'Jetzt malst du deinen Tanz. Mal mit dem Finger, wie du dich bewegst. Unten kannst du Sachen ins Bild holen: einen Hula-Hoop-Reifen, Hanteln, eine Disco-Box, oder Max, Schmanny und Pablo. Schieb sie mit dem Finger dahin, wo du willst. Dann such einen lustigen Namen aus und speichere den Tanz.' },
  tricks: { n: '💡 Trickbuch', t: 'Das ist das Trickbuch. Hier stehen Tricks, die dir beim Rechnen und Lesen helfen. Wenn du mal nicht weiterweißt, schau hier rein.' }
};
