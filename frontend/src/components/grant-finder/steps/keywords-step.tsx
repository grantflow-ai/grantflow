import type { FormData } from "@/components/grant-finder/types";

interface KeywordsStepProps {
	formData: FormData;
	setFormData: (data: FormData) => void;
}

export function KeywordsStep({ formData, setFormData }: KeywordsStepProps) {
	return (
		<div className="flex flex-col gap-6" data-testid="keywords-step">
			<div className="flex flex-col gap-2 w-[874px]" data-testid="keywords-step-header">
				<h3 className="font-cabin text-[28px] font-medium text-gray-600" data-testid="keywords-step-title">
					Keywords
				</h3>
				<p
					className=" text-base font-normal text-gray-600 font-sans leading-5"
					data-testid="keywords-step-description"
				>
					Enter one or more keywords that describe the scientific topics or methods your next projects will
					target, e.g., CRISPR, neuro-oncology, single-cell RNA-seq. Add as many as you like. We&apos;ll
					search NIH Funding Opportunity Announcements (FOAs) whose titles or descriptions contain any of
					these terms.
				</p>
			</div>

			<div>
				<label className="font-sans text-xs font-normal text-app-gray-400" htmlFor="keywords">
					Scientific Topics & Methods
				</label>
				<textarea
					className="resize-none border border-gray-100 bg-white px-3 py-2 rounded-sm w-full h-[231px] font-sans placeholder:font-sans placeholder:font-normal text-gray-400 placeholder:text-sm placeholder:text-gray-400 "
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
