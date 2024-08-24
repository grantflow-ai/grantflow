"use client";

import { DEFAULT_LANGUAGE, DEFAULT_NAMESPACE, type LanguageCode } from "@/utils/i18n/settings";
import { initI18N } from "@/utils/i18n/utils";
import type { TFunction, i18n } from "i18next";
import { useEffect } from "react";
import { useTranslation as i18nextUseTranslations } from "react-i18next";

const singleton = await initI18N({ lng: DEFAULT_LANGUAGE, ns: DEFAULT_NAMESPACE });

/**
 * Use i18next translation function
 *
 * @param ns - Namespace or array of namespaces to load
 * @param language - Language code to use
 * @param keyPrefix - Prefix for translation keys
 */
export function useTranslation<T extends string | string[], K extends string = string>(
	ns: T,
	language: LanguageCode = DEFAULT_LANGUAGE,
	keyPrefix?: K,
): {
	t: TFunction<T, K>;
	i18n: i18n;
} {
	useEffect(() => {
		if (language !== singleton.resolvedLanguage) {
			void singleton.changeLanguage(language);
		}
	}, [language]);

	return i18nextUseTranslations(ns, { lng: language, keyPrefix });
}
