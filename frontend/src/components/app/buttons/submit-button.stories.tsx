import type { Meta, StoryObj } from "@storybook/react-vite";
import { SubmitButton } from "./submit-button";

const meta: Meta<typeof SubmitButton> = {
	argTypes: {
		children: {
			control: "text",
			name: "text",
		},
		onClick: {
			action: false,
		},
	},
	component: SubmitButton,
	parameters: {
		actions: {
			disable: true,
		},
		controls: {
			include: ["children", "variant", "size"],
		},
		layout: "centered",
	},
	title: "Components/Buttons/SubmitButton",
};

export default meta;
type Story = StoryObj<typeof SubmitButton>;

export const StateComparison: Story = {
	parameters: {
		layout: "fullscreen",
	},
	render: () => (
		<div className="p-8 max-w-6xl mx-auto">
			<h2 className="text-2xl font-bold text-gray-800 mb-8 text-center">Submit Button States</h2>
			<div className="grid grid-cols-1 md:grid-cols-3 gap-8">
				<div className="space-y-4">
					<h3 className="text-lg font-semibold text-gray-800 text-center">Enabled</h3>
					<div className="p-6 bg-gradient-to-br from-green-50 to-emerald-100 rounded-lg">
						<form className="space-y-4">
							<div className="space-y-2">
								<label className="text-sm font-medium text-gray-700" htmlFor="enabled-email">
									Email
								</label>
								<input
									className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
									defaultValue="user@example.com"
									id="enabled-email"
									readOnly
									type="email"
								/>
							</div>
							<div className="space-y-2">
								<label className="text-sm font-medium text-gray-700" htmlFor="enabled-message">
									Message
								</label>
								<textarea
									className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
									defaultValue="Ready to submit"
									id="enabled-message"
									readOnly
									rows={2}
								/>
							</div>
							<SubmitButton>Submit Application</SubmitButton>
						</form>
					</div>
				</div>

				<div className="space-y-4">
					<h3 className="text-lg font-semibold text-gray-800 text-center">Disabled</h3>
					<div className="p-6 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg">
						<form className="space-y-4">
							<div className="space-y-2">
								<label className="text-sm font-medium text-gray-700" htmlFor="disabled-email">
									Email
								</label>
								<input
									className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-gray-100 text-gray-500"
									disabled
									id="disabled-email"
									placeholder="Enter your email"
									type="email"
								/>
							</div>
							<div className="space-y-2">
								<label className="text-sm font-medium text-gray-700" htmlFor="disabled-message">
									Message
								</label>
								<textarea
									className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-gray-100 text-gray-500"
									disabled
									id="disabled-message"
									placeholder="Enter message"
									rows={2}
								/>
							</div>
							<SubmitButton disabled>Submit Application</SubmitButton>
						</form>
					</div>
				</div>

				<div className="space-y-4">
					<h3 className="text-lg font-semibold text-gray-800 text-center">Loading</h3>
					<div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-lg">
						<form className="space-y-4">
							<div className="space-y-2">
								<label className="text-sm font-medium text-gray-700" htmlFor="loading-email">
									Email
								</label>
								<input
									className="w-full rounded-md border border-blue-200 px-3 py-2 text-sm bg-blue-50"
									defaultValue="user@example.com"
									id="loading-email"
									readOnly
									type="email"
								/>
							</div>
							<div className="space-y-2">
								<label className="text-sm font-medium text-gray-700" htmlFor="loading-message">
									Message
								</label>
								<textarea
									className="w-full rounded-md border border-blue-200 px-3 py-2 text-sm bg-blue-50"
									defaultValue="Processing..."
									id="loading-message"
									readOnly
									rows={2}
								/>
							</div>
							<SubmitButton isLoading>Submitting...</SubmitButton>
						</form>
					</div>
				</div>
			</div>
		</div>
	),
};
