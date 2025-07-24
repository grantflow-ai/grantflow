import { jsx as _jsx } from "react/jsx-runtime";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { cn } from "@/lib/tiptap-utils";
import "@/components/tiptap-ui-primitive/popover/popover.scss";
function Popover({ ...props }) {
    return _jsx(PopoverPrimitive.Root, { ...props });
}
function PopoverTrigger({ ...props }) {
    return _jsx(PopoverPrimitive.Trigger, { ...props });
}
function PopoverContent({ className, align = "center", sideOffset = 4, ...props }) {
    return (_jsx(PopoverPrimitive.Portal, { children: _jsx(PopoverPrimitive.Content, { align: align, sideOffset: sideOffset, className: cn("tiptap-popover", className), ...props }) }));
}
export { Popover, PopoverTrigger, PopoverContent };
//# sourceMappingURL=popover.js.map