import * as React from "react";
import type { UseHeadingDropdownMenuConfig } from "@/components/tiptap-ui/heading-dropdown-menu";
import type { ButtonProps } from "@/components/tiptap-ui-primitive/button";
export interface HeadingDropdownMenuProps extends Omit<ButtonProps, "type">, UseHeadingDropdownMenuConfig {
    /**
     * Whether to render the dropdown menu in a portal
     * @default false
     */
    portal?: boolean;
    /**
     * Callback for when the dropdown opens or closes
     */
    onOpenChange?: (isOpen: boolean) => void;
}
/**
 * Dropdown menu component for selecting heading levels in a Tiptap editor.
 *
 * For custom dropdown implementations, use the `useHeadingDropdownMenu` hook instead.
 */
export declare const HeadingDropdownMenu: React.ForwardRefExoticComponent<HeadingDropdownMenuProps & React.RefAttributes<HTMLButtonElement>>;
export default HeadingDropdownMenu;
//# sourceMappingURL=heading-dropdown-menu.d.ts.map