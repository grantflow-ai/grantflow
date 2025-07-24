import * as React from "react";
import type { Mark, UseMarkConfig } from "@/components/tiptap-ui/mark-button";
import type { ButtonProps } from "@/components/tiptap-ui-primitive/button";
export interface MarkButtonProps extends Omit<ButtonProps, "type">, UseMarkConfig {
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
export declare function MarkShortcutBadge({ type, shortcutKeys, }: {
    type: Mark;
    shortcutKeys?: string;
}): import("react/jsx-runtime").JSX.Element;
/**
 * Button component for toggling marks in a Tiptap editor.
 *
 * For custom button implementations, use the `useMark` hook instead.
 */
export declare const MarkButton: React.ForwardRefExoticComponent<MarkButtonProps & React.RefAttributes<HTMLButtonElement>>;
//# sourceMappingURL=mark-button.d.ts.map