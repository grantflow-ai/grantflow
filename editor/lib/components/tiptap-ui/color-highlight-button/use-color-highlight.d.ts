import type { Editor } from "@tiptap/react";
import * as React from "react";
export declare const COLOR_HIGHLIGHT_SHORTCUT_KEY = "mod+shift+h";
export declare const HIGHLIGHT_COLORS: {
    label: string;
    value: string;
    border: string;
}[];
export type HighlightColor = (typeof HIGHLIGHT_COLORS)[number];
/**
 * Configuration for the color highlight functionality
 */
export interface UseColorHighlightConfig {
    /**
     * The Tiptap editor instance.
     */
    editor?: Editor | null;
    /**
     * The color to apply when toggling the highlight.
     */
    highlightColor?: string;
    /**
     * Optional label to display alongside the icon.
     */
    label?: string;
    /**
     * Whether the button should hide when the mark is not available.
     * @default false
     */
    hideWhenUnavailable?: boolean;
    /**
     * Called when the highlight is applied.
     */
    onApplied?: ({ color, label }: {
        color: string;
        label: string;
    }) => void;
}
export declare function pickHighlightColorsByValue(values: string[]): {
    label: string;
    value: string;
    border: string;
}[];
export declare function canColorHighlight(editor: Editor | null): boolean;
export declare function isColorHighlightActive(editor: Editor | null, highlightColor?: string): boolean;
export declare function removeHighlight(editor: Editor | null): boolean;
export declare function shouldShowButton(props: {
    editor: Editor | null;
    hideWhenUnavailable: boolean;
}): boolean;
export declare function useColorHighlight(config: UseColorHighlightConfig): {
    isVisible: boolean;
    isActive: boolean;
    handleColorHighlight: () => boolean;
    handleRemoveHighlight: () => boolean;
    canColorHighlight: boolean;
    label: string;
    shortcutKeys: string;
    Icon: React.MemoExoticComponent<({ className, ...props }: React.SVGProps<SVGSVGElement>) => import("react/jsx-runtime").JSX.Element>;
};
//# sourceMappingURL=use-color-highlight.d.ts.map