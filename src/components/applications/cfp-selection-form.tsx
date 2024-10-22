import { Check, ChevronsUpDown } from "lucide-react";

import { cn } from "gen/cn";
import { Button } from "gen/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "gen/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "gen/ui/popover";
import { GrantCFP } from "@/types/database-types";
import { useEffect, useState } from "react";
import { useWizardStore } from "@/stores/wizard";
import { useShallow } from "zustand/react/shallow";

export function CFPSelectionForm({ cfps, workspaceId }: { cfps: GrantCFP[]; workspaceId: string }) {
	const [open, setOpen] = useState(false);
	const [title, setTitle] = useState("Select an NIH Activity Code");

	const { application, updateApplication } = useWizardStore({ workspaceId })(
		useShallow((store) => ({
			application: store.application,
			updateApplication: store.updateApplication,
		})),
	);

	useEffect(() => {
		if (application) {
			const cfp = cfps.find((cfp) => cfp.id === application.cfpId);
			setTitle(cfp ? `${cfp.code} - ${cfp.title}` : "Select an NIH Activity Code");
		} else {
			setTitle("Select an NIH Activity Code");
		}
	}, [application]);

	return (
		<div data-testid="cfp-selection-form-container">
			<Popover open={open} onOpenChange={setOpen}>
				<PopoverTrigger asChild>
					<Button variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between">
						{title}
						<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
					</Button>
				</PopoverTrigger>
				<PopoverContent className="w-full max-w-md p-0">
					<Command>
						<CommandInput placeholder="Search NIH Activity Codes..." />
						<CommandEmpty>No activity code found.</CommandEmpty>
						<CommandGroup className="max-h-60 overflow-y-auto">
							<CommandList>
								{cfps.map((cfp) => (
									<CommandItem
										key={cfp.id}
										value={cfp.id}
										onSelect={async (currentValue) => {
											await updateApplication("cfpId", currentValue);
											setOpen(false);
										}}
										data-testid={`activity-code-select-item-${cfp.code}`}
									>
										<Check
											className={cn(
												"mr-2 h-4 w-4",
												application?.cfpId === cfp.id ? "opacity-100" : "opacity-0",
											)}
										/>
										<span className="font-medium">{cfp.code}</span>
										<span className="ml-2 text-sm text-muted-foreground truncate">{cfp.title}</span>
									</CommandItem>
								))}
							</CommandList>
						</CommandGroup>
					</Command>
				</PopoverContent>
			</Popover>
		</div>
	);
}
