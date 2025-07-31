"use client";

import { Editor, type EditorRef } from "@grantflow/editor";
import { useRef, useState } from "react";
import { EditorExportButton } from "./editor-export-button";
import { EditorPromptWindow } from "./editor-prompt-window";
import { EditorSections } from "./editor-sections";
import { EditorWarning } from "./editor-warning";

export function EditorContainer() {
	const editorRef = useRef<EditorRef>(null);

	const [editorSections, setEditorSections] = useState<{ level: number; text: string }[]>([]);

	return (
		<div className="flex flex-col gap-1 pr-6 h-full">
			<EditorWarning />
			<div className="flex gap-3 h-full">
				<div className="min-w-[326px] w-[326px]">
					<EditorPromptWindow />
				</div>
				<div className="container mx-auto max-w-6xl pt-3" data-testid="grant-application-editor">
					<div className="prose prose-sm max-w-none h-full">
						<Editor
							content={"Hello grantflow"}
							onContentChange={() => {
								if (editorRef.current) {
									setEditorSections(editorRef.current.getHeadings());
								}
							}}
							ref={editorRef}
						/>
					</div>
				</div>
				<div className="min-w-[207px] w-[207px] flex flex-col gap-3 mt-3">
					<EditorExportButton />
					<EditorSections
						onSectionClick={(index) => editorRef.current?.scrollToHeading(index)}
						sections={editorSections}
					/>
				</div>
			</div>
		</div>
	);
}
