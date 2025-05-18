import { SharedLayout } from "@/components/shared-layout";

export default function DefaultLayout({ children }: { children: React.ReactNode }) {
	return (
		<SharedLayout>
			<main className="flex grow" data-testid="main-container">
				{children}
			</main>
		</SharedLayout>
	);
}
