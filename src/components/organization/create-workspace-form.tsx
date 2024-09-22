import { createWorkspace } from "@/actions/workspace";
import { FormButton } from "@/components/form-button";
import type { Localisation } from "@/i18n";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "gen/ui/form";
import { Input } from "gen/ui/input";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

const workspaceSchema = z.object({
	name: z.string().min(3, { message: "Workspace name must be at least 3 characters long" }),
});

type WorkspaceFormValues = z.infer<typeof workspaceSchema>;

export function CreateWorkspaceForm({
	organizationId,
	locales,
	closeModal,
}: {
	organizationId: string;
	locales: Localisation;
	closeModal: () => void;
}) {
	const form = useForm<WorkspaceFormValues>({
		resolver: zodResolver(workspaceSchema),
		defaultValues: { name: "" },
	});

	const onSubmit = async (values: WorkspaceFormValues) => {
		try {
			await createWorkspace(organizationId, values.name);
			toast.success(locales.organizationView.workspaceCreatedSuccess);
		} catch {
			toast.error(locales.organizationView.workspaceCreatedError);
		} finally {
			closeModal();
		}
	};

	return (
		<Form {...form}>
			<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" data-testid="create-workspace-form">
				<FormField
					name="name"
					control={form.control}
					render={({ field }) => (
						<FormItem>
							<FormLabel>{locales.organizationView.workspaceNameLabel}</FormLabel>
							<FormControl>
								<Input
									{...field}
									data-testid="create-workspace-name-input"
									placeholder={locales.organizationView.workspaceNamePlaceholder}
								/>
							</FormControl>
							<FormMessage data-testid="create-workspace-name-error" />
						</FormItem>
					)}
				/>
				<FormButton
					className="w-full"
					data-testid="create-workspace-submit-button"
					isLoading={form.formState.isSubmitting}
				>
					{locales.organizationView.createWorkspace}
				</FormButton>
			</form>
		</Form>
	);
}
