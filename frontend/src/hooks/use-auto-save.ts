import { useEffect, useRef } from "react";

type SaveCallback = () => void;

export function useAutoSave(callback: SaveCallback, dependencies: unknown[], delay = 1500) {
	const isMounted = useRef(false);
	useEffect(() => {
		if (!isMounted.current) {
			isMounted.current = true;
			return;
		}

		const handler = setTimeout(() => {
			callback();
		}, delay);

		return () => {
			clearTimeout(handler);
		};
	}, [...dependencies, callback, delay]);
}
