import { Logo } from "@/components/logo";
import { PagePath } from "@/enums";
import { getEnv } from "@/utils/env";
import Link from "next/link";

export function NavHeader() {
	const loginPageUrl = new URL(PagePath.SIGNIN, getEnv().NEXT_PUBLIC_SITE_URL).toString();
	return (
		<div className="sticky top-0 z-50 w-full" data-testid="nav-header">
			<div className="backdrop-blur-md bg-background/60 w-full">
				<div className="flex justify-between items-center px-4 md:px-8 py-4">
					<div className="logo-container">
						<div className="w-[120px] h-[40px] flex items-center justify-center">
							<Logo />
						</div>
					</div>
					<div className="flex items-center gap-4">
						<p className="text-sm text-foreground hidden md:block">Have early access?</p>
						<Link
							className="bg-primary/10 border border-primary/20 rounded-md shadow-sm px-4 py-2 text-sm text-foreground hover:bg-primary/20 transition-colors"
							href={loginPageUrl}
						>
							Login
						</Link>
					</div>
				</div>
			</div>
		</div>
	);
}
