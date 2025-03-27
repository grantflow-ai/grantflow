import { useState } from "react";
import { NewGrantApplicationFormValues } from "@/schema";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { NewApplicationForm } from "./new-application-form";

export function NewGrantApplicationModal({
	onSubmit,
}: {
	onSubmit: (data: NewGrantApplicationFormValues) => Promise<void>;
}) {
	const [open, setOpen] = useState(false);

	const handleSubmit = async (data: NewGrantApplicationFormValues) => {
		try {
			await onSubmit(data);
		} finally {
			setOpen(false);
		}
	};

	return (
		<Dialog onOpenChange={setOpen} open={open}>
			<DialogTrigger asChild>
				<Button data-testid="new-grant-application-button">New Grant Application</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-[425px]">
				<DialogHeader>
					<DialogTitle>Create New Grant Application</DialogTitle>
				</DialogHeader>
				<NewApplicationForm data-testid="new-application-form" onSubmit={handleSubmit} />
			</DialogContent>
		</Dialog>
	);
}
