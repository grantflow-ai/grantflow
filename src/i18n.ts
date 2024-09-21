import en from "::localisations/en.json";

export type SupportedLocale = "en";

export interface I18n {
	defaultLocale: SupportedLocale;
	locales: SupportedLocale[];
}

export const i18n = {
	defaultLocale: "en",
	locales: ["en"],
} satisfies I18n;

/**
 * Get the locale dictionary for the specified locale.
 * @param locale - The locale to get the dictionary for.
 * @returns The locale dictionary.
 */
export async function getLocale(locale: SupportedLocale): Promise<typeof en> {
	try {
		const { default: defaultExport } = (await import(`::localisations/${locale}.json`)) as { default: typeof en };
		return defaultExport;
	} catch {
		return en;
	}
}
