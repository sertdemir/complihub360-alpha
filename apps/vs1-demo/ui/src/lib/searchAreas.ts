import type { DomainSlug } from './domains';

// ─── /search · „Klingt nach diesem Bereich" (Canvas-Wahl C2, 10.10.2026) ─────
// Eine FESTE Stichwortliste je Bereich, im Browser, ohne Modell und ohne KI.
// Sie ordnet eine frei formulierte Frage hoechstens drei Bereichen zu — als
// Wegweiser, nicht als Pruefung des Falls (die Seite sagt das unter dem Block).
// Keine Risikostufe, keine Pflicht: wer nach Cookies fragt, soll nicht OSS
// mit „Hoch" sehen (das tat die Platzhalter-Antwort bis zum 10.10.).
//
// Stichwoerter in EN/DE/ES/TR, klein geschrieben. Ein Stichwort trifft nur als
// ganzes Wort oder Wortanfang (\b am Anfang): „ust" trifft „USt-Voranmeldung",
// aber nicht „Lust". Reihenfolge der Treffer: wie viele Stichwoerter passen,
// bei Gleichstand die Reihenfolge hier.

const KEYWORDS: Record<DomainSlug, string[]> = {
  'tax-vat': ['vat', 'ust', 'umsatzsteuer', 'mehrwertsteuer', 'mwst', 'oss', 'ioss', 'steuer', 'tax', 'iva', 'impuesto', 'kdv', 'vergi', 'reverse charge', 'fernverkauf', 'distance sell'],
  'product-packaging': ['epr', 'verpackung', 'packaging', 'verpackg', 'lucid', 'envase', 'embalaje', 'ambalaj', 'herstellerverantwortung', 'producer responsibility'],
  'data-privacy': ['dsgvo', 'gdpr', 'datenschutz', 'privacy', 'cookie', 'tracking', 'einwilligung', 'consent', 'personenbezogen', 'personal data', 'avv', 'dpa', 'rgpd', 'protección de datos', 'kvkk', 'kişisel veri', 'çerez'],
  'marketing-seo': ['werbung', 'marketing', 'advertis', 'impressum', 'abmahnung', 'uwg', 'influencer', 'claim', 'klimaneutral', 'climate neutral', 'green claim', 'publicidad', 'reklam', 'newsletter'],
  'corporate-structure': ['gmbh', 'gesellschaft', 'company formation', 'niederlassung', 'branch office', 'subsidiary', 'tochter', 'handelsregister', 'transparenzregister', 'sociedad', 'şirket', 'betriebsstätte', 'permanent establishment'],
  'product-compliance': ['ce-kennzeichnung', 'ce-zeichen', 'ce marking', 'ce-marking', 'marcado ce', 'ce işareti', 'produktsicherheit', 'product safety', 'gpsr', 'konformität', 'conformity', 'kennzeichnung', 'labelling', 'labeling', 'seguridad del producto', 'ürün güvenliği', 'reach-verordnung', 'reach regulation'],
  'logistics-customs': ['zoll', 'customs', 'import', 'export', 'eori', 'incoterm', 'aduana', 'gümrük', 'einfuhr', 'ausfuhr', 'warenursprung', 'rules of origin'],
  'legal-advisory': ['agb', 'terms and conditions', 'terms of service', 'vertrag', 'contract', 'widerruf', 'withdrawal', 'haftung', 'liability', 'contrato', 'sözleşme', 'rechtsberatung', 'legal advice'],
  environment: ['weee', 'elektrogesetz', 'elektroaltgeräte', 'batterie', 'battery', 'stoffrecht', 'umwelt', 'environment', 'pfand', 'medio ambiente', 'çevre', 'atık pil'],
};

export const MAX_AREAS = 3;

function escape(word: string): string {
  return word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const PATTERNS: [DomainSlug, RegExp[]][] = (Object.entries(KEYWORDS) as [DomainSlug, string[]][]).map(
  ([slug, words]) => [slug, words.map((w) => new RegExp(`(^|[^\\p{L}\\p{N}])${escape(w)}`, 'iu'))],
);

/** Bereiche, nach denen die Frage klingt — hoechstens drei, sonst leer. */
export function areasForQuery(query: string): DomainSlug[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return PATTERNS
    .map(([slug, res], order) => ({ slug, order, hits: res.filter((re) => re.test(q)).length }))
    .filter((r) => r.hits > 0)
    .sort((a, b) => b.hits - a.hits || a.order - b.order)
    .slice(0, MAX_AREAS)
    .map((r) => r.slug);
}
