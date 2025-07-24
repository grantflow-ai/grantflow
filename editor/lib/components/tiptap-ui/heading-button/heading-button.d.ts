import * as React from "react";
import type { Level, UseHeadingConfig } from "@/components/tiptap-ui/heading-button";
import type { ButtonProps } from "@/components/tiptap-ui-primitive/button";
export interface HeadingButtonProps extends Omit<ButtonProps, "type">, UseHeadingConfig {
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
export declare function HeadingShortcutBadge({ level, shortcutKeys, }: {
    level: Level;
    shortcutKeys?: string;
}): import("react/jsx-runtime").JSX.Element;
/**
 * Button component for toggling heading in a Tiptap editor.
 *
 * For custom button implementations, use the `useHeading` hook instead.
 */
export declare const HeadingButton: React.ForwardRefExoticComponent<HeadingButtonProps & React.RefAttributes<HTMLButtonElement>>;
//# sourceMappingURL=heading-button.d.ts.map