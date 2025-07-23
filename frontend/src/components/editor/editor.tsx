export const Editor = (_: { content: string; onContentUpdate: (content: string) => void }) => {
	return (
		<textarea
			className="w-full h-[90vh] bg-white text-black p-4"
			data-testid="tiptap-editor"
			placeholder="editor placeholder"
		/>
	);
};
