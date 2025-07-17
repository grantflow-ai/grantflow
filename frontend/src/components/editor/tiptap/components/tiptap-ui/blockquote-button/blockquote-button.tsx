import { type Editor, isNodeSelection } from "@tiptap/react";
import * as React from "react";

// --- Hooks ---
import { useTiptapEditor } from "../../../hooks/use-tiptap-editor";

// --- Icons ---
import { BlockQuoteIcon } from "../../tiptap-icons/block-quote-icon";

// --- Lib ---

import { isNodeInSchema } from "../../../tiptap-utils";
// --- UI Primitives ---
import type { ButtonProps } from "../../tiptap-ui-primitive/button";
import { Button } from "../../tiptap-ui-primitive/button";

export interface BlockquoteButtonProps extends Omit<ButtonProps, "type"> {
	/**
	 * The TipTap editor instance.
	 */
	editor?: Editor | null;
	/**
	 * Whether the button should hide when the node is not available.
	 * @default false
	 */
	hideWhenUnavailable?: boolean;
	/**
	 * Optional text to display alongside the icon.
	 */
	text?: string;
}

export function canToggleBlockquote(editor: Editor | null): boolean {
	if (!editor) return false;

	try {
		return editor.can().toggleWrap("blockquote");
	} catch {
		return false;
	}
}

export function isBlockquoteActive(editor: Editor | null): boolean {
	if (!editor) return false;
	return editor.isActive("blockquote");
}

export function isBlockquoteButtonDisabled(editor: Editor | null, canToggle: boolean, userDisabled = false): boolean {
	if (!editor) return true;
	if (userDisabled) return true;
	if (!canToggle) return true;
	return false;
}

export function shouldShowBlockquoteButton(params: {
	canToggle: boolean;
	editor: Editor | null;
	hideWhenUnavailable: boolean;
	nodeInSchema: boolean;
}): boolean {
	const { canToggle, editor, hideWhenUnavailable, nodeInSchema } = params;

	if (!(nodeInSchema && editor)) {
		return false;
	}

	if (hideWhenUnavailable && (isNodeSelection(editor.state.selection) || !canToggle)) {
		return false;
	}

	return Boolean(editor?.isEditable);
}

export function toggleBlockquote(editor: Editor | null): boolean {
	if (!editor) return false;
	return editor.chain().focus().toggleWrap("blockquote").run();
}

export function useBlockquoteState(editor: Editor | null, disabled = false, hideWhenUnavailable = false) {
	const nodeInSchema = isNodeInSchema("blockquote", editor);

	const canToggle = canToggleBlockquote(editor);
	const isDisabled = isBlockquoteButtonDisabled(editor, canToggle, disabled);
	const isActive = isBlockquoteActive(editor);

	const shouldShow = React.useMemo(
		() =>
			shouldShowBlockquoteButton({
				canToggle,
				editor,
				hideWhenUnavailable,
				nodeInSchema,
			}),
		[editor, hideWhenUnavailable, nodeInSchema, canToggle],
	);

	const handleToggle = React.useCallback(() => {
		if (!isDisabled && editor) {
			return toggleBlockquote(editor);
		}
		return false;
	}, [editor, isDisabled]);

	const shortcutKey = "Ctrl-Shift-b";
	const label = "Blockquote";

	return {
		canToggle,
		handleToggle,
		isActive,
		isDisabled,
		label,
		nodeInSchema,
		shortcutKey,
		shouldShow,
	};
}

export const BlockquoteButton = React.forwardRef<HTMLButtonElement, BlockquoteButtonProps>(
	(
		{
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

		const { handleToggle, isActive, isDisabled, label, shortcutKey, shouldShow } = useBlockquoteState(
			editor,
			disabled,
			hideWhenUnavailable,
		);

		const handleClick = React.useCallback(
			(e: React.MouseEvent<HTMLButtonElement>) => {
				onClick?.(e);

				if (!(e.defaultPrevented || isDisabled)) {
					handleToggle();
				}
			},
			[onClick, isDisabled, handleToggle],
		);

		if (!(shouldShow && editor && editor.isEditable)) {
			return null;
		}

		return (
			<Button
				aria-label="Blockquote"
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
						<BlockQuoteIcon className="tiptap-button-icon" />
						{text && <span className="tiptap-button-text">{text}</span>}
					</>
				)}
			</Button>
		);
	},
);

BlockquoteButton.displayName = "BlockquoteButton";

export default BlockquoteButton;
