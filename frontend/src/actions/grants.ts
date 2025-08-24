import type { API } from "@/types";
import { getClient } from "@/utils/api";

export async function createSubscription(
	data: API.GrantsSubscribeCreateSubscription.RequestBody,
): Promise<API.GrantsSubscribeCreateSubscription.Http201.ResponseBody> {
	return getClient()
		.post("grants/subscribe", {
			json: data satisfies API.GrantsSubscribeCreateSubscription.RequestBody,
		})
		.json<API.GrantsSubscribeCreateSubscription.Http201.ResponseBody>();
}

export async function getGrantDetails(grantId: string): Promise<API.GrantsGrantIdGetGrantDetails.Http200.ResponseBody> {
	return getClient().get(`grants/${grantId}`).json<API.GrantsGrantIdGetGrantDetails.Http200.ResponseBody>();
}

export async function searchGrants(
	params: API.GrantsSearchGrants.QueryParameters = {},
): Promise<API.GrantsSearchGrants.Http200.ResponseBody> {
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
	if (params.deadline_after !== undefined && params.deadline_after !== null) {
		searchParams.append("deadline_after", params.deadline_after);
	}
	if (params.deadline_before !== undefined && params.deadline_before !== null) {
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
		.json<API.GrantsSearchGrants.Http200.ResponseBody>();
}

export async function unsubscribe(email: string): Promise<API.GrantsUnsubscribeUnsubscribe.Http201.ResponseBody> {
	return getClient()
		.post("grants/unsubscribe", {
			searchParams: {
				email,
			},
		})
		.json<API.GrantsUnsubscribeUnsubscribe.Http201.ResponseBody>();
}

export async function verifySubscription(
	token: string,
): Promise<API.GrantsVerifyTokenVerifySubscription.Http200.ResponseBody> {
	return getClient()
		.get(`grants/verify/${token}`)
		.json<API.GrantsVerifyTokenVerifySubscription.Http200.ResponseBody>();
}
