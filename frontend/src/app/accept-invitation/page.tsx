"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
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

const decodeJwtPayload = (token: string): Record<string, unknown> => {
	const [, payload] = token.split(".");

	if (!payload) {
		throw new Error("Invalid invitation token format");
	}

	const parsed: unknown = JSON.parse(atob(payload));

	if (parsed === null || typeof parsed !== "object") {
		throw new Error("Invalid invitation token payload");
	}

	return parsed as Record<string, unknown>;
};

const extractNonEmptyString = (value: unknown) => (typeof value === "string" && value.length > 0 ? value : undefined);

function AcceptInvitationContent() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const { isAuthenticated } = useUserStore();
	const [isProcessing, setIsProcessing] = useState(false);

	const navigateAfterAcceptance = useCallback(
		(payload: { organization_id?: string; project_id?: string }) => {
			if (payload.project_id) {
				router.push(`/projects/${payload.project_id}?success=invitation-accepted`);
				return;
			}

			router.push("/projects?success=invitation-accepted");
		},
		[router],
	);

	const redirectToLogin = useCallback(
		(token: string) => {
			const returnUrl = `/accept-invitation?token=${encodeURIComponent(token)}`;
			router.push(`/login?returnUrl=${encodeURIComponent(returnUrl)}`);
		},
		[router],
	);

	const acceptAndRoute = useCallback(
		async (token: string) => {
			const invitationPayload = decodeJwtPayload(token);
			const invitationId = extractNonEmptyString(invitationPayload.invitation_id);

			if (!invitationId) {
				throw new Error("Invalid invitation token format");
			}

			const result = await acceptInvitation(invitationId, token);
			const rawResultPayload = decodeJwtPayload(result.token);
			const organizationId = extractNonEmptyString(rawResultPayload.organization_id);
			const projectId = extractNonEmptyString(rawResultPayload.project_id);
			const resultPayload = {
				...(organizationId ? { organization_id: organizationId } : {}),
				...(projectId ? { project_id: projectId } : {}),
			};

			log.info("Invitation accepted successfully", { invitationId, resultPayload });
			navigateAfterAcceptance(resultPayload);
		},
		[navigateAfterAcceptance],
	);

	useEffect(() => {
		const token = searchParams.get("token");

		if (!token) {
			log.error("No invitation token provided");
			router.push("/projects?error=invalid-invitation");
			return;
		}

		const processInvitation = async () => {
			if (!isAuthenticated) {
				redirectToLogin(token);
				return;
			}

			if (isProcessing) return;
			setIsProcessing(true);

			try {
				await acceptAndRoute(token);
			} catch (error) {
				log.error("Failed to accept invitation", error);
				router.push("/projects?error=invitation-failed");
			} finally {
				setIsProcessing(false);
			}
		};

		void processInvitation();
	}, [searchParams, isAuthenticated, router, isProcessing, redirectToLogin, acceptAndRoute]);

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
