import en from "@/localisations/en.json";

export type Localisation = typeof en;
export type SupportedLocale = "en";
export interface I18n {
	defaultLocale: SupportedLocale;
	locales: SupportedLocale[];
}

export const i18n = {
	defaultLocale: "en",
	locales: ["en"],
} satisfies I18n;

export const localesMap: Record<SupportedLocale, Localisation> = {
	en,
};

/**
 * Get the localisation dictionary for the specified locale.
 * @param locale - The locale to get the dictionary for.
 * @returns The locale dictionary.
 */
export async function getLocale(locale: SupportedLocale): Promise<Localisation> {
	if (!Reflect.has(localesMap, locale)) {
		const { default: localisation } = (await import(`@/localisations/${locale}.json`)) as { default: Localisation };
		localesMap[locale] = localisation;
	}
	return localesMap[locale];
}
