import { Highlight } from "@tiptap/extension-highlight";
import { Image } from "@tiptap/extension-image";
import { TaskItem, TaskList } from "@tiptap/extension-list";
import { Subscript } from "@tiptap/extension-subscript";
import { Superscript } from "@tiptap/extension-superscript";
import { TextAlign } from "@tiptap/extension-text-align";
import { Typography } from "@tiptap/extension-typography";
import { Selection } from "@tiptap/extensions";
import { EditorContent, EditorContext, useEditor } from "@tiptap/react";
import { StarterKit } from "@tiptap/starter-kit";
import * as React from "react";
import { HorizontalRule } from "@/components/node/horizontal-rule-node/horizontal-rule-node-extension";
import { ImageUploadNode } from "@/components/node/image-upload-node/image-upload-node-extension";
import { Button } from "@/components/ui/button";
import { Spacer } from "@/components/ui/spacer";
import {
	Toolbar,
	ToolbarGroup,
	ToolbarSeparator,
} from "@/components/ui/toolbar";
import "@/components/node/blockquote-node/blockquote-node.scss";
import "@/components/node/code-block-node/code-block-node.scss";
import "@/components/node/horizontal-rule-node/horizontal-rule-node.scss";
import "@/components/node/list-node/list-node.scss";
import "@/components/node/image-node/image-node.scss";
import "@/components/node/heading-node/heading-node.scss";
import "@/components/node/paragraph-node/paragraph-node.scss";
import "@/styles/_keyframe-animations.scss";
import "@/styles/_variables.scss";
import { ArrowLeftIcon } from "@/components/icons/arrow-left-icon";
import { HighlighterIcon } from "@/components/icons/highlighter-icon";
import { LinkIcon } from "@/components/icons/link-icon";
import { BlockquoteButton } from "@/components/ui/blockquote-button";
import { CodeBlockButton } from "@/components/ui/code-block-button";
import {
	ColorHighlightPopover,
	ColorHighlightPopoverButton,
	ColorHighlightPopoverContent,
} from "@/components/ui/color-highlight-popover";
import { HeadingDropdownMenu } from "@/components/ui/heading-dropdown-menu";
import { ImageUploadButton } from "@/components/ui/image-upload-button";
import {
	LinkButton,
	LinkContent,
	LinkPopover,
} from "@/components/ui/link-popover";
import { ListDropdownMenu } from "@/components/ui/list-dropdown-menu";
import { MarkButton } from "@/components/ui/mark-button";
import { TextAlignButton } from "@/components/ui/text-align-button";
import { UndoRedoButton } from "@/components/ui/undo-redo-button";
import { useCursorVisibility } from "@/hooks/use-cursor-visibility";
import { useIsMobile } from "@/hooks/use-mobile";
import { useWindowSize } from "@/hooks/use-window-size";
import { handleImageUpload, MAX_FILE_SIZE } from "@/utils";
import "@/editor/index.scss";
import { Markdown } from "tiptap-markdown";

type MarkdownStorage = { getMarkdown: () => string };

export type EditorRef = {
	getMarkdown: () => string;
	getJSON: () => unknown;
};

const MainToolbarContent = ({
	onHighlighterClick,
	onLinkClick,
	isMobile,
}: {
	onHighlighterClick: () => void;
	onLinkClick: () => void;
	isMobile: boolean;
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
				<HeadingDropdownMenu levels={[1, 2, 3, 4]} portal={isMobile} />
				<ListDropdownMenu
					types={["bulletList", "orderedList", "taskList"]}
					portal={isMobile}
				/>
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
				{!isMobile ? (
					<ColorHighlightPopover />
				) : (
					<ColorHighlightPopoverButton onClick={onHighlighterClick} />
				)}
				{!isMobile ? <LinkPopover /> : <LinkButton onClick={onLinkClick} />}
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

const MobileToolbarContent = ({
	type,
	onBack,
}: {
	type: "highlighter" | "link";
	onBack: () => void;
}) => (
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

		{type === "highlighter" ? (
			<ColorHighlightPopoverContent />
		) : (
			<LinkContent />
		)}
	</>
);

export const Editor = React.forwardRef(function Editor(
	{ content }: { content: string },
	ref: React.ForwardedRef<EditorRef>,
) {
	const isMobile = useIsMobile();
	const windowSize = useWindowSize();
	const [mobileView, setMobileView] = React.useState<
		"main" | "highlighter" | "link"
	>("main");
	const toolbarRef = React.useRef<HTMLDivElement>(null);

	const editor = useEditor({
		content,
		editorProps: {
			attributes: {
				"aria-label": "Main content area, start typing to enter text.",
				autocapitalize: "off",
				autocomplete: "off",
				autocorrect: "off",
				class: "simple-editor",
			},
		},
		extensions: [
			StarterKit.configure({
				horizontalRule: false,
				link: {
					enableClickSelection: true,
					openOnClick: false,
				},
			}),
			Markdown,
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
		],
		immediatelyRender: false,
		shouldRerenderOnTransaction: false,
	});

	React.useImperativeHandle(
		ref,
		() => ({
			getMarkdown: () =>
				// @ts-expect-error: markdown is injected by tiptap-markdown extension
				(editor?.storage.markdown as MarkdownStorage)?.getMarkdown?.() ?? "",
			getJSON: () => editor?.getJSON(),
		}),
		[editor],
	);

	const bodyRect = useCursorVisibility({
		editor,
		overlayHeight: toolbarRef.current?.getBoundingClientRect().height ?? 0,
	});

	React.useEffect(() => {
		if (!isMobile && mobileView !== "main") {
			setMobileView("main");
		}
	}, [isMobile, mobileView]);

	return (
		<div className="simple-editor-wrapper">
			<EditorContext.Provider value={{ editor }}>
				<Toolbar
					ref={toolbarRef}
					style={
						isMobile
							? {
									bottom: `calc(100% - ${windowSize.height - bodyRect.y}px)`,
								}
							: {}
					}
				>
					{mobileView === "main" ? (
						<MainToolbarContent
							onHighlighterClick={() => setMobileView("highlighter")}
							onLinkClick={() => setMobileView("link")}
							isMobile={isMobile}
						/>
					) : (
						<MobileToolbarContent
							type={mobileView === "highlighter" ? "highlighter" : "link"}
							onBack={() => setMobileView("main")}
						/>
					)}
				</Toolbar>

				<EditorContent
					data-testid="simple-editor-content"
					editor={editor}
					role="presentation"
					className="simple-editor-content"
				/>
			</EditorContext.Provider>
		</div>
	);
});
