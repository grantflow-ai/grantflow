"use client";

import { useState } from "react";
import { NewGrantApplicationFormValues, NewGrantWizardFormValues } from "@/lib/schema";
import { NewGrantApplicationModal } from "@/components/workspaces/detail/applications/new/new-grant-application-modal";
import { Wizard } from "@/components/workspaces/detail/applications/new/wizard";

export default function NewApplicationWizardContainer({ workspaceId }: { workspaceId: string }) {
	const [showWizard, setShowWizard] = useState(false);
	const [applicationTitle, setApplicationTitle] = useState("");

	const handleNewGrantApplication = async (data: NewGrantApplicationFormValues) => {
		setApplicationTitle(data.title);
		setShowWizard(true);
	};

	const handleWizardFormSubmit = async (data: NewGrantWizardFormValues) => {
		setShowWizard(false);
	};

	return (
		<main className="container mx-auto py-8" data-testid="home-page">
			{showWizard ? (
				<div>
					<h1 className="text-2xl font-bold mb-4">{applicationTitle}</h1>
					<Wizard data-testid="grant-application-wizard" onSubmit={handleWizardFormSubmit} />
				</div>
			) : (
				<div className="flex justify-center">
					<NewGrantApplicationModal
						data-testid="new-grant-application-modal"
						onSubmit={handleNewGrantApplication}
					/>
				</div>
			)}
		</main>
	);
}
