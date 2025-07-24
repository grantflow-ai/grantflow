import type * as React from "react";
export type SpacerOrientation = "horizontal" | "vertical";
export interface SpacerProps extends React.HTMLAttributes<HTMLDivElement> {
    orientation?: SpacerOrientation;
    size?: string | number;
}
export declare function Spacer({ orientation, size, style, ...props }: SpacerProps): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=spacer.d.ts.map