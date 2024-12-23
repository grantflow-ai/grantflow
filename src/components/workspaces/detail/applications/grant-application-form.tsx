"use client";
import { getOtp } from "@/actions/api";
import { SubmitButton } from "@/components/submit-button";
import { ApplicationDetailsForm } from "@/components/workspaces/detail/applications/application-details-form";
import { KnowledgeBaseForm } from "@/components/workspaces/detail/applications/knowledge-base-form";
import { ResearchAimForm } from "@/components/workspaces/detail/applications/research-aim-form";
import {
	grantApplicationFormSchema,
	GrantApplicationFormValues,
} from "@/components/workspaces/detail/applications/schema";
import { PagePath } from "@/enums";
import { ApplicationId, CreateApplicationRequestBody, GrantCfp } from "@/types/api-types";
import { getClient } from "@/utils/api-client";
import { logError } from "@/utils/logging";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "gen/ui/button";
import { Form } from "gen/ui/form";
import { TooltipProvider } from "gen/ui/tooltip";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useFieldArray, useForm, UseFormReturn } from "react-hook-form";
import { toast } from "sonner";

const DEMO_TITLE = "Developing AI tailored immunocytokines to target melanoma brain metastases";

export function GrantApplicationForm({ cfps, workspaceId }: { cfps: GrantCfp[]; workspaceId: string }) {
	const router = useRouter();
	const [loading, setLoading] = useState(false);

	const onSubmit = async (values: GrantApplicationFormValues) => {
		setLoading(true);
		try {
			const applicationId = await handleCreateApplication({
				formValues: values,
				workspaceId,
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
		defaultValues: {
			application_files: [],
			cfp_id: "",
			research_aims: [],
			title: "",
		},
		resolver: zodResolver(grantApplicationFormSchema),
	});

	const { append, fields, remove } = useFieldArray({
		control: form.control,
		name: "research_aims",
	});

	const watchTitle = form.watch("title");
	useEffect(() => {
		if (watchTitle === DEMO_TITLE) {
			setDemoData(form);
		}
	}, [watchTitle, form]);

	return (
		<TooltipProvider>
			<Form {...form}>
				<form
					aria-label="Grant Application Form"
					className="mx-auto w-full max-w-7xl"
					data-testid="grant-application-form"
					onSubmit={form.handleSubmit(onSubmit)}
				>
					<h1 className="mb-8 text-3xl font-bold">Grant Application</h1>
					<div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
						<div className="space-y-8 lg:col-span-2">
							<ApplicationDetailsForm cfps={cfps} form={form} loading={loading} />
							<section className="space-y-6">
								<h2 className="mb-4 text-xl font-semibold">Research Aims</h2>
								<div>
									{fields.map((field, index) => (
										<ResearchAimForm
											form={form}
											index={index}
											key={index.toString() + field.id}
											loading={loading}
											onClickRemove={() => {
												remove(index);
											}}
										/>
									))}
								</div>
								<Button
									className="w-full"
									data-testid="add-research-aim-button"
									onClick={() => {
										append({
											aim_number: form.getValues().research_aims.length + 1,
											description: "",
											requires_clinical_trials: false,
											research_tasks: [
												{
													description: "",
													task_number: 1,
													title: "",
												},
											],
											title: "",
										});
									}}
									type="button"
									variant="outline"
								>
									<Plus className="mr-2 h-4 w-4" />
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
					<div className="mt-8 flex justify-end border-t pt-6">
						<SubmitButton
							aria-disabled={!form.formState.isValid || form.formState.isSubmitting}
							aria-label={form.formState.isSubmitting ? "Saving changes..." : "Save changes"}
							className="w-full sm:w-auto"
							data-testid="grant-application-form-submit"
							disabled={!form.formState.isValid || loading}
							isLoading={loading}
						>
							Save and Continue
						</SubmitButton>
					</div>
				</form>
			</Form>
		</TooltipProvider>
	);
}

async function handleCreateApplication({
	formValues,
	workspaceId,
}: {
	formValues: GrantApplicationFormValues;
	workspaceId: string;
}) {
	const formData = new FormData();
	for (const file of formValues.application_files) {
		formData.append(file.name, file as Blob);
	}

	const data = {
		cfp_id: formValues.cfp_id,
		innovation: formValues.innovation ?? null,
		research_aims: formValues.research_aims.map(
			({ description: aimDescription, preliminary_results, research_tasks, risks_and_alternatives, ...aim }) => ({
				...aim,
				description: aimDescription ?? null,
				preliminary_results: preliminary_results ?? null,
				research_tasks: research_tasks.map(({ description: taskDescription, ...task }) => ({
					...task,
					description: taskDescription ?? null,
				})),
				risks_and_alternatives: risks_and_alternatives ?? null,
			}),
		),
		significance: formValues.significance ?? null,
		title: formValues.title,
	} satisfies CreateApplicationRequestBody;

	formData.append("data", JSON.stringify(data));

	const { otp } = await getOtp();
	const { id } = await getClient()
		.post(`workspaces/${workspaceId}/applications?otp=${otp}`, {
			body: formData,
			mode: "no-cors",
		})
		.json<ApplicationId>();
	return id;
}

function setDemoData(form: UseFormReturn<GrantApplicationFormValues>) {
	form.setValue("research_aims", [
		{
			aim_number: 1,
			description:
				"The purpose of this aim is to use our advanced single cell technologies to study the immune activity in the BM TME and identify targets for antibodies and cytokines to modulate the immune activity in the brain to more anti-tumor activity.",
			requires_clinical_trials: false,
			research_tasks: [
				{
					description:
						"Research immune temporal changes using Zman-seq in the BM TME using our previous research adapting it from glioma to BM.",
					task_number: 1,
					title: "Temporal understanding of immune activity in BM TME",
				},
				{
					description: "Use PIC-seq to measure immune cell interaction in the BM TME.",
					task_number: 2,
					title: "Immune cell-cell interaction in the BM TME",
				},
				{
					description: "Use stereo-seq to study spatial distribution of immune cells in the BM TME.",
					task_number: 3,
					title: "Immune spatial distribution in the BM TME",
				},
			],
			title: "Developing BM TME models with holistic, multimodal AI-driven analysis",
		},
		{
			aim_number: 2,
			description:
				"The purpose of this aim is to use our advanced single cell technologies to study the immune activity in the BM TME and identify targets for antibodies and cytokines to modulate the immune activity in the brain to more anti-tumor activity.",
			requires_clinical_trials: false,
			research_tasks: [
				{
					description:
						"Use our in-house cytokine library to screen for cytokines that modulate immune activity in the BM TME.",
					task_number: 1,
					title: "Screening of cytokines in BM TME",
				},
				{
					description: "Use in-vitro models to validate the cytokines identified in task 1.",
					task_number: 2,
					title: "In-vitro validation of cytokines",
				},
				{
					description:
						"Single-cell analysis using in-vitro and in vivo functional screening system on myeloid, NK and T cell activity for trans-acting MiTEsUse",
					task_number: 3,
					title: "In-vivo validation of cytokines",
				},
			],
			title: "Preclinical screening of cytokines in orthotopic immunocompetent BM models",
		},
		{
			aim_number: 3,
			description:
				"The purpose of this aim is to use our advanced single cell technologies to study the immune activity in the BM TME and identify targets for antibodies and cytokines to modulate the immune activity in the brain to more anti-tumor activity.",
			requires_clinical_trials: false,
			research_tasks: [
				{
					description:
						"We will develop the optimal structures for the fusion proteins of the top 3-5 mAb-cytokine combinations identified in Aim 2, using advanced techniques in protein design. The design process will include the selection of the most suitable peptide linkers, blocking moieties, TAM-specific cleavage sites and the computational optimization of protein structure and stability.",
					task_number: 1,
					title: "Design fusion proteins and cleavage site",
				},
				{
					description:
						"We will manufacture the 3-5 mAb-cytokine fusion proteins. The protein synthesis will be done by a contract research organization (CRO) selected based on our experience with leading CROs based on quality and punctual production. The production will include the selection of stable molecules with high protein expression and no aggregation.",
					task_number: 2,
					title: "Produce fusion proteins",
				},
				{
					description:
						"We will confirm the binding via SPR, ELISA, cell-based binding and reporter assays.We will validate immunocytokines' impact on interactions between myeloid and lymphoid cell activity using in-vitro assays of co-cultured huMDMs, NK or T cells. To assess the efficacy of the fusion proteins in inducing cytotoxic NK and T cell activity, assays of co-cultured huMDMs, NK, or T cells and tumor cells will be treated with the various mAb-cytokine chimeras.",
					task_number: 3,
					title: "In-vitro validation of immunocytokines",
				},
			],
			title: "Design of tumor-targeting immunocytokines",
		},
	]);
}
