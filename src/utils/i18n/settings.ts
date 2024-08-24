export const LANGUAGE_ENGLISH = "en";
export const LANGUAGE_GERMAN = "de";
export const DEFAULT_LANGUAGE = LANGUAGE_ENGLISH;
export const DEFAULT_NAMESPACE = "translation";
export const SUPPORTED_LANGUAGES = [LANGUAGE_ENGLISH, LANGUAGE_GERMAN];
export const SEARCH_PARAM_NAME = "language";
export const COOKIE_NAME = "language-code";

export type LanguageCode = typeof LANGUAGE_ENGLISH | typeof LANGUAGE_GERMAN;
