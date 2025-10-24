import { MultiSelect } from "@/components/app/forms/multi-select";
import { type FormData, INSTITUTION_LOCATIONS } from "@/components/grant-finder/types";

interface InstitutionLocationStepProps {
	formData: FormData;
	setFormData: (data: FormData) => void;
}

export function InstitutionLocationStep({ formData, setFormData }: InstitutionLocationStepProps) {
	return (
		<div className="flex flex-col gap-6" data-testid="institution-location-step">
			<div className="flex gap-2 flex-col h-[119px]" data-testid="institution-location-step-header">
				<h3
					className="font-cabin text-[28px] font-medium leading-loose text-app-black"
					data-testid="institution-location-step-title"
				>
					Institution Location
				</h3>
				<p
					className="text-base font-sans font-normal text-gray-600 leading-none"
					data-testid="institution-location-step-description"
				>
					Tell us where the grant will be administered
				</p>
			</div>

			<div className="w-full" data-testid="institution-location-select-section">
				<label className="font-sans text-xs font-normal text-app-gray-400" htmlFor="institution-location">
					Institution location
				</label>
				<MultiSelect
					data-testid="institution-location-multiselect"
					id="institution-location"
					onValueChange={(value) => {
						setFormData({ ...formData, institutionLocation: value });
					}}
					options={INSTITUTION_LOCATIONS}
					placeholder="U.S. institution (no foreign component)"
					value={formData.institutionLocation}
				/>
			</div>
		</div>
	);
}
