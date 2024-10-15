"use client";

import { Button } from "gen/ui/button";
import { SiGoogle } from "@icons-pack/react-simple-icons";
import { signInWithGoogle } from "@/actions/signin-with-google";

export function SigninWithGoogleButton() {
	return (
		<section data-testid="oauth-signin-form" className="flex flex-col gap-2">
			<Button
				variant="secondary"
				className="w-full p-1 border rounded"
				data-testid="oauth-signin-form-google-button"
				onClick={async () => {
					await signInWithGoogle();
				}}
			>
				<p className="flex justify-center items-center gap-3">
					<span data-testid="oauth-signin-form-google-text" className="text-md bold">
						Sign in with Google
					</span>
					<span data-testid="oauth-signin-form-google-icon">
						<SiGoogle className="h-4 w-4" />
					</span>
				</p>
			</Button>
		</section>
	);
}
