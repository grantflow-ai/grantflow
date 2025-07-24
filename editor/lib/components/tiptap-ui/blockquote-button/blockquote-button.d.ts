import * as React from "react";
import type { UseBlockquoteConfig } from "@/components/tiptap-ui/blockquote-button";
import type { ButtonProps } from "@/components/tiptap-ui-primitive/button";
export interface BlockquoteButtonProps extends Omit<ButtonProps, "type">, UseBlockquoteConfig {
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
export declare function BlockquoteShortcutBadge({ shortcutKeys, }: {
    shortcutKeys?: string;
}): import("react/jsx-runtime").JSX.Element;
/**
 * Button component for toggling blockquote in a Tiptap editor.
 *
 * For custom button implementations, use the `useBlockquote` hook instead.
 */
export declare const BlockquoteButton: React.ForwardRefExoticComponent<BlockquoteButtonProps & React.RefAttributes<HTMLButtonElement>>;
//# sourceMappingURL=blockquote-button.d.ts.map