import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getGrantingInstitution } from "@/actions/granting-institutions";
import { GrantingInstitutionForm } from "@/components/admin/granting-institutions/granting-institution-form";
import { Button } from "@/components/ui/button";
import type { API } from "@/types/api-types";
import { routes } from "@/utils/navigation";

interface EditGrantingInstitutionPageProps {
	params: Promise<{
		id: string;
	}>;
}

export default async function EditGrantingInstitutionPage({ params }: EditGrantingInstitutionPageProps) {
	const { id } = await params;

	let institution: API.GetGrantingInstitution.Http200.ResponseBody;
	try {
		institution = await getGrantingInstitution(id);
	} catch {
		notFound();
	}

	return (
		<div className="flex flex-col gap-6 max-w-[655px] px-6 py-10">
			<div className="flex flex-col gap-4">
				<Link href={routes.admin.grantingInstitutions.detail(id)}>
					<Button className="mb-2" size="sm" variant="ghost">
						<ArrowLeft className="mr-2 h-4 w-4" />
						Back to details
					</Button>
				</Link>
				<div className="flex flex-col gap-2">
					<h1 className="font-heading font-medium text-[24px] leading-[30px] text-app-black">
						Edit Granting Institution
					</h1>
					<p className="text-[14px] text-app-gray-700 font-body">
						Update the details of this granting institution
					</p>
				</div>
			</div>

			<GrantingInstitutionForm institution={institution} mode="edit" />
		</div>
	);
}
