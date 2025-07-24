import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import * as React from "react";
// --- Tiptap UI Primitive ---
import { Tooltip, TooltipContent, TooltipTrigger, } from "@/components/tiptap-ui-primitive/tooltip";
// --- Lib ---
import { cn, parseShortcutKeys } from "@/lib/tiptap-utils";
import "@/components/tiptap-ui-primitive/button/button-colors.scss";
import "@/components/tiptap-ui-primitive/button/button-group.scss";
import "@/components/tiptap-ui-primitive/button/button.scss";
export const ShortcutDisplay = ({ shortcuts, }) => {
    if (shortcuts.length === 0)
        return null;
    return (_jsx("div", { children: shortcuts.map((key, index) => (_jsxs(React.Fragment, { children: [index > 0 && _jsx("kbd", { children: "+" }), _jsx("kbd", { children: key })] }, index))) }));
};
export const Button = React.forwardRef(({ className, children, tooltip, showTooltip = true, shortcutKeys, "aria-label": ariaLabel, ...props }, ref) => {
    const shortcuts = React.useMemo(() => parseShortcutKeys({ shortcutKeys }), [shortcutKeys]);
    if (!(tooltip && showTooltip)) {
        return (_jsx("button", { className: cn("tiptap-button", className), ref: ref, "aria-label": ariaLabel, ...props, children: children }));
    }
    return (_jsxs(Tooltip, { delay: 200, children: [_jsx(TooltipTrigger, { className: cn("tiptap-button", className), ref: ref, "aria-label": ariaLabel, ...props, children: children }), _jsxs(TooltipContent, { children: [tooltip, _jsx(ShortcutDisplay, { shortcuts: shortcuts })] })] }));
});
Button.displayName = "Button";
export const ButtonGroup = React.forwardRef(({ className, children, orientation = "vertical", ...props }, ref) => {
    return (_jsx("div", { ref: ref, className: cn("tiptap-button-group", className), "data-orientation": orientation, role: "group", ...props, children: children }));
});
ButtonGroup.displayName = "ButtonGroup";
export default Button;
//# sourceMappingURL=button.js.map