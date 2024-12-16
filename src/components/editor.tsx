import { useEditor } from "gen/components/editor/use-editor";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { Plate } from "@udecode/plate-common/react";
import { Editor as PlateEditor, EditorContainer } from "gen/components/plate-ui/editor";

export function Editor({ content }: { content: string }) {
	const editor = useEditor({ content });

	return (
		<div className="max-w-fit max-h-fit">
			<DndProvider backend={HTML5Backend}>
				<Plate editor={editor}>
					<EditorContainer>
						<PlateEditor variant="fullWidth" />
					</EditorContainer>
				</Plate>
			</DndProvider>
		</div>
	);
}
