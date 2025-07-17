import { type Editor, isNodeSelection } from "@tiptap/react";
import * as React from "react";

// --- Hooks ---
import { useTiptapEditor } from "../../../hooks/use-tiptap-editor";
import { isNodeInSchema } from "../../../tiptap-utils";
// --- Icons ---
import { CodeBlockIcon } from "../../tiptap-icons/code-block-icon";
// --- UI Primitives ---
import type { ButtonProps } from "../../tiptap-ui-primitive/button";
import { Button } from "../../tiptap-ui-primitive/button";

export interface CodeBlockButtonProps extends Omit<ButtonProps, "type"> {
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

export function canToggleCodeBlock(editor: Editor | null): boolean {
	if (!editor) return false;

	try {
		return editor.can().toggleNode("codeBlock", "paragraph");
	} catch {
		return false;
	}
}

export function isCodeBlockActive(editor: Editor | null): boolean {
	if (!editor) return false;
	return editor.isActive("codeBlock");
}

export function isCodeBlockButtonDisabled(editor: Editor | null, canToggle: boolean, userDisabled = false): boolean {
	if (!editor) return true;
	if (userDisabled) return true;
	if (!canToggle) return true;
	return false;
}

export function shouldShowCodeBlockButton(params: {
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

export function toggleCodeBlock(editor: Editor | null): boolean {
	if (!editor) return false;
	return editor.chain().focus().toggleNode("codeBlock", "paragraph").run();
}

export function useCodeBlockState(editor: Editor | null, disabled = false, hideWhenUnavailable = false) {
	const nodeInSchema = isNodeInSchema("codeBlock", editor);

	const canToggle = canToggleCodeBlock(editor);
	const isDisabled = isCodeBlockButtonDisabled(editor, canToggle, disabled);
	const isActive = isCodeBlockActive(editor);

	const shouldShow = React.useMemo(
		() =>
			shouldShowCodeBlockButton({
				canToggle,
				editor,
				hideWhenUnavailable,
				nodeInSchema,
			}),
		[editor, hideWhenUnavailable, nodeInSchema, canToggle],
	);

	const handleToggle = React.useCallback(() => {
		if (!isDisabled && editor) {
			return toggleCodeBlock(editor);
		}
		return false;
	}, [editor, isDisabled]);

	const shortcutKey = "Ctrl-Alt-c";
	const label = "Code Block";

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

export const CodeBlockButton = React.forwardRef<HTMLButtonElement, CodeBlockButtonProps>(
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

		const { handleToggle, isActive, isDisabled, label, shortcutKey, shouldShow } = useCodeBlockState(
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
				aria-label="Code Block"
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
						<CodeBlockIcon className="tiptap-button-icon" />
						{text && <span className="tiptap-button-text">{text}</span>}
					</>
				)}
			</Button>
		);
	},
);

CodeBlockButton.displayName = "CodeBlockButton";

export default CodeBlockButton;
