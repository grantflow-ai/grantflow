import AppTextarea from "@/components/app/fields/textarea-field";
import type { FormData } from "@/components/grant-finder/types";

interface KeywordsStepProps {
	formData: FormData;
	setFormData: (data: FormData) => void;
}

export function KeywordsStep({ formData, setFormData }: KeywordsStepProps) {
	return (
		<div className="space-y-6" data-testid="keywords-step">
			<div data-testid="keywords-step-header">
				<h3
					className="font-heading text-2xl font-medium leading-loose text-stone-900"
					data-testid="keywords-step-title"
				>
					Keywords
				</h3>
				<p
					className="mt-2 text-muted-foreground-dark text-sm leading-none"
					data-testid="keywords-step-description"
				>
					Enter one or more keywords that describe the scientific topics or methods your next projects will
					target, e.g., CRISPR, neuro-oncology, single-cell RNA-seq. Add as many as you like. We&apos;ll
					search NIH Funding Opportunity Announcements (FOAs) whose titles or descriptions contain any of
					these terms.
				</p>
			</div>

			<AppTextarea
				label="Scientific Topics & Methods"
				onChange={(e) => {
					setFormData({ ...formData, keywords: e.target.value });
				}}
				placeholder="CRISPR, Alzheimer's disease, proteomics, high-throughput screening"
				rows={5}
				testId="keywords-textarea"
				value={formData.keywords}
				variant="field"
			/>
		</div>
	);
}
