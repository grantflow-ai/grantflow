"use client";

import { useParams } from "next/navigation";
import { PagePath } from "@/enums";
import { WizardProvider } from "@/components/wizard/wizard-provider";
import { useWizardStore } from "@/store/wizard-store";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

/**
 * New application wizard page component
 */
export default function NewApplicationPage() {
	const params = useParams();
	const workspaceId = params.workspaceId as string;

	// Get data from store
	const { applicationData, applicationId, completedSteps, error, isLoading } = useWizardStore((state: any) => ({
		applicationData: state.applicationData,
		applicationId: state.applicationId,
		completedSteps: state.completedSteps,
		error: state.error,
		isLoading: state.isLoading,
	}));

	if (!workspaceId) {
		return (
			<div className="flex h-screen items-center justify-center">
				<div className="rounded-md bg-red-50 p-4">
					<p className="text-red-800">Workspace ID is required</p>
					<Link className="mt-2 inline-block text-blue-600 hover:underline" href={PagePath.WORKSPACES}>
						Go back to workspaces
					</Link>
				</div>
			</div>
		);
	}

	return (
		<WizardProvider workspaceId={workspaceId}>
			<div className="container mx-auto p-6">
				<h1 className="mb-6 text-2xl font-bold">New Grant Application Wizard</h1>

				{error && (
					<div className="mb-6 rounded-md bg-red-50 p-4">
						<p className="text-red-800">{error}</p>
					</div>
				)}

				{/* Application ID placeholder */}
				{applicationId && (
					<div className="mb-4 rounded-md bg-blue-50 p-4">
						<p className="text-sm text-blue-800">Application ID: {applicationId}</p>
					</div>
				)}

				{/* Loading indicator */}
				{isLoading && (
					<div className="mb-6 flex items-center rounded-md bg-blue-50 p-4">
						<Loader2 className="mr-2 size-5 animate-spin text-blue-600" />
						<p className="text-blue-800">Processing your request...</p>
					</div>
				)}

				{/* Completed steps indicator */}
				{completedSteps.length > 0 && (
					<div className="mb-6">
						<h2 className="text-md mb-2 font-semibold">Completed Steps:</h2>
						<div className="flex flex-wrap gap-2">
							{completedSteps.map((step: any) => (
								<span className="rounded-full bg-green-100 px-3 py-1 text-sm text-green-800" key={step}>
									{step}
								</span>
							))}
						</div>
					</div>
				)}

				{/* Application data preview */}
				{applicationData && (
					<div className="mb-6 rounded-md border p-4">
						<h2 className="mb-2 text-lg font-bold">Application Data Preview</h2>
						<p>
							<strong>Title:</strong> {applicationData.title || "Untitled"}
						</p>
						<p>
							<strong>Status:</strong> {applicationData.status}
						</p>

						{applicationData.grant_template && (
							<div className="mt-4">
								<h3 className="text-md font-semibold">Grant Template</h3>
								<p>
									<strong>Template ID:</strong> {applicationData.grant_template.id}
								</p>
								<p>
									<strong>Sections:</strong> {applicationData.grant_template.grant_sections.length}
								</p>
							</div>
						)}

						{applicationData.research_objectives && applicationData.research_objectives.length > 0 && (
							<div className="mt-4">
								<h3 className="text-md font-semibold">Research Objectives</h3>
								<p>
									<strong>Count:</strong> {applicationData.research_objectives.length}
								</p>
							</div>
						)}
					</div>
				)}

				{/* Placeholder for actual wizard steps */}
				<div className="rounded-md bg-gray-100 p-6 text-center">
					<p className="mb-4 text-gray-600">Wizard steps will be implemented here</p>

					{applicationId && (
						<Link href={`/workspaces/${workspaceId}/applications/${applicationId}`}>
							<Button variant="outline">Go to application details</Button>
						</Link>
					)}
				</div>
			</div>
		</WizardProvider>
	);
}
