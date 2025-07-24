import type { Editor } from "@tiptap/react";
import { type ListType } from "@/components/tiptap-ui/list-button";
import type { ButtonProps } from "@/components/tiptap-ui-primitive/button";
export interface ListDropdownMenuProps extends Omit<ButtonProps, "type"> {
    /**
     * The Tiptap editor instance.
     */
    editor?: Editor;
    /**
     * The list types to display in the dropdown.
     */
    types?: ListType[];
    /**
     * Whether the dropdown should be hidden when no list types are available
     * @default false
     */
    hideWhenUnavailable?: boolean;
    /**
     * Callback for when the dropdown opens or closes
     */
    onOpenChange?: (isOpen: boolean) => void;
    /**
     * Whether to render the dropdown menu in a portal
     * @default false
     */
    portal?: boolean;
}
export declare function ListDropdownMenu({ editor: providedEditor, types, hideWhenUnavailable, onOpenChange, portal, ...props }: ListDropdownMenuProps): import("react/jsx-runtime").JSX.Element | null;
export default ListDropdownMenu;
//# sourceMappingURL=list-dropdown-menu.d.ts.map