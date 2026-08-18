// The provider marketing landing and its eight sections were removed on
// 2026-08-18 (decision v2 §D7 / §11 P5: providers are recruited offline/B2B via
// the token-gated intake link, so a public provider-marketing page has no role
// in the funnel). SectionHeading stayed behind — despite living in this folder
// it is shared by the whole marketing surface: 12 importers across the home
// sections, /markets, /how-it-works and /search. Moving it to components/ui is
// a worthwhile follow-up, but it is a rename touching 12 files, not part of
// this removal.
export {
  SectionHeading,
  SectionEyebrow,
  SectionNote,
  GoldWord,
} from './SectionHeading';
