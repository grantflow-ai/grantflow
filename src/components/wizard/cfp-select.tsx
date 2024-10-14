import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "gen/ui/select";
import { GrantCFP } from "@/types/database-types";

export const SupportedActivityCodes = new Set([
	"R01",
	"R03",
	"R18",
	"R21",
	"R24",
	"R25",
	"R33",
	"R34",
	"R35",
	"R41",
	"R42",
	"R43",
	"R44",
	"R50",
	"R61",
]);

export function CfpSelect({ cfps }: { cfps: GrantCFP[] }) {
	return (
		<div data-testid="activity-code-select-container">
			<Select>
				<SelectTrigger>
					<SelectValue
						placeholder="Select an NIH Activity Code"
						data-testid="activity-code-select-placeholder"
						className="p-2"
					/>
				</SelectTrigger>
				<SelectContent>
					<SelectGroup>
						{cfps.map((cfp) => (
							<SelectItem
								key={cfp.id}
								value={cfp.code}
								data-testid={`activity-code-select-item-${cfp.code}`}
							>
								{`(${cfp.code}) ${cfp.title}`}
							</SelectItem>
						))}
					</SelectGroup>
				</SelectContent>
			</Select>
		</div>
	);
}
