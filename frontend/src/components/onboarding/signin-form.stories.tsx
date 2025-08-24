import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn, userEvent, within } from "@storybook/test";
import Link from "next/link";
import type React from "react";
import { AppCard, AppCardContent } from "@/components/app/app-card";
import { AppButton } from "@/components/app/buttons/app-button";
import { SeparatorWithText } from "@/components/app/display/separator-with-text";
import { SocialSigninButton } from ".";
import { AuthCardHeader } from "./auth-card-header";
import { SigninForm } from "./signin-form";

const meta: Meta<typeof SigninForm> = {
	argTypes: {
		isLoading: {
			control: { type: "boolean" },
			description: "Shows loading state with spinner on submit button",
		},
		onSubmit: { action: "onSubmit" },
		socialSignInError: {
			control: { type: "text" },
			description: "Error message from social authentication",
		},
	},
	component: SigninForm,
	decorators: [
		(Story) => {
			const StoryComponent = Story() as {
				props?: {
					children?: [React.ReactNode, React.ReactNode];
				};
			};

			const hasCustomRender =
				typeof StoryComponent === "object" &&
				StoryComponent.props &&
				StoryComponent.props.children &&
				Array.isArray(StoryComponent.props.children);

			if (hasCustomRender && StoryComponent.props?.children) {
				const [formComponent, demoInfo] = StoryComponent.props.children;
				return (
					<div className="flex min-h-screen w-full items-center justify-center bg-gray-50 p-4">
						<div className="w-full max-w-lg space-y-4">
							<AppCard className="w-lg border-primary border bg-white px-7 pb-2 pt-7 shadow-md sm:px-9 sm:pb-3 sm:pt-9">
								<AuthCardHeader
									className="text-center"
									description="Get more funding - faster!"
									title="Create your account"
								/>
								<AppCardContent>
									{formComponent}
									<SeparatorWithText className="mb-5" text={"Or connect with "} />
									<div className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
										<SocialSigninButton
											isLoading={false}
											onClick={async () => {
												await Promise.resolve();
											}}
											platform="google"
										/>
										<SocialSigninButton
											isLoading={false}
											onClick={async () => {
												await Promise.resolve();
											}}
											platform="orcid"
										/>
									</div>
									<div className="text-center">
										<span className="text-dark">Already have an account?</span>
										<AppButton className="text-primary" size="sm" variant="link">
											<Link
												href="#"
												onClick={(e) => {
													e.preventDefault();
												}}
											>
												Login
											</Link>
										</AppButton>
									</div>
								</AppCardContent>
							</AppCard>
							{demoInfo}
						</div>
					</div>
				);
			}

			return (
				<div className="flex min-h-screen w-full items-center justify-center bg-gray-50 p-4">
					<div className="w-full max-w-lg space-y-4">
						<AppCard className="w-lg border-primary border bg-white px-7 pb-2 pt-7 shadow-md sm:px-9 sm:pb-3 sm:pt-9">
							<AuthCardHeader
								className="text-center"
								description="Get more funding - faster!"
								title="Create your account"
							/>
							<AppCardContent>
								<Story />
								<SeparatorWithText className="mb-5" text={"Or connect with "} />
								<div className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
									<SocialSigninButton
										isLoading={false}
										onClick={async () => {
											await Promise.resolve();
										}}
										platform="google"
									/>
									<SocialSigninButton
										isLoading={false}
										onClick={async () => {
											await Promise.resolve();
										}}
										platform="orcid"
									/>
								</div>
								<div className="text-center">
									<span className="text-dark">Already have an account?</span>
									<AppButton className="text-primary" size="sm" variant="link">
										<Link
											href="#"
											onClick={(e) => {
												e.preventDefault();
											}}
										>
											Login
										</Link>
									</AppButton>
								</div>
							</AppCardContent>
						</AppCard>
					</div>
				</div>
			);
		},
	],
	parameters: {
		backgrounds: {
			default: "light",
		},
		layout: "centered",
	},
	title: "Components/Onboarding/SigninForm",
};

export default meta;
type Story = StoryObj<typeof SigninForm>;

export const Default: Story = {
	args: {
		isLoading: false,
		onSubmit: fn(),
		socialSignInError: null,
	},
};

export const Loading: Story = {
	args: {
		isLoading: true,
		onSubmit: fn(),
		socialSignInError: null,
	},
};

export const WithSocialSignInError: Story = {
	args: {
		isLoading: false,
		onSubmit: fn(),
		socialSignInError: "Authentication failed. Please try again.",
	},
};

export const FilledForm: Story = {
	args: {
		isLoading: false,
		onSubmit: fn(),
		socialSignInError: null,
	},
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		const user = userEvent.setup();

		const firstNameInput = canvas.getByTestId("email-signin-form-firstname-input");
		const lastNameInput = canvas.getByTestId("email-signin-form-lastname-input");
		const emailInput = canvas.getByTestId("email-signin-form-email-input");
		const gdprCheckbox = canvas.getByTestId("email-signin-form-gdpr-checkbox");

		await user.type(firstNameInput, "Sarah");
		await user.type(lastNameInput, "Johnson");
		await user.type(emailInput, "sarah.johnson@example.com");
		await user.click(gdprCheckbox);
	},
};

export const WithValidationErrors: Story = {
	args: {
		isLoading: false,
		onSubmit: fn(),
		socialSignInError: null,
	},
	render: (args) => (
		<>
			<SigninForm {...args} />
			<div className="mt-6 p-4 bg-blue-50 rounded-lg text-sm text-blue-800">
				<strong>Demo:</strong> Form validation errors appear inline with each field. GDPR consent errors appear
				in a general error area below the form fields.
			</div>
		</>
	),
};

export const InteractiveDemo: Story = {
	args: {
		isLoading: false,
		onSubmit: fn((data) => {
			alert(`Form submitted with:\n${JSON.stringify(data, null, 2)}`);
		}),
		socialSignInError: null,
	},
	parameters: {
		docs: {
			description: {
				story: "Interactive demo where you can fill out the form and test all validation rules including GDPR consent requirement.",
			},
		},
	},
	render: (args) => (
		<>
			<SigninForm {...args} />
			<div className="mt-6 p-4 bg-blue-50 rounded-lg text-sm text-blue-800">
				<strong>Interactive Demo:</strong>
				<ul className="mt-2 space-y-1 list-disc list-inside">
					<li>Fill out all fields with valid data</li>
					<li>Submit button remains disabled until GDPR consent is checked</li>
					<li>GDPR error appears in general error area (not inline)</li>
					<li>Links to Terms and Privacy Policy open in new tabs</li>
				</ul>
			</div>
		</>
	),
};
