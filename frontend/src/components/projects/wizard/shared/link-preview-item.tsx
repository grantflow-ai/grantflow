import { Link } from "lucide-react";
import { IconClose } from "@/components/projects/shared/icons";
import { Button } from "@/components/ui/button";
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
				<IconClose
					className="cursor-pointer text-primary opacity-0 transition-opacity group-hover:opacity-100"
					data-testid="link-remove-icon"
					onClick={handleRemove}
				/>
				<Link
					className="text-primary absolute opacity-100 transition-opacity group-hover:opacity-0"
					data-testid="link-icon"
				/>
			</div>
			<Button asChild className="h-auto justify-start p-0.5 text-primary hover:text-accent" variant="link">
				<a
					className="text-sm leading-[18px]"
					data-testid="link-url"
					href={url}
					rel="noopener noreferrer"
					target="_blank"
				>
					{url}
				</a>
			</Button>
		</div>
	);
}