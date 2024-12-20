"use client";

import { CalloutPlugin } from "@udecode/plate-callout/react";
import { ParagraphPlugin } from "@udecode/plate-common/react";
import { DatePlugin } from "@udecode/plate-date/react";
import { DocxPlugin } from "@udecode/plate-docx";
import { FontBackgroundColorPlugin, FontColorPlugin, FontSizePlugin } from "@udecode/plate-font/react";
import { HighlightPlugin } from "@udecode/plate-highlight/react";
import { HorizontalRulePlugin } from "@udecode/plate-horizontal-rule/react";
import { KbdPlugin } from "@udecode/plate-kbd/react";
import { ColumnPlugin } from "@udecode/plate-layout/react";
import { MarkdownPlugin } from "@udecode/plate-markdown";
import { EquationPlugin, InlineEquationPlugin } from "@udecode/plate-math/react";
import { SlashPlugin } from "@udecode/plate-slash-command/react";
import { TogglePlugin } from "@udecode/plate-toggle/react";
import { TrailingBlockPlugin } from "@udecode/plate-trailing-block";

import { FixedToolbarPlugin } from "gen/editor/plugins/fixed-toolbar-plugin";
import { FloatingToolbarPlugin } from "gen/editor/plugins/floating-toolbar-plugin";

import { aiPlugins } from "gen/editor/plugins/ai-plugins";
import { alignPlugin } from "gen/editor/plugins/align-plugin";
import { autoformatPlugin } from "gen/editor/plugins/autoformat-plugin";
import { basicNodesPlugins } from "gen/editor/plugins/basic-nodes-plugins";
import { blockMenuPlugins } from "gen/editor/plugins/block-menu-plugins";
import { commentsPlugin } from "gen/editor/plugins/comments-plugin";
import { cursorOverlayPlugin } from "gen/editor/plugins/cursor-overlay-plugin";
import { deletePlugins } from "gen/editor/plugins/delete-plugins";
import { dndPlugins } from "gen/editor/plugins/dnd-plugins";
import { exitBreakPlugin } from "gen/editor/plugins/exit-break-plugin";
import { indentListPlugins } from "gen/editor/plugins/indent-list-plugins";
import { lineHeightPlugin } from "gen/editor/plugins/line-height-plugin";
import { linkPlugin } from "gen/editor/plugins/link-plugin";
import { mediaPlugins } from "gen/editor/plugins/media-plugins";
import { mentionPlugin } from "gen/editor/plugins/mention-plugin";
import { resetBlockTypePlugin } from "gen/editor/plugins/reset-block-type-plugin";
import { softBreakPlugin } from "gen/editor/plugins/soft-break-plugin";
import { tablePlugin } from "gen/editor/plugins/table-plugin";
import { tocPlugin } from "gen/editor/plugins/toc-plugin";

export const viewPlugins = [
	...basicNodesPlugins,
	HorizontalRulePlugin,
	linkPlugin,
	DatePlugin,
	mentionPlugin,
	tablePlugin,
	TogglePlugin,
	tocPlugin,
	...mediaPlugins,
	InlineEquationPlugin,
	EquationPlugin,
	CalloutPlugin,
	ColumnPlugin,

	// Marks
	FontColorPlugin,
	FontBackgroundColorPlugin,
	FontSizePlugin,
	HighlightPlugin,
	KbdPlugin,

	// Block Style
	alignPlugin,
	...indentListPlugins,
	lineHeightPlugin,

	// Collaboration
	commentsPlugin,
] as const;

export const editorPlugins = [
	// AI
	...aiPlugins,

	// Nodes
	...viewPlugins,

	// Functionality
	SlashPlugin,
	autoformatPlugin,
	cursorOverlayPlugin,
	...blockMenuPlugins,
	...dndPlugins,
	exitBreakPlugin,
	resetBlockTypePlugin,
	...deletePlugins,
	softBreakPlugin,
	TrailingBlockPlugin.configure({ options: { type: ParagraphPlugin.key } }),

	// Deserialization
	DocxPlugin,
	MarkdownPlugin.configure({ options: { indentList: true } }),

	// UI
	FixedToolbarPlugin,
	FloatingToolbarPlugin,
];
