"use server";

import { getClient } from "@/utils/api";
import { createAuthHeaders, withAuthRedirect } from "@/utils/server-side";

import type { API } from "@/types/api-types";

export async function getOtp() {
	return withAuthRedirect(
		getClient()
			.get("otp", { headers: await createAuthHeaders() })
			.json<API.GenerateOtp.Http200.ResponseBody>(),
	);
}
