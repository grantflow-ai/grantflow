import { useWizardStore } from "@/stores/wizard";
import { useShallow } from "zustand/react/shallow";
import { Button } from "gen/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "gen/ui/card";
import { Badge } from "gen/ui/badge";
import { Separator } from "gen/ui/separator";
import { CheckCircle2, XCircle } from "lucide-react";
import { FilesDisplay } from "@/components/files-display";
import { generateSection } from "@/actions/text-generation";
import { generateFileDownload } from "@/utils/file";
import { combineTexts } from "@/utils/format";

export function ReviewApplicationForm({
	onPressPrevious,
	workspaceId,
	applicationId,
}: {
	onPressPrevious: () => void;
	workspaceId: string;
	applicationId: string;
}) {
	const { application, significance, innovation, researchAims, researchTasks } = useWizardStore({
		workspaceId,
	})(
		useShallow((state) => ({
			application: state.application,
			significance: state.significance,
			innovation: state.innovation,
			researchAims: state.researchAims,
			researchTasks: state.researchTasks,
		})),
	);

	if (!application || !significance || !innovation || !researchAims.length || !researchTasks.length) {
		return <div>Loading...</div>;
	}

	const handleGenerateDraft = async () => {
		const significanceAndInnovationResponse = await generateSection(
			applicationId,
			{
				workspace_id: workspaceId,
				cfp_title: application.cfpId,
				application_title: application.title,
				grant_funding_organization: "NIH",
				data: {
					significance_description: significance.text,
					innovation_description: innovation.text,
					significance_id: significance.id,
					innovation_id: innovation.id,
				},
			},
			"significance-and-innovation",
		);

		const researchPlanResponse = await generateSection(
			applicationId,
			{
				workspace_id: workspaceId,
				cfp_title: application.cfpId,
				application_title: application.title,
				grant_funding_organization: "NIH",
				data: researchAims.map((aim) => ({
					id: aim.id,
					title: aim.title,
					description: aim.description,
					requires_clinical_trials: aim.requiresClinicalTrials,
					tasks: researchTasks
						.filter((task) => task.aimId === aim.id)
						.map((task) => ({
							id: task.id,
							title: task.title,
							description: task.description,
						})),
				})),
			},
			"research-plan",
		);

		const executiveSummaryResponse = await generateSection(
			applicationId,
			{
				workspace_id: workspaceId,
				cfp_title: application.cfpId,
				application_title: application.title,
				grant_funding_organization: "NIH",
				data: combineTexts([
					significanceAndInnovationResponse.significance_text,
					significanceAndInnovationResponse.innovation_text,
					researchPlanResponse.research_plan_text,
				]),
			},
			"executive-summary",
		);

		generateFileDownload({
			filename: `${application.title.toLowerCase().replaceAll(/[^a-z0-9]/, "-")}.md`,
			content: combineTexts([
				executiveSummaryResponse.executive_summary_text,
				significanceAndInnovationResponse.significance_text,
				significanceAndInnovationResponse.innovation_text,
				researchPlanResponse.research_plan_text,
			]),
			type: "text/markdown",
		});
	};

	return (
		<div className="space-y-6">
			<Card>
				<CardHeader>
					<CardTitle>General Information</CardTitle>
				</CardHeader>
				<CardContent className="space-y-2">
					<div>
						<span className="font-semibold">NIH Activity Code:</span> {application.cfpId}
					</div>
					<div>
						<span className="font-semibold">Title:</span> {application.title}
					</div>
					<div>
						<span className="font-semibold">Resubmission:</span>{" "}
						{application.isResubmission ? (
							<Badge variant="default">Yes</Badge>
						) : (
							<Badge variant="secondary">No</Badge>
						)}
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Significance and Innovation</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<div>
						<h3 className="font-semibold mb-2">Significance</h3>
						<p>{significance.text}</p>
						{significance.files && (
							<div className="mt-2">
								<span className="font-semibold">Attached Files:</span>
								<FilesDisplay files={Object.values(significance.files)} />
							</div>
						)}
					</div>
					<Separator />
					<div>
						<h3 className="font-semibold mb-2">Innovation</h3>
						<p>{innovation.text}</p>
						{innovation.files && (
							<div className="mt-2">
								<span className="font-semibold">Attached Files:</span>
								<FilesDisplay files={Object.values(innovation.files)} />
							</div>
						)}
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Research Plan</CardTitle>
				</CardHeader>
				<CardContent className="space-y-6">
					{researchAims.map((aim, aimIndex) => (
						<div key={aim.id} className="space-y-4">
							<h3 className="font-semibold text-lg">Research Aim {aimIndex + 1}</h3>
							<div>
								<span className="font-semibold">Title:</span> {aim.title}
							</div>
							<div>
								<span className="font-semibold">Description:</span> {aim.description}
							</div>
							<div className="flex items-center">
								<span className="font-semibold mr-2">Requires Clinical Trials:</span>
								{aim.requiresClinicalTrials ? (
									<CheckCircle2 className="h-5 w-5 text-green-500" />
								) : (
									<XCircle className="h-5 w-5 text-red-500" />
								)}
							</div>
							{aim.files && (
								<div>
									<span className="font-semibold">Attached Files:</span>
									<FilesDisplay files={Object.values(aim.files)} />
								</div>
							)}
							<div className="pl-4 space-y-4">
								<h4 className="font-semibold">Research Tasks</h4>
								{researchTasks
									.filter((task) => task.aimId === aim.id)
									.map((task, taskIndex) => (
										<Card key={task.id}>
											<CardContent className="pt-4 space-y-2">
												<div>
													<span className="font-semibold">Task {taskIndex + 1}:</span>{" "}
													{task.title}
												</div>
												<div>
													<span className="font-semibold">Description:</span>{" "}
													{task.description}
												</div>
												{task.files && (
													<div>
														<span className="font-semibold">Attached Files:</span>
														<FilesDisplay files={Object.values(task.files)} />
													</div>
												)}
											</CardContent>
										</Card>
									))}
							</div>
							{aimIndex < researchAims.length - 1 && <Separator />}
						</div>
					))}
				</CardContent>
			</Card>

			<div className="pt-10 flex justify-between">
				<Button onClick={onPressPrevious} variant="outline">
					Go Back
				</Button>
				<Button onClick={handleGenerateDraft} data-testid="review-application-form-submit">
					Generate Draft
				</Button>
			</div>
		</div>
	);
}
