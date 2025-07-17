import "./styles.css";

import { SimpleEditor } from "./tiptap/components/tiptap-templates/simple/simple-editor";

export const Editor = (_: { content: string; onContentUpdate: (content: string) => void }) => {
	return <SimpleEditor />;
};
