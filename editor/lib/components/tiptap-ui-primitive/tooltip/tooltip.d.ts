import * as React from "react";
import { FloatingPortal, type Placement } from "@floating-ui/react";
import "@/components/tiptap-ui-primitive/tooltip/tooltip.scss";
interface TooltipProviderProps {
    children: React.ReactNode;
    initialOpen?: boolean;
    placement?: Placement;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    delay?: number;
    closeDelay?: number;
    timeout?: number;
    useDelayGroup?: boolean;
}
interface TooltipTriggerProps extends Omit<React.HTMLProps<HTMLElement>, "ref"> {
    asChild?: boolean;
    children: React.ReactNode;
}
interface TooltipContentProps extends Omit<React.HTMLProps<HTMLDivElement>, "ref"> {
    children?: React.ReactNode;
    portal?: boolean;
    portalProps?: Omit<React.ComponentProps<typeof FloatingPortal>, "children">;
}
export declare function Tooltip({ children, ...props }: TooltipProviderProps): import("react/jsx-runtime").JSX.Element;
export declare namespace Tooltip {
    var displayName: string;
}
export declare const TooltipTrigger: React.ForwardRefExoticComponent<TooltipTriggerProps & React.RefAttributes<HTMLElement>>;
export declare const TooltipContent: React.ForwardRefExoticComponent<TooltipContentProps & React.RefAttributes<HTMLDivElement>>;
export {};
//# sourceMappingURL=tooltip.d.ts.map