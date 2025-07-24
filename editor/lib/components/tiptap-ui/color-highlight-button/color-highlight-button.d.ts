import * as React from "react";
import type { UseColorHighlightConfig } from "@/components/tiptap-ui/color-highlight-button";
import type { ButtonProps } from "@/components/tiptap-ui-primitive/button";
import "@/components/tiptap-ui/color-highlight-button/color-highlight-button.scss";
export interface ColorHighlightButtonProps extends Omit<ButtonProps, "type">, UseColorHighlightConfig {
    /**
     * Optional text to display alongside the icon.
     */
    text?: string;
    /**
     * Optional show shortcut keys in the button.
     * @default false
     */
    showShortcut?: boolean;
}
export declare function ColorHighlightShortcutBadge({ shortcutKeys, }: {
    shortcutKeys?: string;
}): import("react/jsx-runtime").JSX.Element;
/**
 * Button component for applying color highlights in a Tiptap editor.
 *
 * For custom button implementations, use the `useColorHighlight` hook instead.
 */
export declare const ColorHighlightButton: React.ForwardRefExoticComponent<ColorHighlightButtonProps & React.RefAttributes<HTMLButtonElement>>;
//# sourceMappingURL=color-highlight-button.d.ts.map