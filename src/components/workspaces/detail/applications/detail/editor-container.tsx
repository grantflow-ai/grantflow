import { useEditor } from "gen/editor/use-editor";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { Plate } from "@udecode/plate-common/react";
import { Editor as PlateEditor, EditorContainer as PlateEditorContainer } from "gen/editor/ui/editor";
import { Application } from "@/types/api-types";
import { ApplicationContext } from "@/components/workspaces/detail/applications/detail/context";

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
				<div className="space-y-4">
					<h2 className="text-xl font-semibold mb-4">Knowledge Base</h2>
					<p className="text-sm px-3 space-y-6 italic">
						Upload sources for application generation: previous applications, research notes, articles,
						presentations etc.
					</p>
				</div>
			</ApplicationContext.Provider>
		</div>
	);
}
