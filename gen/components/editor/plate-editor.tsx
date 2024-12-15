"use client";

import React from "react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";

import { Plate } from "@udecode/plate-common/react";

import { useCreateEditor } from "gen/components/editor/use-create-editor";
import { Editor, EditorContainer } from "gen/components/plate-ui/editor";

export function PlateEditor() {
	const editor = useCreateEditor();

	return (
		<DndProvider backend={HTML5Backend}>
			<Plate editor={editor}>
				<EditorContainer>
					<Editor variant="demo" />
				</EditorContainer>
			</Plate>
		</DndProvider>
	);
}
