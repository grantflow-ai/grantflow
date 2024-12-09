"use client";
import { useParams, useRouter } from "next/navigation";
import { PagePath } from "@/enums";
import { Navbar } from "@/components/navbar";
import { getApiClient } from "@/utils/api-client";
import { GrantApplicationDetail } from "@/types/api-types";
import { useEffect, useState } from "react";

export default function ApplicationDetailPage() {
	const router = useRouter();
	const { workspaceId, applicationId } = useParams<{
		workspaceId: string;
		applicationId: string;
	}>();

	const [application, setApplication] = useState<GrantApplicationDetail | null>(null);

	if (!workspaceId || !applicationId) {
		router.replace(PagePath.WORKSPACES);
		return null;
	}

	useEffect(() => {
		(async () => {
			const applicationDetail = await getApiClient().getApplicationDetail(workspaceId, applicationId);
			setApplication(applicationDetail);
		})();
	}, []);

	if (!application) {
		return <div>Loading...</div>;
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
