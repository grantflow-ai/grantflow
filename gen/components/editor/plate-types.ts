"use client";

import type React from "react";

import type { BlockquotePlugin } from "@udecode/plate-block-quote/react";
import type { CodeBlockPlugin, CodeLinePlugin } from "@udecode/plate-code-block/react";
import type { TCommentText } from "@udecode/plate-comments";
import type { TElement, TText } from "@udecode/plate-common";
import type { ParagraphPlugin } from "@udecode/plate-common/react";
import type { HEADING_KEYS } from "@udecode/plate-heading";
import type { HorizontalRulePlugin } from "@udecode/plate-horizontal-rule/react";
import type { TLinkElement } from "@udecode/plate-link";
import type { LinkPlugin } from "@udecode/plate-link/react";
import type { TImageElement, TMediaEmbedElement } from "@udecode/plate-media";
import type { ImagePlugin, MediaEmbedPlugin } from "@udecode/plate-media/react";
import type { TMentionElement, TMentionInputElement } from "@udecode/plate-mention";
import type { MentionInputPlugin, MentionPlugin } from "@udecode/plate-mention/react";
import type { TTableElement } from "@udecode/plate-table";
import type { TableCellPlugin, TablePlugin, TableRowPlugin } from "@udecode/plate-table/react";
import type { TToggleElement } from "@udecode/plate-toggle";
import type { TogglePlugin } from "@udecode/plate-toggle/react";

/** Text */

export type EmptyText = {
	text: "";
};

export type PlainText = {
	text: string;
};

export interface RichText extends TText, TCommentText {
	backgroundColor?: React.CSSProperties["backgroundColor"];
	bold?: boolean;
	code?: boolean;
	color?: React.CSSProperties["color"];
	fontFamily?: React.CSSProperties["fontFamily"];
	fontSize?: React.CSSProperties["fontSize"];
	fontWeight?: React.CSSProperties["fontWeight"];
	italic?: boolean;
	kbd?: boolean;
	strikethrough?: boolean;
	subscript?: boolean;
	underline?: boolean;
}

/** Inline Elements */

export interface EditorLinkElement extends TLinkElement {
	children: RichText[];
	type: typeof LinkPlugin.key;
}

export interface EditorMentionInputElement extends TMentionInputElement {
	children: [PlainText];
	type: typeof MentionInputPlugin.key;
}

export interface EditorMentionElement extends TMentionElement {
	children: [EmptyText];
	type: typeof MentionPlugin.key;
}

export type EditorInlineElement = EditorLinkElement | EditorMentionElement | EditorMentionInputElement;

export type EditorInlineDescendant = EditorInlineElement | RichText;

export type EditorInlineChildren = EditorInlineDescendant[];

/** Block props */

export interface EditorIndentProps {
	indent?: number;
}

export interface EditorIndentListProps extends EditorIndentProps {
	listRestart?: number;
	listStart?: number;
	listStyleType?: string;
}

export interface EditorLineHeightProps {
	lineHeight?: React.CSSProperties["lineHeight"];
}

export interface EditorAlignProps {
	align?: React.CSSProperties["textAlign"];
}

export interface EditorBlockElement extends TElement, EditorIndentListProps, EditorLineHeightProps {
	id?: string;
}

/** Blocks */

export interface EditorParagraphElement extends EditorBlockElement {
	children: EditorInlineChildren;
	type: typeof ParagraphPlugin.key;
}

export interface EditorH1Element extends EditorBlockElement {
	children: EditorInlineChildren;
	type: typeof HEADING_KEYS.h1;
}

export interface EditorH2Element extends EditorBlockElement {
	children: EditorInlineChildren;
	type: typeof HEADING_KEYS.h2;
}

export interface EditorH3Element extends EditorBlockElement {
	children: EditorInlineChildren;
	type: typeof HEADING_KEYS.h3;
}

export interface EditorBlockquoteElement extends EditorBlockElement {
	children: EditorInlineChildren;
	type: typeof BlockquotePlugin.key;
}

export interface EditorCodeBlockElement extends EditorBlockElement {
	children: EditorCodeLineElement[];
	type: typeof CodeBlockPlugin.key;
}

export interface EditorCodeLineElement extends TElement {
	children: PlainText[];
	type: typeof CodeLinePlugin.key;
}

export interface EditorTableElement extends TTableElement, EditorBlockElement {
	children: EditorTableRowElement[];
	type: typeof TablePlugin.key;
}

export interface EditorTableRowElement extends TElement {
	children: EditorTableCellElement[];
	type: typeof TableRowPlugin.key;
}

export interface EditorTableCellElement extends TElement {
	children: EditorNestableBlock[];
	type: typeof TableCellPlugin.key;
}

export interface EditorToggleElement extends TToggleElement, EditorBlockElement {
	children: EditorInlineChildren;
	type: typeof TogglePlugin.key;
}

export interface EditorImageElement extends TImageElement, EditorBlockElement {
	children: [EmptyText];
	type: typeof ImagePlugin.key;
}

export interface EditorMediaEmbedElement extends TMediaEmbedElement, EditorBlockElement {
	children: [EmptyText];
	type: typeof MediaEmbedPlugin.key;
}

export interface EditorHrElement extends EditorBlockElement {
	children: [EmptyText];
	type: typeof HorizontalRulePlugin.key;
}

export type EditorNestableBlock = EditorParagraphElement;

export type EditorRootBlock =
	| EditorBlockquoteElement
	| EditorCodeBlockElement
	| EditorH1Element
	| EditorH2Element
	| EditorH3Element
	| EditorHrElement
	| EditorImageElement
	| EditorMediaEmbedElement
	| EditorParagraphElement
	| EditorTableElement
	| EditorToggleElement;

export type EditorValue = EditorRootBlock[];
