import { createWorkspace } from "@/actions/workspace";
import { FormButton } from "@/components/form-button";
import type { Localisation } from "@/i18n";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel } from "gen/ui/form";
import { Input } from "gen/ui/input";
import { Textarea } from "gen/ui/textarea";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

const workspaceSchema = z.object({
	name: z.string().min(3, { message: "Workspace name must be at least 3 characters long" }),
	description: z.string(),
	logoUrl: z.string(),
});

type WorkspaceFormValues = z.infer<typeof workspaceSchema>;

export function CreateWorkspaceForm({ locales, closeModal }: { locales: Localisation; closeModal: () => void }) {
	const form = useForm<WorkspaceFormValues>({
		resolver: zodResolver(workspaceSchema),
		defaultValues: { name: "", description: "", logoUrl: "" },
	});

	const onSubmit = async (values: WorkspaceFormValues) => {
		const error = await createWorkspace(values);
		if (error) {
			toast.error(locales.workspaceListView.workspaceCreatedError);
		} else {
			toast.success(locales.workspaceListView.workspaceCreatedSuccess);
		}
		closeModal();
	};

	return (
		<Form {...form}>
			<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" data-testid="create-workspace-form">
				<FormField
					name="name"
					control={form.control}
					render={({ field }) => (
						<FormItem>
							<FormLabel>{locales.workspaceListView.workspaceNameLabel}</FormLabel>
							<FormControl>
								<Input
									{...field}
									data-testid="create-workspace-name-input"
									placeholder={locales.workspaceListView.workspaceNamePlaceholder}
								/>
							</FormControl>
						</FormItem>
					)}
				/>
				<FormField
					name="description"
					control={form.control}
					render={({ field }) => (
						<FormItem>
							<FormLabel>{locales.workspaceListView.workspaceNameLabel}</FormLabel>
							<FormControl>
								<Textarea
									{...field}
									data-testid="create-workspace-description-textarea"
									placeholder={locales.workspaceListView.workspaceNamePlaceholder}
								/>
							</FormControl>
						</FormItem>
					)}
				/>
				<FormButton
					className="w-full"
					data-testid="create-workspace-submit-button"
					disabled={!form.formState.isValid}
					isLoading={form.formState.isSubmitting}
				>
					{locales.workspaceListView.createWorkspace}
				</FormButton>
			</form>
		</Form>
	);
}
