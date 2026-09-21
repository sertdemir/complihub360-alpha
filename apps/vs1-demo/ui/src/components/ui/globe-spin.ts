import { RING_LAENGEN, KOORDINATEN } from './globe-paths';

// ─── Die Erde dreht sich ─────────────────────────────────────────────────────
// Sphaerische Projektion der Kuestenlinien auf die Bildmarke. Keine Bildfolge,
// kein Rasterbild: der Pfad wird je Bild neu gerechnet, bleibt damit Vektor,
// laesst sich ueber die Tones umfaerben und laeuft in jedem Tempo.
//
// Warum das billig ist: y und cos(Breite) haengen nicht am Drehwinkel, die
// stehen fest. Und sin(lon+d) = sin·cos d + cos·sin d haelt die innere
// Schleife frei von Trigonometrie. Gemessen rund 0,3 ms je Bild fuer 1620
// Punkte — bei 20 Bildern je Sekunde also unter einem Prozent einer CPU.

/** Mitte und Radius des Globus im Koordinatensystem der Bildmarke (40,594 × 40,018). */
const CX = 21.696;
const CY = 20.396;
const R = 11.75;

/** Ruhelage: 30° West, der Atlantik mittig — die Ansicht der bisherigen Marke. */
export const RUHE_LAENGE = -30;

/** Eine volle Umdrehung (Nutzer-Festlegung 2026-09-21). */
export const UMLAUF_SEKUNDEN = 25;

/** 20 reichen fuer diese Langsamkeit; mehr kostet nur Rechenzeit. */
const BILDER_JE_SEKUNDE = 20;

/** Laengste Strecke, die als Gerade gezeichnet werden darf. */
const FEINHEIT = (4 * Math.PI) / 180;

const GRAD = Math.PI / 180;

// Vorberechnung: je Punkt sin/cos der Laenge sowie sin/cos der Breite.
const N = KOORDINATEN.length / 2;
const sinLat = new Float32Array(N);
const cosLat = new Float32Array(N);
/** Laengenbereich je Ring, um unsichtbare Ringe frueh zu ueberspringen. */
const ringVon = new Float64Array(RING_LAENGEN.length);
const ringBis = new Float64Array(RING_LAENGEN.length);
{
  let p = 0;
  for (let t = 0; t < RING_LAENGEN.length; t++) {
    let von = Infinity;
    let bis = -Infinity;
    for (let j = 0; j < RING_LAENGEN[t]; j++, p++) {
      const lo = KOORDINATEN[p * 2] * GRAD;
      const la = KOORDINATEN[p * 2 + 1] * GRAD;
      sinLat[p] = Math.sin(la);
      cosLat[p] = Math.cos(la);
      if (lo < von) von = lo;
      if (lo > bis) bis = lo;
    }
    ringVon[t] = von;
    ringBis[t] = bis;
  }
}

// Puffer fuer den Beschnitt, damit je Bild nichts angelegt werden muss.
const KAPAZITAET = N + 64;
const aLon = new Float64Array(KAPAZITAET);
const aSin = new Float32Array(KAPAZITAET);
const aCos = new Float32Array(KAPAZITAET);
const bLon = new Float64Array(KAPAZITAET);
const bSin = new Float32Array(KAPAZITAET);
const bCos = new Float32Array(KAPAZITAET);

/**
 * Sutherland-Hodgman gegen einen Meridian, im Laengen-Breiten-Raum.
 * Gibt die neue Punktzahl zurueck.
 */
function schneide(
  einLon: Float64Array, einSin: Float32Array, einCos: Float32Array, einN: number,
  ausLon: Float64Array, ausSin: Float32Array, ausCos: Float32Array,
  grenze: number, groesser: boolean,
): number {
  let m = 0;
  for (let i = 0; i < einN; i++) {
    const j = (i + 1) % einN;
    const al = einLon[i];
    const bl = einLon[j];
    const ain = groesser ? al >= grenze : al <= grenze;
    const bin = groesser ? bl >= grenze : bl <= grenze;
    if (ain) {
      ausLon[m] = al; ausSin[m] = einSin[i]; ausCos[m] = einCos[i]; m++;
    }
    if (ain !== bin) {
      const t = (grenze - al) / (bl - al);
      const s = einSin[i] + t * (einSin[j] - einSin[i]);
      ausLon[m] = grenze; ausSin[m] = s;
      ausCos[m] = Math.sqrt(Math.max(0, 1 - s * s)); m++;
    }
  }
  return m;
}

/**
 * Der Globus bei der angegebenen Mittenlaenge, als SVG-Pfad.
 *
 * Entscheidend ist die Reihenfolge: erst im Laengen-Breiten-Raum auf den
 * sichtbaren Streifen (−90° bis +90°) beschneiden, dann projizieren. Die
 * Schnittkante liegt dann auf dem Meridian und landet von selbst auf der
 * Kugelkante. Wer erst projiziert und danach abschneidet, zieht gerade Sehnen
 * quer durch die Scheibe, sobald ein Ring hinter der Kugel verschwindet.
 *
 * Und die Kante, die beim Beschnitt NEU entsteht, muss unterteilt werden: sie
 * kann ueber 130° Breite ueberspannen, und das ist auf der Kugel ein Bogen.
 */
export function globusPfad(mittenLaengeGrad: number): string {
  const d = -mittenLaengeGrad * GRAD;
  const HALB = Math.PI / 2;
  const UMLAUF = 2 * Math.PI;
  let out = '';
  let p0 = 0;

  for (let t = 0; t < RING_LAENGEN.length; t++) {
    const n = RING_LAENGEN[t];
    for (let k = -1; k <= 1; k++) {
      const v = k * UMLAUF + d;
      if (ringBis[t] + v < -HALB || ringVon[t] + v > HALB) continue;

      for (let j = 0; j < n; j++) {
        const q = p0 + j;
        // Ungefaltete Laenge, nicht ueber atan2: der Beschnitt vergleicht gegen
        // ±90°, und ein auf −π..π gefalteter Wert waere dort falsch.
        aLon[j] = KOORDINATEN[q * 2] * GRAD + v;
        aSin[j] = sinLat[q];
        aCos[j] = cosLat[q];
      }
      let m = schneide(aLon, aSin, aCos, n, bLon, bSin, bCos, -HALB, true);
      if (m < 3) continue;
      m = schneide(bLon, bSin, bCos, m, aLon, aSin, aCos, HALB, false);
      if (m < 3) continue;

      let s = '';
      for (let q = 0; q < m; q++) {
        const q2 = (q + 1) % m;
        const lo = aLon[q];
        const sl = aSin[q];
        s += (q ? 'L' : 'M') + (CX + aCos[q] * Math.sin(lo) * R).toFixed(2)
          + ' ' + (CY - sl * R).toFixed(2);
        const weit = Math.max(
          Math.abs(aLon[q2] - lo),
          Math.abs(Math.asin(aSin[q2]) - Math.asin(sl)),
        );
        if (weit > FEINHEIT) {
          const schritte = Math.ceil(weit / FEINHEIT);
          for (let u = 1; u < schritte; u++) {
            const f = u / schritte;
            const sl2 = sl + (aSin[q2] - sl) * f;
            const lo2 = lo + (aLon[q2] - lo) * f;
            s += 'L' + (CX + Math.sqrt(Math.max(0, 1 - sl2 * sl2)) * Math.sin(lo2) * R).toFixed(2)
              + ' ' + (CY - sl2 * R).toFixed(2);
          }
        }
      }
      out += s + 'Z';
    }
    p0 += n;
  }
  return out;
}

/** Der Globus in Ruhelage — auch das, was ohne JavaScript im Markup steht. */
export const RUHE_PFAD = globusPfad(RUHE_LAENGE);

// ─── Ein Taktgeber fuer alle Marken auf der Seite ────────────────────────────
// Jede Marke zeigt denselben Winkel, also wird der Pfad einmal gerechnet und
// auf alle Elemente geschrieben. Zwei Logos in der Kopfleiste kosten damit
// nicht doppelt.

const laeuft = new Set<SVGPathElement>();
const sichtbar = new WeakSet<SVGPathElement>();
let anfang = 0;
let letzterRahmen = 0;
let angefordert = 0;
let beobachter: IntersectionObserver | null = null;

function ruhigStellen(): boolean {
  if (typeof window === 'undefined') return true;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function takt(jetzt: number): void {
  angefordert = 0;
  let wach = false;
  for (const el of laeuft) if (sichtbar.has(el)) { wach = true; break; }
  if (!wach || document.hidden) return;             // ohne neue Anforderung: Schluss

  if (jetzt - letzterRahmen >= 1000 / BILDER_JE_SEKUNDE) {
    letzterRahmen = jetzt;
    if (!anfang) anfang = jetzt;
    const anteil = (((jetzt - anfang) / 1000) % UMLAUF_SEKUNDEN) / UMLAUF_SEKUNDEN;
    const d = globusPfad(RUHE_LAENGE + anteil * 360);
    for (const el of laeuft) if (sichtbar.has(el)) el.setAttribute('d', d);
  }
  angefordert = requestAnimationFrame(takt);
}

function anstossen(): void {
  if (angefordert || ruhigStellen()) return;
  angefordert = requestAnimationFrame(takt);
}

/**
 * Meldet ein Pfad-Element beim Taktgeber an. Gibt die Abmeldung zurueck.
 *
 * Der Lauf haelt an, sobald kein angemeldetes Logo mehr im Bild ist oder der
 * Tab in den Hintergrund geht — und bei `prefers-reduced-motion` startet er
 * gar nicht erst; dann bleibt die Ruhelage stehen.
 */
export function dreheMit(el: SVGPathElement): () => void {
  if (typeof window === 'undefined' || ruhigStellen()) return () => {};

  if (!beobachter) {
    beobachter = new IntersectionObserver((eintraege) => {
      for (const e of eintraege) {
        const ziel = e.target as SVGPathElement;
        if (e.isIntersecting) sichtbar.add(ziel);
        else sichtbar.delete(ziel);
      }
      anstossen();
    });
    document.addEventListener('visibilitychange', anstossen);
  }

  laeuft.add(el);
  beobachter.observe(el);
  anstossen();

  return () => {
    laeuft.delete(el);
    sichtbar.delete(el);
    beobachter?.unobserve(el);
  };
}
