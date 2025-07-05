"use client";

import { useCallback, useState } from "react";
import { Editor } from "@/components/editor/editor";
import type { API } from "@/types/api-types";

interface GrantApplicationEditorProps {
	application: { text: string } & Omit<API.RetrieveApplication.Http200.ResponseBody, "text">;
}

export function GrantApplicationEditor({ application }: GrantApplicationEditorProps) {
	const [content, setContent] = useState(application.text);

	const handleContentUpdate = useCallback((newContent: string) => {
		setContent(newContent);
	}, []);

	return (
		<div className="container mx-auto max-w-6xl p-6">
			<div className="prose prose-sm max-w-none">
				<Editor content={content} onContentUpdate={handleContentUpdate} />
			</div>
		</div>
	);
}
