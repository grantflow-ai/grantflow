import { isNotNullish, isString } from "@tool-belt/type-predicates";
import type { API } from "@/types/api-types";
import { getClient } from "@/utils/api";

export async function createSubscription(
	data: API.CreateSubscription.RequestBody,
): Promise<API.CreateSubscription.Http201.ResponseBody> {
	return getClient()
		.post("grants/subscribe", {
			json: data satisfies API.CreateSubscription.RequestBody,
		})
		.json<API.CreateSubscription.Http201.ResponseBody>();
}

export async function getGrantDetails(grantId: string): Promise<API.GetGrantDetails.Http200.ResponseBody> {
	return getClient().get(`grants/${grantId}`).json<API.GetGrantDetails.Http200.ResponseBody>();
}

export async function searchGrants(
	params: API.GrantsHandleSearchGrants.QueryParameters = {},
): Promise<API.GrantsHandleSearchGrants.Http200.ResponseBody> {
	const searchParams = new URLSearchParams();

	if (params.search_query !== undefined && params.search_query !== null) {
		searchParams.append("search_query", params.search_query);
	}
	if (params.category !== undefined && params.category !== null) {
		searchParams.append("category", params.category);
	}
	if (params.min_amount !== undefined && params.min_amount !== null) {
		searchParams.append("min_amount", params.min_amount.toString());
	}
	if (params.max_amount !== undefined && params.max_amount !== null) {
		searchParams.append("max_amount", params.max_amount.toString());
	}
	if (isNotNullish(params.deadline_after) && isString(params.deadline_after)) {
		searchParams.append("deadline_after", params.deadline_after);
	}
	if (isNotNullish(params.deadline_before) && isString(params.deadline_before)) {
		searchParams.append("deadline_before", params.deadline_before);
	}
	if (params.limit !== undefined) {
		searchParams.append("limit", params.limit.toString());
	}
	if (params.offset !== undefined) {
		searchParams.append("offset", params.offset.toString());
	}

	return getClient()
		.get("grants", {
			searchParams,
		})
		.json<API.GrantsHandleSearchGrants.Http200.ResponseBody>();
}

export async function unsubscribe(email: string): Promise<API.Unsubscribe.Http201.ResponseBody> {
	return getClient()
		.post("grants/unsubscribe", {
			json: {
				email,
			},
		})
		.json<API.Unsubscribe.Http201.ResponseBody>();
}
