// STUB of erp-web/src/messages/index.ts: never copied into erp-web; erp-web's registers every feature (auth, branding, status, …) between the same markers.
import type { AbstractIntlMessages } from 'next-intl';
// registry start: imports
import exampleItemAr from '@/features/example-item/messages/ar.json';
import exampleItemEn from '@/features/example-item/messages/en.json';
// registry end: imports
import type { Locale } from '@/i18n/locales';
import commonAr from './common/ar.json';
import commonEn from './common/en.json';

/**
 * The static registry of message packs (FE-08). Turbopack has no `import.meta.glob`, so every
 * feature's `messages/<locale>.json` is imported here by hand: a new feature adds its import
 * lines and the two entries between the `registry` markers. One top-level
 * namespace per file = the feature's folder name.
 */
export const NAMESPACES = [
  'common',
  // registry start: namespaces
  'example-item',
  // registry end: namespaces
] as const;
export type Namespace = (typeof NAMESPACES)[number];

const PACKS: Record<Locale, readonly AbstractIntlMessages[]> = {
  en: [
    commonEn,
    // registry start: en
    exampleItemEn,
    // registry end: en
  ],
  ar: [
    commonAr,
    // registry start: ar
    exampleItemAr,
    // registry end: ar
  ],
};

function isMessages(value: unknown): value is AbstractIntlMessages {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Deep-merges plain objects (message files hold no arrays); never mutates its inputs. */
function deepMerge(base: AbstractIntlMessages, over: AbstractIntlMessages): AbstractIntlMessages {
  const out: AbstractIntlMessages = { ...base };
  for (const [key, value] of Object.entries(over)) {
    const existing = out[key];
    out[key] = isMessages(existing) && isMessages(value) ? deepMerge(existing, value) : value;
  }
  return out;
}

/**
 * The merged pack of a locale: English first, the locale's files over it, so an untranslated key
 * renders the English text rather than the key name (T-3-01).
 */
export function messagesFor(locale: Locale): AbstractIntlMessages {
  const layers = locale === 'en' ? PACKS.en : [...PACKS.en, ...PACKS[locale]];
  return layers.reduce<AbstractIntlMessages>((acc, pack) => deepMerge(acc, pack), {});
}
