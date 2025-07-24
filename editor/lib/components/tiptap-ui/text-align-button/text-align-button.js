import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import * as React from "react";
// --- Lib ---
import { parseShortcutKeys } from "@/lib/tiptap-utils";
// --- Hooks ---
import { useTiptapEditor } from "@/hooks/use-tiptap-editor";
import { TEXT_ALIGN_SHORTCUT_KEYS, useTextAlign, } from "@/components/tiptap-ui/text-align-button";
import { Button } from "@/components/tiptap-ui-primitive/button";
import { Badge } from "@/components/tiptap-ui-primitive/badge";
export function TextAlignShortcutBadge({ align, shortcutKeys = TEXT_ALIGN_SHORTCUT_KEYS[align], }) {
    return _jsx(Badge, { children: parseShortcutKeys({ shortcutKeys }) });
}
/**
 * Button component for setting text alignment in a Tiptap editor.
 *
 * For custom button implementations, use the `useTextAlign` hook instead.
 */
export const TextAlignButton = React.forwardRef(({ editor: providedEditor, align, text, hideWhenUnavailable = false, onAligned, showShortcut = false, onClick, children, ...buttonProps }, ref) => {
    const { editor } = useTiptapEditor(providedEditor);
    const { isVisible, handleTextAlign, label, canAlign, isActive, Icon, shortcutKeys, } = useTextAlign({
        editor,
        align,
        hideWhenUnavailable,
        onAligned,
    });
    const handleClick = React.useCallback((event) => {
        onClick?.(event);
        if (event.defaultPrevented)
            return;
        handleTextAlign();
    }, [handleTextAlign, onClick]);
    if (!isVisible) {
        return null;
    }
    return (_jsx(Button, { type: "button", disabled: !canAlign, "data-style": "ghost", "data-active-state": isActive ? "on" : "off", "data-disabled": !canAlign, tabIndex: -1, "aria-label": label, "aria-pressed": isActive, tooltip: label, onClick: handleClick, ...buttonProps, ref: ref, children: children ?? (_jsxs(_Fragment, { children: [_jsx(Icon, { className: "tiptap-button-icon" }), text && _jsx("span", { className: "tiptap-button-text", children: text }), showShortcut && (_jsx(TextAlignShortcutBadge, { align: align, shortcutKeys: shortcutKeys }))] })) }));
});
TextAlignButton.displayName = "TextAlignButton";
//# sourceMappingURL=text-align-button.js.map