// --- Icons ---

import { type Editor, isNodeSelection } from "@tiptap/react";
import * as React from "react";
import { HeadingIcon } from "@/components/editor/tiptap/components/tiptap-icons/heading-icon";
// --- Hooks ---
import { useTiptapEditor } from "@/components/editor/tiptap/hooks/use-tiptap-editor";

// --- Lib ---

// --- Tiptap UI ---
import {
	getFormattedHeadingName,
	HeadingButton,
	headingIcons,
	type Level,
} from "@/components/editor/tiptap/components/tiptap-ui/heading-button/heading-button";

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
import { ChevronDownIcon } from "../../tiptap-icons/chevron-down-icon";

export interface HeadingDropdownMenuProps extends Omit<ButtonProps, "type"> {
	editor?: Editor | null;
	hideWhenUnavailable?: boolean;
	levels?: Level[];
	onOpenChange?: (isOpen: boolean) => void;
}

export function HeadingDropdownMenu({
	editor: providedEditor,
	hideWhenUnavailable = false,
	levels = [1, 2, 3, 4, 5, 6],
	onOpenChange,
	...props
}: HeadingDropdownMenuProps) {
	const [isOpen, setIsOpen] = React.useState(false);
	const editor = useTiptapEditor(providedEditor);

	const headingInSchema = isNodeInSchema("heading", editor);

	const handleOnOpenChange = React.useCallback(
		(open: boolean) => {
			setIsOpen(open);
			onOpenChange?.(open);
		},
		[onOpenChange],
	);

	const getActiveIcon = React.useCallback(() => {
		if (!editor) return <HeadingIcon className="tiptap-button-icon" />;

		const activeLevel = levels.find((level) => editor.isActive("heading", { level }));

		if (!activeLevel) return <HeadingIcon className="tiptap-button-icon" />;

		const ActiveIcon = headingIcons[activeLevel];
		return <ActiveIcon className="tiptap-button-icon" />;
	}, [editor, levels]);

	const canToggleAnyHeading = React.useCallback((): boolean => {
		if (!editor) return false;
		return levels.some((level) => editor.can().toggleNode("heading", "paragraph", { level }));
	}, [editor, levels]);

	const isDisabled = !canToggleAnyHeading();
	const isAnyHeadingActive = editor?.isActive("heading") ?? false;

	const show = React.useMemo(() => {
		if (!(headingInSchema && editor)) {
			return false;
		}

		if (hideWhenUnavailable && (isNodeSelection(editor.state.selection) || !canToggleAnyHeading())) {
			return false;
		}

		return true;
	}, [headingInSchema, editor, hideWhenUnavailable, canToggleAnyHeading]);

	if (!(show && editor && editor.isEditable)) {
		return null;
	}

	return (
		<DropdownMenu onOpenChange={handleOnOpenChange} open={isOpen}>
			<DropdownMenuTrigger asChild>
				<Button
					aria-label="Format text as heading"
					aria-pressed={isAnyHeadingActive}
					data-active-state={isAnyHeadingActive ? "on" : "off"}
					data-disabled={isDisabled}
					data-style="ghost"
					disabled={isDisabled}
					tabIndex={-1}
					tooltip="Heading"
					type="button"
					{...props}
				>
					{getActiveIcon()}
					<ChevronDownIcon className="tiptap-button-dropdown-small" />
				</Button>
			</DropdownMenuTrigger>

			<DropdownMenuContent>
				<DropdownMenuGroup>
					{levels.map((level) => (
						<DropdownMenuItem asChild key={`heading-${level}`}>
							<HeadingButton
								editor={editor}
								level={level}
								text={getFormattedHeadingName(level)}
								tooltip={""}
							/>
						</DropdownMenuItem>
					))}
				</DropdownMenuGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

export default HeadingDropdownMenu;
