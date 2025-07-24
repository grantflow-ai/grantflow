import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import * as React from "react";
// --- Lib ---
import { parseShortcutKeys } from "@/lib/tiptap-utils";
// --- Hooks ---
import { useTiptapEditor } from "@/hooks/use-tiptap-editor";
import { UNDO_REDO_SHORTCUT_KEYS, useUndoRedo, } from "@/components/tiptap-ui/undo-redo-button";
import { Button } from "@/components/tiptap-ui-primitive/button";
import { Badge } from "@/components/tiptap-ui-primitive/badge";
export function HistoryShortcutBadge({ action, shortcutKeys = UNDO_REDO_SHORTCUT_KEYS[action], }) {
    return _jsx(Badge, { children: parseShortcutKeys({ shortcutKeys }) });
}
/**
 * Button component for triggering undo/redo actions in a Tiptap editor.
 *
 * For custom button implementations, use the `useHistory` hook instead.
 */
export const UndoRedoButton = React.forwardRef(({ editor: providedEditor, action, text, hideWhenUnavailable = false, onExecuted, showShortcut = false, onClick, children, ...buttonProps }, ref) => {
    const { editor } = useTiptapEditor(providedEditor);
    const { isVisible, handleAction, label, canExecute, Icon, shortcutKeys } = useUndoRedo({
        editor,
        action,
        hideWhenUnavailable,
        onExecuted,
    });
    const handleClick = React.useCallback((event) => {
        onClick?.(event);
        if (event.defaultPrevented)
            return;
        handleAction();
    }, [handleAction, onClick]);
    if (!isVisible) {
        return null;
    }
    return (_jsx(Button, { type: "button", disabled: !canExecute, "data-style": "ghost", "data-disabled": !canExecute, tabIndex: -1, "aria-label": label, tooltip: label, onClick: handleClick, ...buttonProps, ref: ref, children: children ?? (_jsxs(_Fragment, { children: [_jsx(Icon, { className: "tiptap-button-icon" }), text && _jsx("span", { className: "tiptap-button-text", children: text }), showShortcut && (_jsx(HistoryShortcutBadge, { action: action, shortcutKeys: shortcutKeys }))] })) }));
});
UndoRedoButton.displayName = "UndoRedoButton";
//# sourceMappingURL=undo-redo-button.js.map