import { notFound, useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { slugStore } from "@/utils/slug-store";

interface ApplicationSlugParams extends ProjectSlugParams {
	applicationId: string;
	applicationSlug: string;
}

interface ProjectSlugParams {
	projectId: string;
	projectSlug: string;
}

export function useApplicationSlugParams(): ApplicationSlugParams {
	const params = useParams();
	const [isReady, setIsReady] = useState(false);
	const projectSlug = params.projectId as string;
	const applicationSlug = params.applicationId as string;

	const projectId = slugStore.getIdFromSlug(projectSlug);
	const applicationId = slugStore.getIdFromSlug(applicationSlug);

	useEffect(() => {
		if (!(projectId && applicationId)) {
			notFound();
		}
		setIsReady(true);
	}, [projectId, applicationId]);

	if (!(isReady && projectId && applicationId)) {
		return {
			applicationId: "",
			applicationSlug,
			projectId: "",
			projectSlug,
		};
	}

	return {
		applicationId,
		applicationSlug,
		projectId,
		projectSlug,
	};
}

export function useProjectSlugParams(): ProjectSlugParams {
	const params = useParams();
	const [isReady, setIsReady] = useState(false);
	const projectSlug = params.projectId as string;

	const projectId = slugStore.getIdFromSlug(projectSlug);

	useEffect(() => {
		if (!projectId) {
			notFound();
		}
		setIsReady(true);
	}, [projectId]);

	if (!(isReady && projectId)) {
		return { projectId: "", projectSlug };
	}

	return { projectId, projectSlug };
}
