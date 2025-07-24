import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import * as React from "react";
// --- Lib ---
import { parseShortcutKeys } from "@/lib/tiptap-utils";
// --- Hooks ---
import { useTiptapEditor } from "@/hooks/use-tiptap-editor";
import { MARK_SHORTCUT_KEYS, useMark } from "@/components/tiptap-ui/mark-button";
import { Button } from "@/components/tiptap-ui-primitive/button";
import { Badge } from "@/components/tiptap-ui-primitive/badge";
export function MarkShortcutBadge({ type, shortcutKeys = MARK_SHORTCUT_KEYS[type], }) {
    return _jsx(Badge, { children: parseShortcutKeys({ shortcutKeys }) });
}
/**
 * Button component for toggling marks in a Tiptap editor.
 *
 * For custom button implementations, use the `useMark` hook instead.
 */
export const MarkButton = React.forwardRef(({ editor: providedEditor, type, text, hideWhenUnavailable = false, onToggled, showShortcut = false, onClick, children, ...buttonProps }, ref) => {
    const { editor } = useTiptapEditor(providedEditor);
    const { isVisible, handleMark, label, canToggle, isActive, Icon, shortcutKeys, } = useMark({
        editor,
        type,
        hideWhenUnavailable,
        onToggled,
    });
    const handleClick = React.useCallback((event) => {
        onClick?.(event);
        if (event.defaultPrevented)
            return;
        handleMark();
    }, [handleMark, onClick]);
    if (!isVisible) {
        return null;
    }
    return (_jsx(Button, { type: "button", disabled: !canToggle, "data-style": "ghost", "data-active-state": isActive ? "on" : "off", "data-disabled": !canToggle, tabIndex: -1, "aria-label": label, "aria-pressed": isActive, tooltip: label, onClick: handleClick, ...buttonProps, ref: ref, children: children ?? (_jsxs(_Fragment, { children: [_jsx(Icon, { className: "tiptap-button-icon" }), text && _jsx("span", { className: "tiptap-button-text", children: text }), showShortcut && (_jsx(MarkShortcutBadge, { type: type, shortcutKeys: shortcutKeys }))] })) }));
});
MarkButton.displayName = "MarkButton";
//# sourceMappingURL=mark-button.js.map