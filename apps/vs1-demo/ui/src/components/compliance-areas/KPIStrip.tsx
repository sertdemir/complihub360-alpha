import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Globe, Layers, Timer, ShieldCheck } from 'lucide-react';
import { Typography } from '../ui/Typography';
import { DOMAINS } from '../../lib/domains';

// The domain count is read from the canonical list, never typed out: it said
// "6" while the product had eight, because a literal cannot notice that a
// domain was added.
const ITEMS = [
  { icon: Globe, key: 'jurisdictions', value: '27', labelDefault: 'Jurisdictions Covered' },
  { icon: Layers, key: 'domains', value: String(DOMAINS.length), labelDefault: 'Compliance Domains' },
  { icon: Timer, key: 'time', value: '< 5 min', labelDefault: 'Guided Assessment' },
  { icon: ShieldCheck, key: 'specialists', value: '✓', labelDefault: 'Verified Specialists Network' },
];

export function KPIStrip() {
  const { t } = useTranslation('common');

  return (
    <div className="grid grid-cols-2 desktop-s:grid-cols-4 gap-px bg-primary-100 rounded-2xl overflow-hidden border border-primary-100 shadow-sm">
      {ITEMS.map((item, i) => {
        const Icon = item.icon;
        return (
          <motion.div
            key={item.key}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: i * 0.08 }}
            className="bg-white px-5 py-5 flex items-start gap-3"
          >
            <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center shrink-0">
              <Icon size={18} className="text-primary-600" />
            </div>
            <div className="min-w-0">
              <Typography
                variant="h3"
                weight="bold"
                className="text-neutral-900 leading-tight tabular-nums"
              >
                {item.value}
              </Typography>
              <Typography variant="caption" className="text-neutral-500 leading-snug block mt-0.5 normal-case tracking-normal">
                {t(`compliance.kpi.${item.key}`, item.labelDefault)}
              </Typography>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
