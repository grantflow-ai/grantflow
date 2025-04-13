"use server";

export default async function ApplicationCreatePage({ params }: { params: Promise<{ workspaceId: string }> }) {
	const { workspaceId } = await params;

	return (
		<div className="flex-grow container mx-auto px-4 py-8">
			<span>Placeholder {workspaceId}</span>
		</div>
	);
}
