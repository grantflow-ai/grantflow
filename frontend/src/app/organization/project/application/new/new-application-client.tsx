"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { AppButton } from "@/components/app/buttons/app-button";
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
import { log } from "@/utils/logger/client";
import { routes } from "@/utils/navigation";

const handleCreationError = (error: unknown) => {
	log.error("create-application", error);

	const isPersistenceError = error instanceof Error && error.message.includes("persist");
	const errorMessage = isPersistenceError
		? "Your application was created! Please return to the applications list to open it."
		: "Failed to create application. Please try again.";

	toast.error(errorMessage, {
		duration: isPersistenceError ? 8000 : undefined,
		id: "create-application",
	});
};

export function NewApplicationClient() {
	const router = useRouter();

	const project = useProjectStore((state) => state.project);
	const selectedOrganizationId = useOrganizationStore((state) => state.selectedOrganizationId);
	const navigateToApplication = useNavigationStore((state) => state.navigateToApplication);
	const createApplication = useApplicationStore((state) => state.createApplication);

	const [creatingApplication, setCreatingApplication] = useState<boolean>(false);

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

	const verifyNavigationState = async (expectedAppId: string) => {
		await new Promise((resolve) => setTimeout(resolve, 100));
		const currentAppId = useNavigationStore.getState().activeApplicationId;

		if (currentAppId !== expectedAppId) {
			throw new Error("Failed to persist navigation state");
		}
	};

	const handleGrantTypeSelect = async (grantType: GrantTypeValue) => {
		if (!selectedOrganizationId) {
			toast.error("Missing organization information");
			return;
		}

		if (creatingApplication) return;
		setCreatingApplication(true);

		let creationSucceeded = false;

		try {
			toast.loading("Creating application...", { id: "create-application" });

			const createdApplication = await createApplication(
				selectedOrganizationId,
				project.id,
				grantType,
				DEFAULT_APPLICATION_TITLE,
			);

			if (!createdApplication) {
				throw new Error("Application not created in store");
			}

			navigateToApplication(project.id, project.name, createdApplication.id, createdApplication.title);
			await verifyNavigationState(createdApplication.id);

			router.replace(routes.organization.project.application.wizard());
			creationSucceeded = true;
		} catch (error) {
			handleCreationError(error);
		} finally {
			if (!creationSucceeded) {
				setCreatingApplication(false);
			}
		}
	};

	return (
		<div className="min-h-screen w-full flex flex-col items-center">
			<div className="grow flex items-center justify-center w-full">
				<main className="flex flex-col gap-16">
					<div className="text-center space-y-3">
						<h1 className="font-cabin font-medium text-4xl text-app-black">Application type</h1>
						<p className="font-sans text-base font-normal text-app-gray-600">
							Select the focus of your proposal
						</p>
					</div>
					<div className="flex gap-8 w-full" data-testid="grant-type-options">
						{GRANT_TYPE_OPTIONS.map((option) => (
							<GrantTypeCard
								disabled={creatingApplication}
								key={option.value}
								onSelect={() => {
									void handleGrantTypeSelect(option.value);
								}}
								option={option}
							/>
						))}
					</div>
				</main>
			</div>

			<footer className="relative flex h-auto w-full items-center justify-between border-t-1 border-app-gray-100 bg-surface-primary py-4 px-6">
				<AppButton
					data-testid="back-button"
					disabled={creatingApplication}
					leftIcon={<Image alt="Go back" height={15} src="/icons/go-back.svg" width={15} />}
					onClick={() => {
						router.back();
					}}
					size="lg"
					theme="dark"
					variant="secondary"
				>
					Back
				</AppButton>
				<div />
			</footer>
		</div>
	);
}
