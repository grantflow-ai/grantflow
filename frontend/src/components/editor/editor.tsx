import "./styles.css";

import { type EditorEvents, EditorProvider } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

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
		/>
	);
};
