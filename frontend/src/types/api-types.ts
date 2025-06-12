export namespace API {
	export namespace AcceptInvitation {
		export namespace Http200 {
			export type ResponseBody = {
				token: string;
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
			invitation_id: string;
		}
	}

	export namespace CrawlFundingOrganizationUrl {
		export namespace Http201 {
			export type ResponseBody = {
				message: string;
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

		export type RequestBody = {
			url: string;
		};
	}

	export namespace CrawlGrantApplicationUrl {
		export namespace Http201 {
			export type ResponseBody = {
				message: string;
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

		export type RequestBody = {
			url: string;
		};
	}

	export namespace CrawlGrantTemplateUrl {
		export namespace Http201 {
			export type ResponseBody = {
				message: string;
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

		export type RequestBody = {
			url: string;
		};
	}

	export namespace CreateApplication {
		export namespace Http201 {
			export type ResponseBody = {
				id: string;
				template_id: string;
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
			title: string;
		};
	}

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

	export namespace CreateGrantTemplate {
		export namespace Http201 {
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
			grant_template_id: string;
			workspace_id: string;
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

	export namespace CreateInvitationRedirectUrl {
		export namespace Http201 {
			export type ResponseBody = {
				token: string;
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
			email: string;
			role: "ADMIN" | "MEMBER" | "OWNER";
		};
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

	export namespace DeleteInvitation {
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
			invitation_id: string;
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

	export namespace GenerateApplication {
		export namespace Http201 {
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

	export namespace GenerateOtp {
		export namespace Http200 {
			export type ResponseBody = {
				otp: string;
			};
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

	export namespace RetrieveApplication {
		export namespace Http200 {
			export type ResponseBody = {
				completed_at?: string;
				created_at: string;
				form_inputs?: {
					background_context: string;
					hypothesis: string;
					impact: string;
					novelty_and_innovation: string;
					preliminary_data: string;
					rationale: string;
					research_feasibility: string;
					scientific_infrastructure: string;
					team_excellence: string;
				};
				grant_template?: {
					created_at: string;
					funding_organization?: {
						abbreviation?: string;
						created_at: string;
						full_name: string;
						id: string;
						updated_at: string;
					};
					funding_organization_id?: string;
					grant_application_id: string;
					grant_sections: (
						| {
								depends_on: string[];
								generation_instructions: string;
								id: string;
								is_clinical_trial: boolean | null;
								is_detailed_workplan: boolean | null;
								keywords: string[];
								max_words: number;
								order: number;
								parent_id: null | string;
								search_queries: string[];
								title: string;
								topics: string[];
						  }
						| {
								id: string;
								order: number;
								parent_id: null | string;
								title: string;
						  }
					)[];
					id: string;
					submission_date?: string;
					updated_at: string;
				};
				id: string;
				rag_sources: {
					created_at: string;
					grant_application_id: string;
					rag_source: {
						created_at: string;
						filename?: string;
						id: string;
						indexing_status: "FAILED" | "FINISHED" | "INDEXING";
						mime_type?: string;
						size?: number;
						source_type: string;
						title?: string;
						updated_at: string;
						url?: string;
					};
					rag_source_id: string;
					updated_at: string;
				}[];
				research_objectives?: {
					description?: string;
					number: number;
					research_tasks: {
						description?: string;
						number: number;
						relationships?: {}[];
						title: string;
					}[];
					title: string;
				}[];
				status: "CANCELLED" | "COMPLETED" | "DRAFT" | "IN_PROGRESS";
				text?: string;
				title: string;
				updated_at: string;
				workspace_id: string;
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
			application_id: string;
			workspace_id: string;
		}
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

	export namespace UpdateApplication {
		export namespace Http200 {
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

		export type RequestBody = {
			form_inputs: {};
			research_objectives: {
				description?: string;
				number: number;
				research_tasks: {
					description?: string;
					number: number;
					relationships?: {}[];
					title: string;
				}[];
				title: string;
			}[];
			status: "CANCELLED" | "COMPLETED" | "DRAFT" | "IN_PROGRESS";
			title: string;
		};
	}

	export namespace UpdateGrantTemplate {
		export namespace Http200 {
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
			grant_template_id: string;
			workspace_id: string;
		}

		export type RequestBody = {
			grant_sections: {
				depends_on: string[];
				generation_instructions: string;
				id: string;
				is_clinical_trial: boolean | null;
				is_detailed_workplan: boolean | null;
				keywords: string[];
				max_words: number;
				order: number;
				parent_id: null | string;
				search_queries: string[];
				title: string;
				topics: string[];
			}[];
			submission_date: string;
		};
	}

	export namespace UpdateInvitationRole {
		export namespace Http200 {
			export type ResponseBody = {
				token: string;
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
			invitation_id: string;
			workspace_id: string;
		}

		export type RequestBody = {
			role: "ADMIN" | "MEMBER" | "OWNER";
		};
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
