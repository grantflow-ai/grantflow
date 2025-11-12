import { Plus } from "lucide-react";
import Link from "next/link";
import { listGrantingInstitutions } from "@/actions/granting-institutions";
import { GrantingInstitutionListWrapper } from "@/components/admin/granting-institutions/granting-institution-list-wrapper";
import { Button } from "@/components/ui/button";
import { routes } from "@/utils/navigation";

export default async function GrantingInstitutionsPage() {
	const institutions = await listGrantingInstitutions();

	return (
		<div className="container  py-10">
			<div className="flex items-center justify-between mb-6">
				<div>
					<h1 className="text-3xl font-bold text-app-black">Granting Institutions</h1>
					<p className="text-gray-600 mt-2">Manage granting institutions in the system</p>
				</div>
				<Link href={routes.admin.grantingInstitutions.new()}>
					<Button>
						<Plus className="mr-2 h-4 w-4" />
						Add Institution
					</Button>
				</Link>
			</div>

			<GrantingInstitutionListWrapper institutions={institutions} />
		</div>
	);
}
