"use client";
import { GrantApplicationForm } from "@/components/workspaces/detail/applications/grant-application-form";
import { useParams, useRouter } from "next/navigation";
import { PagePath } from "@/enums";
import { Navbar } from "@/components/navbar";
import { getApiClient } from "@/utils/api-client";
import { useStore } from "@/store";
import { useEffect } from "react";

export default function ApplicationCreatePage() {
	const router = useRouter();
	const { workspaceId } = useParams<{
		workspaceId: string;
	}>();
	const { grantCfps, setGrantCfps } = useStore();

	if (!workspaceId) {
		router.replace(PagePath.WORKSPACES);
		return null;
	}

	useEffect(() => {
		(async () => {
			const cfps = await getApiClient().getCfps();
			setGrantCfps(cfps);
		})();
	}, []);

	if (!grantCfps.length) {
		return <div>Loading...</div>;
	}

	return (
		<div className="flex flex-col flex-1">
			<Navbar>
				<span className="px-2 text-sm">New Grant Application</span>
			</Navbar>
			<div className="mt-14 p-4 container">
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
		</div>
	);
}
