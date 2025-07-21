import { AppCardDescription, AppCardHeader, AppCardTitle } from "@/components/app";

export function AuthCardHeader({
	className,
	description,
	descriptionTestId = "auth-card-description",
	title,
	titleTestId = "auth-card-title",
}: {
	className?: string;
	description: string;
	descriptionTestId?: string;
	title: string;
	titleTestId?: string;
}) {
	return (
		<AppCardHeader className={className} data-testid="auth-card-header">
			<AppCardTitle className="font-heading text-4xl font-medium" data-testid={titleTestId}>
				{title}
			</AppCardTitle>
			<AppCardDescription className="text-app-gray-600" data-testid={descriptionTestId}>
				{description}
			</AppCardDescription>
		</AppCardHeader>
	);
}
