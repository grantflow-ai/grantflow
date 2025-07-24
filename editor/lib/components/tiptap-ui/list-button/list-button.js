import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import * as React from "react";
// --- Lib ---
import { parseShortcutKeys } from "@/lib/tiptap-utils";
// --- Hooks ---
import { useTiptapEditor } from "@/hooks/use-tiptap-editor";
import { Button } from "@/components/tiptap-ui-primitive/button";
import { Badge } from "@/components/tiptap-ui-primitive/badge";
import { LIST_SHORTCUT_KEYS, useList } from "@/components/tiptap-ui/list-button";
export function ListShortcutBadge({ type, shortcutKeys = LIST_SHORTCUT_KEYS[type], }) {
    return _jsx(Badge, { children: parseShortcutKeys({ shortcutKeys }) });
}
/**
 * Button component for toggling lists in a Tiptap editor.
 *
 * For custom button implementations, use the `useList` hook instead.
 */
export const ListButton = React.forwardRef(({ editor: providedEditor, type, text, hideWhenUnavailable = false, onToggled, showShortcut = false, onClick, children, ...buttonProps }, ref) => {
    const { editor } = useTiptapEditor(providedEditor);
    const { isVisible, canToggle, isActive, handleToggle, label, shortcutKeys, Icon, } = useList({
        editor,
        type,
        hideWhenUnavailable,
        onToggled,
    });
    const handleClick = React.useCallback((event) => {
        onClick?.(event);
        if (event.defaultPrevented)
            return;
        handleToggle();
    }, [handleToggle, onClick]);
    if (!isVisible) {
        return null;
    }
    return (_jsx(Button, { type: "button", "data-style": "ghost", "data-active-state": isActive ? "on" : "off", tabIndex: -1, disabled: !canToggle, "data-disabled": !canToggle, "aria-label": label, "aria-pressed": isActive, tooltip: label, onClick: handleClick, ...buttonProps, ref: ref, children: children ?? (_jsxs(_Fragment, { children: [_jsx(Icon, { className: "tiptap-button-icon" }), text && _jsx("span", { className: "tiptap-button-text", children: text }), showShortcut && (_jsx(ListShortcutBadge, { type: type, shortcutKeys: shortcutKeys }))] })) }));
});
ListButton.displayName = "ListButton";
//# sourceMappingURL=list-button.js.map