import { jsx as _jsx } from "react/jsx-runtime";
import { cn } from "@/lib/tiptap-utils";
import "@/components/tiptap-ui-primitive/input/input.scss";
function Input({ className, type, ...props }) {
    return (_jsx("input", { type: type, className: cn("tiptap-input", className), ...props }));
}
function InputGroup({ className, children, ...props }) {
    return (_jsx("div", { className: cn("tiptap-input-group", className), ...props, children: children }));
}
export { Input, InputGroup };
//# sourceMappingURL=input.js.map