import { HeadingLevels } from "@grantflow/editor";
import React from "react";

const MAX_TEXT_LENGTH = 14;

export function EditorSections({
	onSectionClick,
	sections,
}: {
	onSectionClick: (index: number) => void;
	sections: { level: HeadingLevels; text: string }[];
}) {
	const renderedSections = React.useMemo(
		() =>
			sections.map((section, index) => {
				const { level, text } = section;
				const truncatedText = text.length > MAX_TEXT_LENGTH ? `${text.slice(0, MAX_TEXT_LENGTH)}...` : text;

				if (level === HeadingLevels.H2) {
					return (
						<button
							className="w-full px-4 py-2 hover:bg-gray-100 cursor-pointer"
							data-testid="editor-section-item"
							key={`${index}-${text}`}
							onClick={() => {
								onSectionClick(index);
							}}
							type="button"
						>
							<p className="text-app-black">{truncatedText}</p>
						</button>
					);
				}

				if (level === HeadingLevels.H3) {
					return (
						<button
							className="w-full pl-8  px-4 py-2 hover:bg-gray-100 cursor-pointer"
							data-testid="editor-section-item"
							key={`${index}-${text}`}
							onClick={() => {
								onSectionClick(index);
							}}
							type="button"
						>
							<p className="text-sm text-gray-500 leading-4.5">{truncatedText}</p>
						</button>
					);
				}
				return null;
			}),
		[sections, onSectionClick],
	);

	return (
		<div
			className="w-full flex flex-col p-4 bg-white border border-gray-100 rounded-sm"
			data-testid="editor-sections"
		>
			<div className="px-3 py-4">
				<p className="font-['Cabin'] text-app-black font-semibold">Grant Sections</p>
			</div>
			<div>{renderedSections}</div>
		</div>
	);
}
