"use server";

import type { API } from "@/types";
import { getClient } from "@/utils/api/server";
import { createAuthHeaders, withAuthRedirect } from "@/utils/server-side";

export async function getOtp() {
	return withAuthRedirect(
		getClient()
			.get("otp", { headers: await createAuthHeaders() })
			.json<API.GenerateOtp.Http200.ResponseBody>(),
	);
}
