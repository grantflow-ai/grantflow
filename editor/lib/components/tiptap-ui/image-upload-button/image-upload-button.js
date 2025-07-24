import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import * as React from "react";
// --- Lib ---
import { parseShortcutKeys } from "@/lib/tiptap-utils";
// --- Hooks ---
import { useTiptapEditor } from "@/hooks/use-tiptap-editor";
import { IMAGE_UPLOAD_SHORTCUT_KEY, useImageUpload, } from "@/components/tiptap-ui/image-upload-button";
import { Button } from "@/components/tiptap-ui-primitive/button";
import { Badge } from "@/components/tiptap-ui-primitive/badge";
export function ImageShortcutBadge({ shortcutKeys = IMAGE_UPLOAD_SHORTCUT_KEY, }) {
    return _jsx(Badge, { children: parseShortcutKeys({ shortcutKeys }) });
}
/**
 * Button component for uploading/inserting images in a Tiptap editor.
 *
 * For custom button implementations, use the `useImage` hook instead.
 */
export const ImageUploadButton = React.forwardRef(({ editor: providedEditor, text, hideWhenUnavailable = false, onInserted, showShortcut = false, onClick, children, ...buttonProps }, ref) => {
    const { editor } = useTiptapEditor(providedEditor);
    const { isVisible, canInsert, handleImage, label, isActive, shortcutKeys, Icon, } = useImageUpload({
        editor,
        hideWhenUnavailable,
        onInserted,
    });
    const handleClick = React.useCallback((event) => {
        onClick?.(event);
        if (event.defaultPrevented)
            return;
        handleImage();
    }, [handleImage, onClick]);
    if (!isVisible) {
        return null;
    }
    return (_jsx(Button, { type: "button", "data-style": "ghost", "data-active-state": isActive ? "on" : "off", tabIndex: -1, disabled: !canInsert, "data-disabled": !canInsert, "aria-label": label, "aria-pressed": isActive, tooltip: label, onClick: handleClick, ...buttonProps, ref: ref, children: children ?? (_jsxs(_Fragment, { children: [_jsx(Icon, { className: "tiptap-button-icon" }), text && _jsx("span", { className: "tiptap-button-text", children: text }), showShortcut && _jsx(ImageShortcutBadge, { shortcutKeys: shortcutKeys })] })) }));
});
ImageUploadButton.displayName = "ImageUploadButton";
//# sourceMappingURL=image-upload-button.js.map