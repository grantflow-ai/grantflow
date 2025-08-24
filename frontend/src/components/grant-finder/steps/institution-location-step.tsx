import { type FormData, INSTITUTION_LOCATIONS } from "../types";

interface InstitutionLocationStepProps {
	formData: FormData;
	setFormData: (data: FormData) => void;
}

export function InstitutionLocationStep({ formData, setFormData }: InstitutionLocationStepProps) {
	return (
		<div className="space-y-6" data-testid="institution-location-step">
			<div data-testid="institution-location-step-header">
				<h3 className="text-2xl font-semibold text-gray-900" data-testid="institution-location-step-title">
					Institution Location
				</h3>
				<p className="mt-2 text-gray-600" data-testid="institution-location-step-description">
					Tell us where the grant will be administered
				</p>
			</div>

			<div className="max-w-lg" data-testid="institution-location-select-section">
				<label
					className="block text-sm font-medium text-gray-700"
					data-testid="institution-location-select-label"
					htmlFor="institution"
				>
					Select your institution type
				</label>
				<select
					className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
					data-testid="institution-location-select"
					id="institution"
					onChange={(e) => {
						setFormData({ ...formData, institutionLocation: e.target.value });
					}}
					value={formData.institutionLocation}
				>
					<option data-testid="institution-location-default-option" value="">
						Choose institution location
					</option>
					{INSTITUTION_LOCATIONS.map((location) => (
						<option
							data-testid={`institution-location-option-${location.toLowerCase().replaceAll(/[^a-z0-9]/g, "-")}`}
							key={location}
							value={location}
						>
							{location}
						</option>
					))}
				</select>
			</div>
		</div>
	);
}
