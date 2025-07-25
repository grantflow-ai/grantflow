"use client";

import { Editor } from "@grantflow/editor";
import type { API } from "@/types/api-types";

interface GrantApplicationEditorProps {
	application: { text: string } & Omit<API.RetrieveApplication.Http200.ResponseBody, "text">;
}

export function GrantApplicationEditor({ application }: GrantApplicationEditorProps) {
	return (
		<div className="container mx-auto max-w-6xl pt-3" data-testid="grant-application-editor">
			<div className="prose prose-sm max-w-none h-full">
				<Editor content={application.text} />
			</div>
		</div>
	);
}
