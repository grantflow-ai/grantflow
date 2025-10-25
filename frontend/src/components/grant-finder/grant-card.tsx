import { Building2, Calendar, DollarSign, ExternalLink, FileText } from "lucide-react";
import { AppCard, AppCardContent } from "@/components/app/app-card";
import { AppButton } from "@/components/app/buttons/app-button";
import type { Grant } from "./types";

interface GrantCardProps {
	grant: Grant;
}

const formatDeadline = (deadline: string | undefined) => {
	if (!deadline) return "Ongoing";
	const date = new Date(deadline);
	const today = new Date();

	// ~keep Set both dates to start of day in UTC to avoid timezone issues
	const dateUTC = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
	const todayUTC = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
	const daysUntil = Math.round((dateUTC.getTime() - todayUTC.getTime()) / (1000 * 60 * 60 * 24));

	if (daysUntil < 0) return "Expired";
	if (daysUntil === 0) return "Today";
	if (daysUntil === 1) return "Tomorrow";
	if (daysUntil <= 7) return `${daysUntil} days`;
	if (daysUntil <= 30) return `${Math.ceil(daysUntil / 7)} weeks`;
	return date.toLocaleDateString("en-US", { day: "numeric", month: "short", timeZone: "UTC", year: "numeric" });
};

const formatAmount = (min?: number, max?: number) => {
	if (!(min || max)) return "Amount varies";
	if (min && !max) return `$${min.toLocaleString()}+`;
	if (!min && max) return `Up to $${max.toLocaleString()}`;
	return `$${min?.toLocaleString()} - $${max?.toLocaleString()}`;
};

const getDeadlineColor = (deadline: string | undefined) => {
	if (!deadline) return "text-gray-600";
	const date = new Date(deadline);
	const today = new Date();

	// ~keep Set both dates to start of day in UTC to avoid timezone issues
	const dateUTC = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
	const todayUTC = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
	const daysUntil = Math.round((dateUTC.getTime() - todayUTC.getTime()) / (1000 * 60 * 60 * 24));

	if (daysUntil < 0) return "text-gray-400";
	if (daysUntil <= 7) return "text-red-600";
	if (daysUntil <= 30) return "text-orange-600";
	return "text-green-600";
};

export function GrantCard({ grant }: GrantCardProps) {
	return (
		<AppCard className="transition-shadow hover:shadow-md" data-testid="grant-card">
			<AppCardContent className="space-y-4">
				<div className="flex items-start justify-between">
					<div className="flex-1">
						<div className="mb-2 flex flex-wrap items-center gap-2" data-testid="grant-badges">
							{grant.activity_code && (
								<span
									className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary"
									data-testid="activity-code-badge"
								>
									{grant.activity_code}
								</span>
							)}
						</div>

						<h3 className="mb-2 text-lg font-semibold text-stone-900" data-testid="grant-title">
							{grant.title || "Untitled Grant Opportunity"}
						</h3>

						<div
							className="mb-3 flex items-center gap-1 text-sm text-muted-foreground-dark"
							data-testid="grant-organization"
						>
							<Building2 className="h-4 w-4" />
							<span>{grant.organization || "NIH"}</span>
						</div>
					</div>
				</div>

				{grant.description && (
					<p className="line-clamp-3 text-sm text-muted-foreground-dark" data-testid="grant-description">
						{grant.description}
					</p>
				)}

				<div className="grid gap-3 sm:grid-cols-2" data-testid="grant-details">
					<div className="flex items-center gap-2" data-testid="grant-deadline">
						<Calendar className="h-4 w-4 text-muted-foreground" />
						<div className="text-sm">
							<div className="text-muted-foreground-dark">Deadline</div>
							<div className={`font-medium ${getDeadlineColor(grant.deadline ?? undefined)}`}>
								{formatDeadline(grant.deadline ?? undefined)}
							</div>
						</div>
					</div>

					<div className="flex items-center gap-2" data-testid="grant-funding">
						<DollarSign className="h-4 w-4 text-muted-foreground" />
						<div className="text-sm">
							<div className="text-muted-foreground-dark">Funding</div>
							<div className="font-medium text-stone-900">
								{formatAmount(grant.amount_min, grant.amount_max)}
							</div>
						</div>
					</div>
				</div>

				<div className="flex items-center justify-between border-t pt-4" data-testid="grant-footer">
					<div className="flex items-center gap-4">
						{grant.eligibility && (
							<div
								className="flex items-center gap-1 text-xs text-muted-foreground-dark"
								data-testid="grant-eligibility"
							>
								<FileText className="h-3 w-3" />
								<span>Eligibility criteria apply</span>
							</div>
						)}
					</div>

					{grant.url && (
						<a
							data-testid="grant-view-details-link"
							href={grant.url}
							rel="noopener noreferrer"
							target="_blank"
						>
							<AppButton rightIcon={<ExternalLink />} size="md" variant="secondary">
								View Details
							</AppButton>
						</a>
					)}
				</div>
			</AppCardContent>
		</AppCard>
	);
}
