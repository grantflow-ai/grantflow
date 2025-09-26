import { Loader2 } from "lucide-react";
import Image from "next/image";

import { useApplicationStore } from "@/stores/application-store";

export function Autosave() {
	const isSaving = useApplicationStore((state) => state.isSaving);

	return (
		<div className="inline-flex items-center gap-1 w-max">
			{isSaving ? (
				<Loader2 className="size-4 animate-spin" />
			) : (
				<Image alt="ok" height={16} src="/icons/tick-round.svg" width={16} />
			)}
			<span className="text-sm text-gray-600">{isSaving ? "Saving" : "All changes saved"}</span>
		</div>
	);
}
