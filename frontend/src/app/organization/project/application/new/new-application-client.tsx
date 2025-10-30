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
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";

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

	const handleGrantTypeSelect = (grantType: GrantTypeValue) => {
		if (isCreating) return;

		setSelectedGrantType(grantType);
		setIsCreating(true);

		setTimeout(async () => {
			try {
				const application = await createApplication(selectedOrganizationId, project.id, {
					grant_type: grantType,
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
				setSelectedGrantType(null);
			}
		}, 500);
	};

	return (
		<div className="min-h-screen w-full flex flex-col items-center">
			<div className="grow flex items-center justify-center w-full">
				<div className="flex items-center justify-center ">
					<main className="flex flex-col gap-16">
						<div className="text-center">
							<h1 className="font-cabin font-medium text-4xl text-app-black">Application type</h1>
							<p className="font-sans text-base font-normal text-app-gray-600">
								Select the focus of your proposal:
							</p>
						</div>
						<div className="flex gap-8 w-[795px]">
							{cards.map((option) => (
								<GrantTypeCard
									disabled={isCreating}
									isSelected={selectedGrantType === option.value}
									key={option.value}
									onSelect={() => {
										handleGrantTypeSelect(option.value);
									}}
									option={option}
								/>
							))}
						</div>
					</main>
				</div>
			</div>

			<footer className="border border-app-gray-100 bg-white px-6 py-4 w-full h-[70px]  ">
					<Button onClick={()=>router.back()}  className="font-sora text-base font-normal text-primary cursor-pointer hover:bg-white hover:border-2 bg-white border border-primary flex gap-1 px-[8] pl-2 pr-4 w-32 rounded-lg">
						<ChevronLeft className="text-primary"/>
						Back
					</Button>
			</footer>
		</div>
	);
}
