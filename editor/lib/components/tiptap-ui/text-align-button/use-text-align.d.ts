import type { ChainedCommands, Editor } from "@tiptap/react";
import * as React from "react";
export type TextAlign = "left" | "center" | "right" | "justify";
/**
 * Configuration for the text align functionality
 */
export interface UseTextAlignConfig {
    /**
     * The Tiptap editor instance.
     */
    editor?: Editor | null;
    /**
     * The text alignment to apply.
     */
    align: TextAlign;
    /**
     * Whether the button should hide when alignment is not available.
     * @default false
     */
    hideWhenUnavailable?: boolean;
    /**
     * Callback function called after a successful alignment change.
     */
    onAligned?: () => void;
}
export declare const TEXT_ALIGN_SHORTCUT_KEYS: Record<TextAlign, string>;
export declare const textAlignIcons: {
    left: React.MemoExoticComponent<({ className, ...props }: React.SVGProps<SVGSVGElement>) => import("react/jsx-runtime").JSX.Element>;
    center: React.MemoExoticComponent<({ className, ...props }: React.SVGProps<SVGSVGElement>) => import("react/jsx-runtime").JSX.Element>;
    right: React.MemoExoticComponent<({ className, ...props }: React.SVGProps<SVGSVGElement>) => import("react/jsx-runtime").JSX.Element>;
    justify: React.MemoExoticComponent<({ className, ...props }: React.SVGProps<SVGSVGElement>) => import("react/jsx-runtime").JSX.Element>;
};
export declare const textAlignLabels: Record<TextAlign, string>;
/**
 * Checks if text alignment can be performed in the current editor state
 */
export declare function canSetTextAlign(editor: Editor | null, align: TextAlign): boolean;
export declare function hasSetTextAlign(commands: ChainedCommands): commands is ChainedCommands & {
    setTextAlign: (align: TextAlign) => ChainedCommands;
};
/**
 * Checks if the text alignment is currently active
 */
export declare function isTextAlignActive(editor: Editor | null, align: TextAlign): boolean;
/**
 * Sets text alignment in the editor
 */
export declare function setTextAlign(editor: Editor | null, align: TextAlign): boolean;
/**
 * Determines if the text align button should be shown
 */
export declare function shouldShowButton(props: {
    editor: Editor | null;
    hideWhenUnavailable: boolean;
    align: TextAlign;
}): boolean;
/**
 * Custom hook that provides text align functionality for Tiptap editor
 *
 * @example
 * ```tsx
 * // Simple usage
 * function MySimpleAlignButton() {
 *   const { isVisible, handleTextAlign } = useTextAlign({ align: "center" })
 *
 *   if (!isVisible) return null
 *
 *   return <button onClick={handleTextAlign}>Align Center</button>
 * }
 *
 * // Advanced usage with configuration
 * function MyAdvancedAlignButton() {
 *   const { isVisible, handleTextAlign, label, isActive } = useTextAlign({
 *     editor: myEditor,
 *     align: "right",
 *     hideWhenUnavailable: true,
 *     onAligned: () => console.log('Text aligned!')
 *   })
 *
 *   if (!isVisible) return null
 *
 *   return (
 *     <MyButton
 *       onClick={handleTextAlign}
 *       aria-pressed={isActive}
 *       aria-label={label}
 *     >
 *       Align Right
 *     </MyButton>
 *   )
 * }
 * ```
 */
export declare function useTextAlign(config: UseTextAlignConfig): {
    isVisible: boolean;
    isActive: boolean;
    handleTextAlign: () => boolean;
    canAlign: boolean;
    label: string;
    shortcutKeys: string;
    Icon: React.MemoExoticComponent<({ className, ...props }: React.SVGProps<SVGSVGElement>) => import("react/jsx-runtime").JSX.Element> | React.MemoExoticComponent<({ className, ...props }: React.SVGProps<SVGSVGElement>) => import("react/jsx-runtime").JSX.Element> | React.MemoExoticComponent<({ className, ...props }: React.SVGProps<SVGSVGElement>) => import("react/jsx-runtime").JSX.Element> | React.MemoExoticComponent<({ className, ...props }: React.SVGProps<SVGSVGElement>) => import("react/jsx-runtime").JSX.Element>;
};
//# sourceMappingURL=use-text-align.d.ts.map