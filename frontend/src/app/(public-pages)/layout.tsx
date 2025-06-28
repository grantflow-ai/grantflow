import Footer from "@/components/layout/navigation/footer";
import SharedLayout from "@/components/layout/shared-layout";

export default function LandingPagesLayout({ children }: { children: React.ReactNode }) {
	return (
		<SharedLayout>
			<div className="flex min-h-screen w-full flex-col">
				<main className="flex w-full flex-1" data-testid="main-container">
					{children}
				</main>
				<Footer />
			</div>
		</SharedLayout>
	);
}
