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
import { Toolbar, ToolbarGroup, ToolbarSeparator } from "@/components/ui/toolbar";
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
import { ColorHighlightPopoverContent } from "@/components/ui/color-highlight-popover";
import { FontFamilyDropdownMenu } from "@/components/ui/font-family-dropdown-menu";
import { FontSizeDropdownMenu } from "@/components/ui/font-size-dropdown-menu";
import { HeadingDropdownMenu } from "@/components/ui/heading-dropdown-menu";
import { ImageUploadButton } from "@/components/ui/image-upload-button";
import { LinkButton, LinkContent, LinkPopover } from "@/components/ui/link-popover";
import { ListDropdownMenu } from "@/components/ui/list-dropdown-menu";
import { MarkButton } from "@/components/ui/mark-button";
import { TableButton } from "@/components/ui/table-button";
import { TableContextMenu } from "@/components/ui/table-context-menu";
import { TextAlignButton } from "@/components/ui/text-align-button";
import { UndoRedoButton } from "@/components/ui/undo-redo-button";
import { useCursorVisibility } from "@/hooks/use-cursor-visibility";
import { useIsMobile } from "@/hooks/use-mobile";
import { useWindowSize } from "@/hooks/use-window-size";
import { handleImageUpload, MAX_FILE_SIZE } from "@/utils";
import "@/editor/index.scss";
import { HocuspocusProvider } from "@hocuspocus/provider";
import type { JSONContent } from "@tiptap/core";
import Collaboration from "@tiptap/extension-collaboration";
import { TableKit } from "@tiptap/extension-table";
import { FontFamily, FontSize, TextStyle } from "@tiptap/extension-text-style";
import { Markdown } from "tiptap-markdown";

type MarkdownStorage = { getMarkdown: () => string };

export type EditorRef = {
	getMarkdown: () => string;
	getJSON: () => unknown;
	getHeadings: () => { level: HeadingLevels; text: string }[];
	scrollToHeading: (headingIndex: number) => boolean;
};

export enum HeadingLevels {
	H1 = 1,
	H2 = 2,
	H3 = 3,
}

const MainToolbarContent = ({ onLinkClick, isMobile }: { onLinkClick: () => void; isMobile: boolean }) => {
	return (
		<>
			<Spacer />

			<ToolbarGroup>
				<UndoRedoButton action="undo" />
				<UndoRedoButton action="redo" />
			</ToolbarGroup>

			<ToolbarGroup>
				<HeadingDropdownMenu
					levels={[HeadingLevels.H1, HeadingLevels.H2, HeadingLevels.H3]}
					portal={isMobile}
				/>
			</ToolbarGroup>

			<ToolbarGroup>
				<FontFamilyDropdownMenu
					fontFamilies={["Arial", "Times New Roman", "Courier New", "Georgia", "Verdana"]}
					portal={isMobile}
				/>
			</ToolbarGroup>

			<ToolbarGroup>
				<FontSizeDropdownMenu
					fontSizes={["8px", "10px", "12px", "14px", "16px", "18px", "20px", "24px", "28px", "32px"]}
					portal={isMobile}
				/>
			</ToolbarGroup>

			<ToolbarGroup>
				<MarkButton type="bold" />
				<MarkButton type="italic" />
				<MarkButton type="underline" />
				<ListDropdownMenu types={["bulletList", "orderedList", "taskList"]} portal={isMobile} />
				<BlockquoteButton />
				{!isMobile ? <LinkPopover /> : <LinkButton onClick={onLinkClick} />}
			</ToolbarGroup>

			<ToolbarGroup>
				<TextAlignButton align="left" />
				<TextAlignButton align="center" />
				<TextAlignButton align="right" />
				<TextAlignButton align="justify" />
			</ToolbarGroup>

			<ToolbarGroup>
				<TableButton />
				<ImageUploadButton />
			</ToolbarGroup>

			<Spacer />

			{isMobile && <ToolbarSeparator />}
		</>
	);
};

const MobileToolbarContent = ({ type, onBack }: { type: "highlighter" | "link"; onBack: () => void }) => (
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

export const Editor = React.forwardRef(function Editor(
	{
		content,
		onContentChange,
		documentId,
		crdtUrl,
	}: {
		content: string;
		onContentChange?: () => void;
		documentId: string;
		crdtUrl: string;
	},
	ref: React.ForwardedRef<EditorRef>,
) {
	const isMobile = useIsMobile();
	const windowSize = useWindowSize();
	const [mobileView, setMobileView] = React.useState<"main" | "highlighter" | "link">("main");
	const toolbarRef = React.useRef<HTMLDivElement>(null);

	const provider = React.useMemo(() => {
		return new HocuspocusProvider({
			name: documentId,
			url: crdtUrl,
		});
	}, [crdtUrl, documentId]);

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
			Collaboration.configure({
				document: provider.document,
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
			TextStyle,
			FontFamily,
			FontSize,
			TableKit,
		],
		immediatelyRender: false,
		onCreate: () => {
			onContentChange?.();
		},
		onUpdate: () => {
			onContentChange?.();
		},
		shouldRerenderOnTransaction: false,
	});

	React.useImperativeHandle(
		ref,
		() => ({
			getHeadings: () => {
				const json = editor?.getJSON();
				if (!json || typeof json !== "object") return [];

				function extractHeadings(node: JSONContent): { level: HeadingLevels; text: string }[] {
					if (!node) return [];
					let result: { level: HeadingLevels; text: string }[] = [];
					if (
						node.type === "heading" &&
						(node.attrs?.level === HeadingLevels.H2 || node.attrs?.level === HeadingLevels.H3)
					) {
						const text = (node.content || []).map((c: JSONContent) => c.text || "").join("");
						result.push({ level: node.attrs.level, text });
					}
					if (Array.isArray(node.content)) {
						for (const child of node.content) {
							result = result.concat(extractHeadings(child));
						}
					}
					return result;
				}

				return extractHeadings(json);
			},
			getJSON: () => editor?.getJSON(),
			getMarkdown: () =>
				// @ts-expect-error: markdown is injected by tiptap-markdown extension
				(editor?.storage.markdown as MarkdownStorage)?.getMarkdown?.() ?? "",
			scrollToHeading: (headingIndex: number) => {
				if (!editor) return false;
				// Find all h2/h3 headings in document order using $nodes
				const h2Nodes = editor.$nodes("heading", { level: HeadingLevels.H2 }) || [];
				const h3Nodes = editor.$nodes("heading", { level: HeadingLevels.H3 }) || [];
				const allHeadings = [...h2Nodes, ...h3Nodes].sort((a, b) => a.pos - b.pos);

				if (headingIndex < 0 || headingIndex >= allHeadings.length) return false;
				const nodePos = allHeadings[headingIndex];
				if (!nodePos) return false;

				editor
					.chain()
					.focus()
					.setTextSelection(nodePos.from + 1)
					.run();

				const el = nodePos.element as HTMLElement | null;
				if (el && typeof el.scrollIntoView === "function") {
					el.scrollIntoView({ behavior: "smooth", block: "start" });
				} else {
					const root = editor.options.element as HTMLElement | null;
					if (root) {
						const headings = root.querySelectorAll("h2, h3");
						const domHeading = headings[headingIndex] as HTMLElement | undefined;
						if (domHeading && typeof domHeading.scrollIntoView === "function") {
							domHeading.scrollIntoView({
								behavior: "smooth",
								block: "start",
							});
						}
					}
				}
				return true;
			},
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
						<MainToolbarContent onLinkClick={() => setMobileView("link")} isMobile={isMobile} />
					) : (
						<MobileToolbarContent
							type={mobileView === "highlighter" ? "highlighter" : "link"}
							onBack={() => setMobileView("main")}
						/>
					)}
				</Toolbar>

				<TableContextMenu>
					<EditorContent
						data-testid="simple-editor-content"
						editor={editor}
						role="presentation"
						className="simple-editor-content"
					/>
				</TableContextMenu>
			</EditorContext.Provider>
		</div>
	);
});
