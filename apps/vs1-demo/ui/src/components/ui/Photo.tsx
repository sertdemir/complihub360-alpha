// ─── Photo — the graded marketing photos (Look B "Petrol & Papier") ──────────
// Serves the files scripts/photos/grade-photos.py writes to public/img/photos:
// <slug>-<width>.avif / .webp at 640, 1280 and 1920 px, never wider than the
// cropped original. The registry below mirrors those outputs (width × height
// of the largest file) so the <img> reserves its box before it loads — add a
// slug here when a photo joins assets/photos/manifest.json.
//
// Alt defaults to "" on purpose: these are mood photos of stock models, not
// information. Describing them would also tempt copy that presents the models
// as our customers or providers, which the DNA rules out
// (assets/photos/README.md).

const PHOTOS = {
  'owner-laptop-boxes': { w: 1920, h: 1282 },
  'owner-packing-table': { w: 1920, h: 1536 },
  'side-by-side': { w: 1280, h: 1219 },
  'expert-review': { w: 1920, h: 1194 },
  'calm-review': { w: 1920, h: 1080 },
  'warehouse-shelves': { w: 1920, h: 2878 },
  'port-aerial': { w: 1920, h: 1284 },
  'parcel-car': { w: 1280, h: 1001 },
} as const;

export type PhotoSlug = keyof typeof PHOTOS;

const WIDTHS = [640, 1280, 1920];

export function Photo({
  slug,
  sizes,
  alt = '',
  className = '',
  loading = 'lazy',
}: {
  slug: PhotoSlug;
  /** The rendered width, as for <img sizes> — e.g. "(min-width: 1024px) 420px, 100vw". */
  sizes: string;
  alt?: string;
  className?: string;
  loading?: 'lazy' | 'eager';
}) {
  const { w, h } = PHOTOS[slug];
  const widths = WIDTHS.filter((x) => x <= w);
  const srcSet = (ext: string) => widths.map((x) => `/img/photos/${slug}-${x}.${ext} ${x}w`).join(', ');
  return (
    <picture>
      <source type="image/avif" srcSet={srcSet('avif')} sizes={sizes} />
      <source type="image/webp" srcSet={srcSet('webp')} sizes={sizes} />
      <img
        src={`/img/photos/${slug}-${widths[widths.length - 1]}.webp`}
        alt={alt}
        width={w}
        height={h}
        loading={loading}
        decoding="async"
        className={className}
      />
    </picture>
  );
}
