"use client";

import { useWizardStore } from "@/stores/wizard";
import type {
	GrantApplicationAnswer,
	GrantApplicationQuestion,
	GrantCFP,
	GrantWizardSection,
	ResearchAim,
	ResearchTask,
} from "@/types/database-types";
import { useEffect } from "react";
import { useShallow } from "zustand/react/shallow";

export function GrantApplicationWizard({
	draftId,
	cfp,
	answers,
	researchAims,
}: {
	draftId: string;
	cfp: GrantCFP & {
		sections: (GrantWizardSection & {
			questions: GrantApplicationQuestion[];
		})[];
	};
	answers: GrantApplicationAnswer[];
	researchAims: (ResearchAim & { tasks: ResearchTask[] })[];
}) {
	const { setSections, setAnswers, setResearchAims } = useWizardStore({
		cfpIdentifier: cfp.grant_identifier,
		draftId,
	})(
		useShallow((state) => ({
			setSections: state.setSections,
			setAnswers: state.setAnswers,
			setResearchAims: state.setResearchAims,
		})),
	);

	useEffect(() => {
		setSections(cfp.sections);
		setAnswers(answers);
		setResearchAims(researchAims);
	}, [cfp, answers, researchAims, setSections, setAnswers, setResearchAims]);

	return <div />;
}
