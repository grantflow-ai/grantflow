import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { createProject } from "@/actions/project";
import { AppCard, AppCardContent, AppInput, AppTextarea } from "@/components/app";
import { SubmitButton } from "@/components/app/buttons/submit-button";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
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
			const { id: projectId } = await createProject(values);
			closeModal(projectId);
		} catch (error) {
			log.error("createProject", error);
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
								</FormItem>
							)}
						/>
						<SubmitButton
							className="w-full"
							data-testid="create-project-submit-button"
							disabled={!form.formState.isValid}
							isLoading={form.formState.isSubmitting}
						>
							Create Project
						</SubmitButton>
					</form>
				</Form>
			</AppCardContent>
		</AppCard>
	);
}
