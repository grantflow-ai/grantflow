import { AppButton } from "@/components/app/buttons/app-button";

interface RagSourcesFooterProps {
	onBackToUploads?: () => void;
	onContinue?: () => void;
}

export function RagSourcesFooter({ onBackToUploads, onContinue }: RagSourcesFooterProps) {
	return (
		<div className="flex w-full justify-between items-center" data-testid="rag-sources-footer">
			<AppButton
				data-testid="back-to-uploads-button"
				onClick={onBackToUploads}
				size="lg"
				type="button"
				variant="secondary"
			>
				Back to Uploads
			</AppButton>
			<AppButton data-testid="continue-button" onClick={onContinue} size="lg" type="button" variant="primary">
				Continue
			</AppButton>
		</div>
	);
}
