import type { Meta, StoryObj } from "@storybook/react-vite";
import { toast } from "sonner";
import { AppButton } from "@/components/app/buttons/app-button";
import { Toaster } from "@/components/ui/sonner";

const meta: Meta<typeof Toaster> = {
	component: Toaster,
	decorators: [
		(Story) => (
			<div className="min-h-screen bg-gray-100 p-8">
				<Story />
			</div>
		),
	],
	parameters: {
		layout: "fullscreen",
	},
	title: "Components/Feedback/Toaster",
};

export default meta;
type Story = StoryObj<typeof Toaster>;

export const SuccessEvents: Story = {
	decorators: [
		(Story) => (
			<>
				<div className="space-y-4">
					<h2 className="text-2xl font-bold text-gray-800 mb-6">Success Event Notifications</h2>
					<div className="grid grid-cols-2 gap-4 max-w-4xl">
						<AppButton
							onClick={() =>
								toast.success("✅ Completed: Grant Application Generation Completed", {
									description: "Application complete with 5,234 words",
									duration: 8000,
								})
							}
							variant="primary"
						>
							Application Generation Completed
						</AppButton>
						<AppButton
							onClick={() =>
								toast.success("✅ Completed: Grant Template Created", {
									description: "Created template with 8 sections for National Science Foundation",
									duration: 8000,
								})
							}
							variant="primary"
						>
							Grant Template Created
						</AppButton>
						<AppButton
							onClick={() =>
								toast.success("✓ Cfp Data Extracted", {
									description:
										"Extracted grant details from organization National Institutes of Health: Research Project Grant Application...",
									duration: 5000,
								})
							}
							variant="primary"
						>
							CFP Data Extracted
						</AppButton>
						<AppButton
							onClick={() =>
								toast.success("✓ Metadata Generated", {
									description: "Generated metadata for 8 sections",
									duration: 5000,
								})
							}
							variant="primary"
						>
							Metadata Generated
						</AppButton>
						<AppButton
							onClick={() =>
								toast.success("✓ Objectives Enriched", {
									description: "Enriched 5 objectives with 12 research tasks",
									duration: 5000,
								})
							}
							variant="primary"
						>
							Objectives Enriched
						</AppButton>
						<AppButton
							onClick={() =>
								toast.success("✓ Relationships Extracted", {
									description: "Identified 23 relationships",
									duration: 5000,
								})
							}
							variant="primary"
						>
							Relationships Extracted
						</AppButton>
						<AppButton
							onClick={() =>
								toast.success("✅ Completed: Research Plan Completed", {
									description: "Research plan ready with 5 objectives, 12 tasks (3,456 words)",
									duration: 8000,
								})
							}
							variant="primary"
						>
							Research Plan Completed
						</AppButton>
						<AppButton
							onClick={() =>
								toast.success("✓ Section Texts Generated", {
									description: "Generated content for 8 sections",
									duration: 5000,
								})
							}
							variant="primary"
						>
							Section Texts Generated
						</AppButton>
						<AppButton
							onClick={() =>
								toast.success("✓ Wikidata Enhancement Complete", {
									description: "Enhanced content with 34 additional terms",
									duration: 5000,
								})
							}
							variant="primary"
						>
							Wikidata Enhancement Complete
						</AppButton>
					</div>
				</div>
				<Story />
			</>
		),
	],
};

export const ErrorEvents: Story = {
	decorators: [
		(Story) => (
			<>
				<div className="space-y-4">
					<h2 className="text-2xl font-bold text-gray-800 mb-6">Error Event Notifications</h2>
					<div className="grid grid-cols-2 gap-4 max-w-3xl">
						<AppButton
							onClick={() =>
								toast.error("❌ Error: Indexing Failed", {
									description: "Please follow the instructions above to resolve this issue.",
									duration: 10_000,
								})
							}
							variant="primary"
						>
							Indexing Failed
						</AppButton>
						<AppButton
							onClick={() =>
								toast.error("❌ Error: Internal Error", {
									duration: 10_000,
								})
							}
							variant="primary"
						>
							Internal Error
						</AppButton>
						<AppButton
							onClick={() =>
								toast.error("❌ Error: Pipeline Error", {
									description: "Please follow the instructions above to resolve this issue.",
									duration: 10_000,
								})
							}
							variant="primary"
						>
							Pipeline Error
						</AppButton>
					</div>
				</div>
				<Story />
			</>
		),
	],
};

export const WarningEvents: Story = {
	decorators: [
		(Story) => (
			<>
				<div className="space-y-4">
					<h2 className="text-2xl font-bold text-gray-800 mb-6">Warning Event Notifications</h2>
					<div className="grid grid-cols-2 gap-4 max-w-3xl">
						<AppButton
							onClick={() =>
								toast.warning("⚠️ Indexing Timeout", {
									description: "This operation will be automatically retried.",
									duration: 8000,
								})
							}
							variant="primary"
						>
							Indexing Timeout
						</AppButton>
						<AppButton
							onClick={() =>
								toast.warning("⚠️ Insufficient Context Error", {
									description: "This operation will be automatically retried.",
									duration: 8000,
								})
							}
							variant="primary"
						>
							Insufficient Context Error
						</AppButton>
						<AppButton
							onClick={() =>
								toast.warning("⚠️ Job Cancelled", {
									description: "This operation will be automatically retried.",
									duration: 8000,
								})
							}
							variant="primary"
						>
							Job Cancelled
						</AppButton>
						<AppButton
							onClick={() =>
								toast.warning("⚠️ Llm Timeout", {
									description: "This operation will be automatically retried.",
									duration: 8000,
								})
							}
							variant="primary"
						>
							LLM Timeout
						</AppButton>
					</div>
				</div>
				<Story />
			</>
		),
	],
};

export const AllEventTypes: Story = {
	decorators: [
		(Story) => (
			<>
				<div className="space-y-4">
					<h2 className="text-2xl font-bold text-gray-800 mb-6">RAG Processing Event Notifications</h2>
					<div className="space-y-4 max-w-md">
						<AppButton
							onClick={() => {
								toast.success("✓ Cfp Data Extracted", {
									description:
										"Extracted grant details from organization National Science Foundation: Collaborative Research Grant...",
									duration: 5000,
								});
								setTimeout(
									() =>
										toast.success("✓ Metadata Generated", {
											description: "Generated metadata for 8 sections",
											duration: 5000,
										}),
									800,
								);
								setTimeout(
									() =>
										toast.success("✅ Completed: Grant Template Created", {
											description:
												"Created template with 8 sections for National Science Foundation",
											duration: 8000,
										}),
									1600,
								);
								setTimeout(
									() =>
										toast.success("✓ Relationships Extracted", {
											description: "Identified 23 relationships",
											duration: 5000,
										}),
									2400,
								);
								setTimeout(
									() =>
										toast.success("✓ Objectives Enriched", {
											description: "Enriched 5 objectives with 12 research tasks",
											duration: 5000,
										}),
									3200,
								);
								setTimeout(
									() =>
										toast.success("✅ Completed: Research Plan Completed", {
											description:
												"Research plan ready with 5 objectives, 12 tasks (3,456 words)",
											duration: 8000,
										}),
									4000,
								);
								setTimeout(
									() =>
										toast.success("✓ Section Texts Generated", {
											description: "Generated content for 8 sections",
											duration: 5000,
										}),
									4800,
								);
								setTimeout(
									() =>
										toast.success("✓ Wikidata Enhancement Complete", {
											description: "Enhanced content with 34 additional terms",
											duration: 5000,
										}),
									5600,
								);
								setTimeout(
									() =>
										toast.success("✅ Completed: Grant Application Generation Completed", {
											description: "Application complete with 5,234 words",
											duration: 8000,
										}),
									6400,
								);
							}}
							variant="secondary"
						>
							Simulate Full Application Generation Flow
						</AppButton>
						<AppButton
							onClick={() => {
								toast.success("✓ Cfp Data Extracted", {
									description: "Extracted grant details: Innovation Research Grant Application...",
									duration: 5000,
								});
								setTimeout(
									() =>
										toast.warning("⚠️ Indexing Timeout", {
											description: "This operation will be automatically retried.",
											duration: 8000,
										}),
									1500,
								);
								setTimeout(
									() =>
										toast.success("✓ Metadata Generated", {
											description: "Generated metadata for 6 sections",
											duration: 5000,
										}),
									3500,
								);
							}}
							variant="secondary"
						>
							Simulate Flow with Warning
						</AppButton>
						<AppButton
							onClick={() => {
								toast.success("✓ Cfp Data Extracted", {
									description: "Extracted grant details: Small Business Innovation Research...",
									duration: 5000,
								});
								setTimeout(
									() =>
										toast.error("❌ Error: Pipeline Error", {
											description: "Please follow the instructions above to resolve this issue.",
											duration: 10_000,
										}),
									1500,
								);
							}}
							variant="secondary"
						>
							Simulate Flow with Error
						</AppButton>
					</div>
				</div>
				<Story />
			</>
		),
	],
};
