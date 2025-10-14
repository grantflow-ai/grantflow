"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { acceptInvitation } from "@/actions/project";
import { useUserStore } from "@/stores/user-store";
import { log } from "@/utils/logger/client";

export default function AcceptInvitationPage() {
	return (
		<Suspense
			fallback={
				<div className="min-h-screen flex items-center justify-center bg-gray-100">
					<div className="text-center">
						<div
							className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"
							data-testid="loading-spinner"
						/>
						<p className="text-background">Loading...</p>
					</div>
				</div>
			}
		>
			<AcceptInvitationContent />
		</Suspense>
	);
}

function AcceptInvitationContent() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const { isAuthenticated } = useUserStore();
	const [isProcessing, setIsProcessing] = useState(false);

	useEffect(() => {
		const token = searchParams.get("token");

		if (!token) {
			log.error("No invitation token provided");
			router.push("/projects?error=invalid-invitation");
			return;
		}

		const processInvitation = async () => {
			if (!isAuthenticated) {
				const returnUrl = `/accept-invitation?token=${encodeURIComponent(token)}`;
				router.push(`/login?returnUrl=${encodeURIComponent(returnUrl)}`);
				return;
			}

			if (isProcessing) return;
			setIsProcessing(true);

			try {
				const payload = JSON.parse(atob(token.split(".")[1])) as {
					invitation_id: string;
				};
				const invitationId = payload.invitation_id;

				if (!invitationId) {
					throw new Error("Invalid invitation token format");
				}

				const result = await acceptInvitation(invitationId, token);

				const resultPayload = JSON.parse(atob(result.token.split(".")[1])) as {
					organization_id?: string;
					project_id?: string;
				};

				log.info("Invitation accepted successfully", { invitationId, resultPayload });

				if (resultPayload.organization_id && !resultPayload.project_id) {
					router.push("/projects?success=invitation-accepted");
				} else if (resultPayload.project_id) {
					router.push(`/projects/${resultPayload.project_id}?success=invitation-accepted`);
				} else {
					router.push("/projects?success=invitation-accepted");
				}
			} catch (error) {
				log.error("Failed to accept invitation", error);
				router.push("/projects?error=invitation-failed");
			} finally {
				setIsProcessing(false);
			}
		};

		void processInvitation();
	}, [searchParams, isAuthenticated, router, isProcessing]);

	return (
		<div className="min-h-screen flex items-center justify-center bg-surface-primary">
			<div className="text-center">
				<div
					className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"
					data-testid="processing-spinner"
				/>
				<p className="text-text-secondary">Processing your invitation...</p>
			</div>
		</div>
	);
}
