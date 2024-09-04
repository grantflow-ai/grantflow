import { useEffect, useMemo, useRef } from "react";

/**
 * A hook that converts a callback to a ref to avoids triggering re-renders when passed as a
 * prop or avoid re-executing effects when passed as a dependency.
 *
 * @param callback - The callback to convert to a ref.
 * @returns The ref to the callback.
 * Code is vendored from https://github.com/radix-ui/primitives/blob/main/packages/react/use-callback-ref/src/useCallbackRef.tsx
 */
function useCallbackRef<T extends (...args: never[]) => unknown>(callback?: T): T {
	const callbackRef = useRef(callback);

	useEffect(() => {
		callbackRef.current = callback;
	}, [callback]);

	// https://github.com/facebook/react/issues/19240
	return useMemo(() => ((...args) => callbackRef.current?.(...args)) as T, []);
}

export { useCallbackRef };
