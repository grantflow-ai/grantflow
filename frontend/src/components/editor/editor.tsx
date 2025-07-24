import { Editor as GrantflowEditor } from "@grantflow/editor";

export const Editor = (_: { content: string; onContentUpdate: (content: string) => void }) => {
	return <GrantflowEditor />;
};
