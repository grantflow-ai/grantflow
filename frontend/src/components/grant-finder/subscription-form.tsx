"use client";

import { CheckCircle, Loader2, Mail } from "lucide-react";
import { useState } from "react";
import { createSubscription } from "@/actions/grants";
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

			await createSubscription({
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
			});

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
							We&apos;ll notify you when new grants matching your criteria become available. Check your
							email to confirm your subscription.
						</p>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div
			className="rounded-lg border border-gray-200 bg-gradient-to-br from-blue-50 to-indigo-50 p-6"
			data-testid="subscription-form"
		>
			<div className="mb-4 flex items-center gap-2" data-testid="subscription-header">
				<Mail className="h-5 w-5 text-blue-600" />
				<h3 className="text-lg font-semibold text-gray-900">Get Grant Alerts</h3>
			</div>

			<p className="mb-4 text-sm text-gray-600">
				Never miss a grant opportunity. We&apos;ll email you when new grants matching your search criteria are
				posted.
			</p>

			<form className="space-y-3" data-testid="subscription-form-element" onSubmit={handleSubmit}>
				<div>
					<label className="sr-only" htmlFor="subscription-email">
						Email address
					</label>
					<input
						className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
						data-testid="subscription-email-input"
						disabled={loading}
						id="subscription-email"
						onChange={(e) => {
							setEmail(e.target.value);
						}}
						placeholder="your.email@university.edu"
						type="email"
						value={email}
					/>
				</div>

				{error && (
					<p className="text-sm text-red-600" data-testid="subscription-error">
						{error}
					</p>
				)}

				<button
					className="flex w-full items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
					data-testid="subscription-submit-button"
					disabled={loading}
					type="submit"
				>
					{loading ? (
						<>
							<Loader2 className="h-4 w-4 animate-spin" role="progressbar" />
							Subscribing...
						</>
					) : (
						<>
							<Mail className="h-4 w-4" />
							Subscribe to Alerts
						</>
					)}
				</button>

				<p className="text-xs text-gray-500">
					By subscribing, you agree to receive email notifications. You can unsubscribe at any time.
				</p>
			</form>
		</div>
	);
}
