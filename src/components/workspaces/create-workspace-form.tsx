import { createWorkspace } from "@/actions/workspace";
import { SubmitButton } from "@/components/submit-button";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel } from "gen/ui/form";
import { Input } from "gen/ui/input";
import { Textarea } from "gen/ui/textarea";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Card, CardContent } from "gen/ui/card";

const workspaceSchema = z.object({
	name: z.string().min(3, { message: "Workspace name must be at least 3 characters long" }),
	description: z.string(),
});

type WorkspaceFormValues = z.infer<typeof workspaceSchema>;

export function CreateWorkspaceForm({ closeModal }: { closeModal: () => void }) {
	const form = useForm<WorkspaceFormValues>({
		resolver: zodResolver(workspaceSchema),
		defaultValues: { name: "", description: "" },
	});

	const onSubmit = async (values: WorkspaceFormValues) => {
		const error = await createWorkspace(values);
		if (error) {
			toast.error("An error occurred while creating the workspace.");
		} else {
			toast.success("Workspace created successfully.");
		}
		closeModal();
	};

	return (
		<Card className="w-full max-w-2xl mx-auto">
			<CardContent className="p-6">
				<Form {...form}>
					<form
						onSubmit={form.handleSubmit(onSubmit)}
						className="space-y-6"
						data-testid="create-workspace-form"
					>
						<FormField
							name="name"
							control={form.control}
							render={({ field }) => (
								<FormItem>
									<FormLabel>Name *</FormLabel>
									<FormControl>
										<Input
											{...field}
											data-testid="create-workspace-name-input"
											placeholder="Workspace Name"
											className="w-full"
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
									<FormLabel>Description</FormLabel>
									<FormControl>
										<Textarea
											{...field}
											data-testid="create-workspace-description-textarea"
											placeholder="Workspace Description"
											className="w-full min-h-[100px]"
										/>
									</FormControl>
								</FormItem>
							)}
						/>
						<SubmitButton
							className="w-full"
							data-testid="create-workspace-submit-button"
							disabled={!form.formState.isValid}
							isLoading={form.formState.isSubmitting}
						>
							Create Workspace
						</SubmitButton>
					</form>
				</Form>
			</CardContent>
		</Card>
	);
}
