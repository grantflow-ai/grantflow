import { AuthProvider } from "@/components/auth-provider";
import SharedLayout from "@/components/layout/shared-layout";

export default function DefaultLayout({ children }: { children: React.ReactNode }) {
	return (
		<SharedLayout>
			<AuthProvider>
				<main className="flex grow" data-testid="main-container">
					{children}
				</main>
			</AuthProvider>
		</SharedLayout>
	);
}
