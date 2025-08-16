"use client";

import { useEffect, useRef } from "react";
import { useCookieConsentStore } from "@/stores/cookie-consent-store";

interface CookieConsentTriggerProps {
	children: React.ReactNode;
	proximityThreshold?: number;
	triggerElementTestId?: string;
}

export function CookieConsentTrigger({
	children,
	proximityThreshold = 100,
	triggerElementTestId,
}: CookieConsentTriggerProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const hasTriggeredRef = useRef(false);
	const { checkAndShowConsent, hasInteracted } = useCookieConsentStore();

	useEffect(() => {
		if (hasInteracted || hasTriggeredRef.current) {
			return;
		}

		const handleMouseMove = (event: MouseEvent) => {
			if (hasTriggeredRef.current || hasInteracted) {
				return;
			}

			const container = containerRef.current;
			if (!container) return;

			const triggerElement = triggerElementTestId
				? container.querySelector(`[data-testid="${triggerElementTestId}"]`)
				: container.querySelector('[data-testid*="login"], button:has([href*="login"])');

			if (!triggerElement) return;

			const rect = triggerElement.getBoundingClientRect();
			const centerX = rect.left + rect.width / 2;
			const centerY = rect.top + rect.height / 2;

			const distance = Math.hypot(event.clientX - centerX, event.clientY - centerY);

			if (distance < proximityThreshold) {
				hasTriggeredRef.current = true;
				checkAndShowConsent();
				document.removeEventListener("mousemove", handleMouseMove);
			}
		};

		const timeoutId = setTimeout(() => {
			document.addEventListener("mousemove", handleMouseMove);
		}, 500);

		return () => {
			clearTimeout(timeoutId);
			document.removeEventListener("mousemove", handleMouseMove);
		};
	}, [hasInteracted, checkAndShowConsent, triggerElementTestId, proximityThreshold]);

	return (
		<div data-testid="cookie-consent-trigger" ref={containerRef}>
			{children}
		</div>
	);
}
