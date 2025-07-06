"use client";

import { useEffect } from "react";
import { isMockAPIEnabled } from "@/dev-tools/mock-api/client";
import { initializeMockAPI } from "@/dev-tools/mock-api/init";

export function MockAPIInitializer() {
	useEffect(() => {
		if (isMockAPIEnabled()) {
			initializeMockAPI();
		}
	}, []);

	return null;
}
