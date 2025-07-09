import Image from "next/image";

export function EditorPromptWindow() {
	return (
		<div className="w-full border border-gray-100 bg-white h-full flex flex-col">
			<div className="border-b border-gray-100 flex h-16 px-3 items-center justify-between">
				<p className="font-semibold text-app-black font-['Cabin']">Application Name</p>

				<div className="flex gap-1 items-center">
					<Image alt="Close" height={16} src="/icons/tick-round.svg" width={16} />
					<p className="text-gray-600 text-sm ">All Changes saved</p>
				</div>
			</div>

			<div className="flex flex-col p-3 mt-auto">
				<div>
					<Image alt="Grantflow" height={31.56} src="/assets/logo-round.svg" width={31.19} />
					<p className="text-gray-600 mt-3">
						Hi, would you like help refining a specific section, checking alignment with the funder’s
						guidelines, or adding references? Just let me know where you&apos;d like to start.
					</p>
				</div>

				<div className="relative mt-6">
					<textarea
						className="border text-sm leading-4.5 placeholder:text-gray-400 text-app-black border-gray-100 rounded-sm p-3 w-full"
						placeholder="Placeholder"
						rows={4}
					/>
					<button className="absolute cursor-not-allowed right-3 bottom-4" type="button">
						<Image alt="Send" height={32} src="/icons/send-message-button-disabled.svg" width={32} />
					</button>
				</div>
			</div>
		</div>
	);
}
