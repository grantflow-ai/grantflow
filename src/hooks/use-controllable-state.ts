import { useCallbackRef } from "@/hooks/use-callback-ref";
import { type Dispatch, type SetStateAction, useCallback, useEffect, useRef, useState } from "react";

/**
 * Hook that manages state in a controlled way.
 *
 * @param prop - The controlled value.
 * @param defaultProp - The default value.
 * @param onChange - The function to call when the value changes.
 *
 * Code is vendored from https://github.com/radix-ui/primitives/blob/main/packages/react/use-controllable-state/src/useControllableState.tsx
 */
export function useControllableState<T>({
	prop,
	defaultProp,
	onChange,
}: {
	prop?: T | undefined;
	defaultProp?: T | undefined;
	onChange?: (state: T) => void;
}) {
	const [uncontrolledProp, setUncontrolledProp] = useUncontrolledState({
		defaultProp,
		onChange,
	});
	const isControlled = prop !== undefined;
	const value = isControlled ? prop : uncontrolledProp;
	const handleChange = useCallbackRef(onChange);

	const setValue: Dispatch<SetStateAction<T | undefined>> = useCallback(
		(nextValue) => {
			if (isControlled) {
				const setter = nextValue as (prevState?: T) => T;
				const value = typeof nextValue === "function" ? setter(prop) : nextValue;
				if (value !== prop) {
					handleChange(value as T);
				}
			} else {
				setUncontrolledProp(nextValue);
			}
		},
		[isControlled, prop, setUncontrolledProp, handleChange],
	);

	return [value, setValue] as const;
}

function useUncontrolledState<T>({
	defaultProp,
	onChange,
}: {
	defaultProp?: T | undefined;
	onChange?: (state: T) => void;
}) {
	const uncontrolledState = useState(defaultProp);
	const [value] = uncontrolledState;
	const prevValueRef = useRef(value);
	const handleChange = useCallbackRef(onChange);

	useEffect(() => {
		if (prevValueRef.current !== value) {
			handleChange(value as T);
			prevValueRef.current = value;
		}
	}, [value, handleChange]);

	return uncontrolledState;
}
