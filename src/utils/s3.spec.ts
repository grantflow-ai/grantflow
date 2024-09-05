import type { Env } from "@/types/env-types";
import { getEnv } from "@/utils/env";
import { S3Client } from "@aws-sdk/client-s3";
import { getS3Client } from "./s3";

vi.mock("@aws-sdk/client-s3");

vi.mock("@/utils/env", () => ({
	getEnv: vi.fn(),
}));

describe("getS3Client", () => {
	vi.mocked(getEnv).mockReturnValue({
		AWS_ACCESS_KEY_ID: "test-access-key",
		AWS_SECRET_ACCESS_KEY: "test-secret-key",
	} as unknown as Env);

	it("should create a new S3Client", () => {
		const client = getS3Client();
		expect(S3Client).toHaveBeenCalledTimes(1);
		expect(S3Client).toHaveBeenCalledWith({
			region: "eu-central-1",
			credentials: {
				accessKeyId: "test-access-key",
				secretAccessKey: "test-secret-key",
			},
		});
		expect(client).toBeDefined();
	});

	it("should memoize the client", () => {
		expect(getS3Client()).toBe(getS3Client());
	});
});
