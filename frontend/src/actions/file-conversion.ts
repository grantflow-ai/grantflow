"use server";

import type { API } from "@/types/api-types";
import { getClient } from "@/utils/api/server";
import { createAuthHeaders, withAuthRedirect } from "@/utils/server-side";

export async function convertFile(data: API.FilesConvertHandleConvertFile.RequestBody): Promise<Blob> {
	return withAuthRedirect(
		getClient()
			.post("files/convert", {
				headers: await createAuthHeaders(),
				json: data,
			})
			.blob(),
	);
}
