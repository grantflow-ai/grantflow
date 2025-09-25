import { Extension, getHTMLFromFragment } from "@tiptap/core";
import { nanoid } from "nanoid";
import { DiffDeletion, DiffInsertion } from "./diff-marks";

export const EXTENSION_NAME = "aiTools";

declare module "@tiptap/core" {
	interface Commands<ReturnType> {
		aiTools: {
			applyDiff: (params: {
				context: string;
				deleteHtml?: string;
				insertHtml?: string;
				bounds?: { start: number; end: number };
			}) => ReturnType;
		};
	}
}

function findHtmlBoundsInDocument(docHtml: string, selectedHtml: string) {
	const startIndex = docHtml.indexOf(selectedHtml);
	if (startIndex === -1) {
		return { end: -1, start: -1 };
	}
	return {
		end: startIndex + selectedHtml.length,
		start: startIndex,
	};
}

export const AiToolsExtension = Extension.create({
	addCommands() {
		return {
			applyDiff:
				(params: {
					context: string;
					deleteHtml?: string;
					insertHtml?: string;
					bounds?: { start: number; end: number };
				}) =>
				({ editor }) => {
					const { context, deleteHtml = "", insertHtml = "", bounds } = params;

					let docHtml = editor.getHTML();
					let searchPosition = 0;

					let contextIndex: number;

					if (bounds) {
						const boundedHtml = docHtml.slice(bounds.start, bounds.end);
						const localContextIndex = boundedHtml.indexOf(context);
						if (localContextIndex === -1) {
							throw new Error(
								`Context not found within bounds: "${context}". Make sure there is an EXACT match with the code in the specified bounds`,
							);
						}
						contextIndex = bounds.start + localContextIndex;
					} else {
						contextIndex = docHtml.indexOf(context, searchPosition);
						if (contextIndex === -1) {
							throw new Error(
								`Context not found: "${context}". Make sure there is an EXACT match with the code in the document`,
							);
						}
					}
					searchPosition = contextIndex + context.length;

					const markId = nanoid();

					const deleteIndex = deleteHtml ? docHtml.indexOf(deleteHtml, searchPosition) : -1;
					let deleteEndPosition = searchPosition;
					if (deleteIndex !== -1) {
						const markedDeleteHtml = `<span class="deletion" data-id="${markId}">${deleteHtml}</span>`;

						docHtml =
							docHtml.slice(0, deleteIndex) +
							markedDeleteHtml +
							docHtml.slice(deleteIndex + deleteHtml.length);
						deleteEndPosition = deleteIndex + markedDeleteHtml.length;
					}

					if (insertHtml) {
						const markedInsertHtml = `<span class="insertion" data-id="${markId}">${insertHtml}</span>`;
						docHtml =
							docHtml.slice(0, deleteEndPosition) + markedInsertHtml + docHtml.slice(deleteEndPosition);
					}

					editor.commands.setContent(docHtml, { emitUpdate: true });

					return true;
				},
		};
	},
	addExtensions() {
		return [DiffInsertion, DiffDeletion];
	},
	name: EXTENSION_NAME,
	onSelectionUpdate({ editor }) {
		const { state } = editor;
		const { selection } = state;

		if (!selection.empty) {
			const selectedContent = state.doc.slice(selection.from, selection.to).content;
			const selectedHTML = getHTMLFromFragment(selectedContent, state.schema);

			const docHtml = editor.getHTML();
			const htmlBounds = findHtmlBoundsInDocument(docHtml, selectedHTML);

			console.log({
				htmlBounds: {
					end: htmlBounds.end,
					start: htmlBounds.start,
				},
				selectedHTML,
			});
		}
	},
});
