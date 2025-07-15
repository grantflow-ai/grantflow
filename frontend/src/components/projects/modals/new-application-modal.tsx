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

interface NewApplicationModalProps {
	isOpen: boolean;
	onClose: () => void;
	onCreate: (title: string, description: string) => void;
}

export default function NewApplicationModal({ isOpen, onClose, onCreate }: NewApplicationModalProps) {
	const [title, setTitle] = useState("");
	const [description] = useState("");

	const handleCreate = () => {
		onCreate(title, description);
		onClose();
	};

	const handleOpenChange = (open: boolean) => {
		if (!open) {
			onClose();
		}
	};

	return (
		<Dialog onOpenChange={handleOpenChange} open={isOpen}>
			<DialogContent
				className="p-8 w-[464px] h-[431px] flex flex-col gap-8 bg-white [&>button]:text-black [&>button>svg]:text-black [&>button]:hover:bg-gray-100"
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
						<Select>
							<SelectTrigger
								className="border border-primary w-full text-black [&>span]:font-normal [&>span]:text-base [&>span]:text-gray-600 [&>svg]:!text-gray-600 [&>svg]:!opacity-100"
								data-testid="select-trigger"
								id="research-project-select"
							>
								<SelectValue placeholder="Choose a research project or create new" />
							</SelectTrigger>
							<SelectContent className="[&>*]:p-0 border border-gray-200 w-full shadow-none ">
								<SelectItem
									className="bg-white cursor-pointer text-app-black text-sm font-normal p-3 hover:!bg-preview-bg hover:!text-app-black focus:!bg-preview-bg focus:!text-app-black data-[highlighted]:!bg-preview-bg data-[highlighted]:!text-app-black rounded-none"
									data-testid="select-item-first"
									value="Menu Item - First"
								>
									Menu Item - First
								</SelectItem>
								<SelectItem
									className="bg-white cursor-pointer text-app-black text-sm font-normal p-3 hover:!bg-preview-bg hover:!text-app-black focus:!bg-preview-bg focus:!text-app-black data-[highlighted]:!bg-preview-bg data-[highlighted]:!text-app-black rounded-none"
									value="	Menu Item - second"
								>
									Menu Item - second
								</SelectItem>
								<SelectItem
									className="bg-white cursor-pointer border border-gray-200 text-app-black text-sm font-normal p-0 hover:bg-preview-bg hover:text-app-black focus:bg-preview-bg data-[highlighted]:bg-preview-bg data-[highlighted]:text-app-black rounded-none"
									data-testid="select-item-create-new"
									value="Menu Item - create-new"
								>
									<div className="w-[400px] flex  p-3">
										<Plus className="text-primary mr-2" />
										<div className="w-full ">
											<p className="text-primary text-sm font-normal text-center">Create New</p>
										</div>
									</div>
								</SelectItem>
							</SelectContent>
						</Select>
					</div>

					<div>
						<label className="font-normal text-xs text-gray-400" htmlFor="project-name-input">
							Research project name
						</label>
						<input
							className="w-full h-10 px-3 rounded border border-gray-900 placeholder:font-normal placeholder:text-base placeholder:text-gray-600 text-base text-gray-600"
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
							onClick={onClose}
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
							Select
						</AppButton>
					</div>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
