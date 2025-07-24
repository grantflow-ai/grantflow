import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import * as React from "react";
// --- Hooks ---
import { useIsMobile } from "@/hooks/use-mobile";
import { useTiptapEditor } from "@/hooks/use-tiptap-editor";
// --- Icons ---
import { CornerDownLeftIcon } from "@/components/tiptap-icons/corner-down-left-icon";
import { ExternalLinkIcon } from "@/components/tiptap-icons/external-link-icon";
import { LinkIcon } from "@/components/tiptap-icons/link-icon";
import { TrashIcon } from "@/components/tiptap-icons/trash-icon";
import { useLinkPopover } from "@/components/tiptap-ui/link-popover";
import { Button, ButtonGroup } from "@/components/tiptap-ui-primitive/button";
import { Popover, PopoverContent, PopoverTrigger, } from "@/components/tiptap-ui-primitive/popover";
import { Separator } from "@/components/tiptap-ui-primitive/separator";
import { Card, CardBody, CardItemGroup, } from "@/components/tiptap-ui-primitive/card";
import { Input, InputGroup } from "@/components/tiptap-ui-primitive/input";
/**
 * Link button component for triggering the link popover
 */
export const LinkButton = React.forwardRef(({ className, children, ...props }, ref) => {
    return (_jsx(Button, { type: "button", className: className, "data-style": "ghost", tabIndex: -1, "aria-label": "Link", tooltip: "Link", ref: ref, ...props, children: children || _jsx(LinkIcon, { className: "tiptap-button-icon" }) }));
});
LinkButton.displayName = "LinkButton";
/**
 * Main content component for the link popover
 */
const LinkMain = ({ url, setUrl, setLink, removeLink, openLink, isActive, }) => {
    const isMobile = useIsMobile();
    const handleKeyDown = (event) => {
        if (event.key === "Enter") {
            event.preventDefault();
            setLink();
        }
    };
    return (_jsx(Card, { style: {
            ...(isMobile ? { boxShadow: "none", border: 0 } : {}),
        }, children: _jsx(CardBody, { style: {
                ...(isMobile ? { padding: 0 } : {}),
            }, children: _jsxs(CardItemGroup, { orientation: "horizontal", children: [_jsx(InputGroup, { children: _jsx(Input, { type: "url", placeholder: "Paste a link...", value: url, onChange: (e) => setUrl(e.target.value), onKeyDown: handleKeyDown, autoFocus: true, autoComplete: "off", autoCorrect: "off", autoCapitalize: "off" }) }), _jsx(ButtonGroup, { orientation: "horizontal", children: _jsx(Button, { type: "button", onClick: setLink, title: "Apply link", disabled: !(url || isActive), "data-style": "ghost", children: _jsx(CornerDownLeftIcon, { className: "tiptap-button-icon" }) }) }), _jsx(Separator, {}), _jsxs(ButtonGroup, { orientation: "horizontal", children: [_jsx(Button, { type: "button", onClick: openLink, title: "Open in new window", disabled: !(url || isActive), "data-style": "ghost", children: _jsx(ExternalLinkIcon, { className: "tiptap-button-icon" }) }), _jsx(Button, { type: "button", onClick: removeLink, title: "Remove link", disabled: !(url || isActive), "data-style": "ghost", children: _jsx(TrashIcon, { className: "tiptap-button-icon" }) })] })] }) }) }));
};
/**
 * Link content component for standalone use
 */
export const LinkContent = ({ editor }) => {
    const linkPopover = useLinkPopover({
        editor,
    });
    return _jsx(LinkMain, { ...linkPopover });
};
/**
 * Link popover component for Tiptap editors.
 *
 * For custom popover implementations, use the `useLinkPopover` hook instead.
 */
export const LinkPopover = React.forwardRef(({ editor: providedEditor, hideWhenUnavailable = false, onSetLink, onOpenChange, autoOpenOnLinkActive = true, onClick, children, ...buttonProps }, ref) => {
    const { editor } = useTiptapEditor(providedEditor);
    const [isOpen, setIsOpen] = React.useState(false);
    const { isVisible, canSet, isActive, url, setUrl, setLink, removeLink, openLink, label, Icon, } = useLinkPopover({
        editor,
        hideWhenUnavailable,
        onSetLink,
    });
    const handleOnOpenChange = React.useCallback((nextIsOpen) => {
        setIsOpen(nextIsOpen);
        onOpenChange?.(nextIsOpen);
    }, [onOpenChange]);
    const handleSetLink = React.useCallback(() => {
        setLink();
        setIsOpen(false);
    }, [setLink]);
    const handleClick = React.useCallback((event) => {
        onClick?.(event);
        if (event.defaultPrevented)
            return;
        setIsOpen(!isOpen);
    }, [onClick, isOpen]);
    React.useEffect(() => {
        if (autoOpenOnLinkActive && isActive) {
            setIsOpen(true);
        }
    }, [autoOpenOnLinkActive, isActive]);
    if (!isVisible) {
        return null;
    }
    return (_jsxs(Popover, { open: isOpen, onOpenChange: handleOnOpenChange, children: [_jsx(PopoverTrigger, { asChild: true, children: _jsx(LinkButton, { disabled: !canSet, "data-active-state": isActive ? "on" : "off", "data-disabled": !canSet, "aria-label": label, "aria-pressed": isActive, onClick: handleClick, ...buttonProps, ref: ref, children: children ?? _jsx(Icon, { className: "tiptap-button-icon" }) }) }), _jsx(PopoverContent, { children: _jsx(LinkMain, { url: url, setUrl: setUrl, setLink: handleSetLink, removeLink: removeLink, openLink: openLink, isActive: isActive }) })] }));
});
LinkPopover.displayName = "LinkPopover";
export default LinkPopover;
//# sourceMappingURL=link-popover.js.map