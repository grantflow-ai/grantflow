"use client";

import { AppButton } from "@/components/app/buttons/app-button";
import {
	EMPTY_RESEARCH_DEEP_DIVE_FORM_INPUTS,
	EMPTY_TRANSLATIONAL_RESEARCH_FORM_INPUTS,
	useApplicationStore,
} from "@/stores/application-store";
import { useWizardStore } from "@/stores/wizard-store";
import { log } from "@/utils/logger/client";
import { ResearchDeepDiveContent } from "./research-deep-dive-content";

const getEmptyFormInputs = () => {
	const grantType = useApplicationStore.getState().application?.grant_template?.grant_type;
	const isTranslational = grantType === "TRANSLATIONAL";
	return isTranslational ? EMPTY_TRANSLATIONAL_RESEARCH_FORM_INPUTS : EMPTY_RESEARCH_DEEP_DIVE_FORM_INPUTS;
};

const handleResetFormInputs = async () => {
	if (process.env.NODE_ENV === "development") {
		const emptyFormInputs = getEmptyFormInputs();
		await useWizardStore.getState().updateFormInputs(emptyFormInputs);
		log.info("Dev: Form inputs reset", { emptyFormInputs });
	}
};

export function ResearchDeepDiveStep() {
	return (
		<div
			className="flex flex-col h-full lg:px-6 2xl:pt-6 md:px-4 px-3 bg-preview-bg space-y-4 2xl:space-y-6 overflow-y-auto"
			data-testid="research-deep-dive-step"
		>
			<ResearchDeepDiveHeader onResetFormInputs={handleResetFormInputs} />

			<ResearchDeepDiveContent />
		</div>
	);
}

function ResearchDeepDiveHeader({ onResetFormInputs }: { onResetFormInputs: () => void }) {
	const isDevelopment = process.env.NODE_ENV === "development";
	const grantType = useApplicationStore((state) => state.application?.grant_template?.grant_type);

	const isTranslational = grantType === "TRANSLATIONAL";
	const headerTitle = isTranslational ? "Translational Research Deep Dive" : "Research Deep Dive";
	const headerDescription = isTranslational
		? "Before generating your grant application draft, it would be helpful to learn more about your translational research approach to ensure accurate results."
		: "Before generating your grant application draft, it would be helpful to learn a bit more about your research to ensure more accurate results.";

	return (
		<div className="flex items-center justify-between 2xl:mt-5 px-17 gap-4">
			<div className="flex flex-col">
				<h2
					className="text-app-black text-3xl font-medium font-heading leading-loose"
					data-testid="research-deep-dive-header"
				>
					{headerTitle}
				</h2>
				<p
					className="text-app-black font-normal text-base leading-tight -mt-2"
					data-testid="research-deep-dive-description"
				>
					{headerDescription}
				</p>
			</div>
			<div className="flex items-center gap-3">
				{isDevelopment && (
					<AppButton
						className="shrink-0"
						data-testid="dev-reset-button"
						onClick={onResetFormInputs}
						variant="secondary"
					>
						🔄 Reset (Dev)
					</AppButton>
				)}
			</div>
		</div>
	);
}
