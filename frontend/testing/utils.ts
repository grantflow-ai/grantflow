import { NextRequest } from "next/server";

export function createNextRequest(url: string | URL, requestInit?: RequestInit): NextRequest {
	return new NextRequest(new URL(url), requestInit as any);
}
