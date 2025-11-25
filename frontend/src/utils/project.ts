import type { API } from "@/types/api-types";
import { generateBackgroundColor, generateInitials } from "@/utils/user";

export interface ProjectTeamMember {
	backgroundColor: string;
	imageUrl?: string;
	initials: string;
}

export function getProjectTeamMembers(projects: API.ListProjects.Http200.ResponseBody): ProjectTeamMember[] {
	return projects
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
}
