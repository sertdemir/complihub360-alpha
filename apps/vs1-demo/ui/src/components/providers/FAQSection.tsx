import { useTranslation } from 'react-i18next';
import { Container } from '../ui/Container';
import { Typography } from '../ui/Typography';
import { Accordion, AccordionItem } from '../ui/Accordion';
import { SectionEyebrow, GoldWord, Reveal } from './SectionHeading';

// ─── S5 — FAQ (Provider) · Figma 1800:829 ─────────────────────────────────────
// "The things you'd ask. Answered." Ghost-style accordion (divider lines), using
// the Compass Accordion primitive. Light section.
// Q/A copy lives in the 'providersLp' namespace (faq.items.<n>.q / .a).

const FAQ_ITEMS = [
  { value: 'cost', key: '0' },
  { value: 'prequal', key: '1' },
  { value: 'accept', key: '2' },
  { value: 'decline', key: '3' },
  { value: 'partner-tier', key: '4' },
  { value: 'sla', key: '5' },
  { value: 'team', key: '6' },
  { value: 'billing', key: '7' },
] as const;

export function FAQSection() {
  const { t } = useTranslation('providersLp');

  return (
    <section id="faq" className="bg-surface py-20 lg:py-28">
      <Container size="lg">
        <Reveal className="mx-auto mb-10 flex max-w-3xl flex-col items-center gap-4 text-center">
          <SectionEyebrow tone="brand">{t('faq.eyebrow')}</SectionEyebrow>
          <Typography variant="h2" weight="semibold" className="!text-[2rem] leading-tight tracking-tight text-neutral-900 sm:!text-[2.5rem]">
            {t('faq.title.pre')} <GoldWord>{t('faq.title.gold')}</GoldWord>
            {t('faq.title.post')}
          </Typography>
        </Reveal>

        <Reveal delay={0.1}>
          <Accordion type="multiple" styleVariant="ghost" size="lg" defaultValue={['cost', 'accept']} className="mx-auto max-w-3xl">
            {FAQ_ITEMS.map((f) => (
              <AccordionItem key={f.value} value={f.value} title={t(`faq.items.${f.key}.q`)}>
                <p className="leading-relaxed text-neutral-600">{t(`faq.items.${f.key}.a`)}</p>
              </AccordionItem>
            ))}
          </Accordion>
        </Reveal>

        <p className="mx-auto mt-12 max-w-2xl text-center text-ui-small text-neutral-500">
          {t('faq.contactPre')}{' '}
          <a href="mailto:partners@complihub360.com" className="font-medium text-primary-600 hover:text-primary-700">
            partners@complihub360.com
          </a>{' '}
          {t('faq.contactPost')}
        </p>
      </Container>
    </section>
  );
}
