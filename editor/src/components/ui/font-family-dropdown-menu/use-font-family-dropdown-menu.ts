"use client";

import type { Editor } from "@tiptap/react";
import * as React from "react";
import { FontFamilyIcon } from "@/components/icons/font-family-icon";

import { useTiptapEditor } from "@/hooks/use-tiptap-editor";

import { isNodeTypeSelected } from "@/utils";

export interface UseFontFamilyDropdownMenuConfig {
	editor?: Editor | null;
	fontFamilies?: string[];
	hideWhenUnavailable?: boolean;
}

export function canToggleFontFamily(editor: Editor | null): boolean {
	if (!editor?.isEditable) return false;
	if (isNodeTypeSelected(editor, ["image"])) return false;

	return editor.can().setFontFamily("Arial");
}

export function isFontFamilyActive(editor: Editor | null): boolean {
	if (!editor?.isEditable) return false;

	return editor.isActive("fontFamily");
}

export function getActiveFontFamily(editor: Editor | null): string | null {
	if (!editor?.isEditable) return null;

	const attrs = editor.getAttributes("fontFamily");
	console.log("FontFamily attrs:", attrs);

	const isActive = editor.isActive("fontFamily");
	console.log("FontFamily is active:", isActive);

	if (isActive && attrs.fontFamily) {
		return attrs.fontFamily;
	}

	return null;
}

export function shouldShowFontFamilyButton(props: { editor: Editor | null; hideWhenUnavailable: boolean }): boolean {
	const { editor, hideWhenUnavailable } = props;

	if (!editor?.isEditable) return false;

	if (hideWhenUnavailable) {
		return canToggleFontFamily(editor);
	}

	return true;
}

export function useFontFamilyDropdownMenu(config: UseFontFamilyDropdownMenuConfig) {
	const {
		editor: providedEditor,
		fontFamilies = ["Arial", "Times New Roman", "Courier New", "Georgia", "Verdana"],
		hideWhenUnavailable = false,
	} = config;

	const { editor } = useTiptapEditor(providedEditor);
	const [isVisible, setIsVisible] = React.useState<boolean>(true);
	const canToggle = canToggleFontFamily(editor);
	const isActive = isFontFamilyActive(editor);
	const activeFontFamily = getActiveFontFamily(editor);

	console.log("Editor state:", {
		activeFontFamily,
		canToggle,
		editorExists: !!editor,
		isActive,
	});

	React.useEffect(() => {
		if (!editor) return;

		const handleSelectionUpdate = () => {
			setIsVisible(shouldShowFontFamilyButton({ editor, hideWhenUnavailable }));
		};

		handleSelectionUpdate();

		editor.on("selectionUpdate", handleSelectionUpdate);

		return () => {
			editor.off("selectionUpdate", handleSelectionUpdate);
		};
	}, [editor, hideWhenUnavailable]);

	return {
		activeFontFamily,
		canToggle,
		fontFamilies,
		Icon: FontFamilyIcon,
		isActive,
		isVisible,
	};
}
