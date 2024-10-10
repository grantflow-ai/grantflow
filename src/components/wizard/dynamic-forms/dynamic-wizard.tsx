"use client";

import {
	GrantApplicationAnswer,
	GrantApplicationQuestion,
	GrantCFP,
	GrantWizardSection,
	ResearchAim,
	ResearchTask,
} from "@/types/database-types";
import { getStore } from "@/stores/wizard";
import { useEffect } from "react";

export function DynamicWizard({
	draftId,
	cfp,
}: {
	draftId: string;
	cfp: GrantCFP & {
		sections: (GrantWizardSection & { questions: GrantApplicationQuestion[] })[];
	};
	answers: GrantApplicationAnswer[];
	researchAims: (ResearchAim & { tasks: ResearchTask[] })[];
}) {
	const store = getStore({ cfpIdentifier: cfp.grant_identifier, draftId })();

	useEffect(() => {
		store.setSections(cfp.sections);
		// return () => {
		// 	store.resetStore()
		// }
	}, [cfp]);

	return <div></div>;
}
