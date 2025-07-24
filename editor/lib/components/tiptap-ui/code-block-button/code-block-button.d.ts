import * as React from "react";
import type { UseCodeBlockConfig } from "@/components/tiptap-ui/code-block-button";
import type { ButtonProps } from "@/components/tiptap-ui-primitive/button";
export interface CodeBlockButtonProps extends Omit<ButtonProps, "type">, UseCodeBlockConfig {
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
export declare function CodeBlockShortcutBadge({ shortcutKeys, }: {
    shortcutKeys?: string;
}): import("react/jsx-runtime").JSX.Element;
/**
 * Button component for toggling code block in a Tiptap editor.
 *
 * For custom button implementations, use the `useCodeBlock` hook instead.
 */
export declare const CodeBlockButton: React.ForwardRefExoticComponent<CodeBlockButtonProps & React.RefAttributes<HTMLButtonElement>>;
//# sourceMappingURL=code-block-button.d.ts.map