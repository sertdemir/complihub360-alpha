import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Library, Map as MapIcon, GraduationCap, ArrowRight } from 'lucide-react';
import { Typography } from '../ui/Typography';

export function ResourceTeaser() {
  const { t } = useTranslation('common');
  const navigate = useNavigate();
  const { locale } = useParams();
  const localePrefix = locale ? `/${locale}` : '';

  const cards = [
    {
      id: 'library',
      icon: Library,
      titleDefault: 'Compliance Library',
      bodyDefault: 'Curated regulations, official sources, and structured guides for every area.',
      onClick: () => navigate(`${localePrefix}/resources`),
    },
    {
      id: 'countries',
      icon: MapIcon,
      titleDefault: 'Country Guides',
      bodyDefault: 'Jurisdiction-specific overviews — DE, FR, IT, ES, UK, CH, US.',
      onClick: () => navigate(`${localePrefix}/countries`),
    },
    {
      id: 'tutorials',
      icon: GraduationCap,
      titleDefault: 'Tutorials & Walkthroughs',
      bodyDefault: 'Step-by-step playbooks for common compliance scenarios.',
      onClick: () => navigate(`${localePrefix}/resources`),
    },
  ];

  return (
    <div className="mt-8">
      <div className="mb-6">
        <Typography
          variant="caption"
          className="text-primary-500 font-semibold uppercase tracking-wider mb-2 block"
        >
          {t('compliance.resourceTeaser.overline', 'Prefer to research first?')}
        </Typography>
        <Typography variant="h2" weight="bold" className="text-neutral-900">
          {t('compliance.resourceTeaser.title', 'Read before you reach out')}
        </Typography>
        <Typography variant="body" className="text-neutral-600 mt-2 max-w-2xl">
          {t(
            'compliance.resourceTeaser.body',
            'Structured knowledge for the careful researcher. Every guide is grounded in official, validated regulatory sources.',
          )}
        </Typography>
      </div>

      <div className="grid grid-cols-1 tablet:grid-cols-3 gap-4">
        {cards.map((card, i) => {
          const Icon = card.icon;
          const title = t(`compliance.resourceTeaser.${card.id}.title`, card.titleDefault);
          const body = t(`compliance.resourceTeaser.${card.id}.body`, card.bodyDefault);
          return (
            <motion.button
              key={card.id}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              onClick={card.onClick}
              className="group text-left bg-white border border-neutral-200 hover:border-primary-400 rounded-2xl p-6 transition-all hover:shadow-lg hover:-translate-y-0.5 flex flex-col"
            >
              <div className="w-12 h-12 rounded-xl bg-primary-50 flex items-center justify-center mb-4">
                <Icon size={22} className="text-primary-600" />
              </div>
              <Typography variant="h3" weight="bold" className="text-neutral-900 mb-2 leading-tight">
                {title}
              </Typography>
              <Typography variant="body" className="text-neutral-600 leading-relaxed text-sm flex-1">
                {body}
              </Typography>
              <span className="inline-flex items-center gap-1.5 mt-5 text-sm font-bold text-primary-600 group-hover:text-primary-700">
                {t('compliance.resourceTeaser.openCta', 'Open')}
                <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
