import * as React from "react";
import type { Editor } from "@tiptap/react";
import type { UseLinkPopoverConfig } from "@/components/tiptap-ui/link-popover";
import type { ButtonProps } from "@/components/tiptap-ui-primitive/button";
export interface LinkMainProps {
    /**
     * The URL to set for the link.
     */
    url: string;
    /**
     * Function to update the URL state.
     */
    setUrl: React.Dispatch<React.SetStateAction<string | null>>;
    /**
     * Function to set the link in the editor.
     */
    setLink: () => void;
    /**
     * Function to remove the link from the editor.
     */
    removeLink: () => void;
    /**
     * Function to open the link.
     */
    openLink: () => void;
    /**
     * Whether the link is currently active in the editor.
     */
    isActive: boolean;
}
export interface LinkPopoverProps extends Omit<ButtonProps, "type">, UseLinkPopoverConfig {
    /**
     * Callback for when the popover opens or closes.
     */
    onOpenChange?: (isOpen: boolean) => void;
    /**
     * Whether to automatically open the popover when a link is active.
     * @default true
     */
    autoOpenOnLinkActive?: boolean;
}
/**
 * Link button component for triggering the link popover
 */
export declare const LinkButton: React.ForwardRefExoticComponent<ButtonProps & React.RefAttributes<HTMLButtonElement>>;
/**
 * Link content component for standalone use
 */
export declare const LinkContent: React.FC<{
    editor?: Editor | null;
}>;
/**
 * Link popover component for Tiptap editors.
 *
 * For custom popover implementations, use the `useLinkPopover` hook instead.
 */
export declare const LinkPopover: React.ForwardRefExoticComponent<LinkPopoverProps & React.RefAttributes<HTMLButtonElement>>;
export default LinkPopover;
//# sourceMappingURL=link-popover.d.ts.map