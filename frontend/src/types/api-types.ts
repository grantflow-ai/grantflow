export namespace API {
	export namespace CreateFundingOrganizationRagSourceUploadUrl {
		export namespace Http201 {
			export type ResponseBody = {
				url: string;
			};
		}

		export namespace Http400 {
			export type ResponseBody = {
				detail: string;
				extra?: Record<string, unknown> | null | unknown[];
				status_code: number;
			};
		}

		export interface PathParameters {
			organization_id: null | string;
		}

		export interface QueryParameters {
			blob_name: string;
		}
	}

	export namespace CreateGrantApplicationRagSourceUploadUrl {
		export namespace Http201 {
			export type ResponseBody = {
				url: string;
			};
		}

		export namespace Http400 {
			export type ResponseBody = {
				detail: string;
				extra?: Record<string, unknown> | null | unknown[];
				status_code: number;
			};
		}

		export interface PathParameters {
			application_id: null | string;
			workspace_id: null | string;
		}

		export interface QueryParameters {
			blob_name: string;
		}
	}

	export namespace CreateGrantTemplateRagSourceUploadUrl {
		export namespace Http201 {
			export type ResponseBody = {
				url: string;
			};
		}

		export namespace Http400 {
			export type ResponseBody = {
				detail: string;
				extra?: Record<string, unknown> | null | unknown[];
				status_code: number;
			};
		}

		export interface PathParameters {
			template_id: null | string;
			workspace_id: null | string;
		}

		export interface QueryParameters {
			blob_name: string;
		}
	}

	export namespace CreateOrganization {
		export namespace Http201 {
			export type ResponseBody = {
				abbreviation: null | string;
				full_name: string;
				id: string;
			};
		}

		export namespace Http400 {
			export type ResponseBody = {
				detail: string;
				extra?: Record<string, unknown> | null | unknown[];
				status_code: number;
			};
		}

		export type RequestBody = {
			abbreviation: null | string;
			full_name: string;
		};
	}

	export namespace CreateWorkspace {
		export namespace Http201 {
			export type ResponseBody = {
				id: string;
			};
		}

		export namespace Http400 {
			export type ResponseBody = {
				detail: string;
				extra?: Record<string, unknown> | null | unknown[];
				status_code: number;
			};
		}

		export type RequestBody = {
			description: null | string;
			logo_url?: null | string;
			name: string;
		};
	}

	export namespace DeleteApplication {
		export namespace Http204 {
			export type ResponseBody = undefined;
		}

		export namespace Http400 {
			export type ResponseBody = {
				detail: string;
				extra?: Record<string, unknown> | null | unknown[];
				status_code: number;
			};
		}

		export interface PathParameters {
			application_id: string;
			workspace_id: string;
		}
	}

	export namespace DeleteFundingOrganizationRagSource {
		export namespace Http204 {
			export type ResponseBody = undefined;
		}

		export namespace Http400 {
			export type ResponseBody = {
				detail: string;
				extra?: Record<string, unknown> | null | unknown[];
				status_code: number;
			};
		}

		export interface PathParameters {
			organization_id: null | string;
			source_id: string;
		}
	}

	export namespace DeleteGrantApplicationRagSource {
		export namespace Http204 {
			export type ResponseBody = undefined;
		}

		export namespace Http400 {
			export type ResponseBody = {
				detail: string;
				extra?: Record<string, unknown> | null | unknown[];
				status_code: number;
			};
		}

		export interface PathParameters {
			application_id: null | string;
			source_id: string;
			workspace_id: string;
		}
	}

	export namespace DeleteGrantTemplateRagSource {
		export namespace Http204 {
			export type ResponseBody = undefined;
		}

		export namespace Http400 {
			export type ResponseBody = {
				detail: string;
				extra?: Record<string, unknown> | null | unknown[];
				status_code: number;
			};
		}

		export interface PathParameters {
			source_id: string;
			template_id: null | string;
			workspace_id: string;
		}
	}

	export namespace DeleteOrganization {
		export namespace Http204 {
			export type ResponseBody = undefined;
		}

		export namespace Http400 {
			export type ResponseBody = {
				detail: string;
				extra?: Record<string, unknown> | null | unknown[];
				status_code: number;
			};
		}

		export interface PathParameters {
			organization_id: string;
		}
	}

	export namespace DeleteWorkspace {
		export namespace Http204 {
			export type ResponseBody = undefined;
		}

		export namespace Http400 {
			export type ResponseBody = {
				detail: string;
				extra?: Record<string, unknown> | null | unknown[];
				status_code: number;
			};
		}

		export interface PathParameters {
			workspace_id: string;
		}
	}

	export namespace GenerateOtp {
		export namespace Http200 {
			export type ResponseBody = {
				otp: string;
			};
		}

		export namespace Http400 {
			export type ResponseBody = {
				detail: string;
				extra?: Record<string, unknown> | null | unknown[];
				status_code: number;
			};
		}

		export interface QueryParameters {
			auth: string;
		}
	}

	export namespace GetWorkspace {
		export namespace Http200 {
			export type ResponseBody = {
				description: null | string;
				grant_applications: {
					completed_at: null | string;
					id: string;
					title: string;
				}[];
				id: string;
				logo_url: null | string;
				name: string;
				role: "ADMIN" | "MEMBER" | "OWNER";
			};
		}

		export namespace Http400 {
			export type ResponseBody = {
				detail: string;
				extra?: Record<string, unknown> | null | unknown[];
				status_code: number;
			};
		}

		export interface PathParameters {
			workspace_id: string;
		}
	}

	export namespace HealthCheck {
		export namespace Http200 {
			export type ResponseBody = string;
		}
	}

	export namespace ListOrganizations {
		export namespace Http200 {
			export type ResponseBody = {
				abbreviation: null | string;
				full_name: string;
				id: string;
			}[];
		}
	}

	export namespace ListWorkspaces {
		export namespace Http200 {
			export type ResponseBody = {
				description: null | string;
				id: string;
				logo_url: null | string;
				name: string;
				role: "ADMIN" | "MEMBER" | "OWNER";
			}[];
		}
	}

	export namespace Login {
		export namespace Http201 {
			export type ResponseBody = {
				jwt_token: string;
			};
		}

		export namespace Http400 {
			export type ResponseBody = {
				detail: string;
				extra?: Record<string, unknown> | null | unknown[];
				status_code: number;
			};
		}

		export type RequestBody = {
			id_token: string;
		};
	}

	export namespace RetrieveFundingOrganizationRagSources {
		export namespace Http200 {
			export type ResponseBody = (
				| {
						created_at: string;
						description: null | string;
						id: string;
						indexing_status: "FAILED" | "FINISHED" | "INDEXING";
						title: null | string;
						url: string;
				  }
				| {
						created_at: string;
						filename: string;
						id: string;
						indexing_status: "FAILED" | "FINISHED" | "INDEXING";
						mime_type: string;
						size: number;
				  }
			)[];
		}

		export namespace Http400 {
			export type ResponseBody = {
				detail: string;
				extra?: Record<string, unknown> | null | unknown[];
				status_code: number;
			};
		}

		export interface PathParameters {
			organization_id: null | string;
		}
	}

	export namespace RetrieveGrantApplicationRagSources {
		export namespace Http200 {
			export type ResponseBody = (
				| {
						created_at: string;
						description: null | string;
						id: string;
						indexing_status: "FAILED" | "FINISHED" | "INDEXING";
						title: null | string;
						url: string;
				  }
				| {
						created_at: string;
						filename: string;
						id: string;
						indexing_status: "FAILED" | "FINISHED" | "INDEXING";
						mime_type: string;
						size: number;
				  }
			)[];
		}

		export namespace Http400 {
			export type ResponseBody = {
				detail: string;
				extra?: Record<string, unknown> | null | unknown[];
				status_code: number;
			};
		}

		export interface PathParameters {
			application_id: null | string;
			workspace_id: string;
		}
	}

	export namespace RetrieveGrantTemplateRagSources {
		export namespace Http200 {
			export type ResponseBody = (
				| {
						created_at: string;
						description: null | string;
						id: string;
						indexing_status: "FAILED" | "FINISHED" | "INDEXING";
						title: null | string;
						url: string;
				  }
				| {
						created_at: string;
						filename: string;
						id: string;
						indexing_status: "FAILED" | "FINISHED" | "INDEXING";
						mime_type: string;
						size: number;
				  }
			)[];
		}

		export namespace Http400 {
			export type ResponseBody = {
				detail: string;
				extra?: Record<string, unknown> | null | unknown[];
				status_code: number;
			};
		}

		export interface PathParameters {
			template_id: null | string;
			workspace_id: string;
		}
	}

	export namespace UpdateOrganization {
		export namespace Http200 {
			export type ResponseBody = {
				abbreviation: null | string;
				full_name: string;
				id: string;
			};
		}

		export namespace Http400 {
			export type ResponseBody = {
				detail: string;
				extra?: Record<string, unknown> | null | unknown[];
				status_code: number;
			};
		}

		export interface PathParameters {
			organization_id: string;
		}

		export type RequestBody = {
			abbreviation: null | string;
			full_name: string;
		};
	}

	export namespace UpdateWorkspace {
		export namespace Http200 {
			export type ResponseBody = {
				description: null | string;
				id: string;
				logo_url: null | string;
				name: string;
				role: "ADMIN" | "MEMBER" | "OWNER";
			};
		}

		export namespace Http400 {
			export type ResponseBody = {
				detail: string;
				extra?: Record<string, unknown> | null | unknown[];
				status_code: number;
			};
		}

		export interface PathParameters {
			workspace_id: string;
		}

		export type RequestBody = {
			description: null | string;
			logo_url: null | string;
			name: string;
		};
	}
}
