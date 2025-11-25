import { getOrganizations } from "@/actions/organization";
import { getProjects } from "@/actions/project";
import { AdminGrantingInstitutionSourcesContent } from "@/components/admin/granting-institutions/admin-granting-institution-sources-content";
import { AdminGrantingInstitutionClient } from "@/components/admin/layout/admin-granting-institution-client";
import { getSelectedOrgFromCookies } from "@/utils/organization-context";
import { generateBackgroundColor, generateInitials } from "@/utils/user";

export default async function GrantingInstitutionSourcesPage() {
	const EMPTY_PROJECTS: Awaited<ReturnType<typeof getProjects>> = []
	const organizations = await getOrganizations();
		const selectedOrganisationId = 
		(await getSelectedOrgFromCookies()) ?? (organizations.length > 0 ? organizations[0].id: null)
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
		<AdminGrantingInstitutionClient activeTab="sources" projectTeamMembers={projectTeamMembers}>
			<AdminGrantingInstitutionSourcesContent />
		</AdminGrantingInstitutionClient>
	);
}
