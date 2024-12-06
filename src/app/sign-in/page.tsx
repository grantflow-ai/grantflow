"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { FirebaseLogin } from "@/components/sign-in/firebase-login";
import { getFirebaseAuth } from "@/utils/firebase";
import { PagePath } from "@/enums";
import { Loader2 } from "lucide-react";

export default function SignIn() {
	const router = useRouter();
	const auth = getFirebaseAuth();
	const [isLoading, setIsLoading] = useState(false);

	useEffect(() => {
		if (auth.currentUser) {
			router.replace(PagePath.WORKSPACES);
		}
	}, [auth]);

	return (
		<div data-testid="login-container" className="flex bg-base-100 h-full">
			{isLoading ? (
				<Loader2 className="grow animate-spin" />
			) : (
				<div className="grow px-16 pt-16 pb-24 flex-col">
					<FirebaseLogin
						setLoading={(loadingValue) => {
							setIsLoading(loadingValue);
						}}
						auth={auth}
					/>
				</div>
			)}
		</div>
	);
}
