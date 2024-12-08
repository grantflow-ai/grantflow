import { GrantApplicationForm } from "@/components/workspaces/detail/applications/grant-application-form";
import { redirect } from "next/navigation";
import { PagePath } from "@/enums";
import { Navbar } from "@/components/navbar";
import { serverSideAPIClient } from "@/utils/server-side";

export default async function ApplicationCreatePage(props: {
	params: Promise<{
		workspaceId: string;
	}>;
}) {
	const { workspaceId } = await props.params;

	if (!workspaceId) {
		redirect(PagePath.WORKSPACES);
	}

	const cfps = await serverSideAPIClient.getCfps();

	return (
		<div className="flex flex-col flex-1 ml-14">
			<Navbar>
				<span className="px-2 text-sm">Create New Grant Application</span>
			</Navbar>
			<div className="mt-14 p-4">
				<div className="container">
					<section className="py-5">
						<h1 className="text-2xl bold">Grant Application Wizard</h1>
					</section>
					<section>
						<GrantApplicationForm cfps={cfps} workspaceId={workspaceId} />
					</section>
				</div>
			</div>
		</div>
	);
}
