import type { SVGProps } from "react";

interface LogoProps extends SVGProps<SVGSVGElement> {
	height?: number;
	width?: number;
}

export function Logo({ height = 72, width = 72, ...props }: LogoProps) {
	const widthRatio = width / 128;
	const heightRatio = height / 128;

	return (
		<svg width={width} height={height} fill="none" xmlns="http://www.w3.org/2000/svg" {...props} data-testid="logo">
			<title>Trumpet.org logo</title>
			<path
				d={`M${74.8179 * widthRatio} ${52.0173 * heightRatio}C${76.2528 * widthRatio} ${51.9101 * heightRatio} ${76.9253 * widthRatio} ${51.9415 * heightRatio} ${78.6391 * widthRatio} ${51.6406 * heightRatio}C${80.6414 * widthRatio} ${51.227 * heightRatio} ${81.4377 * widthRatio} ${50.904 * heightRatio} ${82.837 * widthRatio} ${50.2951 * heightRatio}C${84.8038 * widthRatio} ${49.4393 * heightRatio} ${85.9047 * widthRatio} ${48.9496 * heightRatio} ${87.5731 * widthRatio} ${47.4965 * heightRatio}L${90.8561 * widthRatio} ${44.1597 * heightRatio}V${68.0187 * heightRatio}C${90.8583 * widthRatio} ${68.0495 * heightRatio} ${90.8584 * widthRatio} ${68.0798 * heightRatio} ${90.8561 * widthRatio} ${68.1094 * heightRatio}V${68.0187 * heightRatio}C${90.8161 * widthRatio} ${67.4727 * heightRatio} ${90.0911 * widthRatio} ${66.7495 * heightRatio} ${89.8873 * widthRatio} ${66.4948 * heightRatio}C${89.6721 * widthRatio} ${66.2257 * heightRatio} ${88.5419 * widthRatio} ${64.8264 * heightRatio} ${88.2189 * widthRatio} ${64.5035 * heightRatio}C${87.896 * widthRatio} ${64.1805 * heightRatio} ${87.1516 * widthRatio} ${63.4655 * heightRatio} ${86.1738 * widthRatio} ${62.6736 * heightRatio}C${85.7432 * widthRatio} ${62.3249 * heightRatio} ${85.4203 * widthRatio} ${61.9201 * heightRatio} ${84.021 * widthRatio} ${61.3281 * heightRatio}C${83.3135 * widthRatio} ${61.1058 * heightRatio} ${82.9961 * widthRatio} ${61.042 * heightRatio} ${82.4602 * widthRatio} ${60.9514 * heightRatio}C${82.1712 * widthRatio} ${60.0001 * heightRatio} ${82.0319 * widthRatio} ${59.4787 * heightRatio} ${81.4377 * widthRatio} ${58.368 * heightRatio}C${80.7963 * widthRatio} ${57.3702 * heightRatio} ${80.3693 * widthRatio} ${56.7912 * heightRatio} ${79.5002 * widthRatio} ${55.7309 * heightRatio}C${79.1363 * widthRatio} ${55.273 * heightRatio} ${78.0939 * widthRatio} ${54.2981 * heightRatio} ${76.6477 * widthRatio} ${53.1475 * heightRatio}C${76.019 * widthRatio} ${52.773 * heightRatio} ${75.5636 * widthRatio} ${52.4829 * heightRatio} ${74.8179 * widthRatio} ${52.0173 * heightRatio}Z`}
				fill="url(#paint0_linear_28_75)"
			/>
			<rect
				x={90.7485 * widthRatio}
				y={42.2222 * heightRatio}
				width={4.9514 * widthRatio}
				height={27.9862 * heightRatio}
				rx={2.4757 * widthRatio}
				fill="url(#paint1_linear_28_75)"
			/>
			<path
				fillRule="evenodd"
				clipRule="evenodd"
				d={`M${39.323 * widthRatio} ${56.3228 * heightRatio}C${38.6038 * widthRatio} ${57.2403 * heightRatio} ${37.4853 * widthRatio} ${57.8298 * heightRatio} ${36.2291 * widthRatio} ${57.8298 * heightRatio}C${34.0593 * widthRatio} ${57.8298 * heightRatio} ${32.3003 * widthRatio} ${56.0708 * heightRatio} ${32.3003 * widthRatio} ${53.901 * heightRatio}C${32.3003 * widthRatio} ${51.7312 * heightRatio} ${34.0593 * widthRatio} ${49.9722 * heightRatio} ${36.2291 * widthRatio} ${49.9722 * heightRatio}C${37.7598 * widthRatio} ${49.9722 * heightRatio} ${39.086 * widthRatio} ${50.8475 * heightRatio} ${39.7345 * widthRatio} ${52.1249 * heightRatio}H${45.2169 * widthRatio}H${45.3247 * widthRatio}H${49.8454 * widthRatio}L${45.3247 * widthRatio} ${56.3227 * heightRatio}V${56.3228 * heightRatio}H${45.3246 * widthRatio}H${39.323 * widthRatio}Z`}
				fill="url(#paint2_linear_28_75)"
			/>
			<circle
				cx={55.3351 * widthRatio}
				cy={45.4513 * heightRatio}
				r={2.260_42 * widthRatio}
				fill="url(#paint3_linear_28_75)"
			/>
			<circle
				cx={62.2448 * widthRatio}
				cy={45.4513 * heightRatio}
				r={2.260_42 * widthRatio}
				fill="url(#paint4_linear_28_75)"
			/>
			<circle
				cx={69.1017 * widthRatio}
				cy={45.4513 * heightRatio}
				r={2.260_42 * widthRatio}
				fill="url(#paint5_linear_28_75)"
			/>
			<path
				d={`M${53.71 * widthRatio} ${49.9692 * heightRatio}H${58.2117 * widthRatio}V${82.6855 * heightRatio}C${58.2117 * widthRatio} ${82.6855 * heightRatio} ${56.7903 * widthRatio} ${82.8629 * heightRatio} ${55.9085 * widthRatio} ${82.6855 * heightRatio}C${54.9927 * widthRatio} ${82.5012 * heightRatio} ${53.71 * widthRatio} ${81.7433 * heightRatio} ${53.71 * widthRatio} ${81.7433 * heightRatio}V${49.9692 * heightRatio}Z`}
				fill="url(#paint6_linear_28_75)"
			/>
			<path
				d={`M${70.3037 * widthRatio} ${49.9692 * heightRatio}H${65.802 * widthRatio}V${82.6855 * heightRatio}C${65.802 * widthRatio} ${82.6855 * heightRatio} ${67.2234 * widthRatio} ${82.8629 * heightRatio} ${68.1052 * widthRatio} ${82.6855 * heightRatio}C${69.0209 * widthRatio} ${82.5012 * heightRatio} ${70.3037 * widthRatio} ${81.7433 * heightRatio} ${70.3037 * widthRatio} ${81.7433 * heightRatio}V${49.9692 * heightRatio}Z`}
				fill="url(#paint7_linear_28_75)"
			/>
			<path
				d={`M${59.939 * widthRatio} ${49.9692 * heightRatio}H${64.4931 * widthRatio}V${83.249 * heightRatio}C${63.6294 * widthRatio} ${83.6328 * heightRatio} ${63.2891 * widthRatio} ${84.0988 * heightRatio} ${62.2684 * widthRatio} ${84.0988 * heightRatio}C${61.2476 * widthRatio} ${84.0988 * heightRatio} ${59.939 * widthRatio} ${83.249 * heightRatio} ${59.939 * widthRatio} ${83.249 * heightRatio}V${49.9692 * heightRatio}Z`}
				fill="url(#paint8_linear_28_75)"
			/>
			<path
				d={`M${72.611 * widthRatio} ${81.2413 * heightRatio}C${74.7638 * widthRatio} ${80.5955 * heightRatio} ${78.754 * widthRatio} ${76.5319 * heightRatio} ${79.9791 * widthRatio} ${74.0512 * heightRatio}C${81.2042 * widthRatio} ${71.5705 * heightRatio} ${81.7516 * widthRatio} ${68.7899 * heightRatio} ${81.5622 * widthRatio} ${66.01 * heightRatio}C${81.3728 * widthRatio} ${63.2301 * heightRatio} ${80.4537 * widthRatio} ${60.5568 * heightRatio} ${78.9044 * widthRatio} ${58.2792 * heightRatio}C${77.3551 * widthRatio} ${56.0016 * heightRatio} ${75.2345 * widthRatio} ${54.2063 * heightRatio} ${72.772 * widthRatio} ${53.0876 * heightRatio}L${71.7499 * widthRatio} ${59.1753 * heightRatio}C${72.9877 * widthRatio} ${59.9826 * heightRatio} ${73.3384 * widthRatio} ${60.2411 * heightRatio} ${74.2951 * widthRatio} ${61.6476 * heightRatio}C${75.2519 * widthRatio} ${63.0542 * heightRatio} ${75.8195 * widthRatio} ${64.7051 * heightRatio} ${75.9365 * widthRatio} ${66.4218 * heightRatio}C${76.0534 * widthRatio} ${68.1385 * heightRatio} ${75.7154 * widthRatio} ${69.8557 * heightRatio} ${74.9588 * widthRatio} ${71.3877 * heightRatio}C${74.2023 * widthRatio} ${72.9197 * heightRatio} ${73.056 * widthRatio} ${74.2081 * heightRatio} ${71.644 * widthRatio} ${75.1137 * heightRatio}L${72.611 * widthRatio} ${81.2413 * heightRatio}Z`}
				fill="url(#paint9_linear_28_75)"
			/>
			<path
				d={`M${51.8368 * widthRatio} ${81.2474 * heightRatio}C${49.684 * widthRatio} ${80.6016 * heightRatio} ${45.6937 * widthRatio} ${76.5381 * heightRatio} ${44.4686 * widthRatio} ${74.0573 * heightRatio}C${43.2435 * widthRatio} ${71.5766 * heightRatio} ${42.6961 * widthRatio} ${68.796 * heightRatio} ${42.8855 * widthRatio} ${66.0161 * heightRatio}C${43.075 * widthRatio} ${63.2362 * heightRatio} ${43.994 * widthRatio} ${60.5629 * heightRatio} ${45.5433 * widthRatio} ${58.2853 * heightRatio}C${47.0926 * widthRatio} ${56.0077 * heightRatio} ${49.2132 * widthRatio} ${54.2124 * heightRatio} ${51.6758 * widthRatio} ${53.0938 * heightRatio}L${52.6979 * widthRatio} ${59.1814 * heightRatio}C${51.46 * widthRatio} ${59.9887 * heightRatio} ${51.1094 * widthRatio} ${60.2472 * heightRatio} ${50.1526 * widthRatio} ${61.6537 * heightRatio}C${49.1958 * widthRatio} ${63.0603 * heightRatio} ${48.6283 * widthRatio} ${64.7112 * heightRatio} ${48.5113 * widthRatio} ${66.4279 * heightRatio}C${48.3943 * widthRatio} ${68.1446 * heightRatio} ${48.7324 * widthRatio} ${69.8619 * heightRatio} ${49.4889 * widthRatio} ${71.3938 * heightRatio}C${50.2455 * widthRatio} ${72.9258 * heightRatio} ${51.3917 * widthRatio} ${74.2142 * heightRatio} ${52.8037 * widthRatio} ${75.1198 * heightRatio}L${51.8368 * widthRatio} ${81.2474 * heightRatio}Z`}
				fill="url(#paint10_linear_28_75)"
			/>
			<g filter="url(#filter0_f_28_75)">
				<ellipse
					cx={90.3484 * widthRatio}
					cy={58.6207 * heightRatio}
					rx={2.757_24 * widthRatio}
					ry={2.9793 * heightRatio}
					transform={`rotate(7.49586 ${90.3484 * widthRatio} ${58.6207 * heightRatio})`}
					fill="#FF6B6B"
				/>
			</g>
			<g filter="url(#filter1_f_28_75)">
				<ellipse
					cx={36.3832 * widthRatio}
					cy={53.5551 * heightRatio}
					rx={1.989_15 * widthRatio}
					ry={2.015_32 * heightRatio}
					fill="#FF6B6B"
				/>
			</g>
			<g filter="url(#filter2_f_28_75)">
				<ellipse
					cx={45.2826 * widthRatio}
					cy={68.081 * heightRatio}
					rx={1.989_15 * widthRatio}
					ry={2.146_19 * heightRatio}
					fill="#FF6B6B"
				/>
			</g>
			<path
				d={`M${48.7753 * widthRatio} ${54.38 * heightRatio}L${52.5061 * widthRatio} ${51.6968 * heightRatio}L${53.5006 * widthRatio} ${64.7571 * heightRatio}L${45.4917 * widthRatio} ${57.2455 * heightRatio}L${48.7753 * widthRatio} ${54.38 * heightRatio}Z`}
				fill="url(#paint11_linear_28_75)"
			/>
			<path
				d={`M${75.9185 * widthRatio} ${54.38 * heightRatio}L${72.1878 * widthRatio} ${51.6968 * heightRatio}L${71.1932 * widthRatio} ${64.7571 * heightRatio}L${79.2021 * widthRatio} ${57.2455 * heightRatio}L${75.9185 * widthRatio} ${54.38 * heightRatio}Z`}
				fill="url(#paint12_linear_28_75)"
			/>
			<path
				d={`M${74.5962 * widthRatio} ${70.803 * heightRatio}L${71.0799 * widthRatio} ${72.7475 * heightRatio}L${72.4129 * widthRatio} ${85.7777 * heightRatio}L${78.9657 * widthRatio} ${76.9669 * heightRatio}L${74.5962 * widthRatio} ${70.803 * heightRatio}Z`}
				fill="url(#paint13_linear_28_75)"
			/>
			<path
				d={`M${48.3655 * widthRatio} ${67.2524 * heightRatio}L${53.4934 * widthRatio} ${69.7583 * heightRatio}L${52.1156 * widthRatio} ${85.5267 * heightRatio}L${42.3462 * widthRatio} ${74.558 * heightRatio}L${48.3655 * widthRatio} ${67.2524 * heightRatio}Z`}
				fill="url(#paint14_linear_28_75)"
			/>
			<defs>
				<filter
					id="filter0_f_28_75"
					x={79.735 * widthRatio}
					y={47.7929 * heightRatio}
					width={21.2267 * widthRatio}
					height={21.6557 * heightRatio}
					filterUnits="userSpaceOnUse"
					colorInterpolationFilters="sRGB"
				>
					<feFlood floodOpacity="0" result="BackgroundImageFix" />
					<feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
					<feGaussianBlur stdDeviation={3.925_95 * widthRatio} result="effect1_foregroundBlur_28_75" />
				</filter>
				<filter
					id="filter1_f_28_75"
					x={29.1594 * widthRatio}
					y={46.3052 * heightRatio}
					width={14.4477 * widthRatio}
					height={14.5 * heightRatio}
					filterUnits="userSpaceOnUse"
					colorInterpolationFilters="sRGB"
				>
					<feFlood floodOpacity="0" result="BackgroundImageFix" />
					<feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
					<feGaussianBlur stdDeviation={2.6173 * widthRatio} result="effect1_foregroundBlur_28_75" />
				</filter>
				<filter
					id="filter2_f_28_75"
					x={35.4416 * widthRatio}
					y={58.0829 * heightRatio}
					width={19.6823 * widthRatio}
					height={19.9963 * heightRatio}
					filterUnits="userSpaceOnUse"
					colorInterpolationFilters="sRGB"
				>
					<feFlood floodOpacity="0" result="BackgroundImageFix" />
					<feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
					<feGaussianBlur stdDeviation={3.925_95 * widthRatio} result="effect1_foregroundBlur_28_75" />
				</filter>
				<linearGradient
					id="paint0_linear_28_75"
					x1={86.9496 * widthRatio}
					y1={41.4893 * heightRatio}
					x2={92.1842 * widthRatio}
					y2={63.527 * heightRatio}
					gradientUnits="userSpaceOnUse"
				>
					<stop stopColor="#C7F464" />
					<stop offset="0.485" stopColor="#4ECDC4" />
					<stop offset="1" stopColor="#3300FF" />
				</linearGradient>
				<linearGradient
					id="paint1_linear_28_75"
					x1={93.2242 * widthRatio}
					y1={42.2222 * heightRatio}
					x2={93.2242 * widthRatio}
					y2={70.2083 * heightRatio}
					gradientUnits="userSpaceOnUse"
				>
					<stop stopColor="#C7F464" />
					<stop offset="0.51" stopColor="#4ECDC4" />
					<stop offset="1" stopColor="#3300FF" />
				</linearGradient>
				<linearGradient
					id="paint2_linear_28_75"
					x1={49.8362 * widthRatio}
					y1={49.3936 * heightRatio}
					x2={33.3996 * widthRatio}
					y2={57.1931 * heightRatio}
					gradientUnits="userSpaceOnUse"
				>
					<stop stopColor="#C7F464" />
					<stop offset="0.48" stopColor="#4ECDC4" />
					<stop offset="1" stopColor="#3300FF" />
				</linearGradient>
				<linearGradient
					id="paint3_linear_28_75"
					x1={55.3351 * widthRatio}
					y1={43.1909 * heightRatio}
					x2={55.3351 * widthRatio}
					y2={47.7118 * heightRatio}
					gradientUnits="userSpaceOnUse"
				>
					<stop stopColor="#C7F464" />
					<stop offset="0.31" stopColor="#A1E882" />
					<stop offset="1" stopColor="#4ECDC4" />
				</linearGradient>
				<linearGradient
					id="paint4_linear_28_75"
					x1={62.2448 * widthRatio}
					y1={43.1909 * heightRatio}
					x2={62.2448 * widthRatio}
					y2={47.7118 * heightRatio}
					gradientUnits="userSpaceOnUse"
				>
					<stop stopColor="#C7F464" />
					<stop offset="1" stopColor="#4ECDC4" />
				</linearGradient>
				<linearGradient
					id="paint5_linear_28_75"
					x1={69.1017 * widthRatio}
					y1={43.1909 * heightRatio}
					x2={69.1017 * widthRatio}
					y2={47.7118 * heightRatio}
					gradientUnits="userSpaceOnUse"
				>
					<stop stopColor="#C7F464" />
					<stop offset="1" stopColor="#4ECDC4" />
				</linearGradient>
				<linearGradient
					id="paint6_linear_28_75"
					x1={55.9608 * widthRatio}
					y1={49.9692 * heightRatio}
					x2={55.9608 * widthRatio}
					y2={81.7432 * heightRatio}
					gradientUnits="userSpaceOnUse"
				>
					<stop stopColor="#C7F464" />
					<stop offset="0.465" stopColor="#4ECDC4" />
					<stop offset="1" stopColor="#3300FF" />
				</linearGradient>
				<linearGradient
					id="paint7_linear_28_75"
					x1={68.0528 * widthRatio}
					y1={49.9692 * heightRatio}
					x2={68.0528 * widthRatio}
					y2={81.7432 * heightRatio}
					gradientUnits="userSpaceOnUse"
				>
					<stop stopColor="#C7F464" />
					<stop offset="0.465" stopColor="#4ECDC4" />
					<stop offset="1" stopColor="#3300FF" />
				</linearGradient>
				<linearGradient
					id="paint8_linear_28_75"
					x1={62.216 * widthRatio}
					y1={49.9692 * heightRatio}
					x2={62.216 * widthRatio}
					y2={83.249 * heightRatio}
					gradientUnits="userSpaceOnUse"
				>
					<stop stopColor="#C7F464" />
					<stop offset="0.465" stopColor="#4ECDC4" />
					<stop offset="1" stopColor="#3300FF" />
				</linearGradient>
				<linearGradient
					id="paint9_linear_28_75"
					x1={76.6215 * widthRatio}
					y1={53.0876 * heightRatio}
					x2={76.6215 * widthRatio}
					y2={81.2413 * heightRatio}
					gradientUnits="userSpaceOnUse"
				>
					<stop offset="0.165" stopColor="#C7F464" />
					<stop offset="0.63" stopColor="#4ECDC4" />
					<stop offset="0.89" stopColor="#3300FF" />
				</linearGradient>
				<linearGradient
					id="paint10_linear_28_75"
					x1={52.2964 * widthRatio}
					y1={49.5506 * heightRatio}
					x2={51.5636 * widthRatio}
					y2={82.1098 * heightRatio}
					gradientUnits="userSpaceOnUse"
				>
					<stop offset="0.215" stopColor="#C7F464" />
					<stop offset="0.540266" stopColor="#4ECDC4" />
					<stop offset="1" stopColor="#3300FF" />
				</linearGradient>
				<linearGradient
					id="paint11_linear_28_75"
					x1={52.7416 * widthRatio}
					y1={55.4919 * heightRatio}
					x2={49.0611 * widthRatio}
					y2={56.1603 * heightRatio}
					gradientUnits="userSpaceOnUse"
				>
					<stop offset="0.152881" stopColor="#2F3740" />
					<stop offset="1" stopColor="#2F3740" stopOpacity="0" />
				</linearGradient>
				<linearGradient
					id="paint12_linear_28_75"
					x1={71.9522 * widthRatio}
					y1={55.4919 * heightRatio}
					x2={75.6328 * widthRatio}
					y2={56.1603 * heightRatio}
					gradientUnits="userSpaceOnUse"
				>
					<stop offset="0.152881" stopColor="#2F3740" />
					<stop offset="1" stopColor="#2F3740" stopOpacity="0" />
				</linearGradient>
				<linearGradient
					id="paint13_linear_28_75"
					x1={71.5198 * widthRatio}
					y1={76.5244 * heightRatio}
					x2={75.2606 * widthRatio}
					y2={76.5308 * heightRatio}
					gradientUnits="userSpaceOnUse"
				>
					<stop offset="0.152881" stopColor="#2F3740" />
					<stop offset="1" stopColor="#2F3740" stopOpacity="0" />
				</linearGradient>
				<linearGradient
					id="paint14_linear_28_75"
					x1={53.0171 * widthRatio}
					y1={74.3267 * heightRatio}
					x2={47.6594 * widthRatio}
					y2={74.5189 * heightRatio}
					gradientUnits="userSpaceOnUse"
				>
					<stop offset="0.152881" stopColor="#2F3740" />
					<stop offset="1" stopColor="#2F3740" stopOpacity="0" />
				</linearGradient>
			</defs>
		</svg>
	);
}
