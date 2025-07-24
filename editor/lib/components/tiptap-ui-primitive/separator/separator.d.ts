import * as React from "react";
import "@/components/tiptap-ui-primitive/separator/separator.scss";
export type Orientation = "horizontal" | "vertical";
export interface SeparatorProps extends React.HTMLAttributes<HTMLDivElement> {
    orientation?: Orientation;
    decorative?: boolean;
}
export declare const Separator: React.ForwardRefExoticComponent<SeparatorProps & React.RefAttributes<HTMLDivElement>>;
//# sourceMappingURL=separator.d.ts.map