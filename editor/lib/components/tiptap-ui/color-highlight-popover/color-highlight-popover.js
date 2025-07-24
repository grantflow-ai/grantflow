import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import * as React from "react";
// --- Hooks ---
import { useMenuNavigation } from "@/hooks/use-menu-navigation";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTiptapEditor } from "@/hooks/use-tiptap-editor";
// --- Icons ---
import { BanIcon } from "@/components/tiptap-icons/ban-icon";
import { HighlighterIcon } from "@/components/tiptap-icons/highlighter-icon";
import { Button, ButtonGroup } from "@/components/tiptap-ui-primitive/button";
import { Popover, PopoverTrigger, PopoverContent, } from "@/components/tiptap-ui-primitive/popover";
import { Separator } from "@/components/tiptap-ui-primitive/separator";
import { Card, CardBody, CardItemGroup, } from "@/components/tiptap-ui-primitive/card";
import { ColorHighlightButton, pickHighlightColorsByValue, useColorHighlight, } from "@/components/tiptap-ui/color-highlight-button";
export const ColorHighlightPopoverButton = React.forwardRef(({ className, children, ...props }, ref) => (_jsx(Button, { type: "button", className: className, "data-style": "ghost", "data-appearance": "default", tabIndex: -1, "aria-label": "Highlight text", tooltip: "Highlight", ref: ref, ...props, children: children ?? _jsx(HighlighterIcon, { className: "tiptap-button-icon" }) })));
ColorHighlightPopoverButton.displayName = "ColorHighlightPopoverButton";
export function ColorHighlightPopoverContent({ editor, colors = pickHighlightColorsByValue([
    "var(--tt-color-highlight-green)",
    "var(--tt-color-highlight-blue)",
    "var(--tt-color-highlight-red)",
    "var(--tt-color-highlight-purple)",
    "var(--tt-color-highlight-yellow)",
]), }) {
    const { handleRemoveHighlight } = useColorHighlight({ editor });
    const isMobile = useIsMobile();
    const containerRef = React.useRef(null);
    const menuItems = React.useMemo(() => [...colors, { label: "Remove highlight", value: "none" }], [colors]);
    const { selectedIndex } = useMenuNavigation({
        containerRef,
        items: menuItems,
        orientation: "both",
        onSelect: (item) => {
            if (!containerRef.current)
                return false;
            const highlightedElement = containerRef.current.querySelector('[data-highlighted="true"]');
            if (highlightedElement)
                highlightedElement.click();
            if (item.value === "none")
                handleRemoveHighlight();
        },
        autoSelectFirstItem: false,
    });
    return (_jsx(Card, { ref: containerRef, tabIndex: 0, style: isMobile ? { boxShadow: "none", border: 0 } : {}, children: _jsx(CardBody, { style: isMobile ? { padding: 0 } : {}, children: _jsxs(CardItemGroup, { orientation: "horizontal", children: [_jsx(ButtonGroup, { orientation: "horizontal", children: colors.map((color, index) => (_jsx(ColorHighlightButton, { editor: editor, highlightColor: color.value, tooltip: color.label, "aria-label": `${color.label} highlight color`, tabIndex: index === selectedIndex ? 0 : -1, "data-highlighted": selectedIndex === index }, color.value))) }), _jsx(Separator, {}), _jsx(ButtonGroup, { orientation: "horizontal", children: _jsx(Button, { onClick: handleRemoveHighlight, "aria-label": "Remove highlight", tooltip: "Remove highlight", tabIndex: selectedIndex === colors.length ? 0 : -1, type: "button", role: "menuitem", "data-style": "ghost", "data-highlighted": selectedIndex === colors.length, children: _jsx(BanIcon, { className: "tiptap-button-icon" }) }) })] }) }) }));
}
export function ColorHighlightPopover({ editor: providedEditor, colors = pickHighlightColorsByValue([
    "var(--tt-color-highlight-green)",
    "var(--tt-color-highlight-blue)",
    "var(--tt-color-highlight-red)",
    "var(--tt-color-highlight-purple)",
    "var(--tt-color-highlight-yellow)",
]), hideWhenUnavailable = false, onApplied, ...props }) {
    const { editor } = useTiptapEditor(providedEditor);
    const [isOpen, setIsOpen] = React.useState(false);
    const { isVisible, canColorHighlight, isActive, label, Icon } = useColorHighlight({
        editor,
        hideWhenUnavailable,
        onApplied,
    });
    if (!isVisible)
        return null;
    return (_jsxs(Popover, { open: isOpen, onOpenChange: setIsOpen, children: [_jsx(PopoverTrigger, { asChild: true, children: _jsx(ColorHighlightPopoverButton, { disabled: !canColorHighlight, "data-active-state": isActive ? "on" : "off", "data-disabled": !canColorHighlight, "aria-pressed": isActive, "aria-label": label, tooltip: label, ...props, children: _jsx(Icon, { className: "tiptap-button-icon" }) }) }), _jsx(PopoverContent, { "aria-label": "Highlight colors", children: _jsx(ColorHighlightPopoverContent, { editor: editor, colors: colors }) })] }));
}
export default ColorHighlightPopover;
//# sourceMappingURL=color-highlight-popover.js.map