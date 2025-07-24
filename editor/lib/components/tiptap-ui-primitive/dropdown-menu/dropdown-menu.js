import { jsx as _jsx } from "react/jsx-runtime";
import * as React from "react";
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import { cn } from "@/lib/tiptap-utils";
import "@/components/tiptap-ui-primitive/dropdown-menu/dropdown-menu.scss";
function DropdownMenu({ ...props }) {
    return _jsx(DropdownMenuPrimitive.Root, { modal: false, ...props });
}
function DropdownMenuPortal({ ...props }) {
    return _jsx(DropdownMenuPrimitive.Portal, { ...props });
}
const DropdownMenuTrigger = React.forwardRef(({ ...props }, ref) => _jsx(DropdownMenuPrimitive.Trigger, { ref: ref, ...props }));
DropdownMenuTrigger.displayName = DropdownMenuPrimitive.Trigger.displayName;
const DropdownMenuGroup = DropdownMenuPrimitive.Group;
const DropdownMenuSub = DropdownMenuPrimitive.Sub;
const DropdownMenuRadioGroup = DropdownMenuPrimitive.RadioGroup;
const DropdownMenuItem = DropdownMenuPrimitive.Item;
const DropdownMenuSubTrigger = DropdownMenuPrimitive.SubTrigger;
const DropdownMenuSubContent = React.forwardRef(({ className, portal = true, ...props }, ref) => {
    const content = (_jsx(DropdownMenuPrimitive.SubContent, { ref: ref, className: cn("tiptap-dropdown-menu", className), ...props }));
    return portal ? (_jsx(DropdownMenuPortal, { ...(typeof portal === "object" ? portal : {}), children: content })) : (content);
});
DropdownMenuSubContent.displayName =
    DropdownMenuPrimitive.SubContent.displayName;
const DropdownMenuContent = React.forwardRef(({ className, sideOffset = 4, portal = false, ...props }, ref) => {
    const content = (_jsx(DropdownMenuPrimitive.Content, { ref: ref, sideOffset: sideOffset, onCloseAutoFocus: (e) => e.preventDefault(), className: cn("tiptap-dropdown-menu", className), ...props }));
    return portal ? (_jsx(DropdownMenuPortal, { ...(typeof portal === "object" ? portal : {}), children: content })) : (content);
});
DropdownMenuContent.displayName = DropdownMenuPrimitive.Content.displayName;
export { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuGroup, DropdownMenuSub, DropdownMenuPortal, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuRadioGroup, };
//# sourceMappingURL=dropdown-menu.js.map