import * as React from "react";
import type { TextAlign, UseTextAlignConfig } from "@/components/tiptap-ui/text-align-button";
import type { ButtonProps } from "@/components/tiptap-ui-primitive/button";
export interface TextAlignButtonProps extends Omit<ButtonProps, "type">, UseTextAlignConfig {
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
export declare function TextAlignShortcutBadge({ align, shortcutKeys, }: {
    align: TextAlign;
    shortcutKeys?: string;
}): import("react/jsx-runtime").JSX.Element;
/**
 * Button component for setting text alignment in a Tiptap editor.
 *
 * For custom button implementations, use the `useTextAlign` hook instead.
 */
export declare const TextAlignButton: React.ForwardRefExoticComponent<TextAlignButtonProps & React.RefAttributes<HTMLButtonElement>>;
//# sourceMappingURL=text-align-button.d.ts.map