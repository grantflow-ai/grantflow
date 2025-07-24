"use client";
import * as React from "react";
/**
 * Hook that tracks the window's visual viewport dimensions, position, and provides
 * a CSS transform for positioning elements.
 *
 * Uses the Visual Viewport API to get accurate measurements, especially important
 * for mobile devices where virtual keyboards can change the visible area.
 * Only updates state when values actually change to optimize performance.
 *
 * @returns An object containing viewport properties and a CSS transform string
 */
export function useWindowSize() {
    const [windowSize, setWindowSize] = React.useState({
        width: 0,
        height: 0,
        offsetTop: 0,
        offsetLeft: 0,
        scale: 0,
    });
    React.useEffect(() => {
        function handleViewportChange() {
            if (typeof window === "undefined")
                return;
            const vp = window.visualViewport;
            if (!vp)
                return;
            const { width = 0, height = 0, offsetTop = 0, offsetLeft = 0, scale = 0, } = vp;
            setWindowSize((prevState) => {
                if (width === prevState.width &&
                    height === prevState.height &&
                    offsetTop === prevState.offsetTop &&
                    offsetLeft === prevState.offsetLeft &&
                    scale === prevState.scale) {
                    return prevState;
                }
                return {
                    width,
                    height,
                    offsetTop,
                    offsetLeft,
                    scale,
                };
            });
        }
        const visualViewport = window.visualViewport;
        if (visualViewport) {
            visualViewport.addEventListener("resize", handleViewportChange);
            visualViewport.addEventListener("scroll", handleViewportChange);
        }
        handleViewportChange();
        return () => {
            if (visualViewport) {
                visualViewport.removeEventListener("resize", handleViewportChange);
                visualViewport.removeEventListener("scroll", handleViewportChange);
            }
        };
    }, []);
    return windowSize;
}
//# sourceMappingURL=use-window-size.js.map