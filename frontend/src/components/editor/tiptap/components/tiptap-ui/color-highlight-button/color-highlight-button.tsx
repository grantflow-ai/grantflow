import type { Node } from "@tiptap/pm/model";
import { type Editor, isNodeSelection } from "@tiptap/react";
import * as React from "react";

// --- Hooks ---
import { useTiptapEditor } from "../../../hooks/use-tiptap-editor";

// --- UI Primitives ---
import type { ButtonProps } from "../../tiptap-ui-primitive/button";
import { Button } from "../../tiptap-ui-primitive/button";

// --- Styles ---
import "./color-highlight-button.css";
import { findNodePosition, isEmptyNode, isMarkInSchema } from "../../../tiptap-utils";

export const HIGHLIGHT_COLORS = [
	{
		border: "var(--tt-bg-color-contrast)",
		label: "Default background",
		value: "var(--tt-bg-color)",
	},
	{
		border: "var(--tt-color-highlight-gray-contrast)",
		label: "Gray background",
		value: "var(--tt-color-highlight-gray)",
	},
	{
		border: "var(--tt-color-highlight-brown-contrast)",
		label: "Brown background",
		value: "var(--tt-color-highlight-brown)",
	},
	{
		border: "var(--tt-color-highlight-orange-contrast)",
		label: "Orange background",
		value: "var(--tt-color-highlight-orange)",
	},
	{
		border: "var(--tt-color-highlight-yellow-contrast)",
		label: "Yellow background",
		value: "var(--tt-color-highlight-yellow)",
	},
	{
		border: "var(--tt-color-highlight-green-contrast)",
		label: "Green background",
		value: "var(--tt-color-highlight-green)",
	},
	{
		border: "var(--tt-color-highlight-blue-contrast)",
		label: "Blue background",
		value: "var(--tt-color-highlight-blue)",
	},
	{
		border: "var(--tt-color-highlight-purple-contrast)",
		label: "Purple background",
		value: "var(--tt-color-highlight-purple)",
	},
	{
		border: "var(--tt-color-highlight-pink-contrast)",
		label: "Pink background",
		value: "var(--tt-color-highlight-pink)",
	},
	{
		border: "var(--tt-color-highlight-red-contrast)",
		label: "Red background",
		value: "var(--tt-color-highlight-red)",
	},
];

export interface ColorHighlightButtonProps extends Omit<ButtonProps, "type"> {
	/**
	 * The color to apply when toggling the highlight.
	 * If not provided, it will use the default color from the extension.
	 */
	color: string;
	/**
	 * The TipTap editor instance.
	 */
	editor?: Editor | null;
	/**
	 * Whether the button should hide when the mark is not available.
	 * @default false
	 */
	hideWhenUnavailable?: boolean;
	/**
	 * The node to apply highlight to
	 */
	node?: Node | null;
	/**
	 * The position of the node in the document
	 */
	nodePos?: null | number;
	/**
	 * Called when the highlight is applied.
	 */
	onApplied?: (color: string) => void;
	/**
	 * Optional text to display alongside the icon.
	 */
	text?: string;
}

/**
 * Checks if highlight can be toggled in the current editor state
 */
export function canToggleHighlight(editor: Editor | null): boolean {
	if (!editor) return false;
	try {
		return editor.can().setMark("highlight");
	} catch {
		return false;
	}
}

/**
 * Determines if the highlight button should be disabled
 */
export function isColorHighlightButtonDisabled(editor: Editor | null, userDisabled = false): boolean {
	if (!editor || userDisabled) return true;

	const isIncompatibleContext =
		editor.isActive("code") || editor.isActive("codeBlock") || editor.isActive("imageUpload");

	return isIncompatibleContext || !canToggleHighlight(editor);
}

/**
 * Checks if highlight is active in the current selection
 */
export function isHighlightActive(editor: Editor | null, color: string): boolean {
	if (!editor) return false;
	return editor.isActive("highlight", { color });
}

/**
 * Determines if the highlight button should be shown
 */
export function shouldShowColorHighlightButton(
	editor: Editor | null,
	hideWhenUnavailable: boolean,
	highlightInSchema: boolean,
): boolean {
	if (!(highlightInSchema && editor)) return false;

	if (hideWhenUnavailable && (isNodeSelection(editor.state.selection) || !canToggleHighlight(editor))) {
		return false;
	}

	return true;
}

/**
 * Toggles highlight on the current selection or specified node
 */
export function toggleHighlight(
	editor: Editor | null,
	color: string,
	node?: Node | null,
	nodePos?: null | number,
): void {
	if (!editor) return;

	try {
		const chain = editor.chain().focus();

		if (isEmptyNode(node)) {
			chain.toggleMark("highlight", { color }).run();
		} else if (nodePos !== undefined && nodePos !== null && nodePos !== -1) {
			chain.setNodeSelection(nodePos).toggleMark("highlight", { color }).run();
		} else if (node) {
			const foundPos = findNodePosition({ editor, node });
			if (foundPos) {
				chain.setNodeSelection(foundPos.pos).toggleMark("highlight", { color }).run();
			} else {
				chain.toggleMark("highlight", { color }).run();
			}
		} else {
			chain.toggleMark("highlight", { color }).run();
		}

		editor.chain().setMeta("hideDragHandle", true).run();
	} catch (error) {
		console.error("Failed to apply highlight:", error);
	}
}

/**
 * Custom hook to manage highlight button state
 */
export function useHighlightState(editor: Editor | null, color: string, disabled = false, hideWhenUnavailable = false) {
	const highlightInSchema = isMarkInSchema("highlight", editor);
	const isDisabled = isColorHighlightButtonDisabled(editor, disabled);
	const isActive = isHighlightActive(editor, color);

	const shouldShow = React.useMemo(
		() => shouldShowColorHighlightButton(editor, hideWhenUnavailable, highlightInSchema),
		[editor, hideWhenUnavailable, highlightInSchema],
	);

	return {
		highlightInSchema,
		isActive,
		isDisabled,
		shouldShow,
	};
}

/**
 * ColorHighlightButton component for TipTap editor
 */
export const ColorHighlightButton = React.forwardRef<HTMLButtonElement, ColorHighlightButtonProps>(
	(
		{
			children,
			className = "",
			color,
			disabled,
			editor: providedEditor,
			hideWhenUnavailable = false,
			node,
			nodePos,
			onApplied,
			onClick,
			style,
			text,
			...buttonProps
		},
		ref,
	) => {
		const editor = useTiptapEditor(providedEditor);
		const { isActive, isDisabled, shouldShow } = useHighlightState(editor, color, disabled, hideWhenUnavailable);

		const handleClick = React.useCallback(
			(e: React.MouseEvent<HTMLButtonElement>) => {
				onClick?.(e);

				if (!(e.defaultPrevented || isDisabled) && editor) {
					toggleHighlight(editor, color, node, nodePos);
					onApplied?.(color);
				}
			},
			[color, editor, isDisabled, node, nodePos, onClick, onApplied],
		);

		const buttonStyle = React.useMemo(
			() =>
				({
					...style,
					"--highlight-color": color,
				}) as React.CSSProperties,
			[color, style],
		);

		if (!(shouldShow && editor && editor.isEditable)) {
			return null;
		}

		return (
			<Button
				aria-label={`${color} highlight color`}
				aria-pressed={isActive}
				className={className.trim()}
				data-active-state={isActive ? "on" : "off"}
				data-disabled={isDisabled}
				data-style="ghost"
				disabled={isDisabled}
				onClick={handleClick}
				style={buttonStyle}
				type="button"
				{...buttonProps}
				ref={ref}
			>
				{children || (
					<>
						<span
							className="tiptap-button-highlight"
							style={{ "--highlight-color": color } as React.CSSProperties}
						/>
						{text && <span className="tiptap-button-text">{text}</span>}
					</>
				)}
			</Button>
		);
	},
);

ColorHighlightButton.displayName = "ColorHighlightButton";

export default ColorHighlightButton;
