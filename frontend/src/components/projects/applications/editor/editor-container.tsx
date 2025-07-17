"use client";

import { EditorExportButton } from "./editor-export-button";
import { EditorPromptWindow } from "./editor-prompt-window";
import { EditorSections } from "./editor-sections";
import { EditorWarning } from "./editor-warning";
import { GrantApplicationEditor } from "./grant-application-editor";

export function EditorContainer() {
	return (
		<div className="flex flex-col gap-4 pr-6 h-full">
			<EditorWarning />
			<div className="flex gap-3 h-full">
				<div className="min-w-[326px] w-[326px]">
					<EditorPromptWindow />
				</div>
				<GrantApplicationEditor
					// @ts-expect-error Update the props
					application={{ text: "hello grantflow editor" }}
				/>
				<div className="min-w-[207px] w-[207px] flex flex-col gap-3 mt-6">
					<EditorExportButton />
					<EditorSections />
				</div>
			</div>
		</div>
	);
}
