export function EditorSections() {
	return (
		<div
			className="w-full flex flex-col p-4 bg-white border border-gray-100 rounded-sm"
			data-testid="editor-sections"
		>
			<div className="px-3 py-4">
				<p className="font-['Cabin'] text-app-black font-semibold">Grant Sections</p>
			</div>
			<div>
				<div className="w-full px-4 py-2 hover:bg-gray-100 cursor-pointer" data-testid="editor-section-item">
					<p className="text-app-black">Section name...</p>
				</div>
				<div className="w-full px-4 py-2 hover:bg-gray-100 cursor-pointer" data-testid="editor-section-item">
					<p className="text-app-black">Section name...</p>
				</div>
				<div
					className="w-full pl-8  px-4 py-2 hover:bg-gray-100 cursor-pointer"
					data-testid="editor-section-item"
				>
					<p className="text-sm text-gray-500 leading-4.5">Section name...</p>
				</div>
				<div
					className="w-full pl-8  px-4 py-2 hover:bg-gray-100 cursor-pointer"
					data-testid="editor-section-item"
				>
					<p className="text-sm text-gray-500 leading-4.5">Section name...</p>
				</div>
				<div className="w-full px-4 py-2 hover:bg-gray-100 cursor-pointer" data-testid="editor-section-item">
					<p className="text-app-black">Section name...</p>
				</div>
				<div className="w-full px-4 py-2 hover:bg-gray-100 cursor-pointer" data-testid="editor-section-item">
					<p className="text-app-black">Section name...</p>
				</div>
				<div className="w-full px-4 py-2 hover:bg-gray-100 cursor-pointer" data-testid="editor-section-item">
					<p className="text-app-black">Section name...</p>
				</div>
				<div
					className="w-full pl-8  px-4 py-2 hover:bg-gray-100 cursor-pointer"
					data-testid="editor-section-item"
				>
					<p className="text-sm text-gray-500 leading-4.5">Section name...</p>
				</div>
			</div>
		</div>
	);
}
