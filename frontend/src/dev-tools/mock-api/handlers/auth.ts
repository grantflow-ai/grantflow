import { JwtResponseFactory, OtpResponseFactory } from "::testing/factories";
import type { API } from "@/types/api-types";
import { log } from "@/utils/logger";

export const authHandlers = {
	generateOtp: async (): Promise<API.GenerateOtp.Http200.ResponseBody> => {
		log.info("[Mock API] Generating OTP");
		return OtpResponseFactory.build();
	},
	login: async ({ body }: { body?: any }): Promise<API.Login.Http201.ResponseBody> => {
		const requestBody = body as API.Login.RequestBody;
		log.info("[Mock API] Login handler called", {
			bodyReceived: !!body,
			hasIdToken: !!requestBody?.id_token,
			idTokenPreview: requestBody?.id_token ? `${requestBody.id_token.slice(0, 20)}...` : "none",
		});
		const response = JwtResponseFactory.build();
		log.info("[Mock API] Login response generated", {
			hasJwtToken: !!response.jwt_token,
			jwtTokenLength: response.jwt_token.length,
			jwtTokenPreview: `${response.jwt_token.slice(0, 50)}...`,
		});
		return response;
	},
};
