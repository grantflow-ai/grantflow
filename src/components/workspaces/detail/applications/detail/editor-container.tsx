import { useEditor } from "gen/components/editor/use-editor";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { Plate } from "@udecode/plate-common/react";
import { Editor as PlateEditor, EditorContainer as PlateEditorContainer } from "gen/components/plate-ui/editor";

export function EditorContainer({ content }: { content: string }) {
	const editor = useEditor({ content });

	return (
		<div className="max-w-fit max-h-fit">
			<DndProvider backend={HTML5Backend}>
				<Plate editor={editor}>
					<PlateEditorContainer>
						<PlateEditor variant="fullWidth" />
					</PlateEditorContainer>
				</Plate>
			</DndProvider>
		</div>
	);
}
