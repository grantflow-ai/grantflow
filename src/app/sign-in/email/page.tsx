"use client";

import { isSignInWithEmailLink, signInWithEmailLink } from "@firebase/auth";
import { useRouter } from "next/navigation";
import { getFirebaseAuth } from "@/utils/firebase";
import { PagePath } from "@/enums";
import { FIREBASE_LOCAL_STORAGE_KEY } from "@/constants";
import { useEffect } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function FinalizeEmailLogin() {
	const router = useRouter();
	const auth = getFirebaseAuth();

	useEffect(() => {
		const email = globalThis.localStorage.getItem(FIREBASE_LOCAL_STORAGE_KEY);

		if (email && isSignInWithEmailLink(auth, globalThis.location.href)) {
			(async () => {
				try {
					await signInWithEmailLink(auth, email, globalThis.location.href);
					globalThis.localStorage.removeItem(FIREBASE_LOCAL_STORAGE_KEY);
					router.replace(PagePath.WORKSPACES);
				} catch (e) {
					console.error("signin error occurred:", e);
					toast.error("Failed to sign in with email link");
				}
			})();
		} else {
			router.replace(PagePath.SIGNIN);
		}
	}, [auth, globalThis.location.href]);

	return (
		<div data-testid="finish-email-signin-container" className="flex bg-base-100 h-full">
			<Loader2 className="grow animate-spin" />
		</div>
	);
}
