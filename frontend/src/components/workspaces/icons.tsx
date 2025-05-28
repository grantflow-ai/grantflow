function IconApplicationStepActive({ height = 15, width = 15, ...props }: React.HTMLProps<SVGSVGElement>) {
	return (
		<svg
			data-testid="icon-application-step-active"
			fill="none"
			height={height}
			viewBox="0 0 16 16"
			width={width}
			xmlns="http://www.w3.org/2000/svg"
			{...props}
		>
			<circle cx="8" cy="8" r="7.5" stroke="#1E13F8" />
			<circle cx="8" cy="8" fill="#1E13F8" r="2.5" />
		</svg>
	);
}

function IconApplicationStepDone({ height = 15, width = 15, ...props }: React.HTMLProps<SVGSVGElement>) {
	return (
		<svg
			data-testid="icon-application-step-done"
			fill="none"
			height={height}
			viewBox="0 0 16 16"
			width={width}
			xmlns="http://www.w3.org/2000/svg"
			{...props}
		>
			<circle cx="8" cy="8" fill="#1E13F8" r="8" />
			<path
				d="M5.08325 8.41669L6.74992 10.0834L10.9166 5.91669"
				stroke="white"
				strokeLinecap="round"
				strokeLinejoin="round"
				strokeWidth="2"
			/>
		</svg>
	);
}

function IconApplicationStepInActive({ height = 15, width = 15, ...props }: React.HTMLProps<SVGSVGElement>) {
	return (
		<svg
			data-testid="icon-application-step-inactive"
			fill="none"
			height={height}
			viewBox="0 0 16 16"
			width={width}
			xmlns="http://www.w3.org/2000/svg"
			{...props}
		>
			<circle cx="8" cy="8" r="7.5" stroke="#D5D3DF" />
		</svg>
	);
}

function IconApprove({ height = 16, width = 16, ...props }: React.HTMLProps<SVGSVGElement>) {
	return (
		<svg
			data-testid="icon-approve"
			fill="none"
			height={height}
			viewBox="0 0 16 16"
			width={width}
			xmlns="http://www.w3.org/2000/svg"
			{...props}
		>
			<mask
				height="16"
				id="mask0_2358_4481"
				maskUnits="userSpaceOnUse"
				style={{ maskType: "alpha" }}
				width="16"
				x="0"
				y="0"
			>
				<rect fill="#D9D9D9" height="16" width="16" />
			</mask>
			<g mask="url(#mask0_2358_4481)">
				<path
					d="M7.06634 11.0667L11.7663 6.36671L10.833 5.43337L7.06634 9.20004L5.16634 7.30004L4.23301 8.23337L7.06634 11.0667ZM7.99967 14.6667C7.07745 14.6667 6.21079 14.4917 5.39967 14.1417C4.58856 13.7917 3.88301 13.3167 3.28301 12.7167C2.68301 12.1167 2.20801 11.4112 1.85801 10.6C1.50801 9.78893 1.33301 8.92226 1.33301 8.00004C1.33301 7.07782 1.50801 6.21115 1.85801 5.40004C2.20801 4.58893 2.68301 3.88337 3.28301 3.28337C3.88301 2.68337 4.58856 2.20837 5.39967 1.85837C6.21079 1.50837 7.07745 1.33337 7.99967 1.33337C8.9219 1.33337 9.78856 1.50837 10.5997 1.85837C11.4108 2.20837 12.1163 2.68337 12.7163 3.28337C13.3163 3.88337 13.7913 4.58893 14.1413 5.40004C14.4913 6.21115 14.6663 7.07782 14.6663 8.00004C14.6663 8.92226 14.4913 9.78893 14.1413 10.6C13.7913 11.4112 13.3163 12.1167 12.7163 12.7167C12.1163 13.3167 11.4108 13.7917 10.5997 14.1417C9.78856 14.4917 8.9219 14.6667 7.99967 14.6667ZM7.99967 13.3334C9.48856 13.3334 10.7497 12.8167 11.783 11.7834C12.8163 10.75 13.333 9.48893 13.333 8.00004C13.333 6.51115 12.8163 5.25004 11.783 4.21671C10.7497 3.18337 9.48856 2.66671 7.99967 2.66671C6.51079 2.66671 5.24967 3.18337 4.21634 4.21671C3.18301 5.25004 2.66634 6.51115 2.66634 8.00004C2.66634 9.48893 3.18301 10.75 4.21634 11.7834C5.24967 12.8167 6.51079 13.3334 7.99967 13.3334Z"
					fill="white"
				/>
			</g>
		</svg>
	);
}

function IconButtonLogo({ height = 16, width = 16, ...props }: React.HTMLProps<SVGSVGElement>) {
	return (
		<svg
			data-testid="icon-button-logo"
			fill="currentColor"
			height={height}
			viewBox="0 0 16 16"
			width={width}
			xmlns="http://www.w3.org/2000/svg"
			{...props}
		>
			<ellipse cx="1.62126" cy="14.4104" fill="currentColor" rx="1.62126" ry="1.58958" />
			<ellipse cx="13.5813" cy="13.2638" fill="currentColor" rx="1.14286" ry="1.12052" />
			<ellipse cx="13.5813" cy="2.37129" fill="currentColor" rx="1.78073" ry="1.74593" />
			<ellipse cx="6.80398" cy="9.09444" fill="currentColor" rx="1.78073" ry="1.74593" />
			<path
				d="M16.0003 2.38437C16.0003 3.70121 14.9115 4.76873 13.5684 4.76873C12.2253 4.76873 11.1365 3.70121 11.1365 2.38437C11.1365 1.06752 12.2253 0 13.5684 0C14.9115 0 16.0003 1.06752 16.0003 2.38437ZM11.3797 2.38437C11.3797 3.56953 12.3596 4.53029 13.5684 4.53029C14.7772 4.53029 15.7571 3.56953 15.7571 2.38437C15.7571 1.1992 14.7772 0.238437 13.5684 0.238437C12.3596 0.238437 11.3797 1.1992 11.3797 2.38437Z"
				fill="currentColor"
			/>
			<path
				d="M11.3227 9.09452C11.3227 11.5411 9.29977 13.5245 6.8044 13.5245C4.30903 13.5245 2.28613 11.5411 2.28613 9.09452C2.28613 6.64792 4.30903 4.66455 6.8044 4.66455C9.29977 4.66455 11.3227 6.64792 11.3227 9.09452ZM2.73796 9.09452C2.73796 11.2965 4.55857 13.0815 6.8044 13.0815C9.05024 13.0815 10.8708 11.2965 10.8708 9.09452C10.8708 6.89258 9.05024 5.10755 6.8044 5.10755C4.55857 5.10755 2.73796 6.89258 2.73796 9.09452Z"
				fill="currentColor"
			/>
			<path
				d="M6.7373 9.17262L11.8669 4.09119"
				stroke="currentColor"
				strokeLinecap="square"
				strokeMiterlimit="1"
				strokeWidth="0.759494"
			/>
			<path d="M1.38184 14.6189L3.80044 12.1433" stroke="currentColor" strokeWidth="0.759494" />
			<path
				d="M7.00042 8.84778C6.82102 8.73914 6.58752 8.7965 6.47888 8.9759C6.37024 9.1553 6.4276 9.3888 6.607 9.49744L7.00042 8.84778ZM6.80371 9.17261L6.607 9.49744L13.3844 13.6017L13.5811 13.2768L13.7778 12.952L7.00042 8.84778L6.80371 9.17261Z"
				fill="currentColor"
			/>
		</svg>
	);
}

function IconDeadline({ height = 16, width = 16, ...props }: React.HTMLProps<SVGSVGElement>) {
	return (
		<svg
			data-testid="icon-deadline"
			fill="none"
			height={height}
			viewBox="0 0 16 16"
			width={width}
			xmlns="http://www.w3.org/2000/svg"
			{...props}
		>
			<mask
				height="16"
				id="mask0_2272_11722"
				maskUnits="userSpaceOnUse"
				style={{ maskType: "alpha" }}
				width="16"
				x="0"
				y="0"
			>
				<rect fill="#D9D9D9" height="16" width="16" />
			</mask>
			<g mask="url(#mask0_2272_11722)">
				<path
					d="M5.33329 13.3333H10.6666V11.3333C10.6666 10.6 10.4055 9.9722 9.88329 9.44998C9.36107 8.92776 8.73329 8.66665 7.99996 8.66665C7.26663 8.66665 6.63885 8.92776 6.11663 9.44998C5.5944 9.9722 5.33329 10.6 5.33329 11.3333V13.3333ZM2.66663 14.6666V13.3333H3.99996V11.3333C3.99996 10.6555 4.15829 10.0194 4.47496 9.42498C4.79163 8.83053 5.23329 8.35554 5.79996 7.99998C5.23329 7.64442 4.79163 7.16942 4.47496 6.57498C4.15829 5.98054 3.99996 5.34442 3.99996 4.66665V2.66665H2.66663V1.33331H13.3333V2.66665H12V4.66665C12 5.34442 11.8416 5.98054 11.525 6.57498C11.2083 7.16942 10.7666 7.64442 10.2 7.99998C10.7666 8.35554 11.2083 8.83053 11.525 9.42498C11.8416 10.0194 12 10.6555 12 11.3333V13.3333H13.3333V14.6666H2.66663Z"
					fill="#2E2D36"
				/>
			</g>
		</svg>
	);
}

export {
	IconApplicationStepActive,
	IconApplicationStepDone,
	IconApplicationStepInActive,
	IconApprove,
	IconButtonLogo,
	IconDeadline,
};
