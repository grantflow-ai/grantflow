import { Highlight } from "@tiptap/extension-highlight";
import { Image } from "@tiptap/extension-image";
import { Subscript } from "@tiptap/extension-subscript";
import { Superscript } from "@tiptap/extension-superscript";
import { TaskItem } from "@tiptap/extension-task-item";
import { TaskList } from "@tiptap/extension-task-list";
import { TextAlign } from "@tiptap/extension-text-align";
import { Typography } from "@tiptap/extension-typography";
import { Underline } from "@tiptap/extension-underline";
import { EditorContent, EditorContext, useEditor } from "@tiptap/react";
// --- Tiptap Core Extensions ---
import { StarterKit } from "@tiptap/starter-kit";
import * as React from "react";

// --- Custom Extensions ---
import { Link } from "../../tiptap-extension/link-extension";
import { Selection } from "../../tiptap-extension/selection-extension";
import { TrailingNode } from "../../tiptap-extension/trailing-node-extension";
// --- Tiptap Node ---
import { ImageUploadNode } from "../../tiptap-node/image-upload-node/image-upload-node-extension";
// --- UI Primitives ---
import { Button } from "../../tiptap-ui-primitive/button";
import { Spacer } from "../../tiptap-ui-primitive/spacer";
import { Toolbar, ToolbarGroup, ToolbarSeparator } from "../../tiptap-ui-primitive/toolbar";
import "../../tiptap-node/code-block-node/code-block-node.css";
import "../../tiptap-node/list-node/list-node.css";
import "../../tiptap-node/image-node/image-node.css";
import "../../tiptap-node/paragraph-node/paragraph-node.css";

import { ArrowLeftIcon } from "../../tiptap-icons/arrow-left-icon";
import { HighlighterIcon } from "../../tiptap-icons/highlighter-icon";
import { LinkIcon } from "../../tiptap-icons/link-icon";
import { BlockquoteButton } from "../../tiptap-ui/blockquote-button";
import { CodeBlockButton } from "../../tiptap-ui/code-block-button";
import {
	ColorHighlightPopover,
	ColorHighlightPopoverButton,
	ColorHighlightPopoverContent,
} from "../../tiptap-ui/color-highlight-popover";
import { HeadingDropdownMenu } from "../../tiptap-ui/heading-dropdown-menu";
import { ImageUploadButton } from "../../tiptap-ui/image-upload-button";
import { LinkButton, LinkContent, LinkPopover } from "../../tiptap-ui/link-popover";
import { ListDropdownMenu } from "../../tiptap-ui/list-dropdown-menu";
import { MarkButton } from "../../tiptap-ui/mark-button";
import { TextAlignButton } from "../../tiptap-ui/text-align-button";
import { UndoRedoButton } from "../../tiptap-ui/undo-redo-button";

// --- Styles ---
import "./simple-editor.css";
import "@/components/editor/tiptap/tiptap-index.css";

import { handleImageUpload, MAX_FILE_SIZE } from "../../../tiptap-utils";
import content from "../simple/data/content.json";

const MainToolbarContent = ({
	isMobile,
	onHighlighterClick,
	onLinkClick,
}: {
	isMobile: boolean;
	onHighlighterClick: () => void;
	onLinkClick: () => void;
}) => {
	return (
		<>
			<Spacer />

			<ToolbarGroup>
				<UndoRedoButton action="undo" />
				<UndoRedoButton action="redo" />
			</ToolbarGroup>

			<ToolbarSeparator />

			<ToolbarGroup>
				<HeadingDropdownMenu levels={[1, 2, 3, 4]} />
				<ListDropdownMenu types={["bulletList", "orderedList", "taskList"]} />
				<BlockquoteButton />
				<CodeBlockButton />
			</ToolbarGroup>

			<ToolbarSeparator />

			<ToolbarGroup>
				<MarkButton type="bold" />
				<MarkButton type="italic" />
				<MarkButton type="strike" />
				<MarkButton type="code" />
				<MarkButton type="underline" />
				{isMobile ? <ColorHighlightPopoverButton onClick={onHighlighterClick} /> : <ColorHighlightPopover />}
				{isMobile ? <LinkButton onClick={onLinkClick} /> : <LinkPopover />}
			</ToolbarGroup>

			<ToolbarSeparator />

			<ToolbarGroup>
				<MarkButton type="superscript" />
				<MarkButton type="subscript" />
			</ToolbarGroup>

			<ToolbarSeparator />

			<ToolbarGroup>
				<TextAlignButton align="left" />
				<TextAlignButton align="center" />
				<TextAlignButton align="right" />
				<TextAlignButton align="justify" />
			</ToolbarGroup>

			<ToolbarSeparator />

			<ToolbarGroup>
				<ImageUploadButton text="Add" />
			</ToolbarGroup>

			<Spacer />

			{isMobile && <ToolbarSeparator />}
		</>
	);
};

const MobileToolbarContent = ({ onBack, type }: { onBack: () => void; type: "highlighter" | "link" }) => (
	<>
		<ToolbarGroup>
			<Button data-style="ghost" onClick={onBack}>
				<ArrowLeftIcon className="tiptap-button-icon" />
				{type === "highlighter" ? (
					<HighlighterIcon className="tiptap-button-icon" />
				) : (
					<LinkIcon className="tiptap-button-icon" />
				)}
			</Button>
		</ToolbarGroup>

		<ToolbarSeparator />

		{type === "highlighter" ? <ColorHighlightPopoverContent /> : <LinkContent />}
	</>
);

export function SimpleEditor() {
	const [mobileView, setMobileView] = React.useState<"highlighter" | "link" | "main">("main");
	const toolbarRef = React.useRef<HTMLDivElement>(null);

	const editor = useEditor({
		content,
		editorProps: {
			attributes: {
				"aria-label": "Main content area, start typing to enter text.",
				autocapitalize: "off",
				autocomplete: "off",
				autocorrect: "off",
			},
		},
		extensions: [
			StarterKit,
			TextAlign.configure({ types: ["heading", "paragraph"] }),
			Underline,
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
				onError: (error) => {
					console.error("Upload failed:", error);
				},
				upload: handleImageUpload,
			}),
			TrailingNode,
			Link.configure({ openOnClick: false }),
		],
		immediatelyRender: false,
	});

	return (
		<div className="tiptap-editor-wrapper">
			<EditorContext.Provider value={{ editor }}>
				<Toolbar ref={toolbarRef}>
					{mobileView === "main" ? (
						<MainToolbarContent
							isMobile={false}
							onHighlighterClick={() => {
								setMobileView("highlighter");
							}}
							onLinkClick={() => {
								setMobileView("link");
							}}
						/>
					) : (
						<MobileToolbarContent
							onBack={() => {
								setMobileView("main");
							}}
							type={mobileView === "highlighter" ? "highlighter" : "link"}
						/>
					)}
				</Toolbar>

				<div className="content-wrapper">
					<EditorContent
						className="simple-editor-content overflow-y-scroll"
						editor={editor}
						role="presentation"
					/>
				</div>
			</EditorContext.Provider>
		</div>
	);
}
