import AppInput from "@/components/app/fields/input-field";
import type { FormData } from "@/components/grant-finder/types";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface EmailAlertsStepProps {
	formData: FormData;
	setFormData: (data: FormData) => void;
}

export function EmailAlertsStep({ formData, setFormData }: EmailAlertsStepProps) {
	return (
		<div className="space-y-6" data-testid="email-alerts-step">
			<div data-testid="email-alerts-step-header">
				<h3 className="text-2xl font-semibold text-dark" data-testid="email-alerts-step-title">
					Email for Alerts
				</h3>
				<p className="mt-2 text-muted" data-testid="email-alerts-step-description">
					Enter your email. We&apos;ll notify you the moment your next funding opportunity is announced. No
					spam; unsubscribe anytime.
				</p>
			</div>

			<div className="max-w-lg" data-testid="email-alerts-input-section">
				<AppInput
					label="Email address"
					onChange={(e) => {
						setFormData({ ...formData, email: e.target.value });
					}}
					placeholder="your.email@university.edu"
					testId="email-alerts-input"
					type="email"
					value={formData.email}
					variant="field"
				/>
			</div>

			<div className="space-y-3" data-testid="email-alerts-checkboxes">
				<div className="flex items-start gap-2" data-testid="terms-checkbox-label">
					<Checkbox
						checked={formData.agreeToTerms}
						data-testid="terms-checkbox"
						id="terms"
						onCheckedChange={(checked) => {
							setFormData({ ...formData, agreeToTerms: checked === true });
						}}
					/>
					<Label className="text-sm text-dark" data-testid="terms-checkbox-text" htmlFor="terms">
						I agree to the Terms & Conditions and Privacy Policy. (Required)
					</Label>
				</div>

				<div className="flex items-start gap-2" data-testid="updates-checkbox-label">
					<Checkbox
						checked={formData.agreeToUpdates}
						data-testid="updates-checkbox"
						id="updates"
						onCheckedChange={(checked) => {
							setFormData({ ...formData, agreeToUpdates: checked === true });
						}}
					/>
					<Label className="text-sm text-dark" data-testid="updates-checkbox-text" htmlFor="updates">
						I consent to receive occasional updates and tips from GrantFlow. (Optional)
					</Label>
				</div>
			</div>
		</div>
	);
}
