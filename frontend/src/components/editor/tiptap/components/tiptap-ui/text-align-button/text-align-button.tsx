import type { ChainedCommands, Editor } from "@tiptap/react";
import * as React from "react";

// --- Hooks ---
import { useTiptapEditor } from "../../../hooks/use-tiptap-editor";

// --- Icons ---
import { AlignCenterIcon } from "../../tiptap-icons/align-center-icon";
import { AlignJustifyIcon } from "../../tiptap-icons/align-justify-icon";
import { AlignLeftIcon } from "../../tiptap-icons/align-left-icon";
import { AlignRightIcon } from "../../tiptap-icons/align-right-icon";

// --- UI Primitives ---
import type { ButtonProps } from "../../tiptap-ui-primitive/button";
import { Button } from "../../tiptap-ui-primitive/button";

export type TextAlign = "center" | "justify" | "left" | "right";

export interface TextAlignButtonProps extends ButtonProps {
	/**
	 * The text alignment to apply.
	 */
	align: TextAlign;
	/**
	 * The TipTap editor instance.
	 */
	editor?: Editor | null;
	/**
	 * Whether the button should hide when the alignment is not available.
	 * @default false
	 */
	hideWhenUnavailable?: boolean;
	/**
	 * Optional text to display alongside the icon.
	 */
	text?: string;
}

export const textAlignIcons = {
	center: AlignCenterIcon,
	justify: AlignJustifyIcon,
	left: AlignLeftIcon,
	right: AlignRightIcon,
};

export const textAlignShortcutKeys: Partial<Record<TextAlign, string>> = {
	center: "Ctrl-Shift-e",
	justify: "Ctrl-Shift-j",
	left: "Ctrl-Shift-l",
	right: "Ctrl-Shift-r",
};

export const textAlignLabels: Record<TextAlign, string> = {
	center: "Align center",
	justify: "Align justify",
	left: "Align left",
	right: "Align right",
};

export function canSetTextAlign(editor: Editor | null, align: TextAlign, alignAvailable: boolean): boolean {
	if (!(editor && alignAvailable)) return false;

	try {
		return editor.can().setTextAlign(align);
	} catch {
		return false;
	}
}

export function checkTextAlignExtension(editor: Editor | null): boolean {
	if (!editor) return false;

	const hasExtension = editor.extensionManager.extensions.some((extension) => extension.name === "textAlign");

	if (!hasExtension) {
		console.warn(
			"TextAlign extension is not available. " + "Make sure it is included in your editor configuration.",
		);
	}

	return hasExtension;
}

export function hasSetTextAlign(commands: ChainedCommands): commands is {
	setTextAlign: (align: TextAlign) => ChainedCommands;
} & ChainedCommands {
	return "setTextAlign" in commands;
}

export function isTextAlignActive(editor: Editor | null, align: TextAlign): boolean {
	if (!editor) return false;
	return editor.isActive({ textAlign: align });
}

export function isTextAlignButtonDisabled(
	editor: Editor | null,
	alignAvailable: boolean,
	canAlign: boolean,
	userDisabled = false,
): boolean {
	if (!(editor && alignAvailable)) return true;
	if (userDisabled) return true;
	if (!canAlign) return true;
	return false;
}

export function setTextAlign(editor: Editor | null, align: TextAlign): boolean {
	if (!editor) return false;

	const chain = editor.chain().focus();
	if (hasSetTextAlign(chain)) {
		return chain.setTextAlign(align).run();
	}
	return false;
}

export function shouldShowTextAlignButton(
	editor: Editor | null,
	canAlign: boolean,
	hideWhenUnavailable: boolean,
): boolean {
	if (!editor?.isEditable) return false;
	if (hideWhenUnavailable && !canAlign) return false;
	return true;
}

export function useTextAlign(editor: Editor | null, align: TextAlign, disabled = false, hideWhenUnavailable = false) {
	const alignAvailable = React.useMemo(() => checkTextAlignExtension(editor), [editor]);

	const canAlign = React.useMemo(
		() => canSetTextAlign(editor, align, alignAvailable),
		[editor, align, alignAvailable],
	);

	const isDisabled = isTextAlignButtonDisabled(editor, alignAvailable, canAlign, disabled);
	const isActive = isTextAlignActive(editor, align);

	const handleAlignment = React.useCallback(() => {
		if (!(alignAvailable && editor) || isDisabled) return false;
		return setTextAlign(editor, align);
	}, [alignAvailable, editor, isDisabled, align]);

	const shouldShow = React.useMemo(
		() => shouldShowTextAlignButton(editor, canAlign, hideWhenUnavailable),
		[editor, canAlign, hideWhenUnavailable],
	);

	const Icon = textAlignIcons[align];
	const shortcutKey = textAlignShortcutKeys[align];
	const label = textAlignLabels[align];

	return {
		alignAvailable,
		canAlign,
		handleAlignment,
		Icon,
		isActive,
		isDisabled,
		label,
		shortcutKey,
		shouldShow,
	};
}

export const TextAlignButton = React.forwardRef<HTMLButtonElement, TextAlignButtonProps>(
	(
		{
			align,
			children,
			className = "",
			disabled,
			editor: providedEditor,
			hideWhenUnavailable = false,
			onClick,
			text,
			...buttonProps
		},
		ref,
	) => {
		const editor = useTiptapEditor(providedEditor);

		const { handleAlignment, Icon, isActive, isDisabled, label, shortcutKey, shouldShow } = useTextAlign(
			editor,
			align,
			disabled,
			hideWhenUnavailable,
		);

		const handleClick = React.useCallback(
			(e: React.MouseEvent<HTMLButtonElement>) => {
				onClick?.(e);

				if (!(e.defaultPrevented || disabled)) {
					handleAlignment();
				}
			},
			[onClick, disabled, handleAlignment],
		);

		if (!(shouldShow && editor && editor.isEditable)) {
			return null;
		}

		return (
			<Button
				aria-label={label}
				aria-pressed={isActive}
				className={className.trim()}
				data-active-state={isActive ? "on" : "off"}
				data-disabled={isDisabled}
				data-style="ghost"
				disabled={isDisabled}
				onClick={handleClick}
				shortcutKeys={shortcutKey}
				tooltip={label}
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

TextAlignButton.displayName = "TextAlignButton";

export default TextAlignButton;
