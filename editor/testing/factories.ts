import type { JSONContent } from "@tiptap/react";
import { Factory } from "interface-forge";

export const ParagraphNodeFactory = new Factory<JSONContent>((factory) => ({
	content: [
		{
			text: factory.lorem.paragraph(),
			type: "text",
		},
	],
	type: "paragraph",
}));

export const HeadingNodeFactory = new Factory<JSONContent>((factory) => ({
	attrs: {
		level: factory.helpers.arrayElement([1, 2, 3, 4, 5, 6]),
	},
	content: [
		{
			text: factory.lorem.sentence(),
			type: "text",
		},
	],
	type: "heading",
}));

export const BoldTextNodeFactory = new Factory<JSONContent>((factory) => ({
	marks: [{ type: "bold" }],
	text: factory.lorem.words(3),
	type: "text",
}));

export const ItalicTextNodeFactory = new Factory<JSONContent>((factory) => ({
	marks: [{ type: "italic" }],
	text: factory.lorem.words(3),
	type: "text",
}));

export const LinkTextNodeFactory = new Factory<JSONContent>((factory) => ({
	marks: [
		{
			attrs: {
				href: factory.internet.url(),
				target: "_blank",
			},
			type: "link",
		},
	],
	text: factory.lorem.words(2),
	type: "text",
}));

export const BlockquoteNodeFactory = new Factory<JSONContent>((factory) => ({
	content: [
		{
			content: [
				{
					text: factory.lorem.sentence(),
					type: "text",
				},
			],
			type: "paragraph",
		},
	],
	type: "blockquote",
}));

export const CodeBlockNodeFactory = new Factory<JSONContent>((factory) => ({
	attrs: {
		language: factory.helpers.arrayElement(["javascript", "python", "typescript", "json"]),
	},
	content: [
		{
			text: factory.helpers.arrayElement([
				"const example = 'hello world';",
				"def hello():\n    return 'world'",
				"interface User {\n  name: string;\n}",
				'{"key": "value"}',
			]),
			type: "text",
		},
	],
	type: "codeBlock",
}));

export const BulletListNodeFactory = new Factory<JSONContent>((factory) => ({
	content: factory.helpers.multiple(
		() => ({
			content: [
				{
					content: [
						{
							text: factory.lorem.sentence(),
							type: "text",
						},
					],
					type: "paragraph",
				},
			],
			type: "listItem",
		}),
		{ count: { max: 5, min: 2 } },
	),
	type: "bulletList",
}));

export const OrderedListNodeFactory = new Factory<JSONContent>((factory) => ({
	content: factory.helpers.multiple(
		() => ({
			content: [
				{
					content: [
						{
							text: factory.lorem.sentence(),
							type: "text",
						},
					],
					type: "paragraph",
				},
			],
			type: "listItem",
		}),
		{ count: { max: 5, min: 2 } },
	),
	type: "orderedList",
}));

export const TaskListNodeFactory = new Factory<JSONContent>((factory) => ({
	content: factory.helpers.multiple(
		() => ({
			attrs: {
				checked: factory.datatype.boolean(),
			},
			content: [
				{
					content: [
						{
							text: factory.lorem.sentence(),
							type: "text",
						},
					],
					type: "paragraph",
				},
			],
			type: "taskItem",
		}),
		{ count: { max: 4, min: 2 } },
	),
	type: "taskList",
}));

export const ImageNodeFactory = new Factory<JSONContent>((factory) => ({
	attrs: {
		alt: factory.lorem.words(3),
		src: factory.image.url(),
		title: factory.datatype.boolean() ? factory.lorem.sentence() : null,
	},
	type: "image",
}));

export const HorizontalRuleNodeFactory = new Factory<JSONContent>(() => ({
	type: "horizontalRule",
}));

export const HighlightTextNodeFactory = new Factory<JSONContent>((factory) => ({
	marks: [
		{
			attrs: {
				color: factory.helpers.arrayElement(["#ffff00", "#ff0000", "#00ff00", "#0000ff"]),
			},
			type: "highlight",
		},
	],
	text: factory.lorem.words(4),
	type: "text",
}));

export const EditorDocumentFactory = new Factory<JSONContent>((factory) => ({
	content: factory.helpers.arrayElement([
		[ParagraphNodeFactory.build(), HeadingNodeFactory.build({ attrs: { level: 2 } }), ParagraphNodeFactory.build()],

		[
			HeadingNodeFactory.build({ attrs: { level: 1 } }),
			ParagraphNodeFactory.build(),
			BulletListNodeFactory.build(),
			BlockquoteNodeFactory.build(),
			CodeBlockNodeFactory.build(),
			ParagraphNodeFactory.build(),
			HorizontalRuleNodeFactory.build(),
			ParagraphNodeFactory.build(),
		],

		[
			HeadingNodeFactory.build({ attrs: { level: 2 } }),
			TaskListNodeFactory.build(),
			ParagraphNodeFactory.build(),
			OrderedListNodeFactory.build(),
		],
	]),
	type: "doc",
}));

export const RichParagraphNodeFactory = new Factory<JSONContent>((factory) => ({
	content: [
		{
			text: `${factory.lorem.words(3)} `,
			type: "text",
		},
		BoldTextNodeFactory.build({ text: `${factory.lorem.words(2)} ` }),
		{
			text: `${factory.lorem.words(2)} `,
			type: "text",
		},
		ItalicTextNodeFactory.build({ text: `${factory.lorem.words(2)} ` }),
		{
			text: `${factory.lorem.words(2)} `,
			type: "text",
		},
		LinkTextNodeFactory.build({ text: factory.lorem.words(1) }),
		{
			text: `. ${factory.lorem.sentence()}`,
			type: "text",
		},
	],
	type: "paragraph",
}));

export const MockFileFactory = new Factory<File>((factory) => {
	const filename = `${factory.lorem.word()}.${factory.helpers.arrayElement(["jpg", "png", "gif", "webp"])}`;
	const type = factory.helpers.arrayElement(["image/jpeg", "image/png", "image/gif", "image/webp"]);
	const size = factory.number.int({ max: 5 * 1024 * 1024, min: 1024 });

	return new File([new ArrayBuffer(size)], filename, {
		lastModified: factory.date.recent().getTime(),
		type,
	});
});

export const EditorStateFactory = new Factory<{
	content: JSONContent;
	selection: { from: number; to: number };
	canUndoRedo: { canUndo: boolean; canRedo: boolean };
}>((factory) => ({
	canUndoRedo: {
		canRedo: factory.datatype.boolean(),
		canUndo: factory.datatype.boolean(),
	},
	content: EditorDocumentFactory.build(),
	selection: {
		from: factory.number.int({ max: 100, min: 0 }),
		to: factory.number.int({ max: 100, min: 0 }),
	},
}));
