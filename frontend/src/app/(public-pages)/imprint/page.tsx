import { LegalPageContainer } from "@/components/info-legal-page-components";

export default function ImprintPage() {
	return (
		<LegalPageContainer title="Imprint">
			<div className="leading-tight">
				<p className="font-medium">Responsible for this website:</p>
				<p>
					Na&apos;aman Hirschfeld
					<br />
					Boppstr. 2<br />
					10967 Berlin, Germany
				</p>
				<p>
					Email:{" "}
					<a className="underline" href="mailto:contact@grantflow.ai">
						contact@grantflow.ai
					</a>
				</p>

				<p className="mt-6">
					GrantFlow is currently in development. This site is operated for informational and early access
					purposes only.
				</p>
			</div>
		</LegalPageContainer>
	);
}
