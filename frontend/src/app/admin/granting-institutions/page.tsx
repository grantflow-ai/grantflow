import { Plus } from "lucide-react";
import Link from "next/link";
import { listGrantingInstitutions } from "@/actions/granting-institutions";
import { GrantingInstitutionListWrapper } from "@/components/admin/granting-institutions/granting-institution-list-wrapper";
import { AppButton } from "@/components/app/buttons/app-button";
import { routes } from "@/utils/navigation";

export default async function GrantingInstitutionsPage() {
	const institutions = await listGrantingInstitutions();

	return (
		<div className="container mx-auto py-10">
			<div className="mb-4 2xl:mb-6 px-6 2xl:px-10 relative flex flex-col gap-6 2xl:gap-8 py-6 2xl:py-10 rounded-lg bg-white border border-app-gray-100">
				<div className="flex items-center justify-between">
					<div className="flex flex-col gap-2">
						<h1 className="font-heading font-medium text-[36px] leading-[42px] text-app-black">
							Granting Institutions
						</h1>
						<p className="font-body font-normal text-base text-app-gray-600">
							Manage granting institutions in the system
						</p>
					</div>
					<Link href={routes.admin.grantingInstitutions.new()}>
						<AppButton size="lg">
							<Plus className="mr-2 h-4 w-4" />
							Add Institution
						</AppButton>
					</Link>
				</div>

				<GrantingInstitutionListWrapper institutions={institutions} />
			</div>
		</div>
	);
}
