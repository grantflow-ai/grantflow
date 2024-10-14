import { Card, CardHeader, CardTitle } from "gen/ui/card";
import Link from "next/link";
import { PagePath } from "@/enums";
import { FileText } from "lucide-react";

export function GrantApplicationCard({ id, title }: { id: string; title: string }) {
	return (
		<Card className="overflow-hidden">
			<Link
				href={`${PagePath.APPLICATIONS}/${id}`}
				className="absolute inset-0 z-10"
				data-testid={`application-draft-link-${id}`}
			>
				<span className="sr-only">Navigate to the {title} grant application</span>
			</Link>
			<CardHeader className="space-y-1">
				<CardTitle className="text-2xl font-semibold flex items-center space-x-2">
					<FileText className="h-6 w-6 text-primary" />
					<span>{title}</span>
				</CardTitle>
			</CardHeader>
		</Card>
	);
}
