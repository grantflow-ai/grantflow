"use client";

import { isSignInWithEmailLink, signInWithEmailLink } from "firebase/auth";
import { Loader2 } from "lucide-react";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";
import { login } from "@/actions/login";
import { FIREBASE_LOCAL_STORAGE_KEY } from "@/constants";
import { useUserStore } from "@/stores/user-store";
import { convertFirebaseUser, getFirebaseAuth } from "@/utils/firebase";
import { log } from "@/utils/logger/client";
import { routes } from "@/utils/navigation";
import { checkProfileAndRedirect } from "@/utils/onboarding";
import { analyticsIdentify } from "@/utils/segment";

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
				router.replace(routes.signup());
				return;
			}

			try {
				const cred = await signInWithEmailLink(auth, email, globalThis.location.href);

				setUser(convertFirebaseUser(cred.user));

				const idToken = await cred.user.getIdToken();
				await login(idToken);

				await analyticsIdentify(cred.user.uid, {
					email: cred.user.email ?? "",
					firstName: cred.user.displayName?.split(" ")[0] ?? "",
					lastName: cred.user.displayName?.split(" ").at(-1) ?? "",
				});

				checkProfileAndRedirect(cred.user.displayName);
			} catch (error) {
				if (!isRedirectError(error)) {
					log.error("finalizeSignIn", error);
					toast.error("Failed to sign in with email link");
					router.replace(routes.login());
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
