"use client";
import { DEFAULT_LANGUAGE, type LanguageCode } from "@/utils/i18n/settings";
import { type ReactNode, createContext } from "react";

const I18NContext = createContext(DEFAULT_LANGUAGE);

export function I18nProvider({ children, params }: { children?: ReactNode; params?: { language?: LanguageCode } }) {
	return <I18NContext.Provider value={params?.language ?? DEFAULT_LANGUAGE}>{children}</I18NContext.Provider>;
}
