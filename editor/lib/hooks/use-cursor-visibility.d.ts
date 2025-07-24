import type { Editor } from "@tiptap/react";
export interface CursorVisibilityOptions {
    /**
     * The Tiptap editor instance
     */
    editor?: Editor | null;
    /**
     * Reference to the toolbar element that may obscure the cursor
     */
    overlayHeight?: number;
}
export type RectState = Omit<DOMRect, "toJSON">;
/**
 * Custom hook that ensures the cursor remains visible when typing in a Tiptap editor.
 * Automatically scrolls the window when the cursor would be hidden by the toolbar.
 *
 * This is particularly useful for long-form content editing where the cursor
 * might move out of the visible area as the user types.
 *
 * @param options Configuration options for cursor visibility behavior
 * @param options.editor The Tiptap editor instance
 * @param options.overlayHeight Reference to the toolbar element that may obscure the cursor
 * @returns void
 */
export declare function useCursorVisibility({ editor, overlayHeight, }: CursorVisibilityOptions): RectState;
//# sourceMappingURL=use-cursor-visibility.d.ts.map