"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { createPredefinedTemplate, updatePredefinedTemplate } from "@/actions/predefined-templates";
import { DeletePredefinedTemplateButton } from "@/components/admin/predefined-templates/delete-template-button";
import {
	createPredefinedTemplateSection,
	PredefinedTemplateSectionsEditor,
} from "@/components/admin/predefined-templates/sections-editor";
import { AppTextarea } from "@/components/app/fields/app-textarea";
import InputField from "@/components/app/fields/input-field";
import { WizardLeftPane } from "@/components/organizations/project/applications/wizard/wizard-left-pane";
import { WizardRightPane } from "@/components/organizations/project/applications/wizard/wizard-right-pane";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { API } from "@/types/api-types";
import type { GrantSection } from "@/types/grant-sections";
import { log } from "@/utils/logger/client";
import { routes } from "@/utils/navigation";

const GRANT_TYPES: API.CreateGrantingInstitutionPredefinedTemplate.RequestBody["grant_type"][] = [
	"RESEARCH",
	"TRANSLATIONAL",
];

const validateName = (name: string): null | string => {
	const trimmedName = name.trim();
	if (!trimmedName) return "Template name is required";
	if (trimmedName.length < 2) return "Template name must be at least 2 characters";
	if (trimmedName.length > 255) return "Template name must not exceed 255 characters";
	return null;
};

const validateActivityCode = (code: string): null | string => {
	if (code && code.length > 50) return "Activity code must not exceed 50 characters";
	return null;
};

interface PersistTemplateArgs {
	initialTemplate?: API.GetGrantingInstitutionPredefinedTemplate.Http200.ResponseBody;
	mode: "create" | "edit";
	requestBody: API.UpdateGrantingInstitutionPredefinedTemplate.RequestBody;
	router: ReturnType<typeof useRouter>;
}

interface TemplateFormState {
	activity_code: string;
	description: string;
	grant_type: API.CreateGrantingInstitutionPredefinedTemplate.RequestBody["grant_type"];
	granting_institution_id: string;
	guideline_source: string;
	guideline_version: string;
	name: string;
}

export const PREDEFINED_TEMPLATE_FORM_MODE = {
	CREATE: "create",
	EDIT: "edit",
} as const;

export type PredefinedTemplateFormMode =
	(typeof PREDEFINED_TEMPLATE_FORM_MODE)[keyof typeof PREDEFINED_TEMPLATE_FORM_MODE];

interface PredefinedTemplateFormProps {
	initialTemplate?: API.GetGrantingInstitutionPredefinedTemplate.Http200.ResponseBody;
	institutions: API.ListGrantingInstitutions.Http200.ResponseBody;
	mode: PredefinedTemplateFormMode;
}

interface TemplateMetadataPanelProps {
	formState: TemplateFormState;
	handleChange: (field: keyof TemplateFormState, value: string) => void;
	institutions: API.ListGrantingInstitutions.Http200.ResponseBody;
	isEditable: boolean;
	selectedInstitution?: API.ListGrantingInstitutions.Http200.ResponseBody[number];
}

export function PredefinedTemplateForm({ initialTemplate, institutions, mode }: PredefinedTemplateFormProps) {
	const router = useRouter();
	const [isPending, startTransition] = useTransition();
	const defaultInstitutionId = institutions[0]?.id ?? "";

	const [formState, setFormState] = useState<TemplateFormState>({
		activity_code: initialTemplate?.activity_code ?? "",
		description: initialTemplate?.description ?? "",
		grant_type: initialTemplate?.grant_type ?? "RESEARCH",
		// API type for granting_institution is incomplete - it should have id property
		granting_institution_id:
			(initialTemplate?.granting_institution as { id?: string } | undefined)?.id ?? defaultInstitutionId,
		guideline_source: initialTemplate?.guideline_source ?? "",
		guideline_version: initialTemplate?.guideline_version ?? "",
		name: initialTemplate?.name ?? "",
	});

	const initialSections =
		initialTemplate && initialTemplate.grant_sections.length > 0
			? initialTemplate.grant_sections
			: [createPredefinedTemplateSection()];
	const [sections, setSections] = useState<GrantSection[]>(initialSections);

	const isEditable = institutions.length > 0;

	const handleChange = (field: keyof TemplateFormState, value: string) => {
		setFormState((prev) => ({ ...prev, [field]: value }));
	};

	const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();

		if (!validateTemplateForm(formState, sections)) {
			return;
		}

		const requestBody: API.UpdateGrantingInstitutionPredefinedTemplate.RequestBody = {
			...formState,
			grant_sections: sections.map((section, index) => ({
				...section,
				order: index,
			})),
		};

		startTransition(() => {
			void persistTemplate({ initialTemplate, mode, requestBody, router });
		});
	};

	const selectedInstitution = useMemo(
		() => institutions.find((institution) => institution.id === formState.granting_institution_id),
		[formState.granting_institution_id, institutions],
	);

	return (
		<form className="flex flex-col gap-6" data-testid="predefined-template-form" onSubmit={handleSubmit}>
			<div className="grid gap-6 lg:grid-cols-[360px_1fr]">
				<TemplateMetadataPanel
					formState={formState}
					handleChange={handleChange}
					institutions={institutions}
					isEditable={isEditable}
					selectedInstitution={selectedInstitution}
				/>
				<WizardRightPane padding="p-6">
					<PredefinedTemplateSectionsEditor onChange={setSections} sections={sections} />
				</WizardRightPane>
			</div>
			<div className="flex items-center justify-between">
				{mode === PREDEFINED_TEMPLATE_FORM_MODE.EDIT && initialTemplate ? (
					<DeletePredefinedTemplateButton templateId={initialTemplate.id} />
				) : (
					<span />
				)}
				<Button
					className="min-w-[120px]"
					data-testid="predefined-template-save"
					disabled={isPending || !isEditable}
					type="submit"
				>
					{(() => {
						if (isPending) return "Saving...";
						return mode === PREDEFINED_TEMPLATE_FORM_MODE.CREATE ? "Create template" : "Save changes";
					})()}
				</Button>
			</div>
		</form>
	);
}

async function persistTemplate({ initialTemplate, mode, requestBody, router }: PersistTemplateArgs) {
	try {
		if (mode === PREDEFINED_TEMPLATE_FORM_MODE.CREATE) {
			const created = await createPredefinedTemplate(
				requestBody as API.CreateGrantingInstitutionPredefinedTemplate.RequestBody,
			);
			toast.success("Predefined template created");
			router.push(routes.admin.predefinedTemplates.detail(created.id));
			return;
		}

		if (!initialTemplate) {
			throw new Error("Template context missing");
		}

		await updatePredefinedTemplate(initialTemplate.id, requestBody);
		toast.success("Template updated");
		router.refresh();
	} catch (error) {
		log.error("Failed to persist predefined template", { error, mode, templateId: initialTemplate?.id });
		toast.error("Failed to save predefined template");
	}
}

function TemplateMetadataPanel({
	formState,
	handleChange,
	institutions,
	isEditable,
	selectedInstitution,
}: TemplateMetadataPanelProps) {
	return (
		<WizardLeftPane>
			<Card>
				<CardContent className="space-y-4 pt-6">
					<InputField
						label="Template name"
						onChange={(event) => {
							handleChange("name", event.target.value);
						}}
						placeholder="NIH R21 Clinical Readiness"
						testId="template-name-input"
						value={formState.name}
					/>
					<div className="space-y-2">
						<Label>Grant type</Label>
						<Select
							onValueChange={(value) => {
								handleChange("grant_type", value);
							}}
							value={formState.grant_type}
						>
							<SelectTrigger data-testid="grant-type-select">
								<SelectValue placeholder="Select grant type" />
							</SelectTrigger>
							<SelectContent>
								{GRANT_TYPES.map((grantType) => (
									<SelectItem key={grantType} value={grantType}>
										{grantType}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					<div className="space-y-2">
						<Label>Granting institution</Label>
						<Select
							disabled={!isEditable}
							onValueChange={(value) => {
								handleChange("granting_institution_id", value);
							}}
							value={formState.granting_institution_id}
						>
							<SelectTrigger data-testid="granting-institution-select">
								<SelectValue placeholder="Select institution" />
							</SelectTrigger>
							<SelectContent>
								{institutions.map((institution) => (
									<SelectItem key={institution.id} value={institution.id}>
										{institution.full_name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					<InputField
						label="Activity code (optional)"
						onChange={(event) => {
							handleChange("activity_code", event.target.value.toUpperCase());
						}}
						placeholder="R21"
						testId="template-activity-code-input"
						value={formState.activity_code}
					/>
					<InputField
						label="Guideline source"
						onChange={(event) => {
							handleChange("guideline_source", event.target.value);
						}}
						placeholder="NIH Instruction Manual"
						testId="template-guideline-source-input"
						value={formState.guideline_source}
					/>
					<InputField
						label="Guideline version"
						onChange={(event) => {
							handleChange("guideline_version", event.target.value);
						}}
						placeholder="Forms-H"
						testId="template-guideline-version-input"
						value={formState.guideline_version}
					/>
					<div className="space-y-2">
						<Label>Description</Label>
						<AppTextarea
							data-testid="template-description-input"
							onChange={(event) => {
								handleChange("description", event.target.value);
							}}
							placeholder="Short summary of when to use this template"
							value={formState.description}
						/>
					</div>
				</CardContent>
			</Card>
			{selectedInstitution?.full_name && (
				<Card>
					<CardContent className="space-y-2 pt-6">
						<p className="text-sm text-muted-foreground">Linked institution</p>
						<p className="text-base font-medium">{selectedInstitution.full_name}</p>
						{selectedInstitution.abbreviation && (
							<p className="text-xs text-muted-foreground">{selectedInstitution.abbreviation}</p>
						)}
					</CardContent>
				</Card>
			)}
		</WizardLeftPane>
	);
}

function validateTemplateForm(formState: TemplateFormState, sections: GrantSection[]): boolean {
	const errors: string[] = [];

	const nameError = validateName(formState.name);
	if (nameError) errors.push(nameError);

	if (!formState.grant_type) errors.push("Grant type is required");
	if (!formState.granting_institution_id) errors.push("Granting institution is required");
	if (sections.length === 0) errors.push("At least one section is required");

	const codeError = validateActivityCode(formState.activity_code);
	if (codeError) errors.push(codeError);

	if (errors.length > 0) {
		toast.error(errors.join(". "));
		return false;
	}

	return true;
}
