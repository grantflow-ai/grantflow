import * as React from "react";
import type { Editor } from "@tiptap/react";
import type { ButtonProps } from "@/components/tiptap-ui-primitive/button";
import type { HighlightColor, UseColorHighlightConfig } from "@/components/tiptap-ui/color-highlight-button";
export interface ColorHighlightPopoverContentProps {
    /**
     * The Tiptap editor instance.
     */
    editor?: Editor | null;
    /**
     * Optional colors to use in the highlight popover.
     * If not provided, defaults to a predefined set of colors.
     */
    colors?: HighlightColor[];
}
export interface ColorHighlightPopoverProps extends Omit<ButtonProps, "type">, Pick<UseColorHighlightConfig, "editor" | "hideWhenUnavailable" | "onApplied"> {
    /**
     * Optional colors to use in the highlight popover.
     * If not provided, defaults to a predefined set of colors.
     */
    colors?: HighlightColor[];
}
export declare const ColorHighlightPopoverButton: React.ForwardRefExoticComponent<ButtonProps & React.RefAttributes<HTMLButtonElement>>;
export declare function ColorHighlightPopoverContent({ editor, colors, }: ColorHighlightPopoverContentProps): import("react/jsx-runtime").JSX.Element;
export declare function ColorHighlightPopover({ editor: providedEditor, colors, hideWhenUnavailable, onApplied, ...props }: ColorHighlightPopoverProps): import("react/jsx-runtime").JSX.Element | null;
export default ColorHighlightPopover;
//# sourceMappingURL=color-highlight-popover.d.ts.map