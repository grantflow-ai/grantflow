import { Plus } from "lucide-react";
import { useState } from "react";
import { AppButton } from "@/components/app";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { API } from "@/types/api-types";
import Image from "next/image";

interface NewApplicationModalProps {
	isOpen: boolean;
	onClose: () => void;
	onCreate: (title: string, description: string) => void;
	projects: Project[];
}

type Project = API.ListProjects.Http200.ResponseBody[number];

export default function NewApplicationModal({ isOpen, onClose, onCreate, projects }: NewApplicationModalProps) {
	const [title, setTitle] = useState("");
	const [description] = useState("");
	const [showNewProjectInput, setShowNewProjectInput] = useState(false);
	const [isSelectOpen, setIsSelectOpen] = useState(false);
	const [selectedValue, setSelectedValue] = useState("");

	let modalHeight = "h-[330px]";
	if (isSelectOpen) {
		modalHeight = "h-[500px]";
	} else if (showNewProjectInput) {
		modalHeight = "h-[392px]";
	}

	const handleCreate = () => {
		onCreate(title, description);
		handleClose();
	};

	const handleOpenChange = (open: boolean) => {
		if (!open) {
			handleClose();
		}
	};

	const handleClose = () => {
		setTitle("");
		setShowNewProjectInput(false);
		setSelectedValue("");

		onClose();
	};
	return (
		<Dialog onOpenChange={handleOpenChange} open={isOpen}>
			<DialogContent
				className={`${
					modalHeight
				} p-8  flex flex-col gap-8 border border-primary bg-white [&>button]:text-black [&>button>svg]:text-black [&>button]:hover:bg-gray-100 transition-all duration-500 `}
				data-testid="new-application-modal"
			>
				<DialogHeader className="flex flex-col gap-2">
					<DialogTitle
						className="font-medium text-2xl leading-[30px] text-[#2e2d36]"
						data-testid="modal-title"
					>
						Select a Research Project
					</DialogTitle>
					<DialogDescription
						className="font-normal text-base leading-5 text-gray-600"
						data-testid="modal-description"
					>
						Every application is part of a Research Project. Please select a project or create a new one.
					</DialogDescription>
				</DialogHeader>
				<main className="flex flex-col gap-6">
					<div>
						<label className="font-normal text-xs text-gray-400" htmlFor="research-project-select">
							Research project
						</label>
						<Select
							onOpenChange={setIsSelectOpen}
							onValueChange={(value) => {
								setSelectedValue(value);
								setShowNewProjectInput(value === "Menu Item - create-new");

								if (value === "Menu Item - create-new") {
									setTitle("");
								} else {
									const selectedProject = projects.find((p) => p.id === value);
									setTitle(selectedProject ? selectedProject.name : "");
								}
							}}
						>
							<SelectTrigger
								className="border border-gray-600 rounded  w-full text-black  [&>svg]:!text-gray-600 [&>svg]:!opacity-100 [&>svg]:hidden"
								data-testid="select-trigger"
								id="research-project-select"
							>
								<div className="flex items-center justify-between w-full font-normal text-sm text-gray-400">
									<SelectValue className="" placeholder="Choose a research project or create new" />
									<div>
										<Image alt="search icon" height={16} src="/icons/search.svg" width={16} />
									</div>
								</div>
							</SelectTrigger>
							<SelectContent className="[&>*]:p-1 border border-gray-200 w-full shadow-none ">
								{projects.map((project) => (
									<SelectItem
										className="bg-white cursor-pointer text-app-black text-sm font-normal p-3 focus:!bg-preview-bg focus:!text-app-black data-[highlighted]:!bg-primary data-[highlighted]:!text-white rounded transition duration-200"
										data-testid={`select-item-${project.id}`}
										key={project.id}
										value={project.id}
									>
										{project.name}
									</SelectItem>
								))}

								<SelectItem
									className="bg-white cursor-pointer border-t border-gray-200 text-app-black text-sm font-normal p-0 hover:bg-preview-bg hover:text-app-black focus:bg-preview-bg data-[highlighted]:bg-preview-bg data-[highlighted]:text-app-black rounded-none"
									data-testid="select-item-create-new"
									value="Menu Item - create-new"
								>
									<div className="w-[400px] flex  p-3">
										{selectedValue !== "Menu Item - create-new" && (
											<Plus className="text-primary mr-2" />
										)}

										<div className="w-full ">
											<p
												className={`${selectedValue === "Menu Item - create-new" ? "text-app-black text-left" : "text-primary text-center"}  text-sm font-normal `}
											>
												Create New
											</p>
										</div>
									</div>
								</SelectItem>
							</SelectContent>
						</Select>
					</div>

					<div
						className={`transition-all duration-500 ease-in-out overflow-hidden ${
							showNewProjectInput ? " max-h-52 opacity-100" : "max-h-0 opacity-0"
						}`}
					>
						<label className="font-normal text-xs text-gray-400" htmlFor="project-name-input">
							Research project name
						</label>
						<input
							className="w-full h-10 px-3 rounded border border-gray-200 placeholder:font-normal placeholder:text-base placeholder:text-gray-400 text-base text-gray-600"
							data-testid="project-name-input"
							id="project-name-input"
							onChange={(e) => {
								setTitle(e.target.value);
							}}
							placeholder="Give your research project a name "
							type="text"
							value={title}
						/>
					</div>
				</main>
				<DialogFooter className="size-full flex items-end">
					<div className="flex items-end justify-between gap-3 w-full">
						<AppButton
							className="rounded px-4 py-2"
							data-testid="cancel-button"
							onClick={handleClose}
							variant="secondary"
						>
							Cancel
						</AppButton>
						<AppButton
							className="rounded px-4 py-2"
							data-testid="select-button"
							onClick={handleCreate}
							variant="primary"
						>
							{selectedValue ? "Create and Start" : "Select"}
						</AppButton>
					</div>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
