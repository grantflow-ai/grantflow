// --- Icons ---

import { type Editor, isNodeSelection } from "@tiptap/react";
import * as React from "react";
import { ChevronDownIcon } from "@/components/editor/tiptap/components/tiptap-icons/chevron-down-icon";
import { ListIcon } from "@/components/editor/tiptap/components/tiptap-icons/list-icon";
// --- Hooks ---
import { useTiptapEditor } from "@/components/editor/tiptap/hooks/use-tiptap-editor";

// --- Lib ---

// --- Tiptap UI ---
import {
	canToggleList,
	isListActive,
	ListButton,
	listOptions,
	type ListType,
} from "@/components/editor/tiptap/components/tiptap-ui/list-button/list-button";

// --- UI Primitives ---
import type { ButtonProps } from "@/components/editor/tiptap/components/tiptap-ui-primitive/button";
import { Button } from "@/components/editor/tiptap/components/tiptap-ui-primitive/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/editor/tiptap/components/tiptap-ui-primitive/dropdown-menu";
import { isNodeInSchema } from "../../../tiptap-utils";

export interface ListDropdownMenuProps extends Omit<ButtonProps, "type"> {
	/**
	 * The TipTap editor instance.
	 */
	editor?: Editor;
	/**
	 * Whether the dropdown should be hidden when no list types are available
	 * @default false
	 */
	hideWhenUnavailable?: boolean;
	onOpenChange?: (isOpen: boolean) => void;
	/**
	 * The list types to display in the dropdown.
	 */
	types?: ListType[];
}

export function canToggleAnyList(editor: Editor | null, listTypes: ListType[]): boolean {
	if (!editor) return false;
	return listTypes.some((type) => canToggleList(editor, type));
}

export function getFilteredListOptions(availableTypes: ListType[]): typeof listOptions {
	return listOptions.filter((option) => !option.type || availableTypes.includes(option.type));
}

export function isAnyListActive(editor: Editor | null, listTypes: ListType[]): boolean {
	if (!editor) return false;
	return listTypes.some((type) => isListActive(editor, type));
}

export function ListDropdownMenu({
	editor: providedEditor,
	hideWhenUnavailable = false,
	onOpenChange,
	types = ["bulletList", "orderedList", "taskList"],
	...props
}: ListDropdownMenuProps) {
	const editor = useTiptapEditor(providedEditor);

	const { canToggleAny, filteredLists, handleOpenChange, isAnyActive, isOpen, listInSchema } = useListDropdownState(
		editor,
		types,
	);

	const getActiveIcon = useActiveListIcon(editor, filteredLists);

	const show = React.useMemo(() => {
		return shouldShowListDropdown({
			canToggleAny,
			editor,
			hideWhenUnavailable,
			listInSchema,
			listTypes: types,
		});
	}, [editor, types, hideWhenUnavailable, listInSchema, canToggleAny]);

	const handleOnOpenChange = React.useCallback(
		(open: boolean) => {
			handleOpenChange(open, onOpenChange);
		},
		[handleOpenChange, onOpenChange],
	);

	if (!(show && editor && editor.isEditable)) {
		return null;
	}

	return (
		<DropdownMenu onOpenChange={handleOnOpenChange} open={isOpen}>
			<DropdownMenuTrigger asChild>
				<Button
					aria-label="List options"
					data-active-state={isAnyActive ? "on" : "off"}
					data-style="ghost"
					tabIndex={-1}
					tooltip="List"
					type="button"
					{...props}
				>
					{getActiveIcon()}
					<ChevronDownIcon className="tiptap-button-dropdown-small" />
				</Button>
			</DropdownMenuTrigger>

			<DropdownMenuContent>
				<DropdownMenuGroup>
					{filteredLists.map((option) => (
						<DropdownMenuItem asChild key={option.type}>
							<ListButton
								editor={editor}
								hideWhenUnavailable={hideWhenUnavailable}
								text={option.label}
								tooltip={""}
								type={option.type}
							/>
						</DropdownMenuItem>
					))}
				</DropdownMenuGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

export function shouldShowListDropdown(params: {
	canToggleAny: boolean;
	editor: Editor | null;
	hideWhenUnavailable: boolean;
	listInSchema: boolean;
	listTypes: ListType[];
}): boolean {
	const { canToggleAny, editor, hideWhenUnavailable, listInSchema } = params;

	if (!(listInSchema && editor)) {
		return false;
	}

	if (hideWhenUnavailable && (isNodeSelection(editor.state.selection) || !canToggleAny)) {
		return false;
	}

	return true;
}

export function useActiveListIcon(editor: Editor | null, filteredLists: typeof listOptions) {
	return React.useCallback(() => {
		const activeOption = filteredLists.find((option) => isListActive(editor, option.type));

		return activeOption ? (
			<activeOption.icon className="tiptap-button-icon" />
		) : (
			<ListIcon className="tiptap-button-icon" />
		);
	}, [editor, filteredLists]);
}

export function useListDropdownState(editor: Editor | null, availableTypes: ListType[]) {
	const [isOpen, setIsOpen] = React.useState(false);

	const listInSchema = availableTypes.some((type) => isNodeInSchema(type, editor));

	const filteredLists = React.useMemo(() => getFilteredListOptions(availableTypes), [availableTypes]);

	const canToggleAny = canToggleAnyList(editor, availableTypes);
	const isAnyActive = isAnyListActive(editor, availableTypes);

	const handleOpenChange = React.useCallback((open: boolean, callback?: (isOpen: boolean) => void) => {
		setIsOpen(open);
		callback?.(open);
	}, []);

	return {
		canToggleAny,
		filteredLists,
		handleOpenChange,
		isAnyActive,
		isOpen,
		listInSchema,
		setIsOpen,
	};
}

export default ListDropdownMenu;
