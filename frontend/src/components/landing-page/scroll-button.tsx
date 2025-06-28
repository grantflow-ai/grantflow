"use client";

import React, { useEffect, useState } from "react";

import { LandingPageButton, type LandingPageButtonProps } from "./button";

const BREAKPOINT_MD = 768;

export function LandingPageScrollButton({
	children,
	desktopTargetId,
	mobileTargetId,
	offset = 0,
	onClick,
	smooth = true,
	...buttonProps
}: {
	desktopTargetId?: string;
	mobileTargetId?: string;
	offset?: number;
	onClick?: () => void;
	smooth?: boolean;
} & LandingPageButtonProps) {
	const [isMobile, setIsMobile] = useState(false);

	useEffect(() => {
		const checkScreenSize = () => {
			setIsMobile(window.innerWidth < BREAKPOINT_MD);
		};

		checkScreenSize();

		window.addEventListener("resize", checkScreenSize);

		return () => {
			window.removeEventListener("resize", checkScreenSize);
		};
	}, []);

	const handleScroll = React.useCallback(
		(e: React.MouseEvent) => {
			e.preventDefault();

			onClick?.();

			const targetId = isMobile ? mobileTargetId : desktopTargetId;
			const targetElement = document.querySelector(`#${targetId}`);

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
			}
		},
		[isMobile, onClick, desktopTargetId, mobileTargetId, offset, smooth],
	);

	return (
		<LandingPageButton onClick={handleScroll} {...buttonProps}>
			{children}
		</LandingPageButton>
	);
}
