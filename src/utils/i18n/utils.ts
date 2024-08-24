import { getEnv } from "@/utils/env";
import { DEFAULT_LANGUAGE, DEFAULT_NAMESPACE, SUPPORTED_LANGUAGES } from "@/utils/i18n/settings";
import { type InitOptions, createInstance } from "i18next";
import resourcesToBackend from "i18next-resources-to-backend";
import { initReactI18next } from "react-i18next/initReactI18next";

/**
 * Initialize i18next instance
 *
 * @param lng - Language code to use
 * @param ns - Namespace or array of namespaces to load
 * @returns Initialized i18next instance
 */
export async function initI18N({ lng, ns }: Pick<InitOptions, "lng" | "ns">) {
	const i18nInstance = createInstance();
	await i18nInstance
		.use(initReactI18next)
		.use(resourcesToBackend((language: string, namespace: string) => import(`./locales/${language}/${namespace}.json`)))
		.init({
			debug: getEnv().NEXT_PUBLIC_DEBUG,
			supportedLngs: SUPPORTED_LANGUAGES,
			fallbackLng: DEFAULT_LANGUAGE,
			lng,
			fallbackNS: DEFAULT_NAMESPACE,
			defaultNS: DEFAULT_NAMESPACE,
			ns,
		});
	return i18nInstance;
}
