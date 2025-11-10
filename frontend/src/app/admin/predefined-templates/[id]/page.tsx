import Link from "next/link";
import { getPredefinedTemplate } from "@/actions/predefined-templates";
import { DeletePredefinedTemplateButton } from "@/components/admin/predefined-templates/delete-template-button";
import { PreviewCard } from "@/components/organizations/project/applications/wizard/preview-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { GrantSection } from "@/types/grant-sections";
import { hasGenerationInstructions, hasLengthConstraint } from "@/types/grant-sections";
import { routes } from "@/utils/navigation";

interface PageProps {
	params: Promise<{ id: string }>;
}

const buildSectionTree = (sections: GrantSection[] | undefined) => {
	const sorted = [...(sections ?? [])].toSorted((a, b) => a.order - b.order);
	const children: Record<string, GrantSection[]> = {};
	sorted.forEach((section) => {
		if (section.parent_id === null) {
			return;
		}
		children[section.parent_id] = [...(children[section.parent_id] ?? []), section];
	});
	return { children, mains: sorted.filter((section) => section.parent_id === null) };
};

const describeLength = (section: GrantSection) => {
	if (hasLengthConstraint(section)) {
		return `${section.length_constraint.value} ${section.length_constraint.type}`;
	}
	return "Flexible length";
};

const SectionNode = ({
	childrenMap,
	level,
	section,
}: {
	childrenMap: Record<string, GrantSection[]>;
	level: number;
	section: GrantSection;
}) => {
	const children = childrenMap[section.id] ?? [];
	return (
		<div className={level > 0 ? "ml-6" : ""}>
			<PreviewCard className="mb-3">
				<div className="flex items-center justify-between">
					<div>
						<p className="text-base font-semibold">{section.title}</p>
						<p className="text-xs text-muted-foreground">{describeLength(section)}</p>
					</div>
					<p className="text-xs uppercase tracking-wide text-muted-foreground">Order {section.order + 1}</p>
				</div>
				{hasGenerationInstructions(section) && section.generation_instructions && (
					<p className="mt-2 text-sm text-muted-foreground">{section.generation_instructions}</p>
				)}
			</PreviewCard>
			{children.map((child) => (
				<SectionNode childrenMap={childrenMap} key={child.id} level={level + 1} section={child} />
			))}
		</div>
	);
};

export default async function PredefinedTemplateDetailPage({ params }: PageProps) {
	const { id } = await params;
	const template = await getPredefinedTemplate(id);
	const { children, mains } = buildSectionTree(template.grant_sections);
	// API type for granting_institution is incomplete - it should have full_name property
	const institutionName =
		(template.granting_institution as { full_name?: string } | undefined)?.full_name ?? "Unassigned";
	const sectionCount = template.grant_sections.length;

	return (
		<div className="container mx-auto space-y-6 py-10" data-testid="predefined-template-detail-page">
			<div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
				<div>
					<p className="text-sm text-muted-foreground">Predefined template</p>
					<h1 className="text-3xl font-bold">{template.name}</h1>
					<p className="text-sm text-muted-foreground">
						{template.activity_code ? `${template.activity_code} · ` : ""}
						{institutionName}
					</p>
				</div>
				<div className="flex gap-2">
					<Link href={routes.admin.predefinedTemplates.edit(template.id)}>
						<Button data-testid="predefined-template-edit-button" variant="outline">
							Edit
						</Button>
					</Link>
					<DeletePredefinedTemplateButton templateId={template.id} variant="destructive" />
				</div>
			</div>
			<div className="grid gap-4 md:grid-cols-3">
				<Card>
					<CardContent className="space-y-2 pt-6">
						<p className="text-sm text-muted-foreground">Grant type</p>
						<p className="text-base font-semibold">{template.grant_type}</p>
						{template.guideline_source && (
							<p className="text-xs text-muted-foreground">{template.guideline_source}</p>
						)}
						{template.guideline_version && (
							<p className="text-xs text-muted-foreground">Version {template.guideline_version}</p>
						)}
					</CardContent>
				</Card>
				<Card className="md:col-span-2">
					<CardContent className="space-y-2 pt-6">
						<p className="text-sm text-muted-foreground">Description</p>
						<p className="text-base">{template.description ?? "No description"}</p>
					</CardContent>
				</Card>
			</div>
			<div className="space-y-4">
				<div>
					<h2 className="text-xl font-semibold">Sections</h2>
					<p className="text-sm text-muted-foreground">{sectionCount} total sections</p>
				</div>
				{mains.length === 0 ? (
					<Card>
						<CardContent className="py-10 text-center text-sm text-muted-foreground">
							This template does not contain any sections yet.
						</CardContent>
					</Card>
				) : (
					mains.map((section) => (
						<SectionNode childrenMap={children} key={section.id} level={0} section={section} />
					))
				)}
			</div>
		</div>
	);
}
