import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import * as React from "react";
// --- Hooks ---
import { useTiptapEditor } from "@/hooks/use-tiptap-editor";
// --- Icons ---
import { ChevronDownIcon } from "@/components/tiptap-icons/chevron-down-icon";
// --- Tiptap UI ---
import { ListButton } from "@/components/tiptap-ui/list-button";
import { useListDropdownMenu } from "./use-list-dropdown-menu";
import { Button, ButtonGroup } from "@/components/tiptap-ui-primitive/button";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, } from "@/components/tiptap-ui-primitive/dropdown-menu";
import { Card, CardBody } from "@/components/tiptap-ui-primitive/card";
export function ListDropdownMenu({ editor: providedEditor, types = ["bulletList", "orderedList", "taskList"], hideWhenUnavailable = false, onOpenChange, portal = false, ...props }) {
    const { editor } = useTiptapEditor(providedEditor);
    const [isOpen, setIsOpen] = React.useState(false);
    const { filteredLists, canToggle, isActive, isVisible, Icon } = useListDropdownMenu({
        editor,
        types,
        hideWhenUnavailable,
    });
    const handleOnOpenChange = React.useCallback((open) => {
        setIsOpen(open);
        onOpenChange?.(open);
    }, [onOpenChange]);
    if (!((isVisible && editor) && editor.isEditable)) {
        return null;
    }
    return (_jsxs(DropdownMenu, { open: isOpen, onOpenChange: handleOnOpenChange, children: [_jsx(DropdownMenuTrigger, { asChild: true, children: _jsxs(Button, { type: "button", "data-style": "ghost", "data-active-state": isActive ? "on" : "off", tabIndex: -1, disabled: !canToggle, "data-disabled": !canToggle, "aria-label": "List options", tooltip: "List", ...props, children: [_jsx(Icon, { className: "tiptap-button-icon" }), _jsx(ChevronDownIcon, { className: "tiptap-button-dropdown-small" })] }) }), _jsx(DropdownMenuContent, { align: "start", portal: portal, children: _jsx(Card, { children: _jsx(CardBody, { children: _jsx(ButtonGroup, { children: filteredLists.map((option) => (_jsx(DropdownMenuItem, { asChild: true, children: _jsx(ListButton, { editor: editor, type: option.type, text: option.label, showTooltip: false }) }, option.type))) }) }) }) })] }));
}
export default ListDropdownMenu;
//# sourceMappingURL=list-dropdown-menu.js.map