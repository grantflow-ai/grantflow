"use client";

import React from "react";

import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { IconApplication, IconPreviewLogo } from "@/components/workspaces/icons";
import { ThemeBadge } from "@/components/workspaces/theme-badge";
import { useApplicationStore } from "@/stores/application-store";

export function ApplicationStructureStep() {
	return (
		<div className="flex size-full" data-testid="application-structure-step">
			<div className="w-1/3 space-y-6 overflow-y-auto p-6 sm:w-1/2">
				<div className="space-y-6">
					<div>
						<h2
							className="font-heading text-2xl font-medium leading-loose"
							data-testid="application-structure-header"
						>
							Application Structure
						</h2>
						<p
							className="text-muted-foreground-dark leading-tight"
							data-testid="application-structure-description"
						>
							Review and customize the structure of your grant application.
						</p>
					</div>

					<div className="space-y-4">
						<Card className="border-app-gray-100 border p-4 shadow-none">
							<h3 className="font-heading mb-2 text-base font-semibold">Section Configuration</h3>
							<p className="text-muted-foreground-dark text-sm">
								Configure the sections and structure of your application based on the requirements.
							</p>
						</Card>

						<Card className="border-app-gray-100 border p-4 shadow-none">
							<h3 className="font-heading mb-2 text-base font-semibold">Content Organization</h3>
							<p className="text-muted-foreground-dark text-sm">
								Organize your content and determine the flow of your application.
							</p>
						</Card>

						<Card className="border-app-gray-100 border p-4 shadow-none">
							<h3 className="font-heading mb-2 text-base font-semibold">Requirements Mapping</h3>
							<p className="text-muted-foreground-dark text-sm">
								Map application requirements to specific sections and content areas.
							</p>
						</Card>
					</div>
				</div>
			</div>

			<ApplicationStructurePreview />
		</div>
	);
}

function ApplicationStructurePreview() {
	const { application } = useApplicationStore();
	const hasContent = application;

	return (
		<div className="bg-preview-bg flex h-full w-[70%] flex-col gap-6 border-l border-gray-100 p-5 md:p-7">
			{hasContent ? (
				<>
					<div className="mb-11 flex flex-col items-start gap-2">
						<div className="flex items-center gap-2">
							<ThemeBadge color="light" leftIcon={<IconApplication />}>
								Application Structure
							</ThemeBadge>
						</div>
						<h3
							className="font-heading text-center text-3xl font-medium"
							data-testid="application-structure-title"
						>
							{application.title}
						</h3>
					</div>

					<ScrollArea className="flex-1">
						<div className="space-y-5">
							<Card
								className="border-app-gray-100 border p-5 shadow-none"
								data-testid="application-structure-sections"
							>
								<h4 className="font-heading mb-4 font-semibold">Application Sections</h4>
								<div className="space-y-3">
									<div className="rounded border border-gray-200 p-3">
										<h5 className="font-medium">Executive Summary</h5>
										<p className="text-muted-foreground-dark text-sm">
											Overview of the project and key highlights
										</p>
									</div>
									<div className="rounded border border-gray-200 p-3">
										<h5 className="font-medium">Project Description</h5>
										<p className="text-muted-foreground-dark text-sm">
											Detailed description of the proposed project
										</p>
									</div>
									<div className="rounded border border-gray-200 p-3">
										<h5 className="font-medium">Budget & Timeline</h5>
										<p className="text-muted-foreground-dark text-sm">
											Financial breakdown and project timeline
										</p>
									</div>
									<div className="rounded border border-gray-200 p-3">
										<h5 className="font-medium">Team & Qualifications</h5>
										<p className="text-muted-foreground-dark text-sm">
											Team members and their relevant experience
										</p>
									</div>
								</div>
							</Card>
						</div>
					</ScrollArea>
				</>
			) : (
				<div className="flex h-full flex-col items-center justify-center">
					<IconPreviewLogo height={180} width={180} />
					<p className="text-muted-foreground-dark mt-6 text-center text-sm">
						Configure your application structure to see a preview
					</p>
				</div>
			)}
		</div>
	);
}
