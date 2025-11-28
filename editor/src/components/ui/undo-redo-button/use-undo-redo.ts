"use client";

import type { Editor } from "@tiptap/react";
import * as React from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { Redo2Icon } from "@/components/icons/redo2-icon";
import { Undo2Icon } from "@/components/icons/undo2-icon";
import { useTiptapEditor } from "@/hooks/use-tiptap-editor";
import { isNodeTypeSelected } from "@/utils";

export type UndoRedoAction = "undo" | "redo";

export interface UseUndoRedoConfig {
	editor?: Editor | null | undefined;
	action: UndoRedoAction;
	hideWhenUnavailable?: boolean | undefined;
	onExecuted?: (() => void) | undefined;
}

export const UNDO_REDO_SHORTCUT_KEYS: Record<UndoRedoAction, string> = {
	redo: "mod+shift+z",
	undo: "mod+z",
};

export const historyActionLabels: Record<UndoRedoAction, string> = {
	redo: "Redo",
	undo: "Undo",
};

export const historyIcons = {
	redo: Redo2Icon,
	undo: Undo2Icon,
};

export function canExecuteUndoRedoAction(editor: Editor | null, action: UndoRedoAction): boolean {
	if (!editor?.isEditable) return false;
	if (isNodeTypeSelected(editor, ["image"])) return false;

	return action === "undo" ? editor.can().undo() : editor.can().redo();
}

export function executeUndoRedoAction(editor: Editor | null, action: UndoRedoAction): boolean {
	if (!editor?.isEditable) return false;
	if (!canExecuteUndoRedoAction(editor, action)) return false;

	const chain = editor.chain().focus();
	return action === "undo" ? chain.undo().run() : chain.redo().run();
}

export function shouldShowButton(props: {
	editor: Editor | null;
	hideWhenUnavailable: boolean;
	action: UndoRedoAction;
}): boolean {
	const { editor, hideWhenUnavailable, action } = props;

	if (!editor?.isEditable) return false;

	if (hideWhenUnavailable && !editor.isActive("code")) {
		return canExecuteUndoRedoAction(editor, action);
	}

	return true;
}

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
export function useUndoRedo(config: UseUndoRedoConfig) {
	const { editor: providedEditor, action, hideWhenUnavailable = false, onExecuted } = config;

	const { editor } = useTiptapEditor(providedEditor);
	const [isVisible, setIsVisible] = React.useState<boolean>(true);
	const canExecute = canExecuteUndoRedoAction(editor, action);

	React.useEffect(() => {
		if (!editor) return;

		const handleUpdate = () => {
			setIsVisible(shouldShowButton({ action, editor, hideWhenUnavailable }));
		};

		handleUpdate();

		editor.on("transaction", handleUpdate);

		return () => {
			editor.off("transaction", handleUpdate);
		};
	}, [editor, hideWhenUnavailable, action]);

	const handleAction = React.useCallback(() => {
		if (!editor) return false;

		const success = executeUndoRedoAction(editor, action);
		if (success) {
			onExecuted?.();
		}
		return success;
	}, [editor, action, onExecuted]);

	useHotkeys(
		UNDO_REDO_SHORTCUT_KEYS[action],
		(event) => {
			event.preventDefault();
			handleAction();
		},
		{
			enabled: isVisible && canExecute,
			enableOnContentEditable: true,
			enableOnFormTags: true,
		},
	);

	return {
		canExecute,
		handleAction,
		Icon: historyIcons[action],
		isVisible,
		label: historyActionLabels[action],
		shortcutKeys: UNDO_REDO_SHORTCUT_KEYS[action],
	};
}
