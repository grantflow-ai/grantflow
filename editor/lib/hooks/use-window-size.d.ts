export interface WindowSizeState {
    /**
     * The width of the window's visual viewport in pixels.
     */
    width: number;
    /**
     * The height of the window's visual viewport in pixels.
     */
    height: number;
    /**
     * The distance from the top of the visual viewport to the top of the layout viewport.
     * Particularly useful for handling mobile keyboard appearance.
     */
    offsetTop: number;
    /**
     * The distance from the left of the visual viewport to the left of the layout viewport.
     */
    offsetLeft: number;
    /**
     * The scale factor of the visual viewport.
     * This is useful for scaling elements based on the current zoom level.
     */
    scale: number;
}
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
export declare function useWindowSize(): WindowSizeState;
//# sourceMappingURL=use-window-size.d.ts.map