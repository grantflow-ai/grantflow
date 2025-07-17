import type { Editor } from "@tiptap/react";
import * as React from "react";

// --- Hooks ---
import { useTiptapEditor } from "../../../hooks/use-tiptap-editor";

// --- Icons ---
import { Redo2Icon } from "../../tiptap-icons/redo2-icon";
import { Undo2Icon } from "../../tiptap-icons/undo2-icon";

// --- UI Primitives ---
import type { ButtonProps } from "../../tiptap-ui-primitive/button";
import { Button } from "../../tiptap-ui-primitive/button";

export type HistoryAction = "redo" | "undo";

/**
 * Props for the UndoRedoButton component.
 */
export interface UndoRedoButtonProps extends ButtonProps {
	/**
	 * The history action to perform (undo or redo).
	 */
	action: HistoryAction;
	/**
	 * The TipTap editor instance.
	 */
	editor?: Editor | null;
	/**
	 * Optional text to display alongside the icon.
	 */
	text?: string;
}

export const historyIcons = {
	redo: Redo2Icon,
	undo: Undo2Icon,
};

export const historyShortcutKeys: Partial<Record<HistoryAction, string>> = {
	redo: "Ctrl-Shift-z",
	undo: "Ctrl-z",
};

export const historyActionLabels: Record<HistoryAction, string> = {
	redo: "Redo",
	undo: "Undo",
};

/**
 * Checks if a history action can be executed.
 *
 * @param editor The TipTap editor instance
 * @param action The history action to check
 * @returns Whether the action can be executed
 */
export function canExecuteHistoryAction(editor: Editor | null, action: HistoryAction): boolean {
	if (!editor) return false;
	return action === "undo" ? editor.can().undo() : editor.can().redo();
}

/**
 * Executes a history action on the editor.
 *
 * @param editor The TipTap editor instance
 * @param action The history action to execute
 * @returns Whether the action was executed successfully
 */
export function executeHistoryAction(editor: Editor | null, action: HistoryAction): boolean {
	if (!editor) return false;
	const chain = editor.chain().focus();
	return action === "undo" ? chain.undo().run() : chain.redo().run();
}

/**
 * Determines if a history action should be disabled.
 *
 * @param editor The TipTap editor instance
 * @param action The history action to check
 * @param userDisabled Whether the action is explicitly disabled by the user
 * @returns Whether the action should be disabled
 */
export function isHistoryActionDisabled(editor: Editor | null, action: HistoryAction, userDisabled = false): boolean {
	if (userDisabled) return true;
	return !canExecuteHistoryAction(editor, action);
}

/**
 * Hook that provides all the necessary state and handlers for a history action.
 *
 * @param editor The TipTap editor instance
 * @param action The history action to handle
 * @param disabled Whether the action is explicitly disabled
 * @returns Object containing state and handlers for the history action
 */
export function useHistoryAction(editor: Editor | null, action: HistoryAction, disabled = false) {
	const canExecute = React.useMemo(() => canExecuteHistoryAction(editor, action), [editor, action]);

	const isDisabled = isHistoryActionDisabled(editor, action, disabled);

	const handleAction = React.useCallback(() => {
		if (!editor || isDisabled) return;
		executeHistoryAction(editor, action);
	}, [editor, action, isDisabled]);

	const Icon = historyIcons[action];
	const actionLabel = historyActionLabels[action];
	const shortcutKey = historyShortcutKeys[action];

	return {
		actionLabel,
		canExecute,
		handleAction,
		Icon,
		isDisabled,
		shortcutKey,
	};
}

/**
 * Button component for triggering undo/redo actions in a TipTap editor.
 */
export const UndoRedoButton = React.forwardRef<HTMLButtonElement, UndoRedoButtonProps>(
	({ action, children, className = "", disabled, editor: providedEditor, onClick, text, ...buttonProps }, ref) => {
		const editor = useTiptapEditor(providedEditor);

		const { actionLabel, handleAction, Icon, isDisabled, shortcutKey } = useHistoryAction(editor, action, disabled);

		const handleClick = React.useCallback(
			(e: React.MouseEvent<HTMLButtonElement>) => {
				onClick?.(e);

				if (!(e.defaultPrevented || disabled)) {
					handleAction();
				}
			},
			[onClick, disabled, handleAction],
		);

		if (!editor?.isEditable) {
			return null;
		}

		return (
			<Button
				aria-label={actionLabel}
				className={className.trim()}
				data-disabled={isDisabled}
				data-style="ghost"
				disabled={isDisabled}
				onClick={handleClick}
				ref={ref}
				shortcutKeys={shortcutKey}
				tooltip={actionLabel}
				type="button"
				{...buttonProps}
			>
				{children || (
					<>
						<Icon className="tiptap-button-icon" />
						{text && <span className="tiptap-button-text">{text}</span>}
					</>
				)}
			</Button>
		);
	},
);

UndoRedoButton.displayName = "UndoRedoButton";

export default UndoRedoButton;
