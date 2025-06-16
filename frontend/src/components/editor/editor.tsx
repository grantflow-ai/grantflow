import "./styles.css";

import { EditorEvents, EditorProvider } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import React from "react";

const extensions = [StarterKit];

export const Editor = ({
	content,
	onContentUpdate,
}: {
	content: string;
	onContentUpdate: (content: string) => void;
}) => {
	return (
		<EditorProvider
			content={content}
			editorProps={{
				attributes: {
					"data-testid": "tiptap-editor",
				},
			}}
			extensions={extensions}
			onUpdate={(event: EditorEvents["update"]) => {
				onContentUpdate(event.editor.getHTML());
			}}
		></EditorProvider>
	);
};
