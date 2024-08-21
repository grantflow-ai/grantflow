export function Separator({
	text,
}: {
	text: string;
}) {
	return (
		<div className="relative" data-testid="separator">
			<div className="relative flex items-center py-1">
				<div className="grow border-t border-zinc-700" />
				<span className="mx-3 shrink text-sm leading-8 text-zinc-500" data-testid="separator-text">
					{text}
				</span>
				<div className="grow border-t border-zinc-700" />
			</div>
		</div>
	);
}
