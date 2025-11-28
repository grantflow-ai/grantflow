"use client";

import type { Editor } from "@tiptap/react";
import * as React from "react";
import { ListIcon } from "@/components/icons/list-icon";
import { ListOrderedIcon } from "@/components/icons/list-ordered-icon";
import { ListTodoIcon } from "@/components/icons/list-todo-icon";
import { canToggleList, isListActive, type ListType, listIcons } from "@/components/ui/list-button";

import { useTiptapEditor } from "@/hooks/use-tiptap-editor";

import { isNodeInSchema } from "@/utils";

export interface UseListDropdownMenuConfig {
	editor?: Editor | null | undefined;
	types?: ListType[] | undefined;
	hideWhenUnavailable?: boolean | undefined;
}

export interface ListOption {
	label: string;
	type: ListType;
	icon: React.ElementType;
}

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

export function canToggleAnyList(editor: Editor | null, listTypes: ListType[]): boolean {
	if (!editor?.isEditable) return false;
	return listTypes.some((type) => canToggleList(editor, type));
}

export function isAnyListActive(editor: Editor | null, listTypes: ListType[]): boolean {
	if (!editor?.isEditable) return false;
	return listTypes.some((type) => isListActive(editor, type));
}

export function getFilteredListOptions(availableTypes: ListType[]): typeof listOptions {
	return listOptions.filter((option) => !option.type || availableTypes.includes(option.type));
}

export function shouldShowListDropdown(params: {
	editor: Editor | null;
	listTypes: ListType[];
	hideWhenUnavailable: boolean;
	listInSchema: boolean;
	canToggleAny: boolean;
}): boolean {
	const { editor, hideWhenUnavailable, listInSchema, canToggleAny } = params;

	if (!(listInSchema && editor)) {
		return false;
	}

	if (hideWhenUnavailable && !editor.isActive("code")) {
		return canToggleAny;
	}

	return true;
}

export function getActiveListType(editor: Editor | null, availableTypes: ListType[]): ListType | undefined {
	if (!editor?.isEditable) return undefined;
	return availableTypes.find((type) => isListActive(editor, type));
}

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
export function useListDropdownMenu(config?: UseListDropdownMenuConfig) {
	const {
		editor: providedEditor,
		types = ["bulletList", "orderedList", "taskList"],
		hideWhenUnavailable = false,
	} = config || {};

	const { editor } = useTiptapEditor(providedEditor);
	const [isVisible, setIsVisible] = React.useState(false);

	const listInSchema = types.some((type) => isNodeInSchema(type, editor));

	const filteredLists = React.useMemo(() => getFilteredListOptions(types), [types]);

	const canToggleAny = canToggleAnyList(editor, types);
	const isAnyActive = isAnyListActive(editor, types);
	const activeType = getActiveListType(editor, types);
	const activeList = filteredLists.find((option) => option.type === activeType);

	React.useEffect(() => {
		if (!editor) return;

		const handleSelectionUpdate = () => {
			setIsVisible(
				shouldShowListDropdown({
					canToggleAny,
					editor,
					hideWhenUnavailable,
					listInSchema,
					listTypes: types,
				}),
			);
		};

		handleSelectionUpdate();

		editor.on("selectionUpdate", handleSelectionUpdate);

		return () => {
			editor.off("selectionUpdate", handleSelectionUpdate);
		};
	}, [canToggleAny, editor, hideWhenUnavailable, listInSchema, types]);

	return {
		activeType,
		canToggle: canToggleAny,
		filteredLists,
		Icon: activeList ? listIcons[activeList.type] : ListIcon,
		isActive: isAnyActive,
		isVisible,
		label: "List",
		types,
	};
}
