import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import * as React from "react";
// --- Icons ---
import { ChevronDownIcon } from "@/components/tiptap-icons/chevron-down-icon";
// --- Hooks ---
import { useTiptapEditor } from "@/hooks/use-tiptap-editor";
// --- Tiptap UI ---
import { HeadingButton } from "@/components/tiptap-ui/heading-button";
import { useHeadingDropdownMenu } from "@/components/tiptap-ui/heading-dropdown-menu";
import { Button, ButtonGroup } from "@/components/tiptap-ui-primitive/button";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, } from "@/components/tiptap-ui-primitive/dropdown-menu";
import { Card, CardBody } from "@/components/tiptap-ui-primitive/card";
/**
 * Dropdown menu component for selecting heading levels in a Tiptap editor.
 *
 * For custom dropdown implementations, use the `useHeadingDropdownMenu` hook instead.
 */
export const HeadingDropdownMenu = React.forwardRef(({ editor: providedEditor, levels = [1, 2, 3, 4, 5, 6], hideWhenUnavailable = false, portal = false, onOpenChange, ...buttonProps }, ref) => {
    const { editor } = useTiptapEditor(providedEditor);
    const [isOpen, setIsOpen] = React.useState(false);
    const { isVisible, isActive, canToggle, Icon } = useHeadingDropdownMenu({
        editor,
        levels,
        hideWhenUnavailable,
    });
    const handleOpenChange = React.useCallback((open) => {
        if (!(editor && canToggle))
            return;
        setIsOpen(open);
        onOpenChange?.(open);
    }, [canToggle, editor, onOpenChange]);
    if (!isVisible) {
        return null;
    }
    return (_jsxs(DropdownMenu, { open: isOpen, onOpenChange: handleOpenChange, children: [_jsx(DropdownMenuTrigger, { asChild: true, children: _jsxs(Button, { type: "button", "data-style": "ghost", "data-active-state": isActive ? "on" : "off", tabIndex: -1, disabled: !canToggle, "data-disabled": !canToggle, "aria-label": "Format text as heading", "aria-pressed": isActive, tooltip: "Heading", ...buttonProps, ref: ref, children: [_jsx(Icon, { className: "tiptap-button-icon" }), _jsx(ChevronDownIcon, { className: "tiptap-button-dropdown-small" })] }) }), _jsx(DropdownMenuContent, { align: "start", portal: portal, children: _jsx(Card, { children: _jsx(CardBody, { children: _jsx(ButtonGroup, { children: levels.map((level) => (_jsx(DropdownMenuItem, { asChild: true, children: _jsx(HeadingButton, { editor: editor, level: level, text: `Heading ${level}`, showTooltip: false }) }, `heading-${level}`))) }) }) }) })] }));
});
HeadingDropdownMenu.displayName = "HeadingDropdownMenu";
export default HeadingDropdownMenu;
//# sourceMappingURL=heading-dropdown-menu.js.map