import { type Editor, isNodeSelection } from "@tiptap/react";
import * as React from "react";
// --- Hooks ---
import { useTiptapEditor } from "../../../hooks/use-tiptap-editor";
import { isMarkInSchema } from "../../../tiptap-utils";
// --- Icons ---
import { BoldIcon } from "../../tiptap-icons/bold-icon";
import { Code2Icon } from "../../tiptap-icons/code2-icon";
import { ItalicIcon } from "../../tiptap-icons/italic-icon";
import { StrikeIcon } from "../../tiptap-icons/strike-icon";
import { SubscriptIcon } from "../../tiptap-icons/subscript-icon";
import { SuperscriptIcon } from "../../tiptap-icons/superscript-icon";
import { UnderlineIcon } from "../../tiptap-icons/underline-icon";
// --- UI Primitives ---
import type { ButtonProps } from "../../tiptap-ui-primitive/button";
import { Button } from "../../tiptap-ui-primitive/button";

export type Mark = "bold" | "code" | "italic" | "strike" | "subscript" | "superscript" | "underline";

export interface MarkButtonProps extends Omit<ButtonProps, "type"> {
	/**
	 * Optional editor instance. If not provided, will use editor from context
	 */
	editor?: Editor | null;
	/**
	 * Whether this button should be hidden when the mark is not available
	 */
	hideWhenUnavailable?: boolean;
	/**
	 * Display text for the button (optional)
	 */
	text?: string;
	/**
	 * The type of mark to toggle
	 */
	type: Mark;
}

export const markIcons = {
	bold: BoldIcon,
	code: Code2Icon,
	italic: ItalicIcon,
	strike: StrikeIcon,
	subscript: SubscriptIcon,
	superscript: SuperscriptIcon,
	underline: UnderlineIcon,
};

export const markShortcutKeys: Partial<Record<Mark, string>> = {
	bold: "Ctrl-b",
	code: "Ctrl-e",
	italic: "Ctrl-i",
	strike: "Ctrl-Shift-s",
	subscript: "Ctrl-,",
	superscript: "Ctrl-.",
	underline: "Ctrl-u",
};

export function canToggleMark(editor: Editor | null, type: Mark): boolean {
	if (!editor) return false;

	try {
		return editor.can().toggleMark(type);
	} catch {
		return false;
	}
}

export function getFormattedMarkName(type: Mark): string {
	return type.charAt(0).toUpperCase() + type.slice(1);
}

export function isMarkActive(editor: Editor | null, type: Mark): boolean {
	if (!editor) return false;
	return editor.isActive(type);
}

export function isMarkButtonDisabled(editor: Editor | null, type: Mark, userDisabled = false): boolean {
	if (!editor) return true;
	if (userDisabled) return true;
	if (editor.isActive("codeBlock")) return true;
	if (!canToggleMark(editor, type)) return true;
	return false;
}

export function shouldShowMarkButton(params: {
	editor: Editor | null;
	hideWhenUnavailable: boolean;
	markInSchema: boolean;
	type: Mark;
}): boolean {
	const { editor, hideWhenUnavailable, markInSchema, type } = params;

	if (!(markInSchema && editor)) {
		return false;
	}

	if (hideWhenUnavailable && (isNodeSelection(editor.state.selection) || !canToggleMark(editor, type))) {
		return false;
	}

	return true;
}

export function toggleMark(editor: Editor | null, type: Mark): void {
	if (!editor) return;
	editor.chain().focus().toggleMark(type).run();
}

export function useMarkState(editor: Editor | null, type: Mark, disabled = false) {
	const markInSchema = isMarkInSchema(type, editor);
	const isDisabled = isMarkButtonDisabled(editor, type, disabled);
	const isActive = isMarkActive(editor, type);

	const Icon = markIcons[type];
	const shortcutKey = markShortcutKeys[type];
	const formattedName = getFormattedMarkName(type);

	return {
		formattedName,
		Icon,
		isActive,
		isDisabled,
		markInSchema,
		shortcutKey,
	};
}

export const MarkButton = React.forwardRef<HTMLButtonElement, MarkButtonProps>(
	(
		{
			children,
			className = "",
			disabled,
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

		const { formattedName, Icon, isActive, isDisabled, markInSchema, shortcutKey } = useMarkState(
			editor,
			type,
			disabled,
		);

		const handleClick = React.useCallback(
			(e: React.MouseEvent<HTMLButtonElement>) => {
				onClick?.(e);

				if (!(e.defaultPrevented || isDisabled) && editor) {
					toggleMark(editor, type);
				}
			},
			[onClick, isDisabled, editor, type],
		);

		const show = React.useMemo(() => {
			return shouldShowMarkButton({
				editor,
				hideWhenUnavailable,
				markInSchema,
				type,
			});
		}, [editor, type, hideWhenUnavailable, markInSchema]);

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

MarkButton.displayName = "MarkButton";

export default MarkButton;
