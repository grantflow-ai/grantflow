"use server";
import { DEFAULT_LANGUAGE, type LanguageCode } from "@/utils/i18n/settings";
import { initI18N } from "@/utils/i18n/utils";
import type { TFunction, i18n } from "i18next";

/**
 * Use i18next translation function
 *
 * @param ns - Namespace or array of namespaces to load
 * @param language - Language code to use
 * @param keyPrefix - Prefix for translation keys
 * @returns Translation function and i18next instance
 */
export async function useTranslation<T extends string | string[], K extends string = string>(
	ns: T,
	language: LanguageCode = DEFAULT_LANGUAGE,
	keyPrefix?: K,
): Promise<{
	t: TFunction<T, K>;
	i18n: i18n;
}> {
	const i18nextInstance = await initI18N({ lng: language, ns });
	return {
		t: i18nextInstance.getFixedT(language, Array.isArray(ns) ? ns[0] : ns, keyPrefix),
		i18n: i18nextInstance,
	};
}
