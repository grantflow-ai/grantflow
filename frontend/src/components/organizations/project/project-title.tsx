import { PencilIcon } from "lucide-react";
import type { FC, RefObject } from "react";

interface ProjectTitleProps {
	isEditing: boolean;
	isFirstEdit: boolean;
	onSave: () => void;
	onSetIsEditing: (isEditing: boolean) => void;
	title: string;
	titleInputRef: RefObject<HTMLDivElement>;
}

const ProjectTitle: FC<ProjectTitleProps> = ({
	isEditing,
	isFirstEdit,
	onSave,
	onSetIsEditing,
	title,
	titleInputRef,
}) => (
	<div className="flex items-center gap-2">
		{isEditing ? (
			<div
				aria-label="Project Title"
				className={`font-medium text-[36px] leading-[42px] text-app-black outline-none border-b-2 border-primary focus:outline-none ${
					isFirstEdit ? "text-gray-400" : "text-app-black"
				}`}
				contentEditable
				data-testid="project-title-input"
				onBlur={onSave}
				onKeyDown={(e) => {
					if (e.key === "Enter") {
						e.preventDefault();
						onSave();
					}
				}}
				ref={titleInputRef}
				role="textbox"
				suppressContentEditableWarning
				tabIndex={0}
			>
				{title}
			</div>
		) : (
			<h1 className="font-medium text-[36px] leading-[42px] text-app-black">{title}</h1>
		)}
		<button
			className="flex size-6 items-center justify-center text-app-gray-600 hover:text-app-black cursor-pointer"
			onClick={() => {
				onSetIsEditing(true);
			}}
			type="button"
		>
			<PencilIcon className={`size-5 ${isEditing ? "text-app-black" : ""}`} />
		</button>
	</div>
);

export default ProjectTitle;
