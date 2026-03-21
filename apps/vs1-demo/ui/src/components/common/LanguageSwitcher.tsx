import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Globe, Check } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'de', label: 'Deutsch' },
  { code: 'es', label: 'Español' },
  { code: 'tr', label: 'Türkçe' },
];

export function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const navigate = useNavigate();

  const currentLangCode = i18n.resolvedLanguage || 'en';

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLanguageChange = (lng: string) => {
    i18n.changeLanguage(lng);
    setIsOpen(false);
    
    // Update the URL to reflect the new language
    const pathParts = location.pathname.split('/');
    if (pathParts.length > 1 && LANGUAGES.some(l => l.code === pathParts[1])) {
      pathParts[1] = lng;
      navigate(pathParts.join('/') + location.search + location.hash);
    } else {
      // If no valid language prefix is found, prepend it
      navigate(`/${lng}${location.pathname}${location.search}${location.hash}`);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center w-8 h-8 rounded-full text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100/80 transition-colors"
        aria-label="Change Language"
      >
        <Globe size={18} strokeWidth={1.5} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-36 bg-white/90 backdrop-blur-xl border border-neutral-200/50 rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.08)] overflow-hidden z-[100]"
          >
            <div className="py-1">
              {LANGUAGES.map((lng) => (
                <button
                  key={lng.code}
                  onClick={() => handleLanguageChange(lng.code)}
                  className="w-full flex items-center justify-between px-4 py-2 text-sm text-left hover:bg-neutral-100/50 transition-colors"
                >
                  <span className={`font-medium ${currentLangCode === lng.code ? 'text-primary-600' : 'text-neutral-600'}`}>
                    {lng.label}
                  </span>
                  {currentLangCode === lng.code && (
                    <Check size={14} className="text-primary-500" strokeWidth={2} />
                  )}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
