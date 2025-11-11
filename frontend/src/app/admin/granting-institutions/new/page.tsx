import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { GrantingInstitutionForm } from "@/components/admin/granting-institutions/granting-institution-form";
import { AppButton } from "@/components/app/buttons/app-button";
import { routes } from "@/utils/navigation";

export default function NewGrantingInstitutionPage() {
	return (
		<div className="h-screen container mx-auto py-10 px-4 md:px-6 lg:px-8">
			<div className="mb-4 2xl:mb-6 px-6 2xl:px-10 relative flex flex-col gap-6 2xl:gap-8 py-6 2xl:py-10 rounded-lg bg-white border border-app-gray-100 min-h-full">
				<div className="flex flex-col gap-4">
					<Link href={routes.admin.grantingInstitutions.list()}>
						<AppButton className="mb-2" size="sm" variant="secondary">
							<ArrowLeft className="mr-2 h-4 w-4" />
							Back to list
						</AppButton>
					</Link>
					<div className="flex flex-col gap-2">
						<h1 className="font-heading font-medium text-[36px] leading-[42px] text-app-black">
							Create Granting Institution
						</h1>
						<p className="font-body font-normal text-base text-app-gray-600">
							Add a new granting institution to the system
						</p>
					</div>
				</div>

				<GrantingInstitutionForm mode="create" />
			</div>
		</div>
	);
}
