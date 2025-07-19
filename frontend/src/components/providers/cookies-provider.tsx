"use client";

import type { ReactNode } from "react";
// eslint-disable-next-line import-x/no-unresolved -- react-cookie has built-in types
import { CookiesProvider } from "react-cookie";

interface CookiesProviderWrapperProps {
	children: ReactNode;
}

export function CookiesProviderWrapper({ children }: CookiesProviderWrapperProps) {
	return <CookiesProvider>{children}</CookiesProvider>;
}
