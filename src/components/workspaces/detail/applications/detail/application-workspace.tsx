"use client";
import { getApplicationText } from "@/actions/api";
import { Loader } from "@/components/loader";
import { Application, ApplicationDraftResponse } from "@/types/api-types";
import { useEffect, useState } from "react";

export function ApplicationWorkspace({ application, workspaceId }: { application: Application; workspaceId: string }) {
	const [draftText, setDraftText] = useState(application.text);

	useEffect(() => {
		if (!application.text) {
			(async () => {
				const draft = await pollDraft(workspaceId, application.id);
				setDraftText(draft);
			})();
		}
	}, [application.text, workspaceId, application.id]);

	return (
		<div className="flex gap-4" data-testid="application-workspace">
			{draftText ?? (
				<div className="flex flex-col justify-center w-full h-full gap-2">
					<div className="space-y-2 flex justify-center text-lg font-semibold italic pt-10">
						<span>Generating draft... Grab a coffee, this will take a few minutes. </span>
					</div>
					<Loader />
				</div>
			)}
		</div>
	);
}

async function pollDraft(workspaceId: string, applicationId: string) {
	let applicationDraftResponse: ApplicationDraftResponse | null = null;

	while (applicationDraftResponse?.status !== "complete") {
		await new Promise((resolve) => setTimeout(resolve, 1000 * 10));
		applicationDraftResponse = await getApplicationText(workspaceId, applicationId);
	}

	return applicationDraftResponse.text;
}
