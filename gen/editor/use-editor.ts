import { withProps } from "@udecode/cn";
import { AIPlugin } from "@udecode/plate-ai/react";
import {
	BoldPlugin,
	CodePlugin,
	ItalicPlugin,
	StrikethroughPlugin,
	SubscriptPlugin,
	SuperscriptPlugin,
	UnderlinePlugin,
} from "@udecode/plate-basic-marks/react";
import { BlockquotePlugin } from "@udecode/plate-block-quote/react";
import { CodeBlockPlugin, CodeLinePlugin, CodeSyntaxPlugin } from "@udecode/plate-code-block/react";
import { CommentsPlugin } from "@udecode/plate-comments/react";
import { ParagraphPlugin, PlateLeaf, usePlateEditor } from "@udecode/plate-common/react";
import { DatePlugin } from "@udecode/plate-date/react";
import { HEADING_KEYS } from "@udecode/plate-heading";
import { TocPlugin } from "@udecode/plate-heading/react";
import { HighlightPlugin } from "@udecode/plate-highlight/react";
import { HorizontalRulePlugin } from "@udecode/plate-horizontal-rule/react";
import { KbdPlugin } from "@udecode/plate-kbd/react";
import { ColumnItemPlugin, ColumnPlugin } from "@udecode/plate-layout/react";
import { LinkPlugin } from "@udecode/plate-link/react";
import {
	AudioPlugin,
	FilePlugin,
	ImagePlugin,
	MediaEmbedPlugin,
	PlaceholderPlugin,
	VideoPlugin,
} from "@udecode/plate-media/react";
import { MentionInputPlugin, MentionPlugin } from "@udecode/plate-mention/react";
import { SlashInputPlugin } from "@udecode/plate-slash-command/react";
import { TableCellHeaderPlugin, TableCellPlugin, TablePlugin, TableRowPlugin } from "@udecode/plate-table/react";
import { TogglePlugin } from "@udecode/plate-toggle/react";

import { editorPlugins } from "gen/editor/editor-plugins";
import { AILeaf } from "gen/editor/ui/ai-leaf";
import { BlockquoteElement } from "gen/editor/ui/blockquote-element";
import { CodeBlockElement } from "gen/editor/ui/code-block-element";
import { CodeLeaf } from "gen/editor/ui/code-leaf";
import { CodeLineElement } from "gen/editor/ui/code-line-element";
import { CodeSyntaxLeaf } from "gen/editor/ui/code-syntax-leaf";
import { ColumnElement } from "gen/editor/ui/column-element";
import { ColumnGroupElement } from "gen/editor/ui/column-group-element";
import { CommentLeaf } from "gen/editor/ui/comment-leaf";
import { DateElement } from "gen/editor/ui/date-element";
import { HeadingElement } from "gen/editor/ui/heading-element";
import { HighlightLeaf } from "gen/editor/ui/highlight-leaf";
import { HrElement } from "gen/editor/ui/hr-element";
import { ImageElement } from "gen/editor/ui/image-element";
import { KbdLeaf } from "gen/editor/ui/kbd-leaf";
import { LinkElement } from "gen/editor/ui/link-element";
import { MediaAudioElement } from "gen/editor/ui/media-audio-element";
import { MediaEmbedElement } from "gen/editor/ui/media-embed-element";
import { MediaFileElement } from "gen/editor/ui/media-file-element";
import { MediaPlaceholderElement } from "gen/editor/ui/media-placeholder-element";
import { MediaVideoElement } from "gen/editor/ui/media-video-element";
import { MentionElement } from "gen/editor/ui/mention-element";
import { MentionInputElement } from "gen/editor/ui/mention-input-element";
import { ParagraphElement } from "gen/editor/ui/paragraph-element";
import { withPlaceholders } from "gen/editor/ui/placeholder";
import { SlashInputElement } from "gen/editor/ui/slash-input-element";
import { TableCellElement, TableCellHeaderElement } from "gen/editor/ui/table-cell-element";
import { TableElement } from "gen/editor/ui/table-element";
import { TableRowElement } from "gen/editor/ui/table-row-element";
import { TocElement } from "gen/editor/ui/toc-element";
import { ToggleElement } from "gen/editor/ui/toggle-element";
import { withDraggables } from "gen/editor/ui/with-draggables";

const editorArgs = {
	override: {
		components: withDraggables(
			withPlaceholders({
				[AIPlugin.key]: AILeaf,
				[AudioPlugin.key]: MediaAudioElement,
				[BlockquotePlugin.key]: BlockquoteElement,
				[BoldPlugin.key]: withProps(PlateLeaf, { as: "strong" }),
				[CodeBlockPlugin.key]: CodeBlockElement,
				[CodeLinePlugin.key]: CodeLineElement,
				[CodePlugin.key]: CodeLeaf,
				[CodeSyntaxPlugin.key]: CodeSyntaxLeaf,
				[ColumnItemPlugin.key]: ColumnElement,
				[ColumnPlugin.key]: ColumnGroupElement,
				[CommentsPlugin.key]: CommentLeaf,
				[DatePlugin.key]: DateElement,
				[FilePlugin.key]: MediaFileElement,
				[HEADING_KEYS.h1]: withProps(HeadingElement, { variant: "h1" }),
				[HEADING_KEYS.h2]: withProps(HeadingElement, { variant: "h2" }),
				[HEADING_KEYS.h3]: withProps(HeadingElement, { variant: "h3" }),
				[HEADING_KEYS.h4]: withProps(HeadingElement, { variant: "h4" }),
				[HEADING_KEYS.h5]: withProps(HeadingElement, { variant: "h5" }),
				[HEADING_KEYS.h6]: withProps(HeadingElement, { variant: "h6" }),
				[HighlightPlugin.key]: HighlightLeaf,
				[HorizontalRulePlugin.key]: HrElement,
				[ImagePlugin.key]: ImageElement,
				[ItalicPlugin.key]: withProps(PlateLeaf, { as: "em" }),
				[KbdPlugin.key]: KbdLeaf,
				[LinkPlugin.key]: LinkElement,
				[MediaEmbedPlugin.key]: MediaEmbedElement,
				[MentionInputPlugin.key]: MentionInputElement,
				[MentionPlugin.key]: MentionElement,
				[ParagraphPlugin.key]: ParagraphElement,
				[PlaceholderPlugin.key]: MediaPlaceholderElement,
				[SlashInputPlugin.key]: SlashInputElement,
				[StrikethroughPlugin.key]: withProps(PlateLeaf, { as: "s" }),
				[SubscriptPlugin.key]: withProps(PlateLeaf, { as: "sub" }),
				[SuperscriptPlugin.key]: withProps(PlateLeaf, { as: "sup" }),
				[TableCellHeaderPlugin.key]: TableCellHeaderElement,
				[TableCellPlugin.key]: TableCellElement,
				[TablePlugin.key]: TableElement,
				[TableRowPlugin.key]: TableRowElement,
				[TocPlugin.key]: TocElement,
				[TogglePlugin.key]: ToggleElement,
				[UnderlinePlugin.key]: withProps(PlateLeaf, { as: "u" }),
				[VideoPlugin.key]: MediaVideoElement,
			}),
		),
	},
	plugins: editorPlugins,
};

export const useEditor = ({ content }: { content: string }) => {
	const editor = usePlateEditor(editorArgs);
	editor.tf.setValue(editor.api.markdown.deserialize(content));
	return editor;
};
