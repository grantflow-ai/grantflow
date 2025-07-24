import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import * as React from "react";
// --- Hooks ---
import { useTiptapEditor } from "@/hooks/use-tiptap-editor";
// --- Lib ---
import { parseShortcutKeys } from "@/lib/tiptap-utils";
import { CODE_BLOCK_SHORTCUT_KEY, useCodeBlock, } from "@/components/tiptap-ui/code-block-button";
import { Button } from "@/components/tiptap-ui-primitive/button";
import { Badge } from "@/components/tiptap-ui-primitive/badge";
export function CodeBlockShortcutBadge({ shortcutKeys = CODE_BLOCK_SHORTCUT_KEY, }) {
    return _jsx(Badge, { children: parseShortcutKeys({ shortcutKeys }) });
}
/**
 * Button component for toggling code block in a Tiptap editor.
 *
 * For custom button implementations, use the `useCodeBlock` hook instead.
 */
export const CodeBlockButton = React.forwardRef(({ editor: providedEditor, text, hideWhenUnavailable = false, onToggled, showShortcut = false, onClick, children, ...buttonProps }, ref) => {
    const { editor } = useTiptapEditor(providedEditor);
    const { isVisible, canToggle, isActive, handleToggle, label, shortcutKeys, Icon, } = useCodeBlock({
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
    return (_jsx(Button, { type: "button", "data-style": "ghost", "data-active-state": isActive ? "on" : "off", disabled: !canToggle, "data-disabled": !canToggle, tabIndex: -1, "aria-label": label, "aria-pressed": isActive, tooltip: "Code Block", onClick: handleClick, ...buttonProps, ref: ref, children: children ?? (_jsxs(_Fragment, { children: [_jsx(Icon, { className: "tiptap-button-icon" }), text && _jsx("span", { className: "tiptap-button-text", children: text }), showShortcut && (_jsx(CodeBlockShortcutBadge, { shortcutKeys: shortcutKeys }))] })) }));
});
CodeBlockButton.displayName = "CodeBlockButton";
//# sourceMappingURL=code-block-button.js.map