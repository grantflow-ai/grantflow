import { RagSourcesContent } from "./rag-sources-content";
import { RagSourcesFooter } from "./rag-sources-footer";

interface RagSourcesDialogOptions {
	onBackToUploads?: () => void;
	onContinue?: () => void;
	sourceType: "application" | "template";
}

export function createRagSourcesDialog(options: RagSourcesDialogOptions) {
	const { onBackToUploads, onContinue, sourceType } = options;

	return {
		content: <RagSourcesContent sourceType={sourceType} />,
		footer: (
			<RagSourcesFooter
				onBackToUploads={sourceType === "template" ? onBackToUploads : undefined}
				onContinue={onContinue}
			/>
		),
	};
}

export { RagSourcesContent } from "./rag-sources-content";
export { RagSourcesFooter } from "./rag-sources-footer";
