"use client";

import { useState } from "react";
import { NewGrantApplicationFormValues, NewGrantWizardFormValues } from "@/lib/schema";
import { NewGrantApplicationModal } from "@/components/workspaces/detail/applications/new/new-grant-application-modal";
import { Wizard } from "@/components/workspaces/detail/applications/new/wizard";
import { logError } from "@/utils/logging";
import { toast } from "sonner";
import { createApplication, updateApplication, uploadApplicationFiles } from "@/actions/api";
import { API } from "@/types/api-types";

export default function NewApplicationWizardContainer({ workspaceId }: { workspaceId: string }) {
	const [showWizard, setShowWizard] = useState(false);
	const [applicationTitle, setApplicationTitle] = useState("");
	const [applicationId, setApplicationId] = useState<string>("");

	const handleNewGrantApplication = async (data: NewGrantApplicationFormValues) => {
		try {
			const formData = new FormData();
			if (data.cfpFile) {
				formData.set("cfp_file", data.cfpFile);
			}
			formData.set(
				"data",
				JSON.stringify({
					cfp_url: data.cfpUrl,
					title: data.title,
				} satisfies API.CreateApplication.RequestBody),
			);
			const { id } = await createApplication(workspaceId, formData);
			setShowWizard(true);
			setApplicationTitle(data.title);
			setApplicationId(id);
		} catch (error) {
			logError({ error, identifier: "newApplicationModal" });
			toast.error("An error occurred while creating the application.");
		}
	};

	const handleWizardFormSubmit = async ({ files, research_objectives }: NewGrantWizardFormValues) => {
		try {
			const formData = new FormData();
			for (const file of files) {
				formData.set(file.name, file);
			}
			await uploadApplicationFiles(workspaceId, applicationId, formData);

			await updateApplication(workspaceId, applicationId, {
				title: applicationTitle,
				research_objectives,
			} as API.UpdateApplication.RequestBody);
		} catch (error) {
			logError({ error, identifier: "newApplicationWizard" });
			toast.error("An error occurred while updating the application.");
		} finally {
			setShowWizard(false);
		}
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
