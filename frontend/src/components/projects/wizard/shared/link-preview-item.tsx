import { Link } from "lucide-react";
import Image from "next/image";
import { SourceIndexingStatus } from "@/enums";
import { useApplicationStore } from "@/stores/application-store";

export function LinkPreviewItem({
	parentId,
	sourceStatus,
	url,
}: {
	parentId?: string;
	sourceStatus?: string;
	url: string;
}) {
	const removeUrl = useApplicationStore((state) => state.removeUrl);

	const isIndexing = sourceStatus === SourceIndexingStatus.INDEXING;

	const handleRemove = async () => {
		if (!parentId || isIndexing) return;
		await removeUrl(url, parentId);
	};

	return (
		<div className="group relative flex items-center gap-2" data-testid="link-preview-item">
			<div className="flex size-3.5 shrink-0 items-center justify-center">
				<Image
					alt="Remove link"
					className={`opacity-0 transition-opacity group-hover:opacity-100 ${
						isIndexing ? "cursor-not-allowed" : "cursor-pointer"
					}`}
					data-testid="link-remove-icon"
					height={16}
					onClick={handleRemove}
					src="/icons/close.svg"
					style={{
						filter: isIndexing
							? "brightness(0) saturate(100%) invert(58%) sepia(88%) saturate(1372%) hue-rotate(5deg) brightness(97%) contrast(102%)"
							: undefined,
					}}
					width={16}
				/>
				<Link
					className={`text-primary absolute opacity-100 transition-opacity group-hover:opacity-0 size-3 ${
						isIndexing ? "text-orange-500 cursor-not-allowed" : "cursor-pointer"
					}`}
					data-testid="link-icon"
				/>
			</div>
			<a
				className={`h-auto justify-start p-0.5 text-sm leading-[18px] hover:no-underline font-normal block truncate max-w-full ${
					isIndexing ? "text-orange-500 cursor-not-allowed" : "text-primary hover:text-accent"
				}`}
				data-testid="link-url"
				href={url}
				rel="noopener noreferrer"
				target="_blank"
				title={`${url}${isIndexing ? " (indexing in progress)" : ""}`}
			>
				{url}
			</a>
		</div>
	);
}
