import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { GrantingInstitutionForm } from "@/components/admin/granting-institutions/granting-institution-form";
import { Button } from "@/components/ui/button";
import { routes } from "@/utils/navigation";

export default function NewGrantingInstitutionPage() {
	return (
		<div className="flex flex-col gap-6 max-w-[655px] px-6 py-10">
			<div className="flex flex-col gap-4">
				<Link href={routes.admin.grantingInstitutions.list()}>
					<Button className="mb-2" size="sm" variant="ghost">
						<ArrowLeft className="mr-2 h-4 w-4" />
						Back to list
					</Button>
				</Link>
				<div className="flex flex-col gap-2">
					<h1 className="font-heading font-medium text-[24px] leading-[30px] text-app-black">
						Create Granting Institution
					</h1>
					<p className="text-[14px] text-app-gray-700 font-body">
						Add a new granting institution to the system
					</p>
				</div>
			</div>

			<GrantingInstitutionForm mode="create" />
		</div>
	);
}
