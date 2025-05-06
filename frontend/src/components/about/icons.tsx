function IconDraft({ className, height = 15, width = 15, ...props }: React.HTMLProps<SVGSVGElement>) {
	return (
		<svg
			className={className}
			fill="currentColor"
			height={height}
			viewBox="0 -960 960 960"
			width={width}
			xmlns="http://www.w3.org/2000/svg"
			{...props}
		>
			<path d="M360-600v-80h360v80H360Zm0 120v-80h360v80H360Zm120 320H200h280Zm0 80H240q-50 0-85-35t-35-85v-120h120v-560h600v361q-20-2-40.5 1.5T760-505v-295H320v480h240l-80 80H200v40q0 17 11.5 28.5T240-160h240v80Zm80 0v-123l221-220q9-9 20-13t22-4q12 0 23 4.5t20 13.5l37 37q8 9 12.5 20t4.5 22q0 11-4 22.5T903-300L683-80H560Zm300-263-37-37 37 37ZM620-140h38l121-122-18-19-19-18-122 121v38Zm141-141-19-18 37 37-18-19Z" />
		</svg>
	);
}

function IconHourglass({ className, height = 15, width = 15, ...props }: React.HTMLProps<SVGSVGElement>) {
	return (
		<svg
			className={className}
			fill="currentColor"
			height={height}
			viewBox="0 -960 960 960"
			width={width}
			xmlns="http://www.w3.org/2000/svg"
			{...props}
		>
			<path d="M480-520q66 0 113-47t47-113v-120H320v120q0 66 47 113t113 47ZM160-80v-80h80v-120q0-61 28.5-114.5T348-480q-51-32-79.5-85.5T240-680v-120h-80v-80h640v80h-80v120q0 61-28.5 114.5T612-480q51 32 79.5 85.5T720-280v120h80v80H160Z" />
		</svg>
	);
}

function IconOrganize({ className, height = 15, width = 15, ...props }: React.HTMLProps<SVGSVGElement>) {
	return (
		<svg
			className={className}
			fill="currentColor"
			height={height}
			viewBox="0 -960 960 960"
			width={width}
			xmlns="http://www.w3.org/2000/svg"
			{...props}
		>
			<path d="M200-80q-33 0-56.5-23.5T120-160v-451q-18-11-29-28.5T80-680v-120q0-33 23.5-56.5T160-880h640q33 0 56.5 23.5T880-800v120q0 23-11 40.5T840-611v451q0 33-23.5 56.5T760-80H200Zm0-520v440h560v-440H200Zm-40-80h640v-120H160v120Zm200 280h240v-80H360v80Zm120 20Z" />
		</svg>
	);
}

function IconRefine({ className, height = 15, width = 15, ...props }: React.HTMLProps<SVGSVGElement>) {
	return (
		<svg
			className={className}
			fill="currentColor"
			height={height}
			viewBox="0 -960 960 960"
			width={width}
			xmlns="http://www.w3.org/2000/svg"
			{...props}
		>
			<path d="m354-287 126-76 126 77-33-144 111-96-146-13-58-136-58 135-146 13 111 97-33 143ZM233-120l65-281L80-590l288-25 112-265 112 265 288 25-218 189 65 281-247-149-247 149Zm457-560 21-89-71-59 94-8 36-84 36 84 94 8-71 59 21 89-80-47-80 47ZM480-481Z" />
		</svg>
	);
}

export { IconDraft, IconHourglass, IconOrganize, IconRefine };
