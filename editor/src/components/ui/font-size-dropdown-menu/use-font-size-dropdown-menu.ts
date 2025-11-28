"use client";

import type { Editor } from "@tiptap/react";
import * as React from "react";
import { FontSizeIcon } from "@/components/icons/font-size-icon";

import { useTiptapEditor } from "@/hooks/use-tiptap-editor";

import { isNodeTypeSelected } from "@/utils";

export interface UseFontSizeDropdownMenuConfig {
	editor?: Editor | null | undefined;
	fontSizes?: string[] | undefined;
	hideWhenUnavailable?: boolean | undefined;
}

export function canToggleFontSize(editor: Editor | null): boolean {
	if (!editor?.isEditable) return false;
	if (isNodeTypeSelected(editor, ["image"])) return false;

	return editor.can().setFontSize("12px");
}

export function isFontSizeActive(editor: Editor | null): boolean {
	if (!editor?.isEditable) return false;
	return editor.isActive("fontSize");
}

export function getActiveFontSize(editor: Editor | null): string | null {
	if (!editor?.isEditable) return null;
	const attrs = editor.getAttributes("fontSize");
	return attrs.fontSize || null;
}

export function shouldShowFontSizeButton(props: { editor: Editor | null; hideWhenUnavailable: boolean }): boolean {
	const { editor, hideWhenUnavailable } = props;

	if (!editor?.isEditable) return false;

	if (hideWhenUnavailable) {
		return canToggleFontSize(editor);
	}

	return true;
}

export function useFontSizeDropdownMenu(config: UseFontSizeDropdownMenuConfig) {
	const {
		editor: providedEditor,
		fontSizes = ["8px", "10px", "12px", "14px", "16px", "18px", "20px", "24px", "28px", "32px"],
		hideWhenUnavailable = false,
	} = config;

	const { editor } = useTiptapEditor(providedEditor);
	const [isVisible, setIsVisible] = React.useState<boolean>(true);
	const canToggle = canToggleFontSize(editor);
	const isActive = isFontSizeActive(editor);
	const activeFontSize = getActiveFontSize(editor);

	React.useEffect(() => {
		if (!editor) return;

		const handleSelectionUpdate = () => {
			setIsVisible(shouldShowFontSizeButton({ editor, hideWhenUnavailable }));
		};

		handleSelectionUpdate();

		editor.on("selectionUpdate", handleSelectionUpdate);

		return () => {
			editor.off("selectionUpdate", handleSelectionUpdate);
		};
	}, [editor, hideWhenUnavailable]);

	return {
		activeFontSize,
		canToggle,
		fontSizes,
		Icon: FontSizeIcon,
		isActive,
		isVisible,
	};
}
