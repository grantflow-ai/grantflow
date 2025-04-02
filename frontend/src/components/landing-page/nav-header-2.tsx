import { Logo } from "@/components/logo";
import { Button } from "../ui/button";
import { CalendarPlus2 } from "lucide-react";

export function NavHeader2() {
	return (
		<header
			className="sticky top-0 z-50 flex justify-between items-center pe-30 ps-24 border-b border-b-gray-400/20"
			data-testid="nav-header"
		>
			<Logo className="h-26" />
			<div className="flex gap-3">
				<Button variant="link">Solutions</Button>
				<Button variant="ghost">About us</Button>
				<Button>
					<CalendarPlus2 className="h-4" />
					Schedule a Demo
				</Button>
			</div>
		</header>
	);
}
