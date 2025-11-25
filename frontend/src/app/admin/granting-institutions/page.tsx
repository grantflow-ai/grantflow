import { Plus } from "lucide-react";
import Link from "next/link";
import { listGrantingInstitutions } from "@/actions/granting-institutions";
import { getOrganizations } from "@/actions/organization";
import { getProjects } from "@/actions/project";
import { GrantingInstitutionListWrapper } from "@/components/admin/granting-institutions/granting-institution-list-wrapper";
import { AppButton } from "@/components/app/buttons/app-button";
import AppHeader from "@/components/layout/app-header";
import { routes } from "@/utils/navigation";
import { getSelectedOrgFromCookies } from "@/utils/organization-context";
import { generateBackgroundColor, generateInitials } from "@/utils/user";
import Image from "next/image";
import { Input } from "@/components/ui/input";


export default async function GrantingInstitutionsPage() {
	const institutions = await listGrantingInstitutions();
	const EMPTY_PROJECTS: Awaited<ReturnType<typeof getProjects>> = []
	const organizations = await getOrganizations();
	const selectedOrganisationId = 
	(await getSelectedOrgFromCookies()) ?? (organizations?.[0]?.id ?? null)
	let initialProjects = EMPTY_PROJECTS
	if(selectedOrganisationId){
		try{
			initialProjects = await getProjects(selectedOrganisationId);

		}
		catch{
			initialProjects = EMPTY_PROJECTS
		}
	}

		const projectTeamMembers = initialProjects
			.flatMap((project) => project.members)
			.reduce<
				{
					backgroundColor: string;
					imageUrl?: string;
					initials: string;
					uid: string;
				}[]
			>((acc, member) => {
				const existingMember = acc.find((existing) => existing.uid === member.firebase_uid);
				if (!existingMember) {
					acc.push({
						backgroundColor: generateBackgroundColor(member.firebase_uid),
						initials: generateInitials(member.display_name ?? undefined, member.email),
						uid: member.firebase_uid,
						...(member.photo_url && { imageUrl: member.photo_url }),
					});
				}
				return acc;
			}, [])
			.map(({ uid: _uid, ...member }) => member);

	return (
		<div className=" relative size-full overflow-y-scroll bg-preview-bg ">
				<AppHeader data-testid="dashboard-header" projectTeamMembers={projectTeamMembers} />
			<div className="mb-4 2xl:mb-6 px-10 2l:px-10 relative flex flex-1 flex-col gap-4 2xl:gap-10 py-6 2xl:py-14 rounded-lg mr-5 bg-white border border-app-gray-100 min-h-0">
				<div className="flex items-center justify-between">
					<div className="flex flex-col gap-2">
						<h1 className="font-heading font-medium text-[36px] leading-[42px] text-app-black">
							Granting Institutions
						</h1>
						<p className="font-body font-normal text-base text-app-gray-600">
							Manage guidelines, documents, and resources for funding institutions
						</p>
					</div>
					<div className="flex space-x-6 items-center">
					<div className="w-[400px] h-10 flex px-3 border border-app-gray-100 rounded-[4px]">
						<Input className="font-sans border-none !bg-white shadow-none focus-visible:ring-0 text-[14px] text-app-gray-400 placeholder:text-app-gray-400  px-0" placeholder="Search by Institutions name" />
						<Image
							alt="Search Icon"
							className=""
							height={16}
							src="/icons/search.svg"
							width={16}
						/>

					</div>
					<Link href={routes.admin.grantingInstitutions.new()}>
						<AppButton size="lg">
							<Plus className="mr-2 h-4 w-4" />
							Add New
						</AppButton>
					</Link>
					</div>
				</div>

				<GrantingInstitutionListWrapper institutions={institutions} />
			</div>
		</div>
	);
}
