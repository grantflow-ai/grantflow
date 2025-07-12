import type { API } from "@/types/api-types";
import { log } from "@/utils/logger";

type ProjectMember = API.ListProjectMembers.Http200.ResponseBody[0];

const mockMembers: Record<string, ProjectMember[]> = {
	"proj-1": [
		{
			display_name: "Project Owner",
			email: "owner@example.com",
			firebase_uid: "user-1",
			joined_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(), // 30 days ago
			photo_url: null,
			role: "OWNER",
		},
		{
			display_name: "Admin User",
			email: "admin@example.com",
			firebase_uid: "user-2",
			joined_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 15).toISOString(), // 15 days ago
			photo_url: "https://example.com/photos/admin.jpg",
			role: "ADMIN",
		},
		{
			display_name: null,
			email: "member@example.com",
			firebase_uid: "user-3",
			joined_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(), // 7 days ago
			photo_url: null,
			role: "MEMBER",
		},
	],
};

export const projectMemberHandlers = {
	listProjectMembers: async ({
		params,
	}: {
		params?: Record<string, string>;
	}): Promise<API.ListProjectMembers.Http200.ResponseBody> => {
		const project_id = params?.project_id;
		if (!project_id) {
			throw new Error("Project ID is required");
		}
		log.info("[Mock API] Listing project members", { project_id });

		return mockMembers[project_id] || [];
	},

	removeProjectMember: async ({ params }: { params?: Record<string, string> }): Promise<void> => {
		const project_id = params?.project_id;
		const firebase_uid = params?.firebase_uid;
		if (!(project_id && firebase_uid)) {
			throw new Error("Project ID and Firebase UID are required");
		}
		log.info("[Mock API] Removing project member", { firebase_uid, project_id });

		const projectMembers = mockMembers[project_id];
		if (!projectMembers) {
			throw new Error("Project not found");
		}

		const memberIndex = projectMembers.findIndex((m) => m.firebase_uid === firebase_uid);
		if (memberIndex === -1) {
			throw new Error("Member not found");
		}

		const member = projectMembers[memberIndex];
		const currentOwners = projectMembers.filter((m) => m.role === "OWNER");

		if (member.role === "OWNER" && currentOwners.length === 1) {
			throw new Error("Cannot remove the last owner from a project");
		}

		projectMembers.splice(memberIndex, 1);
	},

	updateMemberRole: async ({
		body,
		params,
	}: {
		body?: unknown;
		params?: Record<string, string>;
	}): Promise<API.ListProjectMembers.Http200.ResponseBody[0]> => {
		const project_id = params?.project_id;
		const firebase_uid = params?.firebase_uid;
		if (!(project_id && firebase_uid)) {
			throw new Error("Project ID and Firebase UID are required");
		}
		const newRole = (body as { role?: "ADMIN" | "MEMBER" | "OWNER" })?.role;

		log.info("[Mock API] Updating member role", { firebase_uid, newRole, project_id });

		if (!newRole) {
			throw new Error("Role is required");
		}

		const projectMembers = mockMembers[project_id];
		if (!projectMembers) {
			throw new Error("Project not found");
		}

		const member = projectMembers.find((m) => m.firebase_uid === firebase_uid);
		if (!member) {
			throw new Error("Member not found");
		}

		// Validate role change rules
		const requesterRole = "OWNER"; // In mock, assume requester is owner
		const currentOwners = projectMembers.filter((m) => m.role === "OWNER");

		if (member.role === "OWNER" && currentOwners.length === 1 && newRole !== "OWNER") {
			throw new Error("Cannot remove the last owner from a project");
		}

		if (newRole === "OWNER" && requesterRole !== "OWNER") {
			throw new Error("Only owners can transfer ownership");
		}

		member.role = newRole;

		return member;
	},
};

export function addProjectMember(projectId: string, member: ProjectMember): void {
	if (!mockMembers[projectId]) {
		mockMembers[projectId] = [];
	}
	mockMembers[projectId].push(member);
}

export function clearProjectMembers(projectId?: string): void {
	if (projectId) {
		mockMembers[projectId] = [];
	} else {
		Object.keys(mockMembers).forEach((key) => {
			mockMembers[key] = [];
		});
	}
}
