import { Auth, GoogleAuthProvider, sendSignInLinkToEmail, signInWithPopup } from "@firebase/auth";
import { useRouter } from "next/navigation";
import { PagePath } from "@/enums";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "gen/ui/card";
import { EmailSigninForm } from "@/components/sign-in/email-signin-form";
import { SeparatorWithText } from "@/components/separator-with-text";
import { SigninWithGoogleButton } from "@/components/sign-in/signin-with-google-button";
import { getEnv } from "@/utils/env";
import { FIREBASE_LOCAL_STORAGE_KEY } from "@/constants";

const googleProvider = new GoogleAuthProvider();

export function FirebaseLogin({ setLoading, auth }: { setLoading: (value: boolean) => void; auth: Auth }) {
	const router = useRouter();

	const handleGoogleSignin = async () => {
		setLoading(true);

		try {
			await signInWithPopup(auth, googleProvider);
			router.replace(PagePath.WORKSPACES);
		} catch {
			setLoading(false);
		}
	};

	const handleEmailSignin = async (email: string) => {
		setLoading(true);

		const url = new URL(PagePath.FINISH_EMAIL_SIGNIN, getEnv().NEXT_PUBLIC_SITE_URL).toString();

		try {
			await sendSignInLinkToEmail(auth, email, {
				url,
				handleCodeInApp: true,
			});
			globalThis.localStorage.setItem(FIREBASE_LOCAL_STORAGE_KEY, email);
		} catch {
			setLoading(false);
		}
	};

	return (
		<div className="container mx-auto px-4 py-8 md:py-16" data-testid="firebase-login-container">
			<Card className="max-w-md mx-auto">
				<CardHeader>
					<CardTitle className="text-2xl font-bold text-center" data-testid="auth-page-title">
						Welcome to GrantFlow.AI
					</CardTitle>
					<CardDescription className="text-center" data-testid="auth-page-description">
						Sign in to get started
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-6">
					<EmailSigninForm
						onSubmit={async ({ email }) => {
							await handleEmailSignin(email);
						}}
					/>
					<SeparatorWithText text={"Or sign in with"} />
					<SigninWithGoogleButton
						onClick={async () => {
							await handleGoogleSignin();
						}}
					/>
				</CardContent>
			</Card>
		</div>
	);
}
