import type { NextRequest } from "next/server";

import { generateText } from "ai";
import { NextResponse } from "next/server";

/**
 *
 */
export async function POST(req: NextRequest) {
	const { prompt, system } = await req.json();

	try {
		const result = await generateText({
			abortSignal: req.signal,
			maxTokens: 50,
			prompt,
			system,
			temperature: 0.7,
		});

		return NextResponse.json(result);
	} catch (error: any) {
		if (error.name === "AbortError") {
			return NextResponse.json(null, { status: 408 });
		}

		return NextResponse.json({ error: "Failed to process AI request" }, { status: 500 });
	}
}
