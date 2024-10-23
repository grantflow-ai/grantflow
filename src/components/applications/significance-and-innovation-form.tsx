import { Label } from "gen/ui/label";
import { Textarea } from "gen/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "gen/ui/tooltip";
import { InfoIcon } from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import { useWizardStore } from "@/stores/wizard";

export default function SignificanceAndInnovationForm({ workspaceId }: { workspaceId: string }) {
	const { significance, innovation, updateResearchInnovation, updateResearchSignificance } = useWizardStore({
		workspaceId,
	})(
		useShallow((state) => ({
			significance: state.significance,
			innovation: state.innovation,
			updateResearchInnovation: state.updateResearchInnovation,
			updateResearchSignificance: state.updateResearchSignificance,
		})),
	);
	return (
		<TooltipProvider>
			<div className="space-y-8">
				<div className="space-y-2">
					<div className="flex items-center space-x-2">
						<Label htmlFor="significance-textarea" className="text-sm font-medium text-foreground">
							Significance
						</Label>
						<Tooltip>
							<TooltipTrigger asChild>
								<InfoIcon className="h-4 w-4 text-muted-foreground cursor-help" />
							</TooltipTrigger>
							<TooltipContent side="right" align="start" className="max-w-xs">
								<p className="text-sm">
									Describe the importance and potential impact of your research in the field.
								</p>
							</TooltipContent>
						</Tooltip>
					</div>
					<Textarea
						id="significance-textarea"
						placeholder="Describe the significance of your research"
						value={significance?.text}
						onChange={async (e) => {
							await updateResearchSignificance({ text: e.target.value });
						}}
						className="min-h-[100px] transition-all duration-200 focus:ring-2 focus:ring-primary"
					/>
				</div>
				<div className="space-y-2">
					<div className="flex items-center space-x-2">
						<Label htmlFor="innovation-textarea" className="text-sm font-medium text-foreground">
							Innovation
						</Label>
						<Tooltip>
							<TooltipTrigger asChild>
								<InfoIcon className="h-4 w-4 text-muted-foreground cursor-help" />
							</TooltipTrigger>
							<TooltipContent side="right" align="start" className="max-w-xs">
								<p className="text-sm">
									Explain how your research introduces new ideas, methods, or approaches to the field.
								</p>
							</TooltipContent>
						</Tooltip>
					</div>
					<Textarea
						id="innovation-textarea"
						placeholder="Describe the innovation of your research"
						value={innovation?.text}
						onChange={async (e) => {
							await updateResearchInnovation({ text: e.target.value });
						}}
						className="min-h-[100px] transition-all duration-200 focus:ring-2 focus:ring-primary"
					/>
				</div>
			</div>
		</TooltipProvider>
	);
}
