"use client";
import { jsx as _jsx } from "react/jsx-runtime";
import * as React from "react";
import { cn } from "@/lib/tiptap-utils";
import "@/components/tiptap-ui-primitive/card/card.scss";
const Card = React.forwardRef(({ className, ...props }, ref) => {
    return _jsx("div", { ref: ref, className: cn("tiptap-card", className), ...props });
});
Card.displayName = "Card";
const CardHeader = React.forwardRef(({ className, ...props }, ref) => {
    return (_jsx("div", { ref: ref, className: cn("tiptap-card-header", className), ...props }));
});
CardHeader.displayName = "CardHeader";
const CardBody = React.forwardRef(({ className, ...props }, ref) => {
    return (_jsx("div", { ref: ref, className: cn("tiptap-card-body", className), ...props }));
});
CardBody.displayName = "CardBody";
const CardItemGroup = React.forwardRef(({ className, orientation = "vertical", ...props }, ref) => {
    return (_jsx("div", { ref: ref, "data-orientation": orientation, className: cn("tiptap-card-item-group", className), ...props }));
});
CardItemGroup.displayName = "CardItemGroup";
const CardGroupLabel = React.forwardRef(({ className, ...props }, ref) => {
    return (_jsx("div", { ref: ref, className: cn("tiptap-card-group-label", className), ...props }));
});
CardGroupLabel.displayName = "CardGroupLabel";
const CardFooter = React.forwardRef(({ className, ...props }, ref) => {
    return (_jsx("div", { ref: ref, className: cn("tiptap-card-footer", className), ...props }));
});
CardFooter.displayName = "CardFooter";
export { Card, CardHeader, CardFooter, CardBody, CardItemGroup, CardGroupLabel };
//# sourceMappingURL=card.js.map