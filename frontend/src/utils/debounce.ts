import { useCallback, useEffect, useRef } from "react";

function createDebounce<T extends readonly unknown[]>(
	callback: (...args: T) => void,
	delay: number,
): {
	call: (...args: T) => void;
	cancel: () => void;
} {
	let timeoutId: NodeJS.Timeout | null = null;

	const call = (...args: T) => {
		if (timeoutId) {
			clearTimeout(timeoutId);
		}

		timeoutId = setTimeout(() => {
			callback(...args);
		}, delay);
	};

	const cancel = () => {
		if (timeoutId) {
			clearTimeout(timeoutId);
			timeoutId = null;
		}
	};

	return { call, cancel };
}

function useDebounce<T extends readonly unknown[]>(
	callback: (...args: T) => void,
	delay: number,
): (...args: T) => void {
	const timeoutRef = useRef<NodeJS.Timeout | null>(null);

	useEffect(() => {
		return () => {
			if (timeoutRef.current) {
				clearTimeout(timeoutRef.current);
			}
		};
	}, []);

	return useCallback(
		(...args: T) => {
			if (timeoutRef.current) {
				clearTimeout(timeoutRef.current);
			}

			timeoutRef.current = setTimeout(() => {
				callback(...args);
			}, delay);
		},
		[callback, delay],
	);
}

export { createDebounce, useDebounce };
