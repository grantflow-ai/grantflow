import { LegalPageContainer } from "@/components/info-legal-page-components";

export default function AboutPage() {
	return (
		<LegalPageContainer
			background="dark"
			childrenSpan="parent"
			headingLevel="h1"
			isTextCentered
			textColor="text-white"
			title="About GrantFlow.ai"
		>
			<h1>About Us</h1>
		</LegalPageContainer>
	);
}
