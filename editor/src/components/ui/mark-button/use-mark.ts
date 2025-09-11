"use client";

import type { Editor } from "@tiptap/react";
import * as React from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { BoldIcon } from "@/components/icons/bold-icon";
import { Code2Icon } from "@/components/icons/code2-icon";
import { ItalicIcon } from "@/components/icons/italic-icon";
import { StrikeIcon } from "@/components/icons/strike-icon";
import { SubscriptIcon } from "@/components/icons/subscript-icon";
import { SuperscriptIcon } from "@/components/icons/superscript-icon";
import { UnderlineIcon } from "@/components/icons/underline-icon";

import { useTiptapEditor } from "@/hooks/use-tiptap-editor";

import { isMarkInSchema, isNodeTypeSelected } from "@/utils";

export type Mark = "bold" | "italic" | "strike" | "code" | "underline" | "superscript" | "subscript";

export interface UseMarkConfig {
	editor?: Editor | null;
	type: Mark;
	hideWhenUnavailable?: boolean;
	onToggled?: () => void;
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

export const MARK_SHORTCUT_KEYS: Record<Mark, string> = {
	bold: "mod+b",
	code: "mod+e",
	italic: "mod+i",
	strike: "mod+shift+s",
	subscript: "mod+,",
	superscript: "mod+.",
	underline: "mod+u",
};

export function canToggleMark(editor: Editor | null, type: Mark): boolean {
	if (!editor?.isEditable) return false;
	if (!isMarkInSchema(type, editor) || isNodeTypeSelected(editor, ["image"])) return false;

	return editor.can().toggleMark(type);
}

export function isMarkActive(editor: Editor | null, type: Mark): boolean {
	if (!editor?.isEditable) return false;
	return editor.isActive(type);
}

export function toggleMark(editor: Editor | null, type: Mark): boolean {
	if (!editor?.isEditable) return false;
	if (!canToggleMark(editor, type)) return false;

	return editor.chain().focus().toggleMark(type).run();
}

export function shouldShowButton(props: { editor: Editor | null; type: Mark; hideWhenUnavailable: boolean }): boolean {
	const { editor, type, hideWhenUnavailable } = props;

	if (!editor?.isEditable) return false;
	if (!isMarkInSchema(type, editor)) return false;

	if (hideWhenUnavailable && !editor.isActive("code")) {
		return canToggleMark(editor, type);
	}

	return true;
}

export function getFormattedMarkName(type: Mark): string {
	return type.charAt(0).toUpperCase() + type.slice(1);
}

/**
 * Custom hook that provides mark functionality for Tiptap editor
 *
 * @example
 * ```tsx
 * // Simple usage
 * function MySimpleBoldButton() {
 *   const { isVisible, handleMark } = useMark({ type: "bold" })
 *
 *   if (!isVisible) return null
 *
 *   return <button onClick={handleMark}>Bold</button>
 * }
 *
 * // Advanced usage with configuration
 * function MyAdvancedItalicButton() {
 *   const { isVisible, handleMark, label, isActive } = useMark({
 *     editor: myEditor,
 *     type: "italic",
 *     hideWhenUnavailable: true,
 *     onToggled: () => console.log('Mark toggled!')
 *   })
 *
 *   if (!isVisible) return null
 *
 *   return (
 *     <MyButton
 *       onClick={handleMark}
 *       aria-pressed={isActive}
 *       aria-label={label}
 *     >
 *       Italic
 *     </MyButton>
 *   )
 * }
 * ```
 */
export function useMark(config: UseMarkConfig) {
	const { editor: providedEditor, type, hideWhenUnavailable = false, onToggled } = config;

	const { editor } = useTiptapEditor(providedEditor);
	const [isVisible, setIsVisible] = React.useState<boolean>(true);
	const canToggle = canToggleMark(editor, type);
	const isActive = isMarkActive(editor, type);

	React.useEffect(() => {
		if (!editor) return;

		const handleSelectionUpdate = () => {
			setIsVisible(shouldShowButton({ editor, hideWhenUnavailable, type }));
		};

		handleSelectionUpdate();

		editor.on("selectionUpdate", handleSelectionUpdate);

		return () => {
			editor.off("selectionUpdate", handleSelectionUpdate);
		};
	}, [editor, type, hideWhenUnavailable]);

	const handleMark = React.useCallback(() => {
		if (!editor) return false;

		const success = toggleMark(editor, type);
		if (success) {
			onToggled?.();
		}
		return success;
	}, [editor, type, onToggled]);

	useHotkeys(
		MARK_SHORTCUT_KEYS[type],
		(event) => {
			event.preventDefault();
			handleMark();
		},
		{
			enabled: isVisible && canToggle,
			enableOnContentEditable: true,
			enableOnFormTags: true,
		},
	);

	return {
		canToggle,
		handleMark,
		Icon: markIcons[type],
		isActive,
		isVisible,
		label: getFormattedMarkName(type),
		shortcutKeys: MARK_SHORTCUT_KEYS[type],
	};
}
