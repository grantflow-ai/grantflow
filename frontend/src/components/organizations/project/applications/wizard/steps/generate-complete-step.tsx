"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { AppButton } from "@/components/app";
import { useApplicationStore } from "@/stores/application-store";
import { useWizardStore } from "@/stores/wizard-store";

export function GenerateCompleteStep() {
	const router = useRouter();
	const application = useApplicationStore((state) => state.application);
	const generateApplication = useWizardStore((state) => state.generateApplication);
	const isGeneratingApplication = useWizardStore((state) => state.isGeneratingApplication);
	const shouldRedirectToEditor = useWizardStore((state) => state.shouldRedirectToEditor);

	const hasApplicationText = !!(application?.text && application.text.trim().length > 0);
	const canGenerate = !!application && !isGeneratingApplication && !hasApplicationText;

	useEffect(() => {
		if (shouldRedirectToEditor && application) {
			const editorUrl = `/projects/${application.project_id}/applications/${application.id}/editor`;
			router.push(editorUrl);
		}
	}, [shouldRedirectToEditor, application, router]);

	const handleGenerate = () => {
		if (canGenerate) {
			void generateApplication();
		}
	};

	const renderMainContent = () => {
		if (hasApplicationText) {
			return (
				<div className="text-center space-y-4">
					<div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
						<span className="text-green-600 text-2xl">✓</span>
					</div>
					<h3 className="text-xl font-medium text-gray-900">Application Generated Successfully!</h3>
					<p className="text-gray-600 max-w-md">
						Your grant application has been generated and is ready for review and submission.
					</p>
				</div>
			);
		}

		if (isGeneratingApplication) {
			return (
				<div className="text-center space-y-4">
					<div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto animate-pulse">
						<span className="text-blue-600 text-2xl">⚡</span>
					</div>
					<h3 className="text-xl font-medium text-gray-900">Generating Your Application...</h3>
					<p className="text-gray-600 max-w-md">
						Please wait while we create your comprehensive grant application. This may take a few minutes.
					</p>
				</div>
			);
		}

		return (
			<div className="text-center space-y-6">
				<div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
					<span className="text-gray-600 text-2xl">📄</span>
				</div>
				<div className="space-y-2">
					<h3 className="text-xl font-medium text-gray-900">Ready to Generate</h3>
					<p className="text-gray-600 max-w-md">
						All your information has been collected. Click the button below to generate your complete grant
						application.
					</p>
				</div>
				<AppButton
					data-testid="generate-application-button"
					disabled={!canGenerate}
					onClick={handleGenerate}
					size="lg"
				>
					Generate Application
				</AppButton>
			</div>
		);
	};

	return (
		<div className="flex size-full flex-col p-6" data-testid="generate-complete-step">
			<div className="mb-8">
				<h2 className="font-heading text-2xl font-medium leading-loose mb-2">Generate and Complete</h2>
				<p className="text-muted-foreground-dark leading-tight">
					Ready to generate your complete grant application? This process will create a comprehensive document
					based on all the information you&apos;ve provided.
				</p>
			</div>

			<div className="flex-1 flex flex-col items-center justify-center space-y-6">{renderMainContent()}</div>
		</div>
	);
}
