import { redirect } from "next/navigation";
import { PagePath } from "@/enums";
import { Navbar } from "@/components/navbar";
import { serverSideAPIClient } from "@/utils/server-side";

export default async function ApplicationDetailPage(props: {
	params: Promise<{
		workspaceId: string;
		applicationId: string;
	}>;
}) {
	const { workspaceId, applicationId } = await props.params;

	const application = await serverSideAPIClient.getApplicationDetail(workspaceId, applicationId);

	if (!workspaceId || !applicationId) {
		redirect(PagePath.WORKSPACES);
	}

	return (
		<div className="flex flex-col flex-1 ml-14">
			<Navbar>
				<span className="px-2 text-sm">{`${application.title} workspace`}</span>
			</Navbar>
			<div className="mt-14 p-4">
				<div className="container">
					<span>{application.title}</span>
				</div>
			</div>
		</div>
	);
}
