"use client";

import type { Editor } from "@tiptap/react";
import * as React from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { ImagePlusIcon } from "@/components/icons/image-plus-icon";
import { useTiptapEditor } from "@/hooks/use-tiptap-editor";
import { isExtensionAvailable, isNodeTypeSelected } from "@/utils";

export const IMAGE_UPLOAD_SHORTCUT_KEY = "mod+shift+i";

export interface UseImageUploadConfig {
	editor?: Editor | null | undefined;
	hideWhenUnavailable?: boolean | undefined;
	onInserted?: (() => void) | undefined;
}

export function canInsertImage(editor: Editor | null): boolean {
	if (!editor?.isEditable) return false;
	if (!isExtensionAvailable(editor, "imageUpload") || isNodeTypeSelected(editor, ["image"])) return false;

	return editor.can().insertContent({ type: "imageUpload" });
}

export function isImageActive(editor: Editor | null): boolean {
	if (!editor?.isEditable) return false;
	return editor.isActive("imageUpload");
}

export function insertImage(editor: Editor | null): boolean {
	if (!editor?.isEditable) return false;
	if (!canInsertImage(editor)) return false;

	try {
		return editor
			.chain()
			.focus()
			.insertContent({
				type: "imageUpload",
			})
			.run();
	} catch {
		return false;
	}
}

export function shouldShowButton(props: { editor: Editor | null; hideWhenUnavailable: boolean }): boolean {
	const { editor, hideWhenUnavailable } = props;

	if (!editor?.isEditable) return false;
	if (!isExtensionAvailable(editor, "imageUpload")) return false;

	if (hideWhenUnavailable && !editor.isActive("code")) {
		return canInsertImage(editor);
	}

	return true;
}

/**
 * Custom hook that provides image functionality for Tiptap editor
 *
 * @example
 * ```tsx
 * // Simple usage - no params needed
 * function MySimpleImageButton() {
 *   const { isVisible, handleImage } = useImage()
 *
 *   if (!isVisible) return null
 *
 *   return <button onClick={handleImage}>Add Image</button>
 * }
 *
 * // Advanced usage with configuration
 * function MyAdvancedImageButton() {
 *   const { isVisible, handleImage, label, isActive } = useImage({
 *     editor: myEditor,
 *     hideWhenUnavailable: true,
 *     onInserted: () => console.log('Image inserted!')
 *   })
 *
 *   if (!isVisible) return null
 *
 *   return (
 *     <MyButton
 *       onClick={handleImage}
 *       aria-pressed={isActive}
 *       aria-label={label}
 *     >
 *       Add Image
 *     </MyButton>
 *   )
 * }
 * ```
 */
export function useImageUpload(config?: UseImageUploadConfig) {
	const { editor: providedEditor, hideWhenUnavailable = false, onInserted } = config || {};

	const { editor } = useTiptapEditor(providedEditor);
	const [isVisible, setIsVisible] = React.useState<boolean>(true);
	const canInsert = canInsertImage(editor);
	const isActive = isImageActive(editor);

	React.useEffect(() => {
		if (!editor) return;

		const handleSelectionUpdate = () => {
			setIsVisible(shouldShowButton({ editor, hideWhenUnavailable }));
		};

		handleSelectionUpdate();

		editor.on("selectionUpdate", handleSelectionUpdate);

		return () => {
			editor.off("selectionUpdate", handleSelectionUpdate);
		};
	}, [editor, hideWhenUnavailable]);

	const handleImage = React.useCallback(() => {
		if (!editor) return false;

		const success = insertImage(editor);
		if (success) {
			onInserted?.();
		}
		return success;
	}, [editor, onInserted]);

	useHotkeys(
		IMAGE_UPLOAD_SHORTCUT_KEY,
		(event) => {
			event.preventDefault();
			handleImage();
		},
		{
			enabled: isVisible && canInsert,
			enableOnContentEditable: true,
			enableOnFormTags: true,
		},
	);

	return {
		canInsert,
		handleImage,
		Icon: ImagePlusIcon,
		isActive,
		isVisible,
		label: "Add image",
		shortcutKeys: IMAGE_UPLOAD_SHORTCUT_KEY,
	};
}
