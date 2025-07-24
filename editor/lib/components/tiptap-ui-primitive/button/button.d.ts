import * as React from "react";
import "@/components/tiptap-ui-primitive/button/button-colors.scss";
import "@/components/tiptap-ui-primitive/button/button-group.scss";
import "@/components/tiptap-ui-primitive/button/button.scss";
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    className?: string;
    showTooltip?: boolean;
    tooltip?: React.ReactNode;
    shortcutKeys?: string;
}
export declare const ShortcutDisplay: React.FC<{
    shortcuts: string[];
}>;
export declare const Button: React.ForwardRefExoticComponent<ButtonProps & React.RefAttributes<HTMLButtonElement>>;
export declare const ButtonGroup: React.ForwardRefExoticComponent<Omit<React.ClassAttributes<HTMLDivElement> & React.HTMLAttributes<HTMLDivElement> & {
    orientation?: "horizontal" | "vertical";
}, "ref"> & React.RefAttributes<HTMLDivElement>>;
export default Button;
//# sourceMappingURL=button.d.ts.map