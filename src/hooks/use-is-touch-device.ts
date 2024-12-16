"use client";

import { useEffect, useState } from "react";

/**
 * Returns whether the current device is a touch device.
 * @link https://stackoverflow.com/a/4819886
 */
export function useIsTouchDevice() {
	const [isTouchDevice, setIsTouchDevice] = useState(false);

	useEffect(() => {
		function onResize() {
			setIsTouchDevice(
				"ontouchstart" in globalThis || navigator.maxTouchPoints > 0 || navigator.maxTouchPoints > 0,
			);
		}

		window.addEventListener("resize", onResize);
		onResize();

		return () => {
			window.removeEventListener("resize", onResize);
		};
	}, []);

	return isTouchDevice;
}
