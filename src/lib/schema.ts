import { z } from "zod";

export const MIN_LENGTH = 25;

export const MIN_TITLE_LENGTH = 10;

// newGrantApplicationForm

export const newGrantApplicationSchema = z
	.object({
		specificAimsFile: z.custom<File>().optional(),
		title: z.string().min(10, "Title must be at least 10 characters long"),
	})
	.and(
		z.union(
			[
				z.object({
					cfpFile: z.undefined(),
					cfpUrl: z.string().url("Invalid URL"),
				}),
				z.object({
					cfpFile: z.custom<File>(),
					cfpUrl: z.string().max(0),
				}),
			],
			{
				errorMap: () => ({
					message: "You must provide either a CFP URL, file, or both",
				}),
			},
		),
	);
export type NewGrantApplicationFormValues = z.infer<typeof newGrantApplicationSchema>;

// newGrantWizardForm

export const researchTaskSchema = z.object({
	description: z.string().optional(),
	id: z.string().optional(),
	task_number: z.number().optional(),
	title: z
		.string()
		.min(MIN_TITLE_LENGTH, `Title must be at least ${MIN_TITLE_LENGTH} characters`)
		.max(255, "Title must not exceed 255 characters"),
});

export const researchObjectiveSchema = z.object({
	description: z.string().optional(),
	id: z.string().optional(),
	tasks: z.array(researchTaskSchema).min(1, "At least one task is required"),
	title: z
		.string()
		.min(MIN_TITLE_LENGTH, `Title must be at least ${MIN_TITLE_LENGTH} characters`)
		.max(255, "Title must not exceed 255 characters"),
});

export const researchPlanSchema = z.object({
	objectives: z.array(
		researchObjectiveSchema.extend({
			tasks: z.array(researchTaskSchema),
		}),
	),
});

export const newGrantWizardForm = z.object({
	files: z.array(z.custom<File>()).min(1),
	researchPlan: researchPlanSchema,
});

export type NewGrantWizardFormValues = z.infer<typeof newGrantWizardForm>;
