import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import * as React from "react";
import { BLOCKQUOTE_SHORTCUT_KEY, useBlockquote, } from "@/components/tiptap-ui/blockquote-button";
import { Badge } from "@/components/tiptap-ui-primitive/badge";
import { Button } from "@/components/tiptap-ui-primitive/button";
// --- Hooks ---
import { useTiptapEditor } from "@/hooks/use-tiptap-editor";
// --- Lib ---
import { parseShortcutKeys } from "@/lib/tiptap-utils";
export function BlockquoteShortcutBadge({ shortcutKeys = BLOCKQUOTE_SHORTCUT_KEY, }) {
    return _jsx(Badge, { children: parseShortcutKeys({ shortcutKeys }) });
}
/**
 * Button component for toggling blockquote in a Tiptap editor.
 *
 * For custom button implementations, use the `useBlockquote` hook instead.
 */
export const BlockquoteButton = React.forwardRef(({ editor: providedEditor, text, hideWhenUnavailable = false, onToggled, showShortcut = false, onClick, children, ...buttonProps }, ref) => {
    const { editor } = useTiptapEditor(providedEditor);
    const { isVisible, canToggle, isActive, handleToggle, label, shortcutKeys, Icon, } = useBlockquote({
        editor,
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
    return (_jsx(Button, { type: "button", "data-style": "ghost", "data-active-state": isActive ? "on" : "off", role: "button", tabIndex: -1, disabled: !canToggle, "data-disabled": !canToggle, "aria-label": label, "aria-pressed": isActive, tooltip: "Blockquote", onClick: handleClick, ...buttonProps, ref: ref, children: children ?? (_jsxs(_Fragment, { children: [_jsx(Icon, { className: "tiptap-button-icon" }), text && _jsx("span", { className: "tiptap-button-text", children: text }), showShortcut && (_jsx(BlockquoteShortcutBadge, { shortcutKeys: shortcutKeys }))] })) }));
});
BlockquoteButton.displayName = "BlockquoteButton";
//# sourceMappingURL=blockquote-button.js.map