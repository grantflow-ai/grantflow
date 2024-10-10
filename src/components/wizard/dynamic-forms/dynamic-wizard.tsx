"use client";

import type { GrantApplicationQuestion, GrantCFP, GrantWizardSection } from "@/types/database-types";

export function DynamicWizard({
	cfp,
}: {
	cfp: GrantCFP & {
		sections: (GrantWizardSection & { questions: GrantApplicationQuestion[] })[];
	};
}) {
	return <div></div>;
}
