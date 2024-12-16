import type { NextRequest } from "next/server";

import { NextResponse } from "next/server";

/**
 * Route to process AI requests.
 *
 * @param req The incoming request
 * @returns The response to send
 */
// eslint-disable-next-line @typescript-eslint/require-await,no-unused-vars
export async function POST(_: NextRequest) {
	// const { messages, system } = await req.json();

	try {
		// const result = await streamText({
		// 	maxTokens: 2048,
		// 	messages: convertToCoreMessages(messages),
		// 	system,
		// });
		//
		// return result.toDataStreamResponse();
		return NextResponse.json({ error: "Not Implemented" }, { status: 500 });
	} catch {
		return NextResponse.json({ error: "Failed to process AI request" }, { status: 500 });
	}
}
