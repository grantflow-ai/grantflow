function LegalPageContainer({
	background = "light",
	children,
	childrenSpan = "custom",
	headingLevel = "h2",
	isTextCentered = false,
	textColor = "text-black",
	title,
}: {
	background?: "dark" | "light";
	children: React.ReactNode;
	childrenSpan?: "custom" | "parent";
	headingLevel?: "h1" | "h2";
	isTextCentered?: boolean;
	textColor?: string;
	title: string;
}) {
	const colorScheme = background === "light" ? "bg-light" : "bg-dark";

	const Heading = headingLevel;
	const headingFontSize = headingLevel === "h1" ? "text-7xl" : "text-4xl";
	const textChildrenAlignment = isTextCentered ? "text-center" : "text-start";

	return (
		<div className={`w-full min-h-screen ${colorScheme} flex justify-center ${textColor} py-20 px-30`}>
			<div className={`${childrenSpan === "custom" ? "w-198" : "w-full"} ${textChildrenAlignment}`}>
				<Heading className={`font-heading font-medium ${headingFontSize} mb-6`}>{title}</Heading>
				{children}
			</div>
		</div>
	);
}

function TitledLegalSection({ clause, id, title }: { clause: React.ReactNode; id?: string; title: string }) {
	return (
		<section className="leading-tight" id={id}>
			<h4 className="font-bold">{title}</h4>
			{clause}
		</section>
	);
}

function UntitledLegalSection({ clause, id }: { clause: React.ReactNode; id?: string }) {
	return (
		<section className="leading-tight" id={id}>
			{clause}
		</section>
	);
}

export { LegalPageContainer, TitledLegalSection, UntitledLegalSection };
