"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { createApplication } from "@/actions/grant-applications";
import {
	GRANT_TYPE_OPTIONS,
	GrantTypeCard,
	type GrantTypeValue,
} from "@/components/organizations/project/applications/wizard/application-type/grant-type-options";
import { DEFAULT_APPLICATION_TITLE } from "@/constants";
import { useApplicationStore } from "@/stores/application-store";
import { useNavigationStore } from "@/stores/navigation-store";
import { useOrganizationStore } from "@/stores/organization-store";
import { useProjectStore } from "@/stores/project-store";
import { routes } from "@/utils/navigation";

export function NewApplicationClient() {
	const router = useRouter();
	const project = useProjectStore((state) => state.project);
	const selectedOrganizationId = useOrganizationStore((state) => state.selectedOrganizationId);
	const navigateToApplication = useNavigationStore((state) => state.navigateToApplication);
	const setApplication = useApplicationStore((state) => state.setApplication);
	const [selectedGrantType, setSelectedGrantType] = useState<GrantTypeValue | null>(null);
	const [isCreating, setIsCreating] = useState(false);

	const cards = useMemo(() => GRANT_TYPE_OPTIONS, []);

	if (!(project && selectedOrganizationId)) {
		return (
			<div className="flex items-center justify-center min-h-screen bg-gray-50">
				<div className="text-center">
					<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
					<h2 className="text-2xl font-semibold text-gray-900 mb-2">Loading Project</h2>
					<p className="text-gray-600">Please wait while we prepare your application setup.</p>
				</div>
			</div>
		);
	}

	const handleContinue = async () => {
		if (!selectedGrantType || isCreating) return;

		setIsCreating(true);
		try {
			const application = await createApplication(selectedOrganizationId, project.id, {
				grant_type: selectedGrantType,
				title: DEFAULT_APPLICATION_TITLE,
			});

			setApplication(application);
			navigateToApplication(
				project.id,
				project.name,
				application.id,
				application.title || DEFAULT_APPLICATION_TITLE,
			);

			router.replace(routes.organization.project.application.wizard());
		} catch {
			toast.error("Failed to create application. Please try again.");
			setIsCreating(false);
		}
	};

	return (
		<div className="flex min-h-screen flex-col items-center justify-center gap-10 bg-gray-50 px-6 py-12">
			<div className="text-center space-y-3">
				<h1 className="text-3xl font-semibold text-gray-900">Choose Application Type</h1>
				<p className="text-gray-600">
					Select the grant type to tailor the application workflow for {project.name}.
				</p>
			</div>

			<div className="flex flex-col gap-4 md:flex-row">
				{cards.map((option) => (
					<GrantTypeCard
						disabled={isCreating}
						isSelected={selectedGrantType === option.value}
						key={option.value}
						onSelect={() => {
							setSelectedGrantType(option.value);
						}}
						option={option}
					/>
				))}
			</div>

			<button
				className="rounded-md bg-primary px-6 py-3 text-white font-semibold disabled:cursor-not-allowed disabled:bg-primary/40"
				data-testid="create-application-continue"
				disabled={!selectedGrantType || isCreating}
				onClick={handleContinue}
				type="button"
			>
				{isCreating ? "Creating..." : "Continue"}
			</button>
		</div>
	);
}
