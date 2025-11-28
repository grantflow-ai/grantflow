import { RagSourcesContent } from "./rag-sources-content";
import { RagSourcesFooter } from "./rag-sources-footer";

interface RagSourcesDialogOptions {
	onBackToUploads?: () => void;
	onContinue?: () => void;
	sourceType: "application" | "template";
}

export function createRagSourcesDialog(options: RagSourcesDialogOptions) {
	const { onBackToUploads, onContinue, sourceType } = options;
	const footerProps = {
		...(sourceType === "template" && onBackToUploads ? { onBackToUploads } : {}),
		...(onContinue ? { onContinue } : {}),
	};

	return {
		content: <RagSourcesContent sourceType={sourceType} />,
		footer: <RagSourcesFooter {...footerProps} />,
	};
}

export { RagSourcesContent } from "./rag-sources-content";
export { RagSourcesFooter } from "./rag-sources-footer";
