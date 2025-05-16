import { CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function AuthCardHeader({
	description,
	descriptionTestId = "auth-card-description",
	title,
	titleTestId = "auth-card-title",
}: {
	description: string;
	descriptionTestId?: string;
	title: string;
	titleTestId?: string;
}) {
	return (
		<CardHeader data-testid="auth-card-header">
			<CardTitle className="text-4xl font-heading font-medium" data-testid={titleTestId}>
				{title}
			</CardTitle>
			<CardDescription className="text-app-gray-600" data-testid={descriptionTestId}>
				{description}
			</CardDescription>
		</CardHeader>
	);
}
