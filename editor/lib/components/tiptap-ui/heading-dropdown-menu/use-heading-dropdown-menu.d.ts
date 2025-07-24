import type { Editor } from "@tiptap/react";
import * as React from "react";
import { type Level } from "@/components/tiptap-ui/heading-button";
/**
 * Configuration for the heading dropdown menu functionality
 */
export interface UseHeadingDropdownMenuConfig {
    /**
     * The Tiptap editor instance.
     */
    editor?: Editor | null;
    /**
     * Available heading levels to show in the dropdown
     * @default [1, 2, 3, 4, 5, 6]
     */
    levels?: Level[];
    /**
     * Whether the dropdown should hide when headings are not available.
     * @default false
     */
    hideWhenUnavailable?: boolean;
}
/**
 * Gets the currently active heading level from the available levels
 */
export declare function getActiveHeadingLevel(editor: Editor | null, levels?: Level[]): Level | undefined;
/**
 * Custom hook that provides heading dropdown menu functionality for Tiptap editor
 *
 * @example
 * ```tsx
 * // Simple usage
 * function MyHeadingDropdown() {
 *   const {
 *     isVisible,
 *     activeLevel,
 *     isAnyHeadingActive,
 *     canToggle,
 *     levels,
 *   } = useHeadingDropdownMenu()
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
 * function MyAdvancedHeadingDropdown() {
 *   const {
 *     isVisible,
 *     activeLevel,
 *   } = useHeadingDropdownMenu({
 *     editor: myEditor,
 *     levels: [1, 2, 3],
 *     hideWhenUnavailable: true,
 *   })
 *
 *   // component implementation
 * }
 * ```
 */
export declare function useHeadingDropdownMenu(config?: UseHeadingDropdownMenuConfig): {
    isVisible: boolean;
    activeLevel: Level | undefined;
    isActive: boolean;
    canToggle: boolean;
    levels: Level[];
    label: string;
    Icon: React.MemoExoticComponent<({ className, ...props }: React.SVGProps<SVGSVGElement>) => import("react/jsx-runtime").JSX.Element>;
};
//# sourceMappingURL=use-heading-dropdown-menu.d.ts.map