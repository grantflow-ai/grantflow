import { Highlight } from "@tiptap/extension-highlight";
import { Image } from "@tiptap/extension-image";
import { TaskItem, TaskList } from "@tiptap/extension-list";
import { Subscript } from "@tiptap/extension-subscript";
import { Superscript } from "@tiptap/extension-superscript";
import { TableKit } from "@tiptap/extension-table";
import { TextAlign } from "@tiptap/extension-text-align";
import { FontFamily, FontSize, TextStyle } from "@tiptap/extension-text-style";
import { Typography } from "@tiptap/extension-typography";
import { Selection } from "@tiptap/extensions";
import { StarterKit } from "@tiptap/starter-kit";
import { HorizontalRule } from "@/components/node/horizontal-rule-node/horizontal-rule-node-extension";
import { ImageUploadNode } from "@/components/node/image-upload-node/image-upload-node-extension";
import { AiToolsExtension } from "@/components/prompt/ai-tools-extension";
import { handleImageUpload, MAX_FILE_SIZE } from "@/utils";

export const EditorExtensions = [
	StarterKit.configure({
		horizontalRule: false,
		link: {
			enableClickSelection: true,
			openOnClick: false,
		},
	}),
	HorizontalRule,
	TextAlign.configure({ types: ["heading", "paragraph"] }),
	TaskList,
	TaskItem.configure({ nested: true }),
	Highlight.configure({ multicolor: true }),
	Image,
	Typography,
	Superscript,
	Subscript,
	Selection,
	ImageUploadNode.configure({
		accept: "image/*",
		limit: 3,
		maxSize: MAX_FILE_SIZE,
		onError: (error) => console.error("Upload failed:", error),
		upload: handleImageUpload,
	}),
	TextStyle,
	FontFamily,
	FontSize,
	TableKit,
	AiToolsExtension,
];
