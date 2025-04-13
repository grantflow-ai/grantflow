"use server";

export default async function ApplicationDetailPage({
	params,
}: {
	params: Promise<{ applicationId: string; workspaceId: string }>;
}) {
	const { applicationId, workspaceId } = await params;

	return (
		<div className="flex-grow container mx-auto px-4 py-8">
			<span>
				Placeholder {workspaceId}:{applicationId}
			</span>
		</div>
	);
}
