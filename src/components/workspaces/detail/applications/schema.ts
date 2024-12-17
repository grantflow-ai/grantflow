import * as z from "zod";

export const MIN_TITLE_LENGTH = 10;

export const researchTaskSchema = z.object({
	id: z.string().optional(),
	task_number: z.number(),
	title: z
		.string()
		.min(MIN_TITLE_LENGTH, `Title must be at least ${MIN_TITLE_LENGTH} characters`)
		.max(255, "Title must not exceed 255 characters"),
	description: z.string().optional(),
});

export const researchAimSchema = z.object({
	id: z.string().optional(),
	aim_number: z.number(),
	title: z
		.string()
		.min(MIN_TITLE_LENGTH, `Title must be at least ${MIN_TITLE_LENGTH} characters`)
		.max(255, "Title must not exceed 255 characters"),
	description: z.string().optional(),
	requires_clinical_trials: z.boolean().default(false),
	research_tasks: z.array(researchTaskSchema).min(1, "At least one research task is required"),
});

export const grantApplicationFormSchema = z.object({
	application_files: z.array(z.custom<File>()),
	cfp_id: z.string().uuid(),
	title: z
		.string()
		.min(MIN_TITLE_LENGTH, `Title must be at least ${MIN_TITLE_LENGTH} characters`)
		.max(255, "Title must not exceed 255 characters"),
	significance: z.string().optional(),
	innovation: z.string().optional(),
	research_aims: z.array(researchAimSchema).min(1, "At least one research aim is required"),
});

export type GrantApplicationFormValues = z.infer<typeof grantApplicationFormSchema>;
