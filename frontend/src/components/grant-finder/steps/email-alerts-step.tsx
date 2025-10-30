import { Mail } from "lucide-react";
import type { FormData } from "@/components/grant-finder/types";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { FormSummary } from "../form-summary";

interface EmailAlertsStepProps {
	formData: FormData;
	setFormData: (data: FormData) => void;
}

export function EmailAlertsStep({ formData, setFormData }: EmailAlertsStepProps) {
	return (
		<div className="space-y-6" data-testid="email-alerts-step">
			<div className="flex flex-col gap-2" data-testid="email-alerts-step-header">
				<h3
					className="font-cabin text-[28px] font-medium leading-loose text-app-black"
					data-testid="email-alerts-step-title"
				>
					Alerts Setting
				</h3>
				<p
					className="font-sans font-normal text-base text-app-black leading-none"
					data-testid="email-alerts-step-description"
				>
					Enter your email. We&apos;ll notify you the moment your next funding opportunity is announced. No
					spam; unsubscribe anytime.
				</p>
			</div>
			<main className="flex gap-6">
				<div className="w-[539px] flex justify-between flex-col ">
					<div className="w-full" data-testid="email-alerts-input-section">
						<label className="font-sans text-xs font-normal text-app-gray-400" htmlFor="email">
							Email address
						</label>
						<div className="relative">
							<input
								className="w-full text-app-black rounded-lg h-10 border border-primary px-3 placeholder:font-sans placeholder:text-base placeholder:font-normal placeholder:text-app-gray-400"
								data-testid="email-alerts-input"
								id="email"
								onChange={(e) => {
									setFormData({ ...formData, email: e.target.value });
								}}
								placeholder="your.email@university.edu"
								type="email"
								value={formData.email}
							/>
							<Mail className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
						</div>
					</div>

					<div className=" space-y-2" data-testid="email-alerts-checkboxes">
						<div className="flex items-start gap-2" data-testid="terms-checkbox-label">
							<Checkbox
								checked={formData.agreeToTerms}
								data-testid="terms-checkbox"
								id="terms"
								onCheckedChange={(checked) => {
									setFormData({ ...formData, agreeToTerms: checked === true });
								}}
							/>
							<Label
								className="text-sm  font-sora text-app-black font-normal"
								data-testid="terms-checkbox-text"
								htmlFor="terms"
							>
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
							<Label
								className="text-sm  font-sora text-app-black font-normal"
								data-testid="updates-checkbox-text"
								htmlFor="updates"
							>
								I consent to receive occasional updates and tips from GrantFlow. (Optional)
							</Label>
						</div>
					</div>
				</div>
				<div className="" data-testid="wizard-form-summary">
					<FormSummary formData={formData} />
				</div>
			</main>
		</div>
	);
}
