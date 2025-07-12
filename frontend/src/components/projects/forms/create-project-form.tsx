import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { createProject } from "@/actions/project";
import { AppCard, AppCardContent, AppInput, AppTextarea } from "@/components/app";
import { SubmitButton } from "@/components/app/buttons/submit-button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { log } from "@/utils/logger";

const projectSchema = z.object({
	description: z.string(),
	name: z.string().min(3, { message: "Project name must be at least 3 characters long" }),
});

type ProjectFormValues = z.infer<typeof projectSchema>;

export function CreateProjectForm({ closeModal }: { closeModal: (projectId?: string) => void }) {
	const form = useForm<ProjectFormValues>({
		defaultValues: { description: "", name: "" },
		resolver: zodResolver(projectSchema),
	});

	const onSubmit = async (values: ProjectFormValues) => {
		try {
			log.info("[CreateProjectForm] Submitting project", {
				hasDescription: !!values.description,
				name: values.name,
			});
			const { id: projectId } = await createProject(values);
			log.info("[CreateProjectForm] Project created successfully", { projectId });
			closeModal(projectId);
		} catch (error) {
			log.error("[CreateProjectForm] Failed to create project", error);
			toast.error("An error occurred while creating the project.");
			closeModal();
		}
	};

	return (
		<AppCard className="mx-auto w-full max-w-2xl">
			<AppCardContent className="p-6">
				<Form {...form}>
					<form
						className="space-y-6"
						data-testid="create-project-form"
						onSubmit={form.handleSubmit(onSubmit)}
					>
						<FormField
							control={form.control}
							name="name"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Name *</FormLabel>
									<FormControl>
										<AppInput
											{...field}
											className="w-full"
											data-testid="create-project-name-input"
											placeholder="Project Name"
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="description"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Description</FormLabel>
									<FormControl>
										<AppTextarea
											{...field}
											className="min-h-[100px] w-full"
											data-testid="create-project-description-textarea"
											placeholder="Project Description"
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<div className="flex gap-4">
							<button
								className="flex-1 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
								data-testid="cancel-button"
								onClick={() => {
									closeModal();
								}}
								type="button"
							>
								Cancel
							</button>
							<SubmitButton
								className="flex-1"
								data-testid="create-project-submit-button"
								disabled={!form.formState.isValid}
								isLoading={form.formState.isSubmitting}
							>
								Create Project
							</SubmitButton>
						</div>
					</form>
				</Form>
			</AppCardContent>
		</AppCard>
	);
}
