"use client";

import { isSignInWithEmailLink, signInWithEmailLink } from "firebase/auth";
import { Loader2 } from "lucide-react";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";

import { login } from "@/actions/login";
import { FIREBASE_LOCAL_STORAGE_KEY } from "@/constants";
import { PagePath } from "@/enums";
import { useUserStore } from "@/stores/user-store";
import { getFirebaseAuth } from "@/utils/firebase";
import { logError } from "@/utils/logging";

export default function FinalizeEmailLogin() {
	const router = useRouter();
	const { setUser } = useUserStore();

	useEffect(() => {
		const finalizeSignIn = async () => {
			const auth = getFirebaseAuth();

			const email = globalThis.localStorage.getItem(FIREBASE_LOCAL_STORAGE_KEY);
			const isEmailLink = isSignInWithEmailLink(auth, globalThis.location.href);
			if (!(email && isEmailLink)) {
				toast.error("Invalid or expired sign-in link");
				router.replace(PagePath.ONBOARDING);
				return;
			}

			try {
				const cred = await signInWithEmailLink(auth, email, globalThis.location.href);

				// Store user info in the user store
				setUser({
					displayName: cred.user.displayName,
					email: cred.user.email,
					emailVerified: cred.user.emailVerified,
					photoURL: cred.user.photoURL,
					providerId: cred.user.providerData[0]?.providerId,
					uid: cred.user.uid,
				});

				const idToken = await cred.user.getIdToken();
				await login(idToken);
			} catch (error) {
				if (!isRedirectError(error)) {
					logError({ error, identifier: "finalizeSignIn" });
					toast.error("Failed to sign in with email link");
					router.replace(PagePath.LOGIN);
				}
			} finally {
				globalThis.localStorage.removeItem(FIREBASE_LOCAL_STORAGE_KEY);
			}
		};

		void finalizeSignIn();
	}, [router, setUser]);

	return (
		<div
			className="bg-background flex min-h-screen items-center justify-center"
			data-testid="finish-email-signin-container"
		>
			<div className="space-y-4 text-center">
				<Loader2 className="mx-auto size-8 animate-spin" />
				<p className="text-muted-foreground text-sm">Completing sign in...</p>
			</div>
		</div>
	);
}
