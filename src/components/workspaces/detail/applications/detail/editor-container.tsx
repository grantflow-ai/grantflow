import { ApplicationContext } from "@/components/workspaces/detail/applications/detail/context";
import { Application } from "@/types/api-types";
import { Plate } from "@udecode/plate-common/react";
import { Editor as PlateEditor, EditorContainer as PlateEditorContainer } from "gen/editor/ui/editor";
import { useEditor } from "gen/editor/use-editor";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";

export function EditorContainer({ application }: { application: Application }) {
	const editor = useEditor({ content: application.text ?? "" });

	return (
		<div className="max-w-fit max-h-fit">
			<ApplicationContext.Provider value={application}>
				<DndProvider backend={HTML5Backend}>
					<Plate editor={editor}>
						<PlateEditorContainer>
							<PlateEditor variant="fullWidth" />
						</PlateEditorContainer>
					</Plate>
				</DndProvider>
			</ApplicationContext.Provider>
		</div>
	);
}
