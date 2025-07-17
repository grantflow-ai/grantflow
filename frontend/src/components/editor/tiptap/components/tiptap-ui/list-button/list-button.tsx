import { type Editor, isNodeSelection } from "@tiptap/react";
import * as React from "react";

// --- Hooks ---
import { useTiptapEditor } from "../../../hooks/use-tiptap-editor";

// --- Icons ---
import { ListIcon } from "../../tiptap-icons/list-icon";
import { ListOrderedIcon } from "../../tiptap-icons/list-ordered-icon";
import { ListTodoIcon } from "../../tiptap-icons/list-todo-icon";

// --- Lib ---

import { isNodeInSchema } from "../../../tiptap-utils";
// --- UI Primitives ---
import type { ButtonProps } from "../../tiptap-ui-primitive/button";
import { Button } from "../../tiptap-ui-primitive/button";

export interface ListButtonProps extends Omit<ButtonProps, "type"> {
	/**
	 * The TipTap editor instance.
	 */
	editor?: Editor | null;
	/**
	 * Whether the button should hide when the list is not available.
	 * @default false
	 */
	hideWhenUnavailable?: boolean;
	/**
	 * Optional text to display alongside the icon.
	 */
	text?: string;
	/**
	 * The type of list to toggle.
	 */
	type: ListType;
}

export interface ListOption {
	icon: React.ElementType;
	label: string;
	type: ListType;
}

export type ListType = "bulletList" | "orderedList" | "taskList";

export const listOptions: ListOption[] = [
	{
		icon: ListIcon,
		label: "Bullet List",
		type: "bulletList",
	},
	{
		icon: ListOrderedIcon,
		label: "Ordered List",
		type: "orderedList",
	},
	{
		icon: ListTodoIcon,
		label: "Task List",
		type: "taskList",
	},
];

export const listShortcutKeys: Record<ListType, string> = {
	bulletList: "Ctrl-Shift-8",
	orderedList: "Ctrl-Shift-7",
	taskList: "Ctrl-Shift-9",
};

export function canToggleList(editor: Editor | null, type: ListType): boolean {
	if (!editor) {
		return false;
	}

	switch (type) {
		case "bulletList": {
			return editor.can().toggleBulletList();
		}
		case "orderedList": {
			return editor.can().toggleOrderedList();
		}
		case "taskList": {
			return editor.can().toggleList("taskList", "taskItem");
		}
		default: {
			return false;
		}
	}
}

export function getListOption(type: ListType): ListOption | undefined {
	return listOptions.find((option) => option.type === type);
}

export function isListActive(editor: Editor | null, type: ListType): boolean {
	if (!editor) return false;

	switch (type) {
		case "bulletList": {
			return editor.isActive("bulletList");
		}
		case "orderedList": {
			return editor.isActive("orderedList");
		}
		case "taskList": {
			return editor.isActive("taskList");
		}
		default: {
			return false;
		}
	}
}

export function shouldShowListButton(params: {
	editor: Editor | null;
	hideWhenUnavailable: boolean;
	listInSchema: boolean;
	type: ListType;
}): boolean {
	const { editor, hideWhenUnavailable, listInSchema, type } = params;

	if (!(listInSchema && editor)) {
		return false;
	}

	if (hideWhenUnavailable && (isNodeSelection(editor.state.selection) || !canToggleList(editor, type))) {
		return false;
	}

	return true;
}

export function toggleList(editor: Editor | null, type: ListType): void {
	if (!editor) return;

	switch (type) {
		case "bulletList": {
			editor.chain().focus().toggleBulletList().run();
			break;
		}
		case "orderedList": {
			editor.chain().focus().toggleOrderedList().run();
			break;
		}
		case "taskList": {
			editor.chain().focus().toggleList("taskList", "taskItem").run();
			break;
		}
	}
}

export function useListState(editor: Editor | null, type: ListType) {
	const listInSchema = isNodeInSchema(type, editor);
	const listOption = getListOption(type);
	const isActive = isListActive(editor, type);
	const shortcutKey = listShortcutKeys[type];

	return {
		isActive,
		listInSchema,
		listOption,
		shortcutKey,
	};
}

export const ListButton = React.forwardRef<HTMLButtonElement, ListButtonProps>(
	(
		{
			children,
			className = "",
			editor: providedEditor,
			hideWhenUnavailable = false,
			onClick,
			text,
			type,
			...buttonProps
		},
		ref,
	) => {
		const editor = useTiptapEditor(providedEditor);
		const { isActive, listInSchema, listOption, shortcutKey } = useListState(editor, type);

		const Icon = listOption?.icon || ListIcon;
		const isDisabled = !(editor?.isEditable && listInSchema);

		const handleClick = React.useCallback(
			(e: React.MouseEvent<HTMLButtonElement>) => {
				onClick?.(e);

				if (!e.defaultPrevented && editor) {
					toggleList(editor, type);
				}
			},
			[onClick, editor, type],
		);

		const show = React.useMemo(() => {
			return shouldShowListButton({
				editor,
				hideWhenUnavailable,
				listInSchema,
				type,
			});
		}, [editor, type, hideWhenUnavailable, listInSchema]);

		if (!(show && editor && editor.isEditable)) {
			return null;
		}

		return (
			<Button
				aria-label={type}
				aria-pressed={isActive}
				className={className.trim()}
				data-active-state={isActive ? "on" : "off"}
				data-disabled={isDisabled}
				data-style="ghost"
				onClick={handleClick}
				shortcutKeys={shortcutKey}
				tooltip={listOption?.label || type}
				type="button"
				{...buttonProps}
				ref={ref}
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

ListButton.displayName = "ListButton";

export default ListButton;
