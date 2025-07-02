import { Link } from "lucide-react";
import Image from "next/image";
import { useApplicationStore } from "@/stores/application-store";

export function LinkPreviewItem({ parentId, url }: { parentId?: string; url: string }) {
	const removeUrl = useApplicationStore((state) => state.removeUrl);

	const handleRemove = async () => {
		if (!parentId) return;
		await removeUrl(url, parentId);
	};

	return (
		<div className="group relative flex items-center gap-2" data-testid="link-preview-item">
			<div className="flex size-3.5 shrink-0 items-center justify-center">
				<Image
					alt="Remove link"
					className="cursor-pointer text-primary opacity-0 transition-opacity group-hover:opacity-100"
					data-testid="link-remove-icon"
					height={16}
					onClick={handleRemove}
					src="/icons/close.svg"
					width={16}
				/>
				<Link
					className="text-primary absolute opacity-100 transition-opacity group-hover:opacity-0 size-3 cursor-pointer"
					data-testid="link-icon"
				/>
			</div>
			<a
				className="h-auto justify-start p-0.5 text-primary hover:text-accent text-sm leading-[18px] hover:no-underline font-normal block truncate max-w-full"
				data-testid="link-url"
				href={url}
				rel="noopener noreferrer"
				target="_blank"
				title={url}
			>
				{url}
			</a>
		</div>
	);
}
