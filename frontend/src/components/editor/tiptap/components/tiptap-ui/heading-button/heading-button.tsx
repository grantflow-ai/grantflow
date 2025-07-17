import { type Editor, isNodeSelection } from "@tiptap/react";
import * as React from "react";

// --- Hooks ---
import { useTiptapEditor } from "../../../hooks/use-tiptap-editor";
import { HeadingFiveIcon } from "../../tiptap-icons/heading-five-icon";
import { HeadingFourIcon } from "../../tiptap-icons/heading-four-icon";
// --- Icons ---
import { HeadingOneIcon } from "../../tiptap-icons/heading-one-icon";
import { HeadingSixIcon } from "../../tiptap-icons/heading-six-icon";
import { HeadingThreeIcon } from "../../tiptap-icons/heading-three-icon";
import { HeadingTwoIcon } from "../../tiptap-icons/heading-two-icon";

// --- Lib ---

import { isNodeInSchema } from "../../../tiptap-utils";
// --- UI Primitives ---
import type { ButtonProps } from "../../tiptap-ui-primitive/button";
import { Button } from "../../tiptap-ui-primitive/button";

export interface HeadingButtonProps extends Omit<ButtonProps, "type"> {
	/**
	 * The TipTap editor instance.
	 */
	editor?: Editor | null;
	/**
	 * Whether the button should hide when the heading is not available.
	 * @default false
	 */
	hideWhenUnavailable?: boolean;
	/**
	 * The heading level.
	 */
	level: Level;
	/**
	 * Optional text to display alongside the icon.
	 */
	text?: string;
}

export type Level = 1 | 2 | 3 | 4 | 5 | 6;

export const headingIcons = {
	1: HeadingOneIcon,
	2: HeadingTwoIcon,
	3: HeadingThreeIcon,
	4: HeadingFourIcon,
	5: HeadingFiveIcon,
	6: HeadingSixIcon,
};

export const headingShortcutKeys: Partial<Record<Level, string>> = {
	1: "Ctrl-Alt-1",
	2: "Ctrl-Alt-2",
	3: "Ctrl-Alt-3",
	4: "Ctrl-Alt-4",
	5: "Ctrl-Alt-5",
	6: "Ctrl-Alt-6",
};

export function canToggleHeading(editor: Editor | null, level: Level): boolean {
	if (!editor) return false;

	try {
		return editor.can().toggleNode("heading", "paragraph", { level });
	} catch {
		return false;
	}
}

export function getFormattedHeadingName(level: Level): string {
	return `Heading ${level}`;
}

export function isHeadingActive(editor: Editor | null, level: Level): boolean {
	if (!editor) return false;
	return editor.isActive("heading", { level });
}

export function isHeadingButtonDisabled(editor: Editor | null, level: Level, userDisabled = false): boolean {
	if (!editor) return true;
	if (userDisabled) return true;
	if (!canToggleHeading(editor, level)) return true;
	return false;
}

export function shouldShowHeadingButton(params: {
	editor: Editor | null;
	headingInSchema: boolean;
	hideWhenUnavailable: boolean;
	level: Level;
}): boolean {
	const { editor, headingInSchema, hideWhenUnavailable } = params;

	if (!(headingInSchema && editor)) {
		return false;
	}

	if (hideWhenUnavailable && isNodeSelection(editor.state.selection)) {
		return false;
	}

	return true;
}

export function toggleHeading(editor: Editor | null, level: Level): void {
	if (!editor) return;

	if (editor.isActive("heading", { level })) {
		editor.chain().focus().setNode("paragraph").run();
	} else {
		editor.chain().focus().toggleNode("heading", "paragraph", { level }).run();
	}
}

export function useHeadingState(editor: Editor | null, level: Level, disabled = false) {
	const headingInSchema = isNodeInSchema("heading", editor);
	const isDisabled = isHeadingButtonDisabled(editor, level, disabled);
	const isActive = isHeadingActive(editor, level);

	const Icon = headingIcons[level];
	const shortcutKey = headingShortcutKeys[level];
	const formattedName = getFormattedHeadingName(level);

	return {
		formattedName,
		headingInSchema,
		Icon,
		isActive,
		isDisabled,
		shortcutKey,
	};
}

export const HeadingButton = React.forwardRef<HTMLButtonElement, HeadingButtonProps>(
	(
		{
			children,
			className = "",
			disabled,
			editor: providedEditor,
			hideWhenUnavailable = false,
			level,
			onClick,
			text,
			...buttonProps
		},
		ref,
	) => {
		const editor = useTiptapEditor(providedEditor);

		const { formattedName, headingInSchema, Icon, isActive, isDisabled, shortcutKey } = useHeadingState(
			editor,
			level,
			disabled,
		);

		const handleClick = React.useCallback(
			(e: React.MouseEvent<HTMLButtonElement>) => {
				onClick?.(e);

				if (!(e.defaultPrevented || isDisabled) && editor) {
					toggleHeading(editor, level);
				}
			},
			[onClick, isDisabled, editor, level],
		);

		const show = React.useMemo(() => {
			return shouldShowHeadingButton({
				editor,
				headingInSchema,
				hideWhenUnavailable,
				level,
			});
		}, [editor, level, hideWhenUnavailable, headingInSchema]);

		if (!(show && editor && editor.isEditable)) {
			return null;
		}

		return (
			<Button
				aria-label={formattedName}
				aria-pressed={isActive}
				className={className.trim()}
				data-active-state={isActive ? "on" : "off"}
				data-disabled={isDisabled}
				data-style="ghost"
				disabled={isDisabled}
				onClick={handleClick}
				shortcutKeys={shortcutKey}
				tabIndex={-1}
				tooltip={formattedName}
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

HeadingButton.displayName = "HeadingButton";

export default HeadingButton;
