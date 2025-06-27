"use client";

import type { ReactNode } from "react";
import { SWRConfig } from "swr";

interface SWRProviderProps {
	children: ReactNode;
}

export function SWRProvider({ children }: SWRProviderProps) {
	return (
		<SWRConfig
			value={{
				dedupingInterval: 2000,
				errorRetryCount: 3,
				errorRetryInterval: 5000,
				refreshInterval: 0,
				revalidateOnFocus: false,
				revalidateOnReconnect: true,
				shouldRetryOnError: true,
			}}
		>
			{children}
		</SWRConfig>
	);
}
