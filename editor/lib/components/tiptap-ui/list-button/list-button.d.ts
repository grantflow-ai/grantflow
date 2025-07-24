import * as React from "react";
import type { ButtonProps } from "@/components/tiptap-ui-primitive/button";
import type { ListType, UseListConfig } from "@/components/tiptap-ui/list-button";
export interface ListButtonProps extends Omit<ButtonProps, "type">, UseListConfig {
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
export declare function ListShortcutBadge({ type, shortcutKeys, }: {
    type: ListType;
    shortcutKeys?: string;
}): import("react/jsx-runtime").JSX.Element;
/**
 * Button component for toggling lists in a Tiptap editor.
 *
 * For custom button implementations, use the `useList` hook instead.
 */
export declare const ListButton: React.ForwardRefExoticComponent<ListButtonProps & React.RefAttributes<HTMLButtonElement>>;
//# sourceMappingURL=list-button.d.ts.map