import * as React from "react";
import type { UndoRedoAction, UseUndoRedoConfig } from "@/components/tiptap-ui/undo-redo-button";
import type { ButtonProps } from "@/components/tiptap-ui-primitive/button";
export interface UndoRedoButtonProps extends Omit<ButtonProps, "type">, UseUndoRedoConfig {
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
export declare function HistoryShortcutBadge({ action, shortcutKeys, }: {
    action: UndoRedoAction;
    shortcutKeys?: string;
}): import("react/jsx-runtime").JSX.Element;
/**
 * Button component for triggering undo/redo actions in a Tiptap editor.
 *
 * For custom button implementations, use the `useHistory` hook instead.
 */
export declare const UndoRedoButton: React.ForwardRefExoticComponent<UndoRedoButtonProps & React.RefAttributes<HTMLButtonElement>>;
//# sourceMappingURL=undo-redo-button.d.ts.map