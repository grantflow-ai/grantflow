import * as React from "react";
import "@/components/tiptap-ui-primitive/toolbar/toolbar.scss";
type BaseProps = React.HTMLAttributes<HTMLDivElement>;
interface ToolbarProps extends BaseProps {
    variant?: "floating" | "fixed";
}
export declare const Toolbar: React.ForwardRefExoticComponent<ToolbarProps & React.RefAttributes<HTMLDivElement>>;
export declare const ToolbarGroup: React.ForwardRefExoticComponent<BaseProps & React.RefAttributes<HTMLDivElement>>;
export declare const ToolbarSeparator: React.ForwardRefExoticComponent<BaseProps & {
    fixed?: boolean;
} & React.RefAttributes<HTMLDivElement>>;
export {};
//# sourceMappingURL=toolbar.d.ts.map