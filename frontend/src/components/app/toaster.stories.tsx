import type { Meta, StoryObj } from "@storybook/react-vite";
import { ThemeProvider } from "next-themes";
import { toast } from "sonner";
import { Toaster } from "../ui/sonner";
import { AppButton } from "./buttons/app-button";

const meta: Meta<typeof Toaster> = {
	component: Toaster,
	decorators: [
		(Story) => (
			<ThemeProvider attribute="class" defaultTheme="light" enableSystem={true}>
				<div className="min-h-screen bg-gray-100 p-8">
					<Story />
				</div>
			</ThemeProvider>
		),
	],
	parameters: {
		layout: "fullscreen",
	},
	title: "Components/Toaster",
};

export default meta;
type Story = StoryObj<typeof Toaster>;

export const Success: Story = {
	decorators: [
		(Story) => (
			<>
				<AppButton
					onClick={() => toast.success("Thank you! You've successfully joined the waitlist.")}
					variant="primary"
				>
					Show Success Toast
				</AppButton>
				<Story />
			</>
		),
	],
};

export const ErrorToast: Story = {
	decorators: [
		(Story) => (
			<>
				<AppButton
					onClick={() => toast.error("Something went wrong on our end. Please try again later.")}
					variant="primary"
				>
					Show Error Toast
				</AppButton>
				<Story />
			</>
		),
	],
};

export const Warning: Story = {
	decorators: [
		(Story) => (
			<>
				<AppButton
					onClick={() => toast.warning("Please check your information and try again.")}
					variant="primary"
				>
					Show Warning Toast
				</AppButton>
				<Story />
			</>
		),
	],
};

export const Info: Story = {
	decorators: [
		(Story) => (
			<>
				<AppButton onClick={() => toast.info("Your application is being processed.")} variant="primary">
					Show Info Toast
				</AppButton>
				<Story />
			</>
		),
	],
};

export const AllTypes: Story = {
	decorators: [
		(Story) => (
			<>
				<div className="space-y-4">
					<h2 className="text-2xl font-bold text-gray-800 mb-6">Toast Notifications</h2>
					<div className="grid grid-cols-2 gap-4 max-w-md">
						<AppButton
							onClick={() => toast.success("Thank you! You've successfully joined the waitlist.")}
							variant="primary"
						>
							Success
						</AppButton>
						<AppButton
							onClick={() => toast.error("Something went wrong on our end. Please try again later.")}
							variant="primary"
						>
							Error
						</AppButton>
						<AppButton
							onClick={() => toast.warning("Please check your information and try again.")}
							variant="primary"
						>
							Warning
						</AppButton>
						<AppButton onClick={() => toast.info("Your application is being processed.")} variant="primary">
							Info
						</AppButton>
					</div>
					<div className="mt-8">
						<AppButton
							onClick={() => {
								toast.success("Success: Operation completed successfully!");
								setTimeout(() => toast.error("Error: Something went wrong!"), 500);
								setTimeout(() => toast.warning("Warning: Please review your input!"), 1000);
								setTimeout(() => toast.info("Info: Processing your request..."), 1500);
							}}
							variant="secondary"
						>
							Show All Types
						</AppButton>
					</div>
				</div>
				<Story />
			</>
		),
	],
};

export const LongMessages: Story = {
	decorators: [
		(Story) => (
			<>
				<div className="space-y-4 max-w-md">
					<AppButton
						onClick={() =>
							toast.success(
								"Congratulations! Your application has been successfully submitted and is now under review. You will receive email notifications about any updates to your application status. Thank you for your patience during the review process.",
							)
						}
						variant="primary"
					>
						Long Success Message
					</AppButton>
					<AppButton
						onClick={() =>
							toast.error(
								"We encountered an unexpected error while processing your request. Our technical team has been notified and is working to resolve this issue. Please try again in a few minutes or contact support if the problem persists.",
							)
						}
						variant="primary"
					>
						Long Error Message
					</AppButton>
					<AppButton
						onClick={() =>
							toast.warning(
								"Your session will expire soon due to inactivity. Please save any unsaved work and refresh the page to continue working on your application.",
							)
						}
						variant="primary"
					>
						Long Warning Message
					</AppButton>
					<AppButton
						onClick={() =>
							toast.info(
								"Your application is currently being processed by our review team. This comprehensive evaluation includes checking all submitted documents, verifying eligibility criteria, and conducting preliminary assessments. The review process typically takes 2-3 business days, and you will receive detailed updates via email.",
							)
						}
						variant="primary"
					>
						Long Info Message
					</AppButton>
				</div>
				<Story />
			</>
		),
	],
};

export const WithDescriptions: Story = {
	decorators: [
		(Story) => (
			<>
				<div className="space-y-4 max-w-md">
					<AppButton
						onClick={() =>
							toast.success("Application submitted", {
								description:
									"Your grant application has been successfully submitted and is now under review.",
							})
						}
						variant="primary"
					>
						Success with Description
					</AppButton>
					<AppButton
						onClick={() =>
							toast.error("Upload failed", {
								description: "The file could not be uploaded. Please check the file size and format.",
							})
						}
						variant="primary"
					>
						Error with Description
					</AppButton>
					<AppButton
						onClick={() =>
							toast.warning("Session expiring", {
								description: "Your session will expire in 5 minutes. Please save your work.",
							})
						}
						variant="primary"
					>
						Warning with Description
					</AppButton>
					<AppButton
						onClick={() =>
							toast.info("Processing update", {
								description: "Your profile information is being updated. This may take a few moments.",
							})
						}
						variant="primary"
					>
						Info with Description
					</AppButton>
				</div>
				<Story />
			</>
		),
	],
};
