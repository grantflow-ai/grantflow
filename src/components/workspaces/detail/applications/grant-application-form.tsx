"use client";
import { useState } from "react";
import { TooltipProvider } from "gen/ui/tooltip";
import { Form } from "gen/ui/form";
import { Button } from "gen/ui/button";
import { Plus } from "lucide-react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { SubmitButton } from "@/components/submit-button";
import { useRouter } from "next/navigation";
import { PagePath } from "@/enums";
import { getOtp } from "@/actions/api";
import { logError } from "@/utils/logging";
import {
	grantApplicationFormSchema,
	GrantApplicationFormValues,
} from "@/components/workspaces/detail/applications/schema";
import { KnowledgeBaseForm } from "@/components/workspaces/detail/applications/knowledge-base-form";
import { ApplicationDetailsForm } from "@/components/workspaces/detail/applications/application-details-form";
import { ApplicationId, CreateApplicationRequestBody, GrantCfp } from "@/types/api-types";
import { getClient } from "@/utils/api-client";
import { ResearchAimForm } from "@/components/workspaces/detail/applications/research-aim-form";

async function handleCreateApplication({
	workspaceId,
	formValues,
}: {
	workspaceId: string;
	formValues: GrantApplicationFormValues;
}) {
	const formData = new FormData();
	for (const file of formValues.application_files) {
		formData.append(file.name, file as Blob);
	}

	const data = {
		title: formValues.title,
		significance: formValues.significance ?? null,
		innovation: formValues.innovation ?? null,
		cfp_id: formValues.cfp_id,
		research_aims: formValues.research_aims.map(
			({ description: aimDescription, preliminary_results, risks_and_alternatives, research_tasks, ...aim }) => ({
				...aim,
				description: aimDescription ?? null,
				preliminary_results: preliminary_results ?? null,
				risks_and_alternatives: risks_and_alternatives ?? null,
				research_tasks: research_tasks.map(({ description: taskDescription, ...task }) => ({
					...task,
					description: taskDescription ?? null,
				})),
			}),
		),
	} satisfies CreateApplicationRequestBody;

	formData.append("data", JSON.stringify(data));

	const { otp } = await getOtp();
	const { id } = await getClient()
		.post(`workspaces/${workspaceId}/applications?otp=${otp}`, { body: formData })
		.json<ApplicationId>();
	return id;
}

export function GrantApplicationForm({ cfps, workspaceId }: { cfps: GrantCfp[]; workspaceId: string }) {
	const router = useRouter();
	const [loading, setLoading] = useState(false);

	const onSubmit = async (values: GrantApplicationFormValues) => {
		setLoading(true);
		try {
			const applicationId = await handleCreateApplication({
				workspaceId,
				formValues: values,
			});
			router.replace(
				PagePath.APPLICATION_DETAIL.replace(":workspaceId", workspaceId).replace(
					":applicationId",
					applicationId,
				),
			);
		} catch (error) {
			logError({ error, identifier: "handleCreateApplication" });
			toast.error("An error occurred creating the grant application.");
		} finally {
			setLoading(false);
		}
	};

	const form = useForm<GrantApplicationFormValues>({
		resolver: zodResolver(grantApplicationFormSchema),
		defaultValues: {
			application_files: [],
			cfp_id: "",
			title: "",
			research_aims: [],
		},
	});

	const { fields, append, remove } = useFieldArray({
		control: form.control,
		name: "research_aims",
	});

	return (
		<TooltipProvider>
			<Form {...form}>
				<form
					className="w-full max-w-7xl mx-auto"
					data-testid="grant-application-form"
					aria-label="Grant Application Form"
					onSubmit={form.handleSubmit(onSubmit)}
				>
					<h1 className="text-3xl font-bold mb-8">Grant Application</h1>
					<div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
						<div className="lg:col-span-2 space-y-8">
							<ApplicationDetailsForm form={form} cfps={cfps} loading={loading} />
							<section className="space-y-6">
								<h2 className="text-xl font-semibold mb-4">Research Aims</h2>
								<div>
									{fields.map((field, index) => (
										<ResearchAimForm
											key={index.toString() + field.id}
											form={form}
											index={index}
											onClickRemove={() => {
												remove(index);
											}}
											loading={loading}
										/>
									))}
								</div>
								<Button
									type="button"
									variant="outline"
									onClick={() => {
										append({
											title: "",
											aim_number: form.getValues().research_aims.length + 1,
											description: "",
											requires_clinical_trials: false,
											research_tasks: [
												{
													title: "",
													description: "",
													task_number: 1,
												},
											],
										});
									}}
									className="w-full"
									data-testid="add-research-aim-button"
								>
									<Plus className="h-4 w-4 mr-2" />
									Add Research Aim
								</Button>
							</section>
						</div>
						<div className="lg:col-span-1">
							<div className="sticky top-4">
								<KnowledgeBaseForm form={form} />
							</div>
						</div>
					</div>
					<div className="mt-8 pt-6 border-t flex justify-end">
						<SubmitButton
							disabled={!form.formState.isValid || loading}
							isLoading={loading}
							data-testid="grant-application-form-submit"
							aria-disabled={!form.formState.isValid || form.formState.isSubmitting}
							aria-label={form.formState.isSubmitting ? "Saving changes..." : "Save changes"}
							className="w-full sm:w-auto"
						>
							Save and Continue
						</SubmitButton>
					</div>
				</form>
			</Form>
		</TooltipProvider>
	);
}
