import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import * as React from "react";
// --- Lib ---
import { parseShortcutKeys } from "@/lib/tiptap-utils";
import { HEADING_SHORTCUT_KEYS, useHeading, } from "@/components/tiptap-ui/heading-button";
import { Button } from "@/components/tiptap-ui-primitive/button";
import { Badge } from "@/components/tiptap-ui-primitive/badge";
import { useTiptapEditor } from "@/hooks/use-tiptap-editor";
export function HeadingShortcutBadge({ level, shortcutKeys = HEADING_SHORTCUT_KEYS[level], }) {
    return _jsx(Badge, { children: parseShortcutKeys({ shortcutKeys }) });
}
/**
 * Button component for toggling heading in a Tiptap editor.
 *
 * For custom button implementations, use the `useHeading` hook instead.
 */
export const HeadingButton = React.forwardRef(({ editor: providedEditor, level, text, hideWhenUnavailable = false, onToggled, showShortcut = false, onClick, children, ...buttonProps }, ref) => {
    const { editor } = useTiptapEditor(providedEditor);
    const { isVisible, canToggle, isActive, handleToggle, label, Icon, shortcutKeys, } = useHeading({
        editor,
        level,
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
    return (_jsx(Button, { type: "button", "data-style": "ghost", "data-active-state": isActive ? "on" : "off", tabIndex: -1, disabled: !canToggle, "data-disabled": !canToggle, "aria-label": label, "aria-pressed": isActive, tooltip: label, onClick: handleClick, ...buttonProps, ref: ref, children: children ?? (_jsxs(_Fragment, { children: [_jsx(Icon, { className: "tiptap-button-icon" }), text && _jsx("span", { className: "tiptap-button-text", children: text }), showShortcut && (_jsx(HeadingShortcutBadge, { level: level, shortcutKeys: shortcutKeys }))] })) }));
});
HeadingButton.displayName = "HeadingButton";
//# sourceMappingURL=heading-button.js.map