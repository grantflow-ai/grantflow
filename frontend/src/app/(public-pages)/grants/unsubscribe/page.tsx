"use client";

import { CheckCircle, Loader2, Mail, XCircle } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { unsubscribe } from "@/actions/grants";
import { log } from "@/utils/logger/client";

interface UnsubscribeState {
	message: string;
	status: UnsubscribeStatus;
}

type UnsubscribeStatus = "error" | "idle" | "submitting" | "success";

export default function UnsubscribePage() {
	return (
		<Suspense
			fallback={
				<div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
					<div className="text-center">
						<Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-4" />
						<p className="text-gray-600">Loading...</p>
					</div>
				</div>
			}
		>
			<UnsubscribeContent />
		</Suspense>
	);
}

function UnsubscribeContent() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const subscriptionId = searchParams.get("id");

	const [email, setEmail] = useState("");
	const [state, setState] = useState<UnsubscribeState>({
		message: "",
		status: "idle",
	});

	const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();

		if (!email) {
			setState({
				message: "Please enter your email address.",
				status: "error",
			});
			return;
		}

		setState({
			message: "Processing your request...",
			status: "submitting",
		});

		try {
			log.info("Unsubscribing from grant alerts", {
				email,
				subscriptionId: subscriptionId ?? "unknown",
			});

			await unsubscribe(email);

			setState({
				message: "You have been successfully unsubscribed from grant alerts.",
				status: "success",
			});

			log.info("Successfully unsubscribed from grant alerts");

			// Redirect to grant finder after 3 seconds
			setTimeout(() => {
				router.push("/grant-finder");
			}, 3000);
		} catch (error) {
			log.error("Failed to unsubscribe", error);

			let errorMessage = "Failed to unsubscribe. ";

			if (error instanceof Error) {
				if (error.message.includes("404")) {
					errorMessage = "No active subscription found for this email address.";
				} else if (error.message.includes("400")) {
					errorMessage = "Invalid request. Please check your email and try again.";
				} else {
					errorMessage += "Please try again or contact support.";
				}
			}

			setState({
				message: errorMessage,
				status: "error",
			});
		}
	};

	if (state.status === "success") {
		return (
			<div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
				<div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8">
					<div className="text-center">
						<div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
							<CheckCircle className="w-8 h-8 text-green-600" data-testid="success-icon" />
						</div>
						<h1 className="text-2xl font-semibold text-gray-900 mb-2">Unsubscribed Successfully</h1>
						<p className="text-gray-600 mb-4">{state.message}</p>
						<p className="text-sm text-gray-500">
							We&apos;re sorry to see you go. You can resubscribe anytime from the grant finder.
						</p>
						<div className="mt-6">
							<button
								className="px-6 py-2 text-blue-600 hover:text-blue-700 transition-colors"
								onClick={() => {
									router.push("/grant-finder");
								}}
								type="button"
							>
								Return to Grant Finder
							</button>
						</div>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
			<div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8">
				<div className="text-center mb-6">
					<div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
						<Mail className="w-8 h-8 text-blue-600" />
					</div>
					<h1 className="text-2xl font-semibold text-gray-900 mb-2">Unsubscribe from Grant Alerts</h1>
					<p className="text-gray-600">Enter your email address to confirm unsubscription</p>
				</div>

				<form className="space-y-4" onSubmit={handleSubmit}>
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="email">
							Email Address
						</label>
						<input
							className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
							data-testid="email-input"
							disabled={state.status === "submitting"}
							id="email"
							onChange={(e) => {
								setEmail(e.target.value);
								// Clear error state when user starts typing
								if (state.status === "error") {
									setState({ message: "", status: "idle" });
								}
							}}
							placeholder="your.email@university.edu"
							required
							type="email"
							value={email}
						/>
					</div>

					{state.status === "error" && (
						<div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
							<XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
							<p className="text-sm text-red-700" data-testid="error-message">
								{state.message}
							</p>
						</div>
					)}

					<button
						className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
						data-testid="unsubscribe-button"
						disabled={state.status === "submitting"}
						type="submit"
					>
						{state.status === "submitting" ? (
							<>
								<Loader2 className="w-4 h-4 animate-spin" />
								Processing...
							</>
						) : (
							"Unsubscribe"
						)}
					</button>

					<div className="text-center">
						<button
							className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
							onClick={() => {
								router.push("/grant-finder");
							}}
							type="button"
						>
							Cancel
						</button>
					</div>
				</form>

				<div className="mt-6 pt-6 border-t border-gray-200">
					<p className="text-xs text-gray-500 text-center">
						Changed your mind? You can subscribe again anytime from the grant finder page.
					</p>
				</div>
			</div>
		</div>
	);
}
