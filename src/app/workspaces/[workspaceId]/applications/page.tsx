"use client";
import { GrantApplicationForm } from "@/components/workspaces/detail/applications/grant-application-form";
import { useParams, useRouter } from "next/navigation";
import { PagePath } from "@/enums";
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
		if (!grantCfps.length) {
			(async () => {
				const cfps = await getApiClient().getCfps();
				setGrantCfps(cfps);
			})();
		}
	}, [grantCfps]);

	if (!grantCfps.length) {
		return <div>Loading...</div>;
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
