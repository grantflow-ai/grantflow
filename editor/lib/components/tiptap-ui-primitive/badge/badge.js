import { jsx as _jsx } from "react/jsx-runtime";
import * as React from "react";
import "@/components/tiptap-ui-primitive/badge/badge-colors.scss";
import "@/components/tiptap-ui-primitive/badge/badge-group.scss";
import "@/components/tiptap-ui-primitive/badge/badge.scss";
export const Badge = React.forwardRef(({ variant, size = "default", appearance = "default", trimText = false, className, children, ...props }, ref) => {
    return (_jsx("div", { ref: ref, className: `tiptap-badge ${className || ""}`, "data-style": variant, "data-size": size, "data-appearance": appearance, "data-text-trim": trimText ? "on" : "off", ...props, children: children }));
});
Badge.displayName = "Badge";
export default Badge;
//# sourceMappingURL=badge.js.map