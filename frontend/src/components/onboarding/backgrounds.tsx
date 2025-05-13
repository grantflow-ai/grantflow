function OnboardingGradientBackgroundBottom({ ...props }: React.HTMLProps<SVGSVGElement>) {
	return (
		<svg fill="none" height="812" viewBox="0 0 1153 812" width="1153" xmlns="http://www.w3.org/2000/svg" {...props}>
			<g filter="url(#filter0_f_1269_3172)">
				<path
					d="M803 797.217C803 1044.21 497.458 906.988 127.703 906.988C-242.051 906.988 -536 1044.21 -536 797.217C-536 550.226 -236.255 350 133.5 350C88.5768 621.888 803 550.226 803 797.217Z"
					fill="#1E13F8"
				/>
			</g>
			<defs>
				<filter
					colorInterpolationFilters="sRGB"
					filterUnits="userSpaceOnUse"
					height="1295"
					id="filter0_f_1269_3172"
					width="2039"
					x="-886"
					y="0"
				>
					<feFlood floodOpacity="0" result="BackgroundImageFix" />
					<feBlend in="SourceGraphic" in2="BackgroundImageFix" mode="normal" result="shape" />
					<feGaussianBlur result="effect1_foregroundBlur_1269_3172" stdDeviation="175" />
				</filter>
			</defs>
		</svg>
	);
}

function OnboardingGradientBackgroundTop({ ...props }: React.HTMLProps<SVGSVGElement>) {
	return (
		<svg fill="none" height="698" viewBox="0 0 964 698" width="964" xmlns="http://www.w3.org/2000/svg" {...props}>
			<g filter="url(#filter0_f_1269_2973)">
				<path
					d="M1224 252C1224 495.005 1013.16 360 758 360C502.844 360 300 495.005 300 252C300 8.99471 506.844 -188 762 -188C1017.16 -188 1224 8.99471 1224 252Z"
					fill="#1E13F8"
				/>
			</g>
			<defs>
				<filter
					colorInterpolationFilters="sRGB"
					filterUnits="userSpaceOnUse"
					height="1185.4"
					id="filter0_f_1269_2973"
					width="1524"
					x="0"
					y="-488"
				>
					<feFlood floodOpacity="0" result="BackgroundImageFix" />
					<feBlend in="SourceGraphic" in2="BackgroundImageFix" mode="normal" result="shape" />
					<feGaussianBlur result="effect1_foregroundBlur_1269_2973" stdDeviation="150" />
				</filter>
			</defs>
		</svg>
	);
}

function StackedHighlight({ ...props }: React.HTMLProps<SVGSVGElement>) {
	return (
		<svg fill="none" height="600" viewBox="0 0 1169 1024" width="700" xmlns="http://www.w3.org/2000/svg" {...props}>
			<g filter="url(#filter0_f_1269_72413)">
				<path
					d="M869 659.714C869 905.875 662.948 769.116 413.591 769.116C164.234 769.116 -34 905.875 -34 659.714C-34 413.553 168.143 214 417.5 214C666.857 214 869 413.553 869 659.714Z"
					fill="white"
				/>
			</g>
			<defs>
				<filter
					colorInterpolationFilters="sRGB"
					filterUnits="userSpaceOnUse"
					height="1193"
					id="filter0_f_1269_72413"
					width="1503"
					x="-334"
					y="-86"
				>
					<feFlood floodOpacity="0" result="BackgroundImageFix" />
					<feBlend in="SourceGraphic" in2="BackgroundImageFix" mode="normal" result="shape" />
					<feGaussianBlur result="effect1_foregroundBlur_1269_72413" stdDeviation="150" />
				</filter>
			</defs>
		</svg>
	);
}

export { OnboardingGradientBackgroundBottom, OnboardingGradientBackgroundTop, StackedHighlight };
