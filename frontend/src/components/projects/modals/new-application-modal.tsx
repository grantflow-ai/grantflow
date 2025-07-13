import { X } from "lucide-react";
import { useState } from "react";

import { AppButton } from "@/components/app";
import { BaseModal } from "@/components/app/feedback/base-modal";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface NewApplicationModalProps {
	isOpen: boolean;
	onClose: () => void;
	onCreate: (title: string, description: string) => void;
}

export function NewApplicationModal({ isOpen, onClose, onCreate }: NewApplicationModalProps) {
	const [title, setTitle] = useState("");
	const [description, setDescription] = useState("");

	const handleCreate = () => {
		onCreate(title, description);
		onClose();
	};

	return (
		<BaseModal isOpen={isOpen} onClose={onClose}>
			<div className=" w-[464px]" data-testid="new-application-modal">
				<button
					aria-label="Close modal"
					className="absolute right-4 top-4 flex size-4 items-center justify-center text-black"
					data-testid="close-modal-button"
					onClick={onClose}
					type="button"
				>
					<X className="size-4" />
				</button>

				<main className="flex flex-col gap-8 p-8">
					<div className="flex flex-col gap-2">
						<h2 className="font-medium text-2xl leading-[30px] text-[#2e2d36]">
							Select a Research Project
						</h2>
						<p className="font-normal text-base leading-5 text-gray-600">
							Every application is part of a Research Project. Please select a project or create a new
							one.
						</p>
					</div>
					<div className="flex flex-col">
						<label className="font-normal text-xs text-gray-400">Research project</label>
						<Select>
							<SelectTrigger className="border border-primary w-full text-black [&>span]:font-normal [&>span]:text-base [&>span]:text-gray-600 [&>svg]:!text-gray-600 [&>svg]:!opacity-100">
								<SelectValue placeholder="Choose a research project or create new" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="light">Light</SelectItem>
								<SelectItem value="dark">Dark</SelectItem>
								<SelectItem value="system">System</SelectItem>
							</SelectContent>
						</Select>
					</div>
					<div className="flex flex-col gap-2">
						<label className="font-medium text-sm text-gray-700" htmlFor="application-description">
							Description (Optional)
						</label>
						<textarea
							className="w-full h-24 rounded-[4px] px-3 py-2 border border-[#e1dfeb] bg-white text-base text-black placeholder:text-gray-400 outline-none focus:border-[#1e13f8]"
							id="application-description"
							onChange={(e) => setDescription(e.target.value)}
							placeholder="Enter a brief description"
							value={description}
						/>
					</div>
				</main>

				<div className="flex items-center justify-end gap-3">
					<AppButton onClick={onClose} variant="secondary">
						Cancel
					</AppButton>
					<AppButton onClick={handleCreate} disabled={!title.trim()} variant="primary">
						Create
					</AppButton>
				</div>
			</div>
		</BaseModal>
	);
}
