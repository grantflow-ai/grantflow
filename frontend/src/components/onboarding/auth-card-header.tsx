import { CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function AuthCardHeader({
	description,
	descriptionTestId = "auth-page-description",
	title,
	titleTestId = "auth-page-title",
}: {
	description: string;
	descriptionTestId?: string;
	title: string;
	titleTestId?: string;
}) {
	return (
		<CardHeader>
			<CardTitle className="text-4xl font-heading font-medium" data-testid={titleTestId}>
				{title}
			</CardTitle>
			<CardDescription className="text-app-gray-600" data-testid={descriptionTestId}>
				{description}
			</CardDescription>
		</CardHeader>
	);
}
