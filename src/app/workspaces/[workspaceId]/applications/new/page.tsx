"use server";

import NewApplicationWizardContainer from "@/components/workspaces/detail/applications/new-application-wizard-container";

export default async function ApplicationCreatePage({ params }: { params: Promise<{ workspaceId: string }> }) {
	const { workspaceId } = await params;

	return (
		<div className="flex-grow container mx-auto px-4 py-8">
			<section>
				<NewApplicationWizardContainer workspaceId={workspaceId} />
			</section>
		</div>
	);
}
