import type { Editor } from "@tiptap/react";
import * as React from "react";
export declare const BLOCKQUOTE_SHORTCUT_KEY = "mod+shift+b";
/**
 * Configuration for the blockquote functionality
 */
export interface UseBlockquoteConfig {
    /**
     * The Tiptap editor instance.
     */
    editor?: Editor | null;
    /**
     * Whether the button should hide when blockquote is not available.
     * @default false
     */
    hideWhenUnavailable?: boolean;
    /**
     * Callback function called after a successful toggle.
     */
    onToggled?: () => void;
}
/**
 * Checks if blockquote can be toggled in the current editor state
 */
export declare function canToggleBlockquote(editor: Editor | null, turnInto?: boolean): boolean;
/**
 * Toggles blockquote formatting for a specific node or the current selection
 */
export declare function toggleBlockquote(editor: Editor | null): boolean;
/**
 * Determines if the blockquote button should be shown
 */
export declare function shouldShowButton(props: {
    editor: Editor | null;
    hideWhenUnavailable: boolean;
}): boolean;
/**
 * Custom hook that provides blockquote functionality for Tiptap editor
 *
 * @example
 * ```tsx
 * // Simple usage - no params needed
 * function MySimpleBlockquoteButton() {
 *   const { isVisible, handleToggle, isActive } = useBlockquote()
 *
 *   if (!isVisible) return null
 *
 *   return <button onClick={handleToggle}>Blockquote</button>
 * }
 *
 * // Advanced usage with configuration
 * function MyAdvancedBlockquoteButton() {
 *   const { isVisible, handleToggle, label, isActive } = useBlockquote({
 *     editor: myEditor,
 *     hideWhenUnavailable: true,
 *     onToggled: () => console.log('Blockquote toggled!')
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
 *       Toggle Blockquote
 *     </MyButton>
 *   )
 * }
 * ```
 */
export declare function useBlockquote(config?: UseBlockquoteConfig): {
    isVisible: boolean;
    isActive: boolean | undefined;
    handleToggle: () => boolean;
    canToggle: boolean;
    label: string;
    shortcutKeys: string;
    Icon: React.MemoExoticComponent<({ className, ...props }: React.SVGProps<SVGSVGElement>) => import("react/jsx-runtime").JSX.Element>;
};
//# sourceMappingURL=use-blockquote.d.ts.map