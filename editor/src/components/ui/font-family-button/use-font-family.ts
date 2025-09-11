"use client";

import type { Editor } from "@tiptap/react";
import * as React from "react";

import { useTiptapEditor } from "@/hooks/use-tiptap-editor";

import { isNodeTypeSelected } from "@/utils";

export interface UseFontFamilyConfig {
	editor?: Editor | null;
	fontFamily: string;
	hideWhenUnavailable?: boolean;
	onToggled?: () => void;
}

export function canSetFontFamily(editor: Editor | null, fontFamily: string): boolean {
	if (!editor?.isEditable) return false;
	if (isNodeTypeSelected(editor, ["image"])) return false;

	return editor.can().setFontFamily(fontFamily);
}

export function isFontFamilyActive(editor: Editor | null, fontFamily: string): boolean {
	if (!editor?.isEditable) return false;
	return editor.isActive("fontFamily", { fontFamily });
}

export function setFontFamily(editor: Editor | null, fontFamily: string): boolean {
	if (!editor?.isEditable) return false;
	if (!canSetFontFamily(editor, fontFamily)) return false;

	return editor.chain().focus().setFontFamily(fontFamily).run();
}

export function shouldShowFontFamilyButton(props: {
	editor: Editor | null;
	fontFamily: string;
	hideWhenUnavailable: boolean;
}): boolean {
	const { editor, fontFamily, hideWhenUnavailable } = props;

	if (!editor?.isEditable) return false;

	if (hideWhenUnavailable) {
		return canSetFontFamily(editor, fontFamily);
	}

	return true;
}

export function getFormattedFontFamilyName(fontFamily: string): string {
	return fontFamily;
}

export function useFontFamily(config: UseFontFamilyConfig) {
	const { editor: providedEditor, fontFamily, hideWhenUnavailable = false, onToggled } = config;

	const { editor } = useTiptapEditor(providedEditor);
	const [isVisible, setIsVisible] = React.useState<boolean>(true);
	const canToggle = canSetFontFamily(editor, fontFamily);
	const isActive = isFontFamilyActive(editor, fontFamily);

	React.useEffect(() => {
		if (!editor) return;

		const handleSelectionUpdate = () => {
			setIsVisible(shouldShowFontFamilyButton({ editor, fontFamily, hideWhenUnavailable }));
		};

		handleSelectionUpdate();

		editor.on("selectionUpdate", handleSelectionUpdate);

		return () => {
			editor.off("selectionUpdate", handleSelectionUpdate);
		};
	}, [editor, fontFamily, hideWhenUnavailable]);

	const handleToggle = React.useCallback(() => {
		if (!editor) return false;

		const success = setFontFamily(editor, fontFamily);
		if (success) {
			onToggled?.();
		}
		return success;
	}, [editor, fontFamily, onToggled]);

	return {
		canToggle,
		handleToggle,
		isActive,
		isVisible,
		label: getFormattedFontFamilyName(fontFamily),
	};
}
