import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { IconCalendar } from "./icons";

export function NavHeader() {
	return (
		<header
			className="z-40 bg-background flex justify-between items-center px-30 border-b border-b-gray-400/20"
			data-testid="nav-header"
		>
			<Logo className="h-27" height="210" width="210" />
			<div className="flex gap-3">
				<Button variant="link">Solutions</Button>
				<Button variant="ghost">About us</Button>
				<Button>
					<IconCalendar />
					Schedule a Demo
				</Button>
			</div>
		</header>
	);
}
