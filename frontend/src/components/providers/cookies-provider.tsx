"use client";

import type { ReactNode } from "react";

// eslint-disable-next-line import-x/no-unresolved
import { CookiesProvider } from "react-cookie";

interface CookiesProviderWrapperProps {
	children: ReactNode;
}

export function CookiesProviderWrapper({ children }: CookiesProviderWrapperProps) {
	return <CookiesProvider>{children}</CookiesProvider>;
}
