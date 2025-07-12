import type { Meta, StoryObj } from "@storybook/react-vite";
import { NotificationProgress } from "@/components/app";
import type { RagProcessingStatus } from "@/hooks/use-application-notifications";

const meta: Meta<typeof NotificationProgress> = {
	component: NotificationProgress,
	parameters: {
		layout: "centered",
	},
	title: "Components/NotificationProgress",
};

export default meta;
type Story = StoryObj<typeof NotificationProgress>;

const createNotification = (overrides: Partial<RagProcessingStatus>): RagProcessingStatus => ({
	current_pipeline_stage: 1,
	event: "processing",
	message: "Processing your application",
	total_pipeline_stages: 5,
	...overrides,
});

export const RestoredProgress: Story = {
	args: {
		notification: createNotification({
			current_pipeline_stage: 3,
			event: "restored_progress",
			message: "Resuming from previous progress",
			total_pipeline_stages: 5,
		}),
	},
};

export const ProcessingStarted: Story = {
	args: {
		notification: createNotification({
			current_pipeline_stage: 1,
			event: "processing_started",
			message: "Starting application processing",
			total_pipeline_stages: 6,
		}),
	},
};

export const Validating: Story = {
	args: {
		notification: createNotification({
			current_pipeline_stage: 2,
			event: "validating_inputs",
			message: "Validating application inputs",
			total_pipeline_stages: 6,
		}),
	},
};

export const Generating: Story = {
	args: {
		notification: createNotification({
			current_pipeline_stage: 3,
			event: "generating_content",
			message: "Generating application content",
			total_pipeline_stages: 5,
		}),
	},
};

export const Assembling: Story = {
	args: {
		notification: createNotification({
			current_pipeline_stage: 4,
			event: "assembling_document",
			message: "Assembling final document",
			total_pipeline_stages: 5,
		}),
	},
};

export const Saving: Story = {
	args: {
		notification: createNotification({
			current_pipeline_stage: 5,
			event: "saving_progress",
			message: "Saving your progress",
			total_pipeline_stages: 5,
		}),
	},
};

export const Extracting: Story = {
	args: {
		notification: createNotification({
			current_pipeline_stage: 2,
			event: "extracting_data",
			message: "Extracting information from documents",
			total_pipeline_stages: 4,
		}),
	},
};

export const GenericEvent: Story = {
	args: {
		notification: createNotification({
			current_pipeline_stage: 3,
			event: "custom_processing",
			message: "Processing custom workflow",
			total_pipeline_stages: 7,
		}),
	},
	name: "Generic Event (Default Icon)",
};

export const NoProgressInfo: Story = {
	args: {
		notification: {
			event: "status_update",
			message: "Processing in progress",
		},
	},
	name: "No Progress Information (Hidden)",
};

export const FirstStep: Story = {
	args: {
		notification: createNotification({
			current_pipeline_stage: 1,
			event: "initialization_started",
			message: "Initializing processing pipeline",
			total_pipeline_stages: 10,
		}),
	},
};

export const MiddleProgress: Story = {
	args: {
		notification: createNotification({
			current_pipeline_stage: 5,
			event: "processing",
			message: "Processing application data",
			total_pipeline_stages: 10,
		}),
	},
	name: "50% Progress",
};

export const AlmostComplete: Story = {
	args: {
		notification: createNotification({
			current_pipeline_stage: 9,
			event: "finalizing",
			message: "Finalizing application",
			total_pipeline_stages: 10,
		}),
	},
	name: "90% Progress",
};

export const Complete: Story = {
	args: {
		notification: createNotification({
			current_pipeline_stage: 10,
			event: "completed",
			message: "Processing complete",
			total_pipeline_stages: 10,
		}),
	},
	name: "100% Complete",
};

export const LongMessage: Story = {
	args: {
		notification: createNotification({
			current_pipeline_stage: 3,
			event: "generating_comprehensive_report",
			message:
				"Generating comprehensive research proposal with detailed budget analysis and team member qualifications",
			total_pipeline_stages: 5,
		}),
	},
};

export const ProgressSequence: Story = {
	parameters: {
		layout: "padded",
	},
	render: () => {
		const notifications: RagProcessingStatus[] = [
			createNotification({
				current_pipeline_stage: 1,
				event: "processing_started",
				message: "Starting processing",
				total_pipeline_stages: 5,
			}),
			createNotification({
				current_pipeline_stage: 2,
				event: "validating_inputs",
				message: "Validating inputs",
				total_pipeline_stages: 5,
			}),
			createNotification({
				current_pipeline_stage: 3,
				event: "generating_content",
				message: "Generating content",
				total_pipeline_stages: 5,
			}),
			createNotification({
				current_pipeline_stage: 4,
				event: "assembling_document",
				message: "Assembling document",
				total_pipeline_stages: 5,
			}),
			createNotification({
				current_pipeline_stage: 5,
				event: "saving_progress",
				message: "Saving progress",
				total_pipeline_stages: 5,
			}),
		];

		return (
			<div className="w-96 space-y-6">
				<h3 className="text-lg font-semibold">Processing Pipeline Sequence</h3>
				{notifications.map((notification, index) => (
					<div className="rounded-lg border p-4" key={index}>
						<NotificationProgress notification={notification} />
					</div>
				))}
			</div>
		);
	},
};

export const VariousStages: Story = {
	name: "Various Pipeline Lengths",
	parameters: {
		layout: "padded",
	},
	render: () => (
		<div className="w-96 space-y-4">
			<div className="rounded-lg border p-4">
				<h4 className="mb-2 text-sm font-medium">3-Stage Pipeline</h4>
				<NotificationProgress
					notification={createNotification({
						current_pipeline_stage: 2,
						event: "processing",
						message: "Simple workflow",
						total_pipeline_stages: 3,
					})}
				/>
			</div>
			<div className="rounded-lg border p-4">
				<h4 className="mb-2 text-sm font-medium">10-Stage Pipeline</h4>
				<NotificationProgress
					notification={createNotification({
						current_pipeline_stage: 7,
						event: "processing",
						message: "Complex workflow",
						total_pipeline_stages: 10,
					})}
				/>
			</div>
			<div className="rounded-lg border p-4">
				<h4 className="mb-2 text-sm font-medium">20-Stage Pipeline</h4>
				<NotificationProgress
					notification={createNotification({
						current_pipeline_stage: 15,
						event: "processing",
						message: "Very complex workflow",
						total_pipeline_stages: 20,
					})}
				/>
			</div>
		</div>
	),
};
