import { Skeleton } from "@/components/ui/skeleton";

export default function GrantingInstitutionsLoading() {
	return (
		<div className="container  py-10 px-4 md:px-6 lg:px-8">
			<div className="mb-4 2xl:mb-6 px-6 2xl:px-10 relative flex flex-col gap-6 2xl:gap-8 py-6 2xl:py-10 rounded-lg bg-white border border-app-gray-100">
				<div className="flex items-center justify-between">
					<div className="flex flex-col gap-2">
						<Skeleton className="h-[42px] w-64" />
						<Skeleton className="h-[24px] w-96" />
					</div>
					<Skeleton className="h-10 w-[160px]" />
				</div>

				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
					{[1, 2, 3, 4, 5, 6].map((i) => (
						<div
							className="relative flex h-[206px] flex-col rounded-lg border border-app-gray-100 px-4 py-4 bg-preview-bg"
							key={i}
						>
							<header className="flex flex-col gap-3">
								<div className="flex items-start justify-between">
									<Skeleton className="h-[14px] w-24" />
									<Skeleton className="h-6 w-6 rounded-full" />
								</div>

								<div className="flex items-center gap-2">
									<Skeleton className="size-[19px] rounded-full" />
									<Skeleton className="h-[22px] w-48" />
								</div>

								<Skeleton className="h-[20px] w-32" />
							</header>

							<main className="flex h-full w-full items-end pt-3">
								<div className="flex gap-2">
									<Skeleton className="h-[28px] w-24" />
								</div>

								<div className="ml-auto flex items-center gap-2">
									<Skeleton className="h-[32px] w-[97px]" />
								</div>
							</main>
						</div>
					))}
				</div>
			</div>
		</div>
	);
}
