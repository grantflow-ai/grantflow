import { type FormData, INSTITUTION_LOCATIONS } from "@/components/grant-finder/types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface InstitutionLocationStepProps {
	formData: FormData;
	setFormData: (data: FormData) => void;
}

export function InstitutionLocationStep({ formData, setFormData }: InstitutionLocationStepProps) {
	return (
		<div className="space-y-6" data-testid="institution-location-step">
			<div data-testid="institution-location-step-header">
				<h3
					className="font-heading text-2xl font-medium leading-loose text-stone-900"
					data-testid="institution-location-step-title"
				>
					Institution Location
				</h3>
				<p
					className="mt-2 text-muted-foreground-dark text-sm leading-none"
					data-testid="institution-location-step-description"
				>
					Tell us where the grant will be administered
				</p>
			</div>

			<div className="max-w-lg" data-testid="institution-location-select-section">
				<div
					className="block text-sm font-semibold text-stone-900 mb-1"
					data-testid="institution-location-select-label"
				>
					Select your institution type
				</div>
				<Select
					onValueChange={(value) => {
						setFormData({ ...formData, institutionLocation: value });
					}}
					value={formData.institutionLocation}
				>
					<SelectTrigger className="mt-1" data-testid="institution-location-select">
						<SelectValue placeholder="Choose institution location" />
					</SelectTrigger>
					<SelectContent>
						{INSTITUTION_LOCATIONS.map((location) => (
							<SelectItem
								data-testid={`institution-location-option-${location.toLowerCase().replaceAll(/[^a-z0-9]/g, "-")}`}
								key={location}
								value={location}
							>
								{location}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>
		</div>
	);
}
