import type { FormData } from "../types";

interface KeywordsStepProps {
	formData: FormData;
	setFormData: (data: FormData) => void;
}

export function KeywordsStep({ formData, setFormData }: KeywordsStepProps) {
	return (
		<div className="space-y-6" data-testid="keywords-step">
			<div data-testid="keywords-step-header">
				<h3 className="text-2xl font-semibold text-gray-900" data-testid="keywords-step-title">
					Keywords
				</h3>
				<p className="mt-2 text-gray-600" data-testid="keywords-step-description">
					Enter one or more keywords that describe the scientific topics or methods your next projects will
					target, e.g., CRISPR, neuro-oncology, single-cell RNA-seq. Add as many as you like. We&apos;ll
					search NIH Funding Opportunity Announcements (FOAs) whose titles or descriptions contain any of
					these terms.
				</p>
			</div>

			<div data-testid="keywords-input-section">
				<label
					className="block text-sm font-medium text-gray-700"
					data-testid="keywords-input-label"
					htmlFor="keywords"
				>
					Scientific Topics & Methods
				</label>
				<textarea
					className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
					data-testid="keywords-textarea"
					id="keywords"
					onChange={(e) => {
						setFormData({ ...formData, keywords: e.target.value });
					}}
					placeholder="CRISPR, Alzheimer's disease, proteomics, high-throughput screening"
					rows={5}
					value={formData.keywords}
				/>
			</div>
		</div>
	);
}
