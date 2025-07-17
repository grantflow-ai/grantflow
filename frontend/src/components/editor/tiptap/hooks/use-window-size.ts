import * as React from "react";

interface WindowSizeState {
	height: number;
	offsetTop: number;
	width: number;
}

/**
 * Custom hook to track window size and viewport information
 * @returns Current window dimensions and offsetTop
 */
export function useWindowSize(): WindowSizeState {
	const [windowSize, setWindowSize] = React.useState<WindowSizeState>({
		height: 0,
		offsetTop: 0,
		width: 0,
	});

	React.useEffect(() => {
		handleResize();

		function handleResize() {
			if (typeof globalThis.window === "undefined") return;

			const vp = window.visualViewport;
			if (!vp) return;

			const { height = 0, offsetTop = 0, width = 0 } = vp;

			// Only update state if values have changed
			setWindowSize((state) => {
				if (width === state.width && height === state.height && offsetTop === state.offsetTop) {
					return state;
				}

				return { height, offsetTop, width };
			});
		}

		const { visualViewport } = globalThis;
		if (visualViewport) {
			visualViewport.addEventListener("resize", handleResize);
			visualViewport.addEventListener("scroll", handleResize);
		}

		return () => {
			if (visualViewport) {
				visualViewport.removeEventListener("resize", handleResize);
				visualViewport.removeEventListener("scroll", handleResize);
			}
		};
	}, []);

	return windowSize;
}
