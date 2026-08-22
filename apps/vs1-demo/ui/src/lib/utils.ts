import { type ClassValue, clsx } from "clsx"
import { extendTailwindMerge } from "tailwind-merge"

/**
 * Compass type-scale keys from tailwind.config.js (theme.extend.fontSize).
 *
 * tailwind-merge only recognises the stock t-shirt sizes (text-sm, text-lg, …).
 * Any other `text-*` falls through to its catch-all and is classified as a text
 * COLOUR — so `cn('text-caption', 'text-error-700')` treated both as colours and
 * silently dropped the font size. Registering the scale here puts each class in
 * the font-size group, so size and colour stop conflicting.
 *
 * Keep this list in sync with theme.extend.fontSize in tailwind.config.js.
 */
const FONT_SIZES = [
  'display-2xl', 'display-xl', 'display-lg', 'display-md', 'display-sm',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'body-lg', 'body', 'body-sm', 'body-xs',
  // The neutral small steps added with the type-scale migration. Missing here,
  // tailwind-merge classifies them as text COLOURS and silently drops the size.
  'body-md', 'body-2xs', 'body-3xs', 'body-4xs', 'body-5xs',
  'label', 'ui-small', 'caption', 'eyebrow',
]

/**
 * Compass border-width aliases from tailwind.config.js (theme.extend.borderWidth).
 *
 * Same trap as the font sizes above, one group over: tailwind-merge knows
 * border-2 and border-[2px], not border-medium. Anything else after `border-`
 * falls into its catch-all and is classified as a border COLOUR — so
 * `cn('border-medium border-neutral-300')` read both as colours and silently
 * dropped the WIDTH. Every Button variant="outline" in the app therefore
 * rendered with no border at all: a white control on a near-white ground.
 *
 * Keep this list in sync with theme.extend.borderWidth in tailwind.config.js.
 */
const BORDER_WIDTHS = ['none', 'sm', 'md', 'lg', 'thin', 'medium', 'thick']

const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [{ text: FONT_SIZES }],
      'border-w': [{ border: BORDER_WIDTHS }],
    },
  },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
