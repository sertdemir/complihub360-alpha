import { describe, expect, it, vi } from 'vitest';
import { ObligationEnrichmentMap } from '@complihub/compliance-engine';
vi.mock('../supabase.js', () => ({ supabaseApi: {} }));
import { domainKnowledge } from '../domain';

// Der Assistent bekommt das Bereichswissen als Text. Ein Platzhalter
// (scope 'placeholder', z. B. "National commercial register act") ist ein
// zitatfoermiger String, der nichts zitiert — stuende er dort als Quelle,
// reichte der Assistent ihn als Rechtsgrundlage weiter.
describe('domainKnowledge', () => {
  const platzhalter = Object.values(ObligationEnrichmentMap)
    .map((by) => by.default)
    .filter((d) => d?.scope === 'placeholder')
    .map((d) => d!.source);

  it('nennt einen Platzhalter nie als Quelle, sondern sagt, dass keine gefuehrt wird', () => {
    expect(platzhalter.length).toBeGreaterThan(0);
    const slugs = ['tax-vat', 'corporate-structure', 'legal-advisory', 'data-privacy', 'product-packaging', 'logistics-customs'];
    const zeilen = slugs.flatMap((s) => domainKnowledge(s, ['TR', 'US']));
    const text = zeilen.join('\n');
    for (const p of platzhalter) expect(text, p).not.toContain(p);
    expect(text).toContain('no named statute on file');
  });
});
