"use client";

import { isSignInWithEmailLink, signInWithEmailLink } from "@firebase/auth";
import { useRouter } from "next/navigation";
import { getFirebaseAuth } from "@/utils/firebase";
import { PagePath } from "@/enums";
import { FIREBASE_LOCAL_STORAGE_KEY } from "@/constants";
import { useEffect } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useStore } from "@/store";

/**
 * Handles the email sign-in completion flow after user clicks the email link.
 * Validates the email link, completes the sign-in process, and redirects the user.
 */
export default function FinalizeEmailLogin() {
	const router = useRouter();
	const auth = getFirebaseAuth();
	const { setUser } = useStore();

	useEffect(() => {
		const finalizeSignIn = async () => {
			const email = globalThis.localStorage.getItem(FIREBASE_LOCAL_STORAGE_KEY);

			if (!email || !isSignInWithEmailLink(auth, globalThis.location.href)) {
				toast.error("Invalid or expired sign-in link");
				router.replace(PagePath.SIGNIN);
				return;
			}

			try {
				await signInWithEmailLink(auth, email, globalThis.location.href);
				setUser(auth.currentUser);
				router.replace(PagePath.WORKSPACES);
			} catch (error) {
				console.error("Sign-in error:", error);
				toast.error(error instanceof Error ? error.message : "Failed to sign in with email link");
				router.replace(PagePath.SIGNIN);
			} finally {
				globalThis.localStorage.removeItem(FIREBASE_LOCAL_STORAGE_KEY);
			}
		};

		void finalizeSignIn();
	}, [auth.currentUser, router]);

	return (
		<div
			className="flex items-center justify-center min-h-screen bg-background"
			data-testid="finish-email-signin-container"
		>
			<div className="text-center space-y-4">
				<Loader2 className="w-8 h-8 animate-spin mx-auto" />
				<p className="text-sm text-muted-foreground">Completing sign in...</p>
			</div>
		</div>
	);
}
