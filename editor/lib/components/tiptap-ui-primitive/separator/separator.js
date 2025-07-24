import { jsx as _jsx } from "react/jsx-runtime";
import * as React from "react";
import "@/components/tiptap-ui-primitive/separator/separator.scss";
import { cn } from "@/lib/tiptap-utils";
export const Separator = React.forwardRef(({ decorative, orientation = "vertical", className, ...divProps }, ref) => {
    const ariaOrientation = orientation === "vertical" ? orientation : undefined;
    const semanticProps = decorative
        ? { role: "none" }
        : { "aria-orientation": ariaOrientation, role: "separator" };
    return (_jsx("div", { className: cn("tiptap-separator", className), "data-orientation": orientation, ...semanticProps, ...divProps, ref: ref }));
});
Separator.displayName = "Separator";
//# sourceMappingURL=separator.js.map