import TiptapLink from "@tiptap/extension-link";
import { Plugin, TextSelection } from "@tiptap/pm/state";
import type { EditorView } from "@tiptap/pm/view";
import { getMarkRange } from "@tiptap/react";

export const Link = TiptapLink.extend({
	addProseMirrorPlugins() {
		const { editor } = this;

		return [
			...(this.parent?.() || []),
			new Plugin({
				props: {
					handleClick(view, pos) {
						const { doc, schema, tr } = view.state;
						let range: ReturnType<typeof getMarkRange> | undefined;

						if (schema.marks.link) {
							range = getMarkRange(doc.resolve(pos), schema.marks.link);
						}

						if (!range) {
							return;
						}

						const { from, to } = range;
						const start = Math.min(from, to);
						const end = Math.max(from, to);

						if (pos < start || pos > end) {
							return;
						}

						const $start = doc.resolve(start);
						const $end = doc.resolve(end);
						const transaction = tr.setSelection(new TextSelection($start, $end));

						view.dispatch(transaction);
					},
					handleKeyDown: (_: EditorView, event: KeyboardEvent) => {
						const { selection } = editor.state;

						if (event.key === "Escape" && !selection.empty) {
							editor.commands.focus(selection.to, { scrollIntoView: false });
						}

						return false;
					},
				},
			}),
		];
	},
	inclusive: false,

	parseHTML() {
		return [
			{
				tag: 'a[href]:not([data-type="button"]):not([href *= "javascript:" i])',
			},
		];
	},
});

export default Link;
