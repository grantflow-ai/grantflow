import type { Editor } from "@tiptap/core";
import type { MarkType } from "@tiptap/pm/model";
import { useCallback, useEffect, useState } from "react";

interface MarkChange {
	type: "delete" | "removeMark";
	pos: number;
	endPos: number;
	markType?: MarkType | undefined;
}

export function DiffMarkHoverHandler({ editor }: { editor: Editor | null }) {
	const [markId, setMarkId] = useState<string | null>(null);
	const [buttonPosition, setButtonPosition] = useState<{
		x: number;
		y: number;
	} | null>(null);

	const handleMouseOver = useCallback(
		(event: MouseEvent) => {
			const target = event.target as HTMLElement;

			const mark = target.closest(".deletion") || target.closest(".insertion");
			if (mark) {
				const dataId = mark.getAttribute("data-id");
				if (dataId === markId && !!buttonPosition) {
					return;
				}

				if (dataId) {
					setMarkId(dataId);

					const rect = mark.getBoundingClientRect();
					setButtonPosition({
						x: rect.left,
						y: rect.bottom + 8,
					});
				}
			}
		},
		[markId, buttonPosition],
	);

	const hideContextMenu = useCallback(() => {
		setButtonPosition(null);
		setMarkId(null);
	}, []);

	useEffect(() => {
		if (!editor) {
			return;
		}

		const editorDom = editor.view.dom;
		editorDom.addEventListener("mouseover", handleMouseOver);
		editor.view.dom.addEventListener("click", hideContextMenu);
		editor.on("update", hideContextMenu);

		return () => {
			editorDom.removeEventListener("mouseover", handleMouseOver);
			editor.view.dom.removeEventListener("click", hideContextMenu);
			editor.off("update", hideContextMenu);
		};
	}, [editor, handleMouseOver, hideContextMenu]);

	const applyMarkChanges = useCallback(
		(isAccept: boolean) => {
			if (!(markId && editor)) return;

			editor
				.chain()
				.focus()
				.command(({ tr, state }) => {
					const changes: MarkChange[] = [];

					state.doc.descendants((node, pos) => {
						node.marks?.forEach(({ attrs, type }) => {
							if (attrs["data-id"] !== markId) {
								return;
							}

							if (type.name === "deletion") {
								changes.push({
									endPos: pos + node.nodeSize,
									markType: isAccept ? undefined : type,
									pos: pos,
									type: isAccept ? "delete" : "removeMark",
								});
							} else if (type.name === "insertion") {
								changes.push({
									endPos: pos + node.nodeSize,
									markType: isAccept ? type : undefined,
									pos: pos,
									type: isAccept ? "removeMark" : "delete",
								});
							}
						});
					});

					changes.sort((a, b) => b.pos - a.pos);

					changes.forEach((change) => {
						if (change.type === "delete") {
							tr.delete(change.pos, change.endPos);
						} else if (change.type === "removeMark" && change.markType) {
							tr.removeMark(change.pos, change.endPos, change.markType);
						}
					});

					return changes.length > 0;
				})
				.run();

			setButtonPosition(null);
		},
		[markId, editor],
	);

	return (
		<>
			{buttonPosition && (
				<div
					className="suggestion-tooltip"
					style={{
						left: buttonPosition.x,
						top: buttonPosition.y,
					}}
				>
					<div className="button-group">
						<button type="button" className="destructive" onClick={() => applyMarkChanges(false)}>
							Reject
						</button>
						<button type="button" onClick={() => applyMarkChanges(true)}>
							Apply
						</button>
					</div>
				</div>
			)}
		</>
	);
}
