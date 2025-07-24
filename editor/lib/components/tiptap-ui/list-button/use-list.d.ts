import type { Editor } from "@tiptap/react";
import * as React from "react";
export type ListType = "bulletList" | "orderedList" | "taskList";
/**
 * Configuration for the list functionality
 */
export interface UseListConfig {
    /**
     * The Tiptap editor instance.
     */
    editor?: Editor | null;
    /**
     * The type of list to toggle.
     */
    type: ListType;
    /**
     * Whether the button should hide when list is not available.
     * @default false
     */
    hideWhenUnavailable?: boolean;
    /**
     * Callback function called after a successful toggle.
     */
    onToggled?: () => void;
}
export declare const listIcons: {
    bulletList: React.MemoExoticComponent<({ className, ...props }: React.SVGProps<SVGSVGElement>) => import("react/jsx-runtime").JSX.Element>;
    orderedList: React.MemoExoticComponent<({ className, ...props }: React.SVGProps<SVGSVGElement>) => import("react/jsx-runtime").JSX.Element>;
    taskList: React.MemoExoticComponent<({ className, ...props }: React.SVGProps<SVGSVGElement>) => import("react/jsx-runtime").JSX.Element>;
};
export declare const listLabels: Record<ListType, string>;
export declare const LIST_SHORTCUT_KEYS: Record<ListType, string>;
/**
 * Checks if a list can be toggled in the current editor state
 */
export declare function canToggleList(editor: Editor | null, type: ListType, turnInto?: boolean): boolean;
/**
 * Checks if list is currently active
 */
export declare function isListActive(editor: Editor | null, type: ListType): boolean;
/**
 * Toggles list in the editor
 */
export declare function toggleList(editor: Editor | null, type: ListType): boolean;
/**
 * Determines if the list button should be shown
 */
export declare function shouldShowButton(props: {
    editor: Editor | null;
    type: ListType;
    hideWhenUnavailable: boolean;
}): boolean;
/**
 * Custom hook that provides list functionality for Tiptap editor
 *
 * @example
 * ```tsx
 * // Simple usage
 * function MySimpleListButton() {
 *   const { isVisible, handleToggle, isActive } = useList({ type: "bulletList" })
 *
 *   if (!isVisible) return null
 *
 *   return <button onClick={handleToggle}>Bullet List</button>
 * }
 *
 * // Advanced usage with configuration
 * function MyAdvancedListButton() {
 *   const { isVisible, handleToggle, label, isActive } = useList({
 *     type: "orderedList",
 *     editor: myEditor,
 *     hideWhenUnavailable: true,
 *     onToggled: () => console.log('List toggled!')
 *   })
 *
 *   if (!isVisible) return null
 *
 *   return (
 *     <MyButton
 *       onClick={handleToggle}
 *       aria-label={label}
 *       aria-pressed={isActive}
 *     >
 *       Toggle List
 *     </MyButton>
 *   )
 * }
 * ```
 */
export declare function useList(config: UseListConfig): {
    isVisible: boolean;
    isActive: boolean;
    handleToggle: () => boolean;
    canToggle: boolean;
    label: string;
    shortcutKeys: string;
    Icon: React.MemoExoticComponent<({ className, ...props }: React.SVGProps<SVGSVGElement>) => import("react/jsx-runtime").JSX.Element> | React.MemoExoticComponent<({ className, ...props }: React.SVGProps<SVGSVGElement>) => import("react/jsx-runtime").JSX.Element> | React.MemoExoticComponent<({ className, ...props }: React.SVGProps<SVGSVGElement>) => import("react/jsx-runtime").JSX.Element>;
};
//# sourceMappingURL=use-list.d.ts.map