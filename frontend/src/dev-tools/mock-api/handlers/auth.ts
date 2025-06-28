import { JwtResponseFactory, OtpResponseFactory } from "::testing/factories";
import type { API } from "@/types/api-types";

export const authHandlers = {
	generateOtp: async (): Promise<API.GenerateOtp.Http200.ResponseBody> => {
		console.log("[Mock API] Generating OTP");
		return OtpResponseFactory.build();
	},
	login: async ({ body }: { body?: any }): Promise<API.Login.Http201.ResponseBody> => {
		const requestBody = body as API.Login.RequestBody;
		console.log("[Mock API] Login with ID token:", `${requestBody.id_token.slice(0, 20)}...`);
		return JwtResponseFactory.build();
	},
};
