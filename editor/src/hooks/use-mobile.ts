import { useEffect, useState } from "react";

export function useIsMobile(breakpoint = 768) {
	const [isMobile, setIsMobile] = useState<boolean>(() => {
		if (typeof window === "undefined") return false;
		return window.innerWidth < breakpoint;
	});

	useEffect(() => {
		const mql = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
		const onChange = () => {
			setIsMobile(window.innerWidth < breakpoint);
		};
		mql.addEventListener("change", onChange);
		return () => mql.removeEventListener("change", onChange);
	}, [breakpoint]);

	return isMobile;
}
