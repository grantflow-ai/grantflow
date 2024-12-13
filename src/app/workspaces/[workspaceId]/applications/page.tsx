"use server";
import { GrantApplicationForm } from "@/components/workspaces/detail/applications/grant-application-form";
import { getCfps } from "@/app/actions/api";
import { Loader } from "@/components/loader";

export default async function ApplicationCreatePage({ params }: { params: Promise<{ workspaceId: string }> }) {
	const { workspaceId } = await params;

	const grantCfps = await getCfps();

	if (!grantCfps.length) {
		return <Loader />;
	}

	return (
		<div className="flex-grow container mx-auto px-4 py-8">
			<section>
				<GrantApplicationForm
					cfps={grantCfps.filter(
						(cfp) =>
							// TODO: this is temporary, will remove this.
							cfp.code.startsWith("R") && !Number.isNaN(Number.parseInt(cfp.code.replace("R", ""))),
					)}
					workspaceId={workspaceId}
				/>
			</section>
		</div>
	);
}
