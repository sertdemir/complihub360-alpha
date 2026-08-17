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
  'label', 'ui-small', 'caption', 'eyebrow',
]

const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [{ text: FONT_SIZES }],
    },
  },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
