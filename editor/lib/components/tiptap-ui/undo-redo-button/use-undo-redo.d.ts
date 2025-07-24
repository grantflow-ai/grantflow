import type { Editor } from "@tiptap/react";
import * as React from "react";
export type UndoRedoAction = "undo" | "redo";
/**
 * Configuration for the history functionality
 */
export interface UseUndoRedoConfig {
    /**
     * The Tiptap editor instance.
     */
    editor?: Editor | null;
    /**
     * The history action to perform (undo or redo).
     */
    action: UndoRedoAction;
    /**
     * Whether the button should hide when action is not available.
     * @default false
     */
    hideWhenUnavailable?: boolean;
    /**
     * Callback function called after a successful action execution.
     */
    onExecuted?: () => void;
}
export declare const UNDO_REDO_SHORTCUT_KEYS: Record<UndoRedoAction, string>;
export declare const historyActionLabels: Record<UndoRedoAction, string>;
export declare const historyIcons: {
    undo: React.MemoExoticComponent<({ className, ...props }: React.SVGProps<SVGSVGElement>) => import("react/jsx-runtime").JSX.Element>;
    redo: React.MemoExoticComponent<({ className, ...props }: React.SVGProps<SVGSVGElement>) => import("react/jsx-runtime").JSX.Element>;
};
/**
 * Checks if a history action can be executed
 */
export declare function canExecuteUndoRedoAction(editor: Editor | null, action: UndoRedoAction): boolean;
/**
 * Executes a history action on the editor
 */
export declare function executeUndoRedoAction(editor: Editor | null, action: UndoRedoAction): boolean;
/**
 * Determines if the history button should be shown
 */
export declare function shouldShowButton(props: {
    editor: Editor | null;
    hideWhenUnavailable: boolean;
    action: UndoRedoAction;
}): boolean;
/**
 * Custom hook that provides history functionality for Tiptap editor
 *
 * @example
 * ```tsx
 * // Simple usage
 * function MySimpleUndoButton() {
 *   const { isVisible, handleAction } = useHistory({ action: "undo" })
 *
 *   if (!isVisible) return null
 *
 *   return <button onClick={handleAction}>Undo</button>
 * }
 *
 * // Advanced usage with configuration
 * function MyAdvancedRedoButton() {
 *   const { isVisible, handleAction, label } = useHistory({
 *     editor: myEditor,
 *     action: "redo",
 *     hideWhenUnavailable: true,
 *     onExecuted: () => console.log('Action executed!')
 *   })
 *
 *   if (!isVisible) return null
 *
 *   return (
 *     <MyButton
 *       onClick={handleAction}
 *       aria-label={label}
 *     >
 *       Redo
 *     </MyButton>
 *   )
 * }
 * ```
 */
export declare function useUndoRedo(config: UseUndoRedoConfig): {
    isVisible: boolean;
    handleAction: () => boolean;
    canExecute: boolean;
    label: string;
    shortcutKeys: string;
    Icon: React.MemoExoticComponent<({ className, ...props }: React.SVGProps<SVGSVGElement>) => import("react/jsx-runtime").JSX.Element> | React.MemoExoticComponent<({ className, ...props }: React.SVGProps<SVGSVGElement>) => import("react/jsx-runtime").JSX.Element>;
};
//# sourceMappingURL=use-undo-redo.d.ts.map