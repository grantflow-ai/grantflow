"use server";

import { API } from "@/types/api-types";
import { createAuthHeaders, getClient, withAuthRedirect } from "@/utils/api";

export async function getOtp() {
	return withAuthRedirect(
		getClient()
			.get("otp", { headers: await createAuthHeaders() })
			.json<API.GenerateOtp.Http200.ResponseBody>(),
	);
}
