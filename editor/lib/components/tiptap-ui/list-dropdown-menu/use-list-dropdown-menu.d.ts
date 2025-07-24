import type { Editor } from "@tiptap/react";
import * as React from "react";
import { type ListType } from "@/components/tiptap-ui/list-button";
/**
 * Configuration for the list dropdown menu functionality
 */
export interface UseListDropdownMenuConfig {
    /**
     * The Tiptap editor instance.
     */
    editor?: Editor | null;
    /**
     * The list types to display in the dropdown.
     * @default ["bulletList", "orderedList", "taskList"]
     */
    types?: ListType[];
    /**
     * Whether the dropdown should be hidden when no list types are available
     * @default false
     */
    hideWhenUnavailable?: boolean;
}
export interface ListOption {
    label: string;
    type: ListType;
    icon: React.ElementType;
}
export declare const listOptions: ListOption[];
export declare function canToggleAnyList(editor: Editor | null, listTypes: ListType[]): boolean;
export declare function isAnyListActive(editor: Editor | null, listTypes: ListType[]): boolean;
export declare function getFilteredListOptions(availableTypes: ListType[]): typeof listOptions;
export declare function shouldShowListDropdown(params: {
    editor: Editor | null;
    listTypes: ListType[];
    hideWhenUnavailable: boolean;
    listInSchema: boolean;
    canToggleAny: boolean;
}): boolean;
/**
 * Gets the currently active list type from the available types
 */
export declare function getActiveListType(editor: Editor | null, availableTypes: ListType[]): ListType | undefined;
/**
 * Custom hook that provides list dropdown menu functionality for Tiptap editor
 *
 * @example
 * ```tsx
 * // Simple usage
 * function MyListDropdown() {
 *   const {
 *     isVisible,
 *     activeType,
 *     isAnyActive,
 *     canToggleAny,
 *     filteredLists,
 *   } = useListDropdownMenu()
 *
 *   if (!isVisible) return null
 *
 *   return (
 *     <DropdownMenu>
 *       // dropdown content
 *     </DropdownMenu>
 *   )
 * }
 *
 * // Advanced usage with configuration
 * function MyAdvancedListDropdown() {
 *   const {
 *     isVisible,
 *     activeType,
 *   } = useListDropdownMenu({
 *     editor: myEditor,
 *     types: ["bulletList", "orderedList"],
 *     hideWhenUnavailable: true,
 *   })
 *
 *   // component implementation
 * }
 * ```
 */
export declare function useListDropdownMenu(config?: UseListDropdownMenuConfig): {
    isVisible: boolean;
    activeType: ListType | undefined;
    isActive: boolean;
    canToggle: boolean;
    types: ListType[];
    filteredLists: ListOption[];
    label: string;
    Icon: React.MemoExoticComponent<({ className, ...props }: React.SVGProps<SVGSVGElement>) => import("react/jsx-runtime").JSX.Element>;
};
//# sourceMappingURL=use-list-dropdown-menu.d.ts.map