import { Mark, mergeAttributes } from "@tiptap/core";

export const DiffInsertion = Mark.create({
	addAttributes() {
		return {
			"data-id": { default: "" },
		};
	},
	addOptions() {
		return { HTMLAttributes: { class: "insertion" } };
	},
	name: "insertion",
	parseHTML() {
		return [{ tag: "span.insertion" }];
	},
	renderHTML({ HTMLAttributes }) {
		return ["span", mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0];
	},
});

export const DiffDeletion = Mark.create({
	addAttributes() {
		return {
			contenteditable: { default: "false" },
			"data-id": { default: "" },
		};
	},
	addOptions() {
		return { HTMLAttributes: { class: "deletion" } };
	},
	name: "deletion",
	parseHTML() {
		return [{ tag: "span.deletion" }];
	},
	renderHTML({ HTMLAttributes }) {
		return ["span", mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0];
	},
});
