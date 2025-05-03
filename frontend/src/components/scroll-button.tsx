"use client";

import { AppButton, AppButtonProps } from "@/components/app-button";
import React from "react";

export function ScrollButton({
	children,
	offset = 0,
	selector,
	smooth = true,
	...buttonProps
}: {
	offset?: number;
	selector: string;
	smooth?: boolean;
} & AppButtonProps) {
	const handleScroll = React.useCallback(
		(e: React.MouseEvent) => {
			e.preventDefault();

			const targetElement =
				selector.startsWith("#") || selector.startsWith(".")
					? document.querySelector(selector)
					: (document.querySelector(`#${selector}`) ?? document.querySelector(selector));

			if (targetElement) {
				const targetPosition = targetElement.getBoundingClientRect().top + window.scrollY - offset;

				if (smooth) {
					window.scrollTo({
						behavior: "smooth",
						top: targetPosition,
					});
				} else {
					window.scrollTo(0, targetPosition);
				}

				if (selector.startsWith("#")) {
					globalThis.history.pushState(null, "", selector);
				} else if (!selector.startsWith(".")) {
					globalThis.history.pushState(null, "", `#${selector}`);
				}
			}
		},
		[selector, smooth, offset],
	);

	return (
		<AppButton onClick={handleScroll} {...buttonProps}>
			{children}
		</AppButton>
	);
}
