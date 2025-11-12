import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function GrantingInstitutionsLoading() {
	return (
		<div className="container mx-auto py-10">
			<div className="flex items-center justify-between mb-6">
				<div>
					<Skeleton className="h-9 w-64 mb-2" />
					<Skeleton className="h-5 w-96" />
				</div>
				<Skeleton className="h-10 w-40" />
			</div>

			<div className="space-y-4">
				{[1, 2, 3, 4, 5].map((i) => (
					<Card key={i}>
						<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
							<div className="space-y-2 flex-1">
								<Skeleton className="h-6 w-64" />
								<Skeleton className="h-4 w-32" />
							</div>
							<Skeleton className="h-9 w-16" />
						</CardHeader>
						<CardContent className="pt-2">
							<Skeleton className="h-4 w-full" />
						</CardContent>
					</Card>
				))}
			</div>
		</div>
	);
}
