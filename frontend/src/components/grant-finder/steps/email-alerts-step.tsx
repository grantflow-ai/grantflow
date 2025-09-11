import type { FormData } from "@/components/grant-finder/types";

interface EmailAlertsStepProps {
	formData: FormData;
	setFormData: (data: FormData) => void;
}

export function EmailAlertsStep({ formData, setFormData }: EmailAlertsStepProps) {
	return (
		<div className="space-y-6" data-testid="email-alerts-step">
			<div data-testid="email-alerts-step-header">
				<h3 className="text-2xl font-semibold text-gray-900" data-testid="email-alerts-step-title">
					Email for Alerts
				</h3>
				<p className="mt-2 text-gray-600" data-testid="email-alerts-step-description">
					Enter your email. We&apos;ll notify you the moment your next funding opportunity is announced. No
					spam; unsubscribe anytime.
				</p>
			</div>

			<div className="max-w-lg" data-testid="email-alerts-input-section">
				<label
					className="block text-sm font-medium text-gray-700"
					data-testid="email-alerts-input-label"
					htmlFor="email"
				>
					Email address
				</label>
				<input
					className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
					data-testid="email-alerts-input"
					id="email"
					onChange={(e) => {
						setFormData({ ...formData, email: e.target.value });
					}}
					placeholder="your.email@university.edu"
					type="email"
					value={formData.email}
				/>
			</div>

			<div className="space-y-3" data-testid="email-alerts-checkboxes">
				<label className="flex items-start" data-testid="terms-checkbox-label">
					<input
						checked={formData.agreeToTerms}
						className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
						data-testid="terms-checkbox"
						onChange={(e) => {
							setFormData({ ...formData, agreeToTerms: e.target.checked });
						}}
						type="checkbox"
					/>
					<span className="ml-2 text-sm text-gray-700" data-testid="terms-checkbox-text">
						I agree to the Terms & Conditions and Privacy Policy. (Required)
					</span>
				</label>

				<label className="flex items-start" data-testid="updates-checkbox-label">
					<input
						checked={formData.agreeToUpdates}
						className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
						data-testid="updates-checkbox"
						onChange={(e) => {
							setFormData({ ...formData, agreeToUpdates: e.target.checked });
						}}
						type="checkbox"
					/>
					<span className="ml-2 text-sm text-gray-700" data-testid="updates-checkbox-text">
						I consent to receive occasional updates and tips from GrantFlow. (Optional)
					</span>
				</label>
			</div>
		</div>
	);
}
