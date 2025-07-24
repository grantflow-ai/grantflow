import * as React from "react";
import "@/components/tiptap-ui-primitive/badge/badge-colors.scss";
import "@/components/tiptap-ui-primitive/badge/badge-group.scss";
import "@/components/tiptap-ui-primitive/badge/badge.scss";
export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
    variant?: "ghost" | "white" | "gray" | "green" | "default";
    size?: "default" | "small";
    appearance?: "default" | "subdued" | "emphasized";
    trimText?: boolean;
}
export declare const Badge: React.ForwardRefExoticComponent<BadgeProps & React.RefAttributes<HTMLDivElement>>;
export default Badge;
//# sourceMappingURL=badge.d.ts.map