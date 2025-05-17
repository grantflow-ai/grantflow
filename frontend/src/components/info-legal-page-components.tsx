function LegalPageContainer({
	background = "light",
	backgroundStack,
	children,
	childrenSpan = "custom",
	headingLevel = "h2",
	isTextCentered = false,
	textColor = "text-black",
	title,
}: {
	background?: "dark" | "light";
	backgroundStack?: React.ReactNode;
	children: React.ReactNode;
	childrenSpan?: "custom" | "parent";
	headingLevel?: "h1" | "h2";
	isTextCentered?: boolean;
	textColor?: string;
	title: string;
}) {
	const colorScheme = background === "light" ? "bg-light" : "bg-dark";

	const Heading = headingLevel;
	const headingClasses = headingLevel === "h1" ? "text-5xl md:text-[4.25rem] font-normal" : "text-4xl font-medium";
	const textChildrenAlignment = isTextCentered ? "text-center" : "text-start";

	return (
		<div
			className={`w-full z-20 ${colorScheme} flex justify-center ${textColor} py-8 px-16 md:py-12 md:px-20 xl:py-16 xl:px-24 lg:py-20 lg:px-30 relative`}
		>
			{backgroundStack && <div className="absolute inset-0 size-full overflow-hidden">{backgroundStack}</div>}
			<div className={`z-30 ${childrenSpan === "custom" ? "w-198" : "w-full"} ${textChildrenAlignment}`}>
				<Heading className={`font-heading ${headingClasses} mb-6`}>{title}</Heading>
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
