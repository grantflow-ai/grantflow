import { AppButton } from "@/components/app/buttons/app-button";
import { useApplicationStore } from "@/stores/application-store";

interface RagSourcesFooterProps {
	onBackToUploads?: () => void;
	onContinue?: () => void;
}

export function RagSourcesFooter({ onBackToUploads, onContinue }: RagSourcesFooterProps) {
	const ragSources = useApplicationStore((state) => state.application?.grant_template?.rag_sources) ?? [];
	const hasNoSources = ragSources.length === 0;
	const allSourcesFailed = ragSources.length > 0 && ragSources.every((source) => source.status === "FAILED");

	const isContinueDisabled = hasNoSources || allSourcesFailed;
	const isTemplateSource = !!onBackToUploads;

	return (
		<div
			className="flex w-full items-center"
			data-testid="rag-sources-footer"
			style={{ justifyContent: isTemplateSource ? "space-between" : "flex-end" }}
		>
			{isTemplateSource && (
				<AppButton
					data-testid="back-to-uploads-button"
					onClick={onBackToUploads}
					size="lg"
					type="button"
					variant="secondary"
				>
					Back to Uploads
				</AppButton>
			)}
			<AppButton
				data-testid="continue-button"
				disabled={isTemplateSource && isContinueDisabled}
				onClick={onContinue}
				size="lg"
				type="button"
				variant="primary"
			>
				Continue
			</AppButton>
		</div>
	);
}
