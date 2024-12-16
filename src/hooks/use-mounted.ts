import { useEffect, useState } from "react";

/**
 * Returns whether the component is mounted.
 */
export function useMounted() {
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setMounted(true);
	}, []);

	return mounted;
}
