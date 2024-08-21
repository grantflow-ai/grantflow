import {
	AUTH_METHOD_EMAIL_SIGNIN,
	AUTH_METHOD_OAUTH_SIGNIN,
	AUTH_METHOD_PASSWORD_SIGNIN,
	getEnabledAuthMethods,
} from "@/config/auth";
import { getEnv } from "@/utils/env";

vi.mock("@/utils/env");

describe("getEnabledAuthMethods", () => {
	it("returns all enabled auth methods", () => {
		vi.mocked(getEnv).mockReturnValue({
			NEXT_PUBLIC_ENABLE_EMAIL_OTP_SIGNIN: true,
			NEXT_PUBLIC_ENABLE_PASSWORD_AUTH: true,
			NEXT_PUBLIC_ENABLE_OAUTH_SIGNIN: true,
		} as any);

		const result = getEnabledAuthMethods();
		expect(result).toEqual(new Set([AUTH_METHOD_EMAIL_SIGNIN, AUTH_METHOD_PASSWORD_SIGNIN, AUTH_METHOD_OAUTH_SIGNIN]));
	});
});
