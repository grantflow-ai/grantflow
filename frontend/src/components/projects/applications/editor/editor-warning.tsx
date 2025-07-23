import Image from "next/image";
import { useState } from "react";

export function EditorWarning() {
	const [visible, setVisible] = useState(true);

	if (!visible) {
		return null;
	}

	return (
		<div
			className="flex justify-between items-center bg-light-gray p-2 rounded-sm border-app-slate-blue border"
			data-testid="editor-warning"
		>
			<div className="flex gap-1 items-center">
				<Image alt="Warning" height={16} src="/icons/info.svg" width={16} />
				<p className="text-sm text-app-black">
					Keep in mind that AI has limitations and may occasionally make mistakes. Always review and refine
					the output.
				</p>
			</div>
			<button
				className="cursor-pointer"
				data-testid="editor-warning-close"
				onClick={() => {
					setVisible(false);
				}}
				type="button"
			>
				<Image alt="Close" height={16} src="/icons/close.svg" width={16} />
			</button>
		</div>
	);
}
