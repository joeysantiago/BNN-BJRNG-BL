import { Lang } from '../site';

/** A translation key such as `st.start`. The texts live in the Translations master table and are served by the API. */
export type TranslationKey = string;

export type Dictionary = Record<string, string>;

export type Dictionaries = Record<Lang, Dictionary>;
