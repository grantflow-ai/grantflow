import type { Editor } from "@tiptap/react";
import * as React from "react";

// --- Hooks ---
import { useTiptapEditor } from "../../../hooks/use-tiptap-editor";

// --- Icons ---
import { ImagePlusIcon } from "../../tiptap-icons/image-plus-icon";

// --- UI Primitives ---
import type { ButtonProps } from "../../tiptap-ui-primitive/button";
import { Button } from "../../tiptap-ui-primitive/button";

export interface ImageUploadButtonProps extends ButtonProps {
	editor?: Editor | null;
	extensionName?: string;
	text?: string;
}

export function insertImage(editor: Editor | null, extensionName: string): boolean {
	if (!editor) return false;

	return editor
		.chain()
		.focus()
		.insertContent({
			type: extensionName,
		})
		.run();
}

export function isImageActive(editor: Editor | null, extensionName: string): boolean {
	if (!editor) return false;
	return editor.isActive(extensionName);
}

export function useImageUploadButton(editor: Editor | null, extensionName = "imageUpload", disabled = false) {
	const isActive = isImageActive(editor, extensionName);
	const handleInsertImage = React.useCallback(() => {
		if (disabled) return false;
		return insertImage(editor, extensionName);
	}, [editor, extensionName, disabled]);

	return {
		handleInsertImage,
		isActive,
	};
}

export const ImageUploadButton = React.forwardRef<HTMLButtonElement, ImageUploadButtonProps>(
	(
		{
			children,
			className = "",
			disabled,
			editor: providedEditor,
			extensionName = "imageUpload",
			onClick,
			text,
			...buttonProps
		},
		ref,
	) => {
		const editor = useTiptapEditor(providedEditor);
		const { handleInsertImage, isActive } = useImageUploadButton(editor, extensionName, disabled);

		const handleClick = React.useCallback(
			(e: React.MouseEvent<HTMLButtonElement>) => {
				onClick?.(e);

				if (!(e.defaultPrevented || disabled)) {
					handleInsertImage();
				}
			},
			[onClick, disabled, handleInsertImage],
		);

		if (!editor?.isEditable) {
			return null;
		}

		return (
			<Button
				aria-label="Add image"
				aria-pressed={isActive}
				className={className.trim()}
				data-active-state={isActive ? "on" : "off"}
				data-disabled={disabled}
				data-style="ghost"
				onClick={handleClick}
				ref={ref}
				tooltip="Add image"
				type="button"
				{...buttonProps}
			>
				{children || (
					<>
						<ImagePlusIcon className="tiptap-button-icon" />
						{text && <span className="tiptap-button-text">{text}</span>}
					</>
				)}
			</Button>
		);
	},
);

ImageUploadButton.displayName = "ImageUploadButton";

export default ImageUploadButton;
