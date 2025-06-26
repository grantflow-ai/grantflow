import type { API } from "@/types/api-types";

export type GrantSection = NonNullable<
	NonNullable<API.RetrieveApplication.Http200.ResponseBody["grant_template"]>
>["grant_sections"][0];

export type UpdateGrantSection = API.UpdateGrantTemplate.RequestBody["grant_sections"][0];
