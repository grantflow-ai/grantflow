"use client";

import Image from "next/image";
import { AppButton } from "@/components/app/buttons/app-button";
import { useApplicationStore } from "@/stores/application-store";
import { useWizardStore } from "@/stores/wizard-store";
import type { API } from "@/types/api-types";
import { log } from "@/utils/logger/client";
import { ResearchDeepDiveContent } from "./research-deep-dive-content";

type FormInputs = NonNullable<API.RetrieveApplication.Http200.ResponseBody["form_inputs"]>;

export function ResearchDeepDiveStep() {
	const triggerAutofill = useWizardStore((state) => state.triggerAutofill);
	const isAutofillLoading = useWizardStore((state) => state.isAutofillLoading.research_deep_dive);

	const handleResetFormInputs = async () => {
		if (process.env.NODE_ENV === "development") {
			const emptyFormInputs: FormInputs = {
				background_context: "",
				hypothesis: "",
				impact: "",
				novelty_and_innovation: "",
				preliminary_data: "",
				rationale: "",
				research_feasibility: "",
				scientific_infrastructure: "",
				team_excellence: "",
			};
			await useWizardStore.getState().updateFormInputs(emptyFormInputs);
			log.info("Dev: Form inputs reset", { emptyFormInputs });
		}
	};

	return (
		<div
			className="flex flex-col h-full lg:px-6 lg:pt-6 md:px-4 md:pt-4 px-3 pt-3 bg-preview-bg space-y-6 overflow-y-auto"
			data-testid="research-deep-dive-step"
		>
			<ResearchDeepDiveHeader
				isAutofillLoading={isAutofillLoading}
				onResetFormInputs={handleResetFormInputs}
				onTriggerAutofill={() => triggerAutofill("research_deep_dive")}
			/>

			<ResearchDeepDiveContent />
		</div>
	);
}

function ResearchDeepDiveHeader({
	isAutofillLoading,
	onResetFormInputs,
	onTriggerAutofill,
}: {
	isAutofillLoading: boolean;
	onResetFormInputs: () => void;
	onTriggerAutofill: () => void;
}) {
	const application = useApplicationStore((state) => state.application);
	const isDevelopment = process.env.NODE_ENV === "development";

	return (
		<div className="flex items-center justify-between mt-5 px-17 gap-4">
			<div className="flex flex-col">
				<h2
					className="text-app-black text-3xl font-medium font-heading leading-loose"
					data-testid="research-deep-dive-header"
				>
					Research Deep Dive
				</h2>
				<p
					className="text-app-black font-normal text-base leading-tight -mt-2"
					data-testid="research-deep-dive-description"
				>
					Before generating your grant application draft, it would be helpful to learn a bit more about your
					research to ensure more accurate results.
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
				{/* Temporarily hidden - autofill functionality
				<AppButton
					className="shrink-0"
					data-testid="ai-try-button"
					disabled={isAutofillLoading || !application}
					leftIcon={<Image alt="AI Try" height={16} src="/icons/button-logo.svg" width={16} />}
					onClick={onTriggerAutofill}
					variant="secondary"
				>
					{isAutofillLoading ? "Generating..." : "Let the AI Try!"}
				</AppButton>
				*/}
			</div>
		</div>
	);
}
