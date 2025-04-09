import { Logo } from "@/components/logo";
import { IconCalendar } from "./icons";
import { AppButton } from "@/components/app-button";

export function NavHeader() {
	return (
		<header
			className="z-40 bg-background flex justify-between items-center px-30 border-b border-b-gray-400/20"
			data-testid="nav-header"
		>
			<Logo className="h-27" height="250" width="250" />
			<div className="flex gap-6 items-center">
				<AppButton size="lg" theme="light" variant="link">
					Solutions
				</AppButton>
				<AppButton size="lg" theme="light" variant="link">
					About us
				</AppButton>
				<AppButton leftIcon={<IconCalendar />}>Schedule a Demo</AppButton>
			</div>
		</header>
	);
}
