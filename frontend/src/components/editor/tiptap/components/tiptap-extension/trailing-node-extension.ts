import type { Node, NodeType } from "@tiptap/pm/model";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Extension } from "@tiptap/react";

export interface TrailingNodeOptions {
	node: string;
	notAfter: string[];
}

function nodeEqualsType({ node, types }: { node: Node | null; types: NodeType | NodeType[] }) {
	if (!node) return false;

	if (Array.isArray(types)) {
		return types.includes(node.type);
	}

	return node.type === types;
}

export const TrailingNode = Extension.create<TrailingNodeOptions>({
	addOptions() {
		return {
			node: "paragraph",
			notAfter: ["paragraph"],
		};
	},

	addProseMirrorPlugins() {
		const plugin = new PluginKey(this.name);
		const disabledNodes = Object.entries(this.editor.schema.nodes)
			.map(([, value]) => value)
			.filter((node) => this.options.notAfter.includes(node.name));

		return [
			new Plugin({
				appendTransaction: (_, __, state) => {
					const { doc, schema, tr } = state;
					const shouldInsertNodeAtEnd = plugin.getState(state);
					const endPosition = doc.content.size;
					const type = schema.nodes[this.options.node];

					if (!shouldInsertNodeAtEnd) {
						return null;
					}

					if (type) {
						return tr.insert(endPosition, type.create());
					}

					return null;
				},
				key: plugin,
				state: {
					apply: (tr, value) => {
						if (!tr.docChanged) {
							return value;
						}

						const lastNode = tr.doc.lastChild;

						return !nodeEqualsType({ node: lastNode, types: disabledNodes });
					},
					init: (_, state) => {
						const lastNode = state.tr.doc.lastChild;

						return !nodeEqualsType({ node: lastNode, types: disabledNodes });
					},
				},
			}),
		];
	},
	name: "trailingNode",
});

export default TrailingNode;
