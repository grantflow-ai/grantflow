import { RagSourcesContent } from "./rag-sources-content";
import { RagSourcesFooter } from "./rag-sources-footer";

interface RagSourcesDialogOptions {
	onBackToUploads?: () => void;
	onContinue?: () => void;
}

export function createRagSourcesDialog(options: RagSourcesDialogOptions = {}) {
	const { onBackToUploads, onContinue } = options;

	return {
		content: <RagSourcesContent />,
		footer: <RagSourcesFooter onBackToUploads={onBackToUploads} onContinue={onContinue} />,
	};
}

export { RagSourcesContent } from "./rag-sources-content";
export { RagSourcesFooter } from "./rag-sources-footer";
