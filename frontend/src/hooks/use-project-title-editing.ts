import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useProjectStore } from "@/stores/project-store";

interface UseProjectTitleEditingParams {
	initialTitle: string;
	organizationId: null | string;
	projectId: string;
}

export function useProjectTitleEditing({ initialTitle, organizationId, projectId }: UseProjectTitleEditingParams) {
	const { updateProject } = useProjectStore();
	const [isEditing, setIsEditing] = useState(false);
	const [title, setTitle] = useState(initialTitle);
	const [isFirstEdit, setIsFirstEdit] = useState(false);
	const titleInputRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		setTitle(initialTitle);
	}, [initialTitle]);

	useEffect(() => {
		if (isEditing && titleInputRef.current) {
			setIsFirstEdit(true);
			const element = titleInputRef.current;
			element.focus();

			const range = document.createRange();
			range.setStart(element, element.childNodes.length);
			range.collapse(true);
			const selection = globalThis.getSelection();
			if (selection) {
				selection.removeAllRanges();
				selection.addRange(range);
			}

			const handleFirstKey = (e: KeyboardEvent) => {
				if (e.key.length === 1) {
					element.textContent = "";
					setIsFirstEdit(false);
					element.removeEventListener("keydown", handleFirstKey);
				}
			};
			element.addEventListener("keydown", handleFirstKey);
			return () => {
				element.removeEventListener("keydown", handleFirstKey);
			};
		}
	}, [isEditing]);

	const handleSave = async () => {
		const newTitle = (titleInputRef.current?.textContent ?? "").trim();
		if (newTitle && newTitle !== initialTitle && organizationId) {
			try {
				await updateProject(organizationId, projectId, {
					description: null,
					logo_url: null,
					name: newTitle,
				});
				setTitle(newTitle);
				toast.success("Project title updated successfully!");
			} catch {
				toast.error("Failed to update project title.");
			}
		}
		setIsEditing(false);
	};

	return {
		handleSave,
		isEditing,
		isFirstEdit,
		setIsEditing,
		title,
		titleInputRef,
	};
}
