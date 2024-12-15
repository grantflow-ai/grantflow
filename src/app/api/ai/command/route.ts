import type { NextRequest } from "next/server";

import { convertToCoreMessages, streamText } from "ai";
import { NextResponse } from "next/server";

/**
 *
 */
export async function POST(req: NextRequest) {
	const { messages, system } = await req.json();

	try {
		const result = await streamText({
			maxTokens: 2048,
			messages: convertToCoreMessages(messages),
			system,
		});

		return result.toDataStreamResponse();
	} catch {
		return NextResponse.json({ error: "Failed to process AI request" }, { status: 500 });
	}
}
