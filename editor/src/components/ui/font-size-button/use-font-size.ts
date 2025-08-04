"use client";

import type { Editor } from "@tiptap/react";
import * as React from "react";

import { useTiptapEditor } from "@/hooks/use-tiptap-editor";

import { isNodeTypeSelected } from "@/utils";

export interface UseFontSizeConfig {
	editor?: Editor | null;
	fontSize: string;
	hideWhenUnavailable?: boolean;
	onToggled?: () => void;
}

/**
 * Checks if font size can be set in the current editor state
 */
export function canSetFontSize(editor: Editor | null, fontSize: string): boolean {
	if (!editor?.isEditable) return false;
	if (isNodeTypeSelected(editor, ["image"])) return false;

	return editor.can().setFontSize(fontSize);
}

export function isFontSizeActive(editor: Editor | null, fontSize: string): boolean {
	if (!editor?.isEditable) return false;
	return editor.isActive("fontSize", { fontSize });
}

export function setFontSize(editor: Editor | null, fontSize: string): boolean {
	if (!editor?.isEditable) return false;
	if (!canSetFontSize(editor, fontSize)) return false;

	return editor.chain().focus().setFontSize(fontSize).run();
}

export function shouldShowFontSizeButton(props: {
	editor: Editor | null;
	fontSize: string;
	hideWhenUnavailable: boolean;
}): boolean {
	const { editor, fontSize, hideWhenUnavailable } = props;

	if (!editor?.isEditable) return false;

	if (hideWhenUnavailable) {
		return canSetFontSize(editor, fontSize);
	}

	return true;
}

export function getFormattedFontSizeName(fontSize: string): string {
	return fontSize;
}

export function useFontSize(config: UseFontSizeConfig) {
	const { editor: providedEditor, fontSize, hideWhenUnavailable = false, onToggled } = config;

	const { editor } = useTiptapEditor(providedEditor);
	const [isVisible, setIsVisible] = React.useState<boolean>(true);
	const canToggle = canSetFontSize(editor, fontSize);
	const isActive = isFontSizeActive(editor, fontSize);

	React.useEffect(() => {
		if (!editor) return;

		const handleSelectionUpdate = () => {
			setIsVisible(shouldShowFontSizeButton({ editor, fontSize, hideWhenUnavailable }));
		};

		handleSelectionUpdate();

		editor.on("selectionUpdate", handleSelectionUpdate);

		return () => {
			editor.off("selectionUpdate", handleSelectionUpdate);
		};
	}, [editor, fontSize, hideWhenUnavailable]);

	const handleToggle = React.useCallback(() => {
		if (!editor) return false;

		const success = setFontSize(editor, fontSize);
		if (success) {
			onToggled?.();
		}
		return success;
	}, [editor, fontSize, onToggled]);

	return {
		canToggle,
		handleToggle,
		isActive,
		isVisible,
		label: getFormattedFontSizeName(fontSize),
	};
}
