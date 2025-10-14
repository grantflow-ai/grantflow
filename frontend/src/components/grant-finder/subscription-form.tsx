"use client";

import { CheckCircle, Loader2, Mail } from "lucide-react";
import { useState } from "react";
import { createSubscription } from "@/actions/grants";
import { AppButton } from "@/components/app/buttons/app-button";
import AppInput from "@/components/app/fields/input-field";
import type { API } from "@/types/api-types";
import type { SearchParams } from "./types";

interface SubscriptionFormProps {
	searchParams: SearchParams;
}

export function SubscriptionForm({ searchParams }: SubscriptionFormProps) {
	const [email, setEmail] = useState("");
	const [loading, setLoading] = useState(false);
	const [success, setSuccess] = useState(false);
	const [error, setError] = useState<null | string>(null);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!email) {
			setError("Please enter your email address");
			return;
		}

		try {
			setLoading(true);
			setError(null);

			const requestBody: API.CreateSubscription.RequestBody = {
				email,
				search_params: {
					category: "",
					deadline_after: "",
					deadline_before: "",
					limit: 20,
					max_amount: 0,
					min_amount: 0,
					offset: 0,
					query: searchParams.keywords.join(" "),
				},
			};
			await createSubscription(requestBody);

			setSuccess(true);
			setEmail("");
		} catch {
			setError("Failed to create subscription. Please try again.");
		} finally {
			setLoading(false);
		}
	};

	if (success) {
		return (
			<div className="rounded-lg border border-green-200 bg-green-50 p-6" data-testid="subscription-success">
				<div className="flex items-start gap-3">
					<CheckCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-600" />
					<div>
						<h3 className="font-semibold text-green-900" data-testid="success-title">
							Success! You&apos;re subscribed
						</h3>
						<p className="mt-1 text-sm text-green-700" data-testid="success-message">
							We&apos;ll notify you when new grants matching your criteria become available.
						</p>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div
			className="rounded-xl border border-input-border bg-white p-8 shadow-sm lg:p-12"
			data-testid="subscription-form"
		>
			<div className="space-y-6">
				<div>
					<div className="mb-4 flex items-center gap-2" data-testid="subscription-header">
						<Mail className="h-5 w-5 text-primary" />
						<h3 className="font-heading text-2xl font-medium leading-loose text-stone-900">
							Get Grant Alerts
						</h3>
					</div>

					<p className="text-muted-foreground-dark text-sm leading-none">
						Never miss a grant opportunity. We&apos;ll email you when new grants matching your search
						criteria are posted.
					</p>
				</div>

				<form className="space-y-6" data-testid="subscription-form-element" onSubmit={handleSubmit}>
					<div className="max-w-lg">
						<AppInput
							data-testid="subscription-email-input"
							disabled={loading}
							errorMessage={error}
							id="subscription-email"
							label="Email address"
							onChange={(e) => {
								setEmail(e.target.value);
								setError(null);
							}}
							placeholder="your.email@university.edu"
							testId="subscription-email-input"
							type="email"
							value={email}
							variant="field"
						/>
					</div>

					<AppButton
						data-testid="subscription-submit-button"
						disabled={loading}
						leftIcon={loading ? <Loader2 className="animate-spin" role="progressbar" /> : <Mail />}
						size="lg"
						type="submit"
						variant="primary"
					>
						{loading ? "Subscribing..." : "Subscribe to Alerts"}
					</AppButton>

					<p className="text-muted-foreground-dark text-xs leading-none">
						By subscribing, you agree to receive email notifications. You can unsubscribe at any time.
					</p>
				</form>
			</div>
		</div>
	);
}
