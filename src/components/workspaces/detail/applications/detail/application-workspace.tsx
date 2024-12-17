"use client";
import { useEffect, useState } from "react";
import { ApplicationDraftResponse } from "@/types/api-types";
import { Editor } from "@/components/editor";
import { Loader } from "@/components/loader";
import { getApplicationText } from "@/actions/api";

async function pollDraft(workspaceId: string, applicationId: string) {
	let applicationDraftResponse: ApplicationDraftResponse | null = null;

	while (applicationDraftResponse?.status !== "complete") {
		await new Promise((resolve) => setTimeout(resolve, 1000 * 10));
		applicationDraftResponse = await getApplicationText(workspaceId, applicationId);
	}

	return applicationDraftResponse.text;
}

export function ApplicationWorkspace({
	workspaceId,
	applicationId,
	content,
}: {
	workspaceId: string;
	applicationId: string;
	content: string | null;
}) {
	const [draftText, setDraftText] = useState(content);

	useEffect(() => {
		if (!content) {
			(async () => {
				const draft = await pollDraft(workspaceId, applicationId);
				setDraftText(draft);
			})();
		}
	}, [content]);

	return (
		<div className="flex gap-4" data-testid="application-workspace">
			{draftText ? (
				<Editor content={draftText} />
			) : (
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
