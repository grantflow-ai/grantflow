import type { Editor } from "@tiptap/react";
import * as React from "react";
export declare const CODE_BLOCK_SHORTCUT_KEY = "mod+alt+c";
/**
 * Configuration for the code block functionality
 */
export interface UseCodeBlockConfig {
    /**
     * The Tiptap editor instance.
     */
    editor?: Editor | null;
    /**
     * Whether the button should hide when code block is not available.
     * @default false
     */
    hideWhenUnavailable?: boolean;
    /**
     * Callback function called after a successful code block toggle.
     */
    onToggled?: () => void;
}
/**
 * Checks if code block can be toggled in the current editor state
 */
export declare function canToggle(editor: Editor | null, turnInto?: boolean): boolean;
/**
 * Toggles code block in the editor
 */
export declare function toggleCodeBlock(editor: Editor | null): boolean;
/**
 * Determines if the code block button should be shown
 */
export declare function shouldShowButton(props: {
    editor: Editor | null;
    hideWhenUnavailable: boolean;
}): boolean;
/**
 * Custom hook that provides code block functionality for Tiptap editor
 *
 * @example
 * ```tsx
 * // Simple usage - no params needed
 * function MySimpleCodeBlockButton() {
 *   const { isVisible, isActive, handleToggle } = useCodeBlock()
 *
 *   if (!isVisible) return null
 *
 *   return (
 *     <button
 *       onClick={handleToggle}
 *       aria-pressed={isActive}
 *     >
 *       Code Block
 *     </button>
 *   )
 * }
 *
 * // Advanced usage with configuration
 * function MyAdvancedCodeBlockButton() {
 *   const { isVisible, isActive, handleToggle, label } = useCodeBlock({
 *     editor: myEditor,
 *     hideWhenUnavailable: true,
 *     onToggled: (isActive) => console.log('Code block toggled:', isActive)
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
 *       Toggle Code Block
 *     </MyButton>
 *   )
 * }
 * ```
 */
export declare function useCodeBlock(config?: UseCodeBlockConfig): {
    isVisible: boolean;
    isActive: boolean | undefined;
    handleToggle: () => boolean;
    canToggle: boolean;
    label: string;
    shortcutKeys: string;
    Icon: React.MemoExoticComponent<({ className, ...props }: React.SVGProps<SVGSVGElement>) => import("react/jsx-runtime").JSX.Element>;
};
//# sourceMappingURL=use-code-block.d.ts.map