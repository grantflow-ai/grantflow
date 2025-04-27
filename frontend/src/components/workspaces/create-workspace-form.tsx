import { createWorkspace } from "@/actions/workspace";
import { SubmitButton } from "@/components/submit-button";
import { logError } from "@/utils/logging";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

const workspaceSchema = z.object({
	description: z.string(),
	name: z.string().min(3, { message: "Workspace name must be at least 3 characters long" }),
});

type WorkspaceFormValues = z.infer<typeof workspaceSchema>;

export function CreateWorkspaceForm({ closeModal }: { closeModal: (workspaceId?: string) => void }) {
	const form = useForm<WorkspaceFormValues>({
		defaultValues: { description: "", name: "" },
		resolver: zodResolver(workspaceSchema),
	});

	const onSubmit = async (values: WorkspaceFormValues) => {
		try {
			const { id: workspaceId } = await createWorkspace(values);
			closeModal(workspaceId);
		} catch (error) {
			logError({ error, identifier: "createWorkspace" });
			toast.error("An error occurred while creating the workspace.");
			closeModal();
		}
	};

	return (
		<Card className="mx-auto w-full max-w-2xl">
			<CardContent className="p-6">
				<Form {...form}>
					<form
						className="space-y-6"
						data-testid="create-workspace-form"
						onSubmit={form.handleSubmit(onSubmit)}
					>
						<FormField
							control={form.control}
							name="name"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Name *</FormLabel>
									<FormControl>
										<Input
											{...field}
											className="w-full"
											data-testid="create-workspace-name-input"
											placeholder="Workspace Name"
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
										<Textarea
											{...field}
											className="min-h-[100px] w-full"
											data-testid="create-workspace-description-textarea"
											placeholder="Workspace Description"
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
