import { ApplicationWithTemplateFactory, GrantTemplateFactory, RagSourceFactory } from "::testing/factories";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useEffect, useRef } from "react";
import { AppButton } from "@/components/app/buttons/app-button";
import { useApplicationStore } from "@/stores/application-store";
import { RagSourcesContent } from "./rag-sources-content";
import { RagSourcesFooter } from "./rag-sources-footer";
import { WizardDialog, type WizardDialogRef } from "./wizard-dialog";

const meta: Meta<typeof WizardDialog> = {
	component: WizardDialog,
	decorators: [
		(Story) => (
			<div className="min-h-screen bg-light p-8">
				<Story />
			</div>
		),
	],
	parameters: {
		layout: "fullscreen",
	},
	title: "Wizard/Components/WizardDialog",
};

export default meta;
type Story = StoryObj<typeof WizardDialog>;

const DialogOpener = ({ content }: { content: Parameters<WizardDialogRef["open"]>[0] }) => {
	const dialogRef = useRef<null | WizardDialogRef>(null);

	return (
		<>
			<AppButton onClick={() => dialogRef.current?.open(content)} type="button" variant="primary">
				Open Dialog
			</AppButton>
			<WizardDialog ref={dialogRef} />
		</>
	);
};

export const RagSourcesSuccess: Story = {
	decorators: [
		(Story) => {
			useEffect(() => {
				const ragSources = [
					RagSourceFactory.build({
						filename: "grant-guidelines.pdf",
						sourceId: "source-1",
						status: "FINISHED",
					}),
					RagSourceFactory.build({
						filename: "budget-template.xlsx",
						sourceId: "source-2",
						status: "FINISHED",
					}),
					RagSourceFactory.build({
						sourceId: "source-3",
						status: "FINISHED",
						url: "https://example.org/funding-info",
					}),
				];

				const grantTemplate = GrantTemplateFactory.build({
					rag_sources: ragSources,
				});

				const application = ApplicationWithTemplateFactory.build({
					grant_template: grantTemplate,
				});

				useApplicationStore.setState({
					application,
					areAppOperationsInProgress: false,
				});
			}, []);
			return <Story />;
		},
	],
	name: "RAG Sources - All Success",
	render: () => (
		<DialogOpener
			content={{
				content: <RagSourcesContent sourceType="template" />,
				description: "All documents have been successfully processed and indexed.",
				footer: (
					<RagSourcesFooter
						onBackToUploads={() => {
							// ~keep - No-op for Storybook demo
						}}
						onContinue={() => {
							// ~keep - No-op for Storybook demo
						}}
					/>
				),
				minWidth: "min-w-4xl",
				title: "Knowledge Base Status",
			}}
		/>
	),
};

export const RagSourcesWithFailures: Story = {
	decorators: [
		(Story) => {
			useEffect(() => {
				const ragSources = [
					RagSourceFactory.build({
						filename: "grant-guidelines.pdf",
						sourceId: "source-1",
						status: "FINISHED",
					}),
					RagSourceFactory.build({
						filename: "corrupted-file.docx",
						sourceId: "source-2",
						status: "FAILED",
					}),
					RagSourceFactory.build({
						sourceId: "source-3",
						status: "FAILED",
						url: "https://broken-link.com/404",
					}),
					RagSourceFactory.build({
						filename: "processing.pptx",
						sourceId: "source-4",
						status: "INDEXING",
					}),
				];

				const grantTemplate = GrantTemplateFactory.build({
					rag_sources: ragSources,
				});

				const application = ApplicationWithTemplateFactory.build({
					grant_template: grantTemplate,
				});

				useApplicationStore.setState({
					application,
					areAppOperationsInProgress: false,
				});
			}, []);
			return <Story />;
		},
	],
	name: "RAG Sources - Mixed Status with Failures",
	render: () => (
		<DialogOpener
			content={{
				content: <RagSourcesContent sourceType="template" />,
				description:
					"We couldn't process one or more of your files or links. To ensure accurate analysis, please upload all required documents.",
				dismissOnOutsideClick: false,
				footer: (
					<RagSourcesFooter
						onBackToUploads={() => {
							// ~keep - No-op for Storybook demo
						}}
						onContinue={() => {
							// ~keep - No-op for Storybook demo
						}}
					/>
				),
				minWidth: "min-w-4xl",
				title: "Review Required: Some Uploads Failed",
			}}
		/>
	),
};

export const RagSourcesEmpty: Story = {
	decorators: [
		(Story) => {
			useEffect(() => {
				const grantTemplate = GrantTemplateFactory.build({
					rag_sources: [],
				});

				const application = ApplicationWithTemplateFactory.build({
					grant_template: grantTemplate,
				});

				useApplicationStore.setState({
					application,
					areAppOperationsInProgress: false,
				});
			}, []);
			return <Story />;
		},
	],
	name: "RAG Sources - Empty State",
	render: () => (
		<DialogOpener
			content={{
				content: <RagSourcesContent sourceType="template" />,
				description: "Upload documents and add URLs to build your knowledge base.",
				footer: (
					<RagSourcesFooter
						onBackToUploads={() => {
							// ~keep - No-op for Storybook demo
						}}
						onContinue={() => {
							// ~keep - No-op for Storybook demo
						}}
					/>
				),
				minWidth: "min-w-4xl",
				title: "Knowledge Base Setup",
			}}
		/>
	),
};

export const SectionDeletionWarning: Story = {
	name: "Section Deletion - With Sub-sections",
	render: () => (
		<DialogOpener
			content={{
				content: null,
				description:
					"All content within this section and its sub-sections will be permanently removed. This action cannot be undone.",
				dismissOnOutsideClick: false,
				footer: (
					<div className="flex justify-between w-full">
						<AppButton
							data-testid="cancel-delete-button"
							onClick={() => {
								// ~keep - No-op for Storybook demo
							}}
							variant="secondary"
						>
							Cancel
						</AppButton>
						<AppButton
							data-testid="confirm-delete-button"
							onClick={() => {
								// ~keep - No-op for Storybook demo
							}}
							variant="primary"
						>
							Delete Section
						</AppButton>
					</div>
				),
				title: "Are you sure you want to delete this section?",
			}}
		/>
	),
};

export const SectionDeletionSimple: Story = {
	name: "Section Deletion - Single Section",
	render: () => (
		<DialogOpener
			content={{
				content: null,
				description:
					"All content within this section will be permanently removed. This action cannot be undone.",
				dismissOnOutsideClick: false,
				footer: (
					<div className="flex justify-between w-full">
						<AppButton
							data-testid="cancel-delete-button"
							onClick={() => {
								// ~keep - No-op for Storybook demo
							}}
							variant="secondary"
						>
							Cancel
						</AppButton>
						<AppButton
							data-testid="confirm-delete-button"
							onClick={() => {
								// ~keep - No-op for Storybook demo
							}}
							variant="primary"
						>
							Delete Section
						</AppButton>
					</div>
				),
				title: "Are you sure you want to delete this section?",
			}}
		/>
	),
};

export const SectionReorderWarning: Story = {
	name: "Section Reorder - Conversion Warning",
	render: () => (
		<DialogOpener
			content={{
				content: null,
				description:
					"Converting a main section into a secondary section will permanently remove any associated secondary sections, if they exist. This action cannot be undone.",
				dismissOnOutsideClick: false,
				footer: (
					<div className="flex justify-between w-full">
						<AppButton
							data-testid="cancel-move-button"
							onClick={() => {
								// ~keep - No-op for Storybook demo
							}}
							variant="secondary"
						>
							Cancel Move
						</AppButton>
						<AppButton
							data-testid="confirm-move-button"
							onClick={() => {
								// ~keep - No-op for Storybook demo
							}}
							variant="primary"
						>
							Convert and Remove
						</AppButton>
					</div>
				),
				title: "Section Structure Will Change",
			}}
		/>
	),
};

export const RagSourcesManyItems: Story = {
	decorators: [
		(Story) => {
			useEffect(() => {
				const statusOptions = ["FINISHED", "FAILED", "INDEXING", "CREATED"] as const;
				const manyRagSources = Array.from({ length: 15 }, (_, i) => {
					const isUrl = i % 3 === 0;
					return RagSourceFactory.build({
						sourceId: `source-${i}`,
						status: statusOptions[i % 4],
						...(isUrl
							? { url: `https://example.com/resource-${i}` }
							: { filename: `document-${i + 1}.pdf` }),
					});
				});

				const grantTemplate = GrantTemplateFactory.build({
					rag_sources: manyRagSources,
				});

				const application = ApplicationWithTemplateFactory.build({
					grant_template: grantTemplate,
				});

				useApplicationStore.setState({
					application,
					areAppOperationsInProgress: false,
				});
			}, []);
			return <Story />;
		},
	],
	name: "RAG Sources - Many Items (Scrollable)",
	render: () => (
		<DialogOpener
			content={{
				content: <RagSourcesContent sourceType="template" />,
				description:
					"Review all uploaded documents and URLs. The list below shows the processing status for each item.",
				footer: (
					<RagSourcesFooter
						onBackToUploads={() => {
							// ~keep - No-op for Storybook demo
						}}
						onContinue={() => {
							// ~keep - No-op for Storybook demo
						}}
					/>
				),
				minWidth: "min-w-4xl",
				title: "Knowledge Base Review",
			}}
		/>
	),
};
