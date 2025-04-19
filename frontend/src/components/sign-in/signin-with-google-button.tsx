import { SiGoogle } from "@icons-pack/react-simple-icons";
import { Button } from "@/components/ui/button";

export function SigninWithGoogleButton({ isLoading, onClick }: { isLoading: boolean; onClick: () => Promise<void> }) {
	return (
		<section className="flex flex-col gap-2" data-testid="oauth-signin-form">
			<Button
				className="w-full rounded border p-1"
				data-testid="oauth-signin-form-google-button"
				disabled={isLoading}
				onClick={async () => {
					await onClick();
				}}
				variant="secondary"
			>
				<p className="flex items-center justify-center gap-3">
					<span className="text-md bold" data-testid="oauth-signin-form-google-text">
						Sign in with Google
					</span>
					<span data-testid="oauth-signin-form-google-icon">
						<SiGoogle className="size-4" />
					</span>
				</p>
			</Button>
		</section>
	);
}
