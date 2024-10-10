"use client";

import {
	GrantApplicationAnswer,
	GrantApplicationQuestion,
	GrantCFP,
	GrantWizardSection,
	ResearchAim,
	ResearchTask,
} from "@/types/database-types";
import { useWizardStore } from "@/stores/wizard";
import { useEffect } from "react";

export function GrantApplicationWizard({
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
	const setSections = useWizardStore({ cfpIdentifier: cfp.grant_identifier, draftId })((store) => store.setSections);

	useEffect(() => {
		setSections(cfp.sections);
		// return () => {
		// 	store.resetStore()
		// }
	}, [cfp, setSections]);

	return <div></div>;
}
