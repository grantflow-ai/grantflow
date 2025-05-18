import { cn } from "@/lib/utils";

const MAP_GRADIENT_CENTER = {
	"bottom-left": { centerX: "0%", centerY: "80%" },
	"bottom-right": { centerX: "100%", centerY: "80%" },
	"top-left": { centerX: "0%", centerY: "0%" },
	"top-right": { centerX: "100%", centerY: "0%" },
};

function GradientBackground({
	className,
	position = "bottom-right",
	...rest
}: {
	position?: "bottom-left" | "bottom-right" | "top-left" | "top-right";
} & React.HTMLAttributes<HTMLDivElement>) {
	const { centerX, centerY } = MAP_GRADIENT_CENTER[position];

	return (
		<div
			className={cn("opacity-70", className)}
			style={{
				background: `radial-gradient(60% 100% at ${centerX} ${centerY}, var(--primary) 0%, transparent 100%)`,
			}}
			{...rest}
		></div>
	);
}

function PatternedBackground({ className, ...props }: React.HTMLProps<SVGSVGElement>) {
	return (
		<svg
			className={cn("w-full h-full", className)}
			fill="none"
			preserveAspectRatio="xMidYMid slice"
			viewBox="0 0 1440 1024"
			xmlns="http://www.w3.org/2000/svg"
			{...props}
		>
			<path
				d="M5.04894 4.75H0.951062L3 1.4717L5.04894 4.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M19.0489 4.75H14.9511L17 1.4717L19.0489 4.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M33.0489 4.75H28.9511L31 1.4717L33.0489 4.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M47.0489 4.75H42.9511L45 1.4717L47.0489 4.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M61.0489 4.75H56.9511L59 1.4717L61.0489 4.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M75.0489 4.75H70.9511L73 1.4717L75.0489 4.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M89.0489 4.75H84.9511L87 1.4717L89.0489 4.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M103.049 4.75H98.9511L101 1.4717L103.049 4.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M117.049 4.75H112.951L115 1.4717L117.049 4.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M131.049 4.75H126.951L129 1.4717L131.049 4.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M145.049 4.75H140.951L143 1.4717L145.049 4.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M159.049 4.75H154.951L157 1.4717L159.049 4.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M173.049 4.75H168.951L171 1.4717L173.049 4.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M187.049 4.75H182.951L185 1.4717L187.049 4.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M201.049 4.75H196.951L199 1.4717L201.049 4.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M215.049 4.75H210.951L213 1.4717L215.049 4.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M229.049 4.75H224.951L227 1.4717L229.049 4.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M243.049 4.75H238.951L241 1.4717L243.049 4.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M257.049 4.75H252.951L255 1.4717L257.049 4.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M271.049 4.75H266.951L269 1.4717L271.049 4.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M285.049 4.75H280.951L283 1.4717L285.049 4.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M299.049 4.75H294.951L297 1.4717L299.049 4.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M313.049 4.75H308.951L311 1.4717L313.049 4.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M327.049 4.75H322.951L325 1.4717L327.049 4.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M341.049 4.75H336.951L339 1.4717L341.049 4.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M355.049 4.75H350.951L353 1.4717L355.049 4.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M369.049 4.75H364.951L367 1.4717L369.049 4.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M383.049 4.75H378.951L381 1.4717L383.049 4.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M397.049 4.75H392.951L395 1.4717L397.049 4.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M411.049 4.75H406.951L409 1.4717L411.049 4.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M425.049 4.75H420.951L423 1.4717L425.049 4.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M439.049 4.75H434.951L437 1.4717L439.049 4.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M453.049 4.75H448.951L451 1.4717L453.049 4.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M467.049 4.75H462.951L465 1.4717L467.049 4.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M481.049 4.75H476.951L479 1.4717L481.049 4.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M495.049 4.75H490.951L493 1.4717L495.049 4.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M509.049 4.75H504.951L507 1.4717L509.049 4.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M523.049 4.75H518.951L521 1.4717L523.049 4.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M537.049 4.75H532.951L535 1.4717L537.049 4.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M551.049 4.75H546.951L549 1.4717L551.049 4.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M565.049 4.75H560.951L563 1.4717L565.049 4.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M579.049 4.75H574.951L577 1.4717L579.049 4.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M593.049 4.75H588.951L591 1.4717L593.049 4.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M607.049 4.75H602.951L605 1.4717L607.049 4.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M621.049 4.75H616.951L619 1.4717L621.049 4.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M635.049 4.75H630.951L633 1.4717L635.049 4.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M649.049 4.75H644.951L647 1.4717L649.049 4.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M663.049 4.75H658.951L661 1.4717L663.049 4.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M677.049 4.75H672.951L675 1.4717L677.049 4.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M691.049 4.75H686.951L689 1.4717L691.049 4.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M705.049 4.75H700.951L703 1.4717L705.049 4.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M719.049 4.75H714.951L717 1.4717L719.049 4.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M733.049 4.75H728.951L731 1.4717L733.049 4.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M747.049 4.75H742.951L745 1.4717L747.049 4.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M761.049 4.75H756.951L759 1.4717L761.049 4.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M775.049 4.75H770.951L773 1.4717L775.049 4.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M789.049 4.75H784.951L787 1.4717L789.049 4.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M803.049 4.75H798.951L801 1.4717L803.049 4.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M817.049 4.75H812.951L815 1.4717L817.049 4.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M831.049 4.75H826.951L829 1.4717L831.049 4.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M845.049 4.75H840.951L843 1.4717L845.049 4.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M859.049 4.75H854.951L857 1.4717L859.049 4.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M873.049 4.75H868.951L871 1.4717L873.049 4.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M887.049 4.75H882.951L885 1.4717L887.049 4.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M901.049 4.75H896.951L899 1.4717L901.049 4.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M915.049 4.75H910.951L913 1.4717L915.049 4.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M929.049 4.75H924.951L927 1.4717L929.049 4.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M943.049 4.75H938.951L941 1.4717L943.049 4.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M957.049 4.75H952.951L955 1.4717L957.049 4.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M971.049 4.75H966.951L969 1.4717L971.049 4.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M985.049 4.75H980.951L983 1.4717L985.049 4.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M999.049 4.75H994.951L997 1.4717L999.049 4.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1013.05 4.75H1008.95L1011 1.4717L1013.05 4.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1027.05 4.75H1022.95L1025 1.4717L1027.05 4.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1041.05 4.75H1036.95L1039 1.4717L1041.05 4.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1055.05 4.75H1050.95L1053 1.4717L1055.05 4.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1069.05 4.75H1064.95L1067 1.4717L1069.05 4.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1083.05 4.75H1078.95L1081 1.4717L1083.05 4.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1097.05 4.75H1092.95L1095 1.4717L1097.05 4.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1111.05 4.75H1106.95L1109 1.4717L1111.05 4.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1125.05 4.75H1120.95L1123 1.4717L1125.05 4.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1139.05 4.75H1134.95L1137 1.4717L1139.05 4.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1153.05 4.75H1148.95L1151 1.4717L1153.05 4.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1167.05 4.75H1162.95L1165 1.4717L1167.05 4.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1181.05 4.75H1176.95L1179 1.4717L1181.05 4.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1195.05 4.75H1190.95L1193 1.4717L1195.05 4.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1209.05 4.75H1204.95L1207 1.4717L1209.05 4.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1223.05 4.75H1218.95L1221 1.4717L1223.05 4.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1237.05 4.75H1232.95L1235 1.4717L1237.05 4.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1251.05 4.75H1246.95L1249 1.4717L1251.05 4.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1265.05 4.75H1260.95L1263 1.4717L1265.05 4.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1279.05 4.75H1274.95L1277 1.4717L1279.05 4.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1293.05 4.75H1288.95L1291 1.4717L1293.05 4.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1307.05 4.75H1302.95L1305 1.4717L1307.05 4.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1321.05 4.75H1316.95L1319 1.4717L1321.05 4.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1335.05 4.75H1330.95L1333 1.4717L1335.05 4.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1349.05 4.75H1344.95L1347 1.4717L1349.05 4.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1363.05 4.75H1358.95L1361 1.4717L1363.05 4.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1377.05 4.75H1372.95L1375 1.4717L1377.05 4.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1391.05 4.75H1386.95L1389 1.4717L1391.05 4.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1405.05 4.75H1400.95L1403 1.4717L1405.05 4.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1419.05 4.75H1414.95L1417 1.4717L1419.05 4.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1433.05 4.75H1428.95L1431 1.4717L1433.05 4.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M5.04894 20.75H0.951062L3 17.4717L5.04894 20.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M19.0489 20.75H14.9511L17 17.4717L19.0489 20.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M33.0489 20.75H28.9511L31 17.4717L33.0489 20.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M47.0489 20.75H42.9511L45 17.4717L47.0489 20.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M61.0489 20.75H56.9511L59 17.4717L61.0489 20.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M75.0489 20.75H70.9511L73 17.4717L75.0489 20.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M89.0489 20.75H84.9511L87 17.4717L89.0489 20.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M103.049 20.75H98.9511L101 17.4717L103.049 20.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M117.049 20.75H112.951L115 17.4717L117.049 20.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M131.049 20.75H126.951L129 17.4717L131.049 20.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M145.049 20.75H140.951L143 17.4717L145.049 20.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M159.049 20.75H154.951L157 17.4717L159.049 20.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M173.049 20.75H168.951L171 17.4717L173.049 20.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M187.049 20.75H182.951L185 17.4717L187.049 20.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M201.049 20.75H196.951L199 17.4717L201.049 20.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M215.049 20.75H210.951L213 17.4717L215.049 20.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M229.049 20.75H224.951L227 17.4717L229.049 20.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M243.049 20.75H238.951L241 17.4717L243.049 20.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M257.049 20.75H252.951L255 17.4717L257.049 20.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M271.049 20.75H266.951L269 17.4717L271.049 20.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M285.049 20.75H280.951L283 17.4717L285.049 20.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M299.049 20.75H294.951L297 17.4717L299.049 20.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M313.049 20.75H308.951L311 17.4717L313.049 20.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M327.049 20.75H322.951L325 17.4717L327.049 20.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M341.049 20.75H336.951L339 17.4717L341.049 20.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M355.049 20.75H350.951L353 17.4717L355.049 20.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M369.049 20.75H364.951L367 17.4717L369.049 20.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M383.049 20.75H378.951L381 17.4717L383.049 20.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M397.049 20.75H392.951L395 17.4717L397.049 20.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M411.049 20.75H406.951L409 17.4717L411.049 20.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M425.049 20.75H420.951L423 17.4717L425.049 20.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M439.049 20.75H434.951L437 17.4717L439.049 20.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M453.049 20.75H448.951L451 17.4717L453.049 20.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M467.049 20.75H462.951L465 17.4717L467.049 20.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M481.049 20.75H476.951L479 17.4717L481.049 20.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M495.049 20.75H490.951L493 17.4717L495.049 20.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M509.049 20.75H504.951L507 17.4717L509.049 20.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M523.049 20.75H518.951L521 17.4717L523.049 20.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M537.049 20.75H532.951L535 17.4717L537.049 20.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M551.049 20.75H546.951L549 17.4717L551.049 20.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M565.049 20.75H560.951L563 17.4717L565.049 20.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M579.049 20.75H574.951L577 17.4717L579.049 20.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M593.049 20.75H588.951L591 17.4717L593.049 20.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M607.049 20.75H602.951L605 17.4717L607.049 20.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M621.049 20.75H616.951L619 17.4717L621.049 20.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M635.049 20.75H630.951L633 17.4717L635.049 20.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M649.049 20.75H644.951L647 17.4717L649.049 20.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M663.049 20.75H658.951L661 17.4717L663.049 20.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M677.049 20.75H672.951L675 17.4717L677.049 20.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M691.049 20.75H686.951L689 17.4717L691.049 20.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M705.049 20.75H700.951L703 17.4717L705.049 20.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M719.049 20.75H714.951L717 17.4717L719.049 20.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M733.049 20.75H728.951L731 17.4717L733.049 20.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M747.049 20.75H742.951L745 17.4717L747.049 20.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M761.049 20.75H756.951L759 17.4717L761.049 20.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M775.049 20.75H770.951L773 17.4717L775.049 20.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M789.049 20.75H784.951L787 17.4717L789.049 20.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M803.049 20.75H798.951L801 17.4717L803.049 20.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M817.049 20.75H812.951L815 17.4717L817.049 20.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M831.049 20.75H826.951L829 17.4717L831.049 20.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M845.049 20.75H840.951L843 17.4717L845.049 20.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M859.049 20.75H854.951L857 17.4717L859.049 20.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M873.049 20.75H868.951L871 17.4717L873.049 20.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M887.049 20.75H882.951L885 17.4717L887.049 20.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M901.049 20.75H896.951L899 17.4717L901.049 20.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M915.049 20.75H910.951L913 17.4717L915.049 20.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M929.049 20.75H924.951L927 17.4717L929.049 20.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M943.049 20.75H938.951L941 17.4717L943.049 20.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M957.049 20.75H952.951L955 17.4717L957.049 20.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M971.049 20.75H966.951L969 17.4717L971.049 20.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M985.049 20.75H980.951L983 17.4717L985.049 20.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M999.049 20.75H994.951L997 17.4717L999.049 20.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1013.05 20.75H1008.95L1011 17.4717L1013.05 20.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1027.05 20.75H1022.95L1025 17.4717L1027.05 20.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1041.05 20.75H1036.95L1039 17.4717L1041.05 20.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1055.05 20.75H1050.95L1053 17.4717L1055.05 20.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1069.05 20.75H1064.95L1067 17.4717L1069.05 20.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1083.05 20.75H1078.95L1081 17.4717L1083.05 20.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1097.05 20.75H1092.95L1095 17.4717L1097.05 20.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1111.05 20.75H1106.95L1109 17.4717L1111.05 20.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1125.05 20.75H1120.95L1123 17.4717L1125.05 20.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1139.05 20.75H1134.95L1137 17.4717L1139.05 20.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1153.05 20.75H1148.95L1151 17.4717L1153.05 20.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1167.05 20.75H1162.95L1165 17.4717L1167.05 20.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1181.05 20.75H1176.95L1179 17.4717L1181.05 20.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1195.05 20.75H1190.95L1193 17.4717L1195.05 20.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1209.05 20.75H1204.95L1207 17.4717L1209.05 20.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1223.05 20.75H1218.95L1221 17.4717L1223.05 20.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1237.05 20.75H1232.95L1235 17.4717L1237.05 20.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1251.05 20.75H1246.95L1249 17.4717L1251.05 20.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1265.05 20.75H1260.95L1263 17.4717L1265.05 20.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1279.05 20.75H1274.95L1277 17.4717L1279.05 20.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1293.05 20.75H1288.95L1291 17.4717L1293.05 20.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1307.05 20.75H1302.95L1305 17.4717L1307.05 20.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1321.05 20.75H1316.95L1319 17.4717L1321.05 20.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1335.05 20.75H1330.95L1333 17.4717L1335.05 20.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1349.05 20.75H1344.95L1347 17.4717L1349.05 20.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1363.05 20.75H1358.95L1361 17.4717L1363.05 20.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1377.05 20.75H1372.95L1375 17.4717L1377.05 20.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1391.05 20.75H1386.95L1389 17.4717L1391.05 20.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1405.05 20.75H1400.95L1403 17.4717L1405.05 20.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1419.05 20.75H1414.95L1417 17.4717L1419.05 20.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1433.05 20.75H1428.95L1431 17.4717L1433.05 20.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M5.04894 36.75H0.951062L3 33.4717L5.04894 36.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M19.0489 36.75H14.9511L17 33.4717L19.0489 36.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M33.0489 36.75H28.9511L31 33.4717L33.0489 36.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M47.0489 36.75H42.9511L45 33.4717L47.0489 36.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M61.0489 36.75H56.9511L59 33.4717L61.0489 36.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M75.0489 36.75H70.9511L73 33.4717L75.0489 36.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M89.0489 36.75H84.9511L87 33.4717L89.0489 36.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M103.049 36.75H98.9511L101 33.4717L103.049 36.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M117.049 36.75H112.951L115 33.4717L117.049 36.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M131.049 36.75H126.951L129 33.4717L131.049 36.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M145.049 36.75H140.951L143 33.4717L145.049 36.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M159.049 36.75H154.951L157 33.4717L159.049 36.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M173.049 36.75H168.951L171 33.4717L173.049 36.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M187.049 36.75H182.951L185 33.4717L187.049 36.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M201.049 36.75H196.951L199 33.4717L201.049 36.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M215.049 36.75H210.951L213 33.4717L215.049 36.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M229.049 36.75H224.951L227 33.4717L229.049 36.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M243.049 36.75H238.951L241 33.4717L243.049 36.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M257.049 36.75H252.951L255 33.4717L257.049 36.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M271.049 36.75H266.951L269 33.4717L271.049 36.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M285.049 36.75H280.951L283 33.4717L285.049 36.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M299.049 36.75H294.951L297 33.4717L299.049 36.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M313.049 36.75H308.951L311 33.4717L313.049 36.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M327.049 36.75H322.951L325 33.4717L327.049 36.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M341.049 36.75H336.951L339 33.4717L341.049 36.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M355.049 36.75H350.951L353 33.4717L355.049 36.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M369.049 36.75H364.951L367 33.4717L369.049 36.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M383.049 36.75H378.951L381 33.4717L383.049 36.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M397.049 36.75H392.951L395 33.4717L397.049 36.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M411.049 36.75H406.951L409 33.4717L411.049 36.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M425.049 36.75H420.951L423 33.4717L425.049 36.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M439.049 36.75H434.951L437 33.4717L439.049 36.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M453.049 36.75H448.951L451 33.4717L453.049 36.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M467.049 36.75H462.951L465 33.4717L467.049 36.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M481.049 36.75H476.951L479 33.4717L481.049 36.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M495.049 36.75H490.951L493 33.4717L495.049 36.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M509.049 36.75H504.951L507 33.4717L509.049 36.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M523.049 36.75H518.951L521 33.4717L523.049 36.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M537.049 36.75H532.951L535 33.4717L537.049 36.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M551.049 36.75H546.951L549 33.4717L551.049 36.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M565.049 36.75H560.951L563 33.4717L565.049 36.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M579.049 36.75H574.951L577 33.4717L579.049 36.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M593.049 36.75H588.951L591 33.4717L593.049 36.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M607.049 36.75H602.951L605 33.4717L607.049 36.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M621.049 36.75H616.951L619 33.4717L621.049 36.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M635.049 36.75H630.951L633 33.4717L635.049 36.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M649.049 36.75H644.951L647 33.4717L649.049 36.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M663.049 36.75H658.951L661 33.4717L663.049 36.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M677.049 36.75H672.951L675 33.4717L677.049 36.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M691.049 36.75H686.951L689 33.4717L691.049 36.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M705.049 36.75H700.951L703 33.4717L705.049 36.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M719.049 36.75H714.951L717 33.4717L719.049 36.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M733.049 36.75H728.951L731 33.4717L733.049 36.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M747.049 36.75H742.951L745 33.4717L747.049 36.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M761.049 36.75H756.951L759 33.4717L761.049 36.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M775.049 36.75H770.951L773 33.4717L775.049 36.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M789.049 36.75H784.951L787 33.4717L789.049 36.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M803.049 36.75H798.951L801 33.4717L803.049 36.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M817.049 36.75H812.951L815 33.4717L817.049 36.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M831.049 36.75H826.951L829 33.4717L831.049 36.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M845.049 36.75H840.951L843 33.4717L845.049 36.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M859.049 36.75H854.951L857 33.4717L859.049 36.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M873.049 36.75H868.951L871 33.4717L873.049 36.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M887.049 36.75H882.951L885 33.4717L887.049 36.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M901.049 36.75H896.951L899 33.4717L901.049 36.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M915.049 36.75H910.951L913 33.4717L915.049 36.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M929.049 36.75H924.951L927 33.4717L929.049 36.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M943.049 36.75H938.951L941 33.4717L943.049 36.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M957.049 36.75H952.951L955 33.4717L957.049 36.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M971.049 36.75H966.951L969 33.4717L971.049 36.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M985.049 36.75H980.951L983 33.4717L985.049 36.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M999.049 36.75H994.951L997 33.4717L999.049 36.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1013.05 36.75H1008.95L1011 33.4717L1013.05 36.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1027.05 36.75H1022.95L1025 33.4717L1027.05 36.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1041.05 36.75H1036.95L1039 33.4717L1041.05 36.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1055.05 36.75H1050.95L1053 33.4717L1055.05 36.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1069.05 36.75H1064.95L1067 33.4717L1069.05 36.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1083.05 36.75H1078.95L1081 33.4717L1083.05 36.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1097.05 36.75H1092.95L1095 33.4717L1097.05 36.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1111.05 36.75H1106.95L1109 33.4717L1111.05 36.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1125.05 36.75H1120.95L1123 33.4717L1125.05 36.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1139.05 36.75H1134.95L1137 33.4717L1139.05 36.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1153.05 36.75H1148.95L1151 33.4717L1153.05 36.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1167.05 36.75H1162.95L1165 33.4717L1167.05 36.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1181.05 36.75H1176.95L1179 33.4717L1181.05 36.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1195.05 36.75H1190.95L1193 33.4717L1195.05 36.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1209.05 36.75H1204.95L1207 33.4717L1209.05 36.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1223.05 36.75H1218.95L1221 33.4717L1223.05 36.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1237.05 36.75H1232.95L1235 33.4717L1237.05 36.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1251.05 36.75H1246.95L1249 33.4717L1251.05 36.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1265.05 36.75H1260.95L1263 33.4717L1265.05 36.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1279.05 36.75H1274.95L1277 33.4717L1279.05 36.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1293.05 36.75H1288.95L1291 33.4717L1293.05 36.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1307.05 36.75H1302.95L1305 33.4717L1307.05 36.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1321.05 36.75H1316.95L1319 33.4717L1321.05 36.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1335.05 36.75H1330.95L1333 33.4717L1335.05 36.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1349.05 36.75H1344.95L1347 33.4717L1349.05 36.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1363.05 36.75H1358.95L1361 33.4717L1363.05 36.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1377.05 36.75H1372.95L1375 33.4717L1377.05 36.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1391.05 36.75H1386.95L1389 33.4717L1391.05 36.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1405.05 36.75H1400.95L1403 33.4717L1405.05 36.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1419.05 36.75H1414.95L1417 33.4717L1419.05 36.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1433.05 36.75H1428.95L1431 33.4717L1433.05 36.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M5.04894 52.75H0.951062L3 49.4717L5.04894 52.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M19.0489 52.75H14.9511L17 49.4717L19.0489 52.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M33.0489 52.75H28.9511L31 49.4717L33.0489 52.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M47.0489 52.75H42.9511L45 49.4717L47.0489 52.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M61.0489 52.75H56.9511L59 49.4717L61.0489 52.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M75.0489 52.75H70.9511L73 49.4717L75.0489 52.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M89.0489 52.75H84.9511L87 49.4717L89.0489 52.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M103.049 52.75H98.9511L101 49.4717L103.049 52.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M117.049 52.75H112.951L115 49.4717L117.049 52.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M131.049 52.75H126.951L129 49.4717L131.049 52.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M145.049 52.75H140.951L143 49.4717L145.049 52.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M159.049 52.75H154.951L157 49.4717L159.049 52.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M173.049 52.75H168.951L171 49.4717L173.049 52.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M187.049 52.75H182.951L185 49.4717L187.049 52.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M201.049 52.75H196.951L199 49.4717L201.049 52.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M215.049 52.75H210.951L213 49.4717L215.049 52.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M229.049 52.75H224.951L227 49.4717L229.049 52.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M243.049 52.75H238.951L241 49.4717L243.049 52.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M257.049 52.75H252.951L255 49.4717L257.049 52.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M271.049 52.75H266.951L269 49.4717L271.049 52.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M285.049 52.75H280.951L283 49.4717L285.049 52.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M299.049 52.75H294.951L297 49.4717L299.049 52.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M313.049 52.75H308.951L311 49.4717L313.049 52.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M327.049 52.75H322.951L325 49.4717L327.049 52.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M341.049 52.75H336.951L339 49.4717L341.049 52.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M355.049 52.75H350.951L353 49.4717L355.049 52.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M369.049 52.75H364.951L367 49.4717L369.049 52.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M383.049 52.75H378.951L381 49.4717L383.049 52.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M397.049 52.75H392.951L395 49.4717L397.049 52.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M411.049 52.75H406.951L409 49.4717L411.049 52.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M425.049 52.75H420.951L423 49.4717L425.049 52.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M439.049 52.75H434.951L437 49.4717L439.049 52.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M453.049 52.75H448.951L451 49.4717L453.049 52.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M467.049 52.75H462.951L465 49.4717L467.049 52.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M481.049 52.75H476.951L479 49.4717L481.049 52.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M495.049 52.75H490.951L493 49.4717L495.049 52.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M509.049 52.75H504.951L507 49.4717L509.049 52.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M523.049 52.75H518.951L521 49.4717L523.049 52.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M537.049 52.75H532.951L535 49.4717L537.049 52.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M551.049 52.75H546.951L549 49.4717L551.049 52.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M565.049 52.75H560.951L563 49.4717L565.049 52.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M579.049 52.75H574.951L577 49.4717L579.049 52.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M593.049 52.75H588.951L591 49.4717L593.049 52.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M607.049 52.75H602.951L605 49.4717L607.049 52.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M621.049 52.75H616.951L619 49.4717L621.049 52.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M635.049 52.75H630.951L633 49.4717L635.049 52.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M649.049 52.75H644.951L647 49.4717L649.049 52.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M663.049 52.75H658.951L661 49.4717L663.049 52.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M677.049 52.75H672.951L675 49.4717L677.049 52.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M691.049 52.75H686.951L689 49.4717L691.049 52.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M705.049 52.75H700.951L703 49.4717L705.049 52.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M719.049 52.75H714.951L717 49.4717L719.049 52.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M733.049 52.75H728.951L731 49.4717L733.049 52.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M747.049 52.75H742.951L745 49.4717L747.049 52.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M761.049 52.75H756.951L759 49.4717L761.049 52.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M775.049 52.75H770.951L773 49.4717L775.049 52.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M789.049 52.75H784.951L787 49.4717L789.049 52.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M803.049 52.75H798.951L801 49.4717L803.049 52.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M817.049 52.75H812.951L815 49.4717L817.049 52.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M831.049 52.75H826.951L829 49.4717L831.049 52.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M845.049 52.75H840.951L843 49.4717L845.049 52.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M859.049 52.75H854.951L857 49.4717L859.049 52.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M873.049 52.75H868.951L871 49.4717L873.049 52.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M887.049 52.75H882.951L885 49.4717L887.049 52.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M901.049 52.75H896.951L899 49.4717L901.049 52.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M915.049 52.75H910.951L913 49.4717L915.049 52.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M929.049 52.75H924.951L927 49.4717L929.049 52.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M943.049 52.75H938.951L941 49.4717L943.049 52.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M957.049 52.75H952.951L955 49.4717L957.049 52.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M971.049 52.75H966.951L969 49.4717L971.049 52.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M985.049 52.75H980.951L983 49.4717L985.049 52.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M999.049 52.75H994.951L997 49.4717L999.049 52.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1013.05 52.75H1008.95L1011 49.4717L1013.05 52.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1027.05 52.75H1022.95L1025 49.4717L1027.05 52.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1041.05 52.75H1036.95L1039 49.4717L1041.05 52.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1055.05 52.75H1050.95L1053 49.4717L1055.05 52.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1069.05 52.75H1064.95L1067 49.4717L1069.05 52.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1083.05 52.75H1078.95L1081 49.4717L1083.05 52.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1097.05 52.75H1092.95L1095 49.4717L1097.05 52.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1111.05 52.75H1106.95L1109 49.4717L1111.05 52.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1125.05 52.75H1120.95L1123 49.4717L1125.05 52.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1139.05 52.75H1134.95L1137 49.4717L1139.05 52.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1153.05 52.75H1148.95L1151 49.4717L1153.05 52.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1167.05 52.75H1162.95L1165 49.4717L1167.05 52.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1181.05 52.75H1176.95L1179 49.4717L1181.05 52.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1195.05 52.75H1190.95L1193 49.4717L1195.05 52.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1209.05 52.75H1204.95L1207 49.4717L1209.05 52.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1223.05 52.75H1218.95L1221 49.4717L1223.05 52.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1237.05 52.75H1232.95L1235 49.4717L1237.05 52.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1251.05 52.75H1246.95L1249 49.4717L1251.05 52.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1265.05 52.75H1260.95L1263 49.4717L1265.05 52.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1279.05 52.75H1274.95L1277 49.4717L1279.05 52.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1293.05 52.75H1288.95L1291 49.4717L1293.05 52.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1307.05 52.75H1302.95L1305 49.4717L1307.05 52.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1321.05 52.75H1316.95L1319 49.4717L1321.05 52.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1335.05 52.75H1330.95L1333 49.4717L1335.05 52.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1349.05 52.75H1344.95L1347 49.4717L1349.05 52.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1363.05 52.75H1358.95L1361 49.4717L1363.05 52.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1377.05 52.75H1372.95L1375 49.4717L1377.05 52.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1391.05 52.75H1386.95L1389 49.4717L1391.05 52.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1405.05 52.75H1400.95L1403 49.4717L1405.05 52.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1419.05 52.75H1414.95L1417 49.4717L1419.05 52.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1433.05 52.75H1428.95L1431 49.4717L1433.05 52.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M5.04894 68.75H0.951062L3 65.4717L5.04894 68.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M19.0489 68.75H14.9511L17 65.4717L19.0489 68.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M33.0489 68.75H28.9511L31 65.4717L33.0489 68.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M47.0489 68.75H42.9511L45 65.4717L47.0489 68.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M61.0489 68.75H56.9511L59 65.4717L61.0489 68.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M75.0489 68.75H70.9511L73 65.4717L75.0489 68.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M89.0489 68.75H84.9511L87 65.4717L89.0489 68.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M103.049 68.75H98.9511L101 65.4717L103.049 68.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M117.049 68.75H112.951L115 65.4717L117.049 68.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M131.049 68.75H126.951L129 65.4717L131.049 68.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M145.049 68.75H140.951L143 65.4717L145.049 68.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M159.049 68.75H154.951L157 65.4717L159.049 68.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M173.049 68.75H168.951L171 65.4717L173.049 68.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M187.049 68.75H182.951L185 65.4717L187.049 68.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M201.049 68.75H196.951L199 65.4717L201.049 68.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M215.049 68.75H210.951L213 65.4717L215.049 68.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M229.049 68.75H224.951L227 65.4717L229.049 68.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M243.049 68.75H238.951L241 65.4717L243.049 68.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M257.049 68.75H252.951L255 65.4717L257.049 68.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M271.049 68.75H266.951L269 65.4717L271.049 68.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M285.049 68.75H280.951L283 65.4717L285.049 68.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M299.049 68.75H294.951L297 65.4717L299.049 68.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M313.049 68.75H308.951L311 65.4717L313.049 68.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M327.049 68.75H322.951L325 65.4717L327.049 68.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M341.049 68.75H336.951L339 65.4717L341.049 68.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M355.049 68.75H350.951L353 65.4717L355.049 68.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M369.049 68.75H364.951L367 65.4717L369.049 68.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M383.049 68.75H378.951L381 65.4717L383.049 68.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M397.049 68.75H392.951L395 65.4717L397.049 68.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M411.049 68.75H406.951L409 65.4717L411.049 68.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M425.049 68.75H420.951L423 65.4717L425.049 68.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M439.049 68.75H434.951L437 65.4717L439.049 68.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M453.049 68.75H448.951L451 65.4717L453.049 68.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M467.049 68.75H462.951L465 65.4717L467.049 68.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M481.049 68.75H476.951L479 65.4717L481.049 68.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M495.049 68.75H490.951L493 65.4717L495.049 68.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M509.049 68.75H504.951L507 65.4717L509.049 68.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M523.049 68.75H518.951L521 65.4717L523.049 68.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M537.049 68.75H532.951L535 65.4717L537.049 68.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M551.049 68.75H546.951L549 65.4717L551.049 68.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M565.049 68.75H560.951L563 65.4717L565.049 68.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M579.049 68.75H574.951L577 65.4717L579.049 68.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M593.049 68.75H588.951L591 65.4717L593.049 68.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M607.049 68.75H602.951L605 65.4717L607.049 68.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M621.049 68.75H616.951L619 65.4717L621.049 68.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M635.049 68.75H630.951L633 65.4717L635.049 68.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M649.049 68.75H644.951L647 65.4717L649.049 68.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M663.049 68.75H658.951L661 65.4717L663.049 68.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M677.049 68.75H672.951L675 65.4717L677.049 68.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M691.049 68.75H686.951L689 65.4717L691.049 68.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M705.049 68.75H700.951L703 65.4717L705.049 68.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M719.049 68.75H714.951L717 65.4717L719.049 68.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M733.049 68.75H728.951L731 65.4717L733.049 68.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M747.049 68.75H742.951L745 65.4717L747.049 68.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M761.049 68.75H756.951L759 65.4717L761.049 68.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M775.049 68.75H770.951L773 65.4717L775.049 68.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M789.049 68.75H784.951L787 65.4717L789.049 68.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M803.049 68.75H798.951L801 65.4717L803.049 68.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M817.049 68.75H812.951L815 65.4717L817.049 68.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M831.049 68.75H826.951L829 65.4717L831.049 68.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M845.049 68.75H840.951L843 65.4717L845.049 68.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M859.049 68.75H854.951L857 65.4717L859.049 68.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M873.049 68.75H868.951L871 65.4717L873.049 68.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M887.049 68.75H882.951L885 65.4717L887.049 68.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M901.049 68.75H896.951L899 65.4717L901.049 68.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M915.049 68.75H910.951L913 65.4717L915.049 68.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M929.049 68.75H924.951L927 65.4717L929.049 68.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M943.049 68.75H938.951L941 65.4717L943.049 68.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M957.049 68.75H952.951L955 65.4717L957.049 68.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M971.049 68.75H966.951L969 65.4717L971.049 68.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M985.049 68.75H980.951L983 65.4717L985.049 68.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M999.049 68.75H994.951L997 65.4717L999.049 68.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1013.05 68.75H1008.95L1011 65.4717L1013.05 68.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1027.05 68.75H1022.95L1025 65.4717L1027.05 68.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1041.05 68.75H1036.95L1039 65.4717L1041.05 68.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1055.05 68.75H1050.95L1053 65.4717L1055.05 68.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1069.05 68.75H1064.95L1067 65.4717L1069.05 68.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1083.05 68.75H1078.95L1081 65.4717L1083.05 68.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1097.05 68.75H1092.95L1095 65.4717L1097.05 68.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1111.05 68.75H1106.95L1109 65.4717L1111.05 68.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1125.05 68.75H1120.95L1123 65.4717L1125.05 68.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1139.05 68.75H1134.95L1137 65.4717L1139.05 68.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1153.05 68.75H1148.95L1151 65.4717L1153.05 68.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1167.05 68.75H1162.95L1165 65.4717L1167.05 68.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1181.05 68.75H1176.95L1179 65.4717L1181.05 68.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1195.05 68.75H1190.95L1193 65.4717L1195.05 68.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1209.05 68.75H1204.95L1207 65.4717L1209.05 68.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1223.05 68.75H1218.95L1221 65.4717L1223.05 68.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1237.05 68.75H1232.95L1235 65.4717L1237.05 68.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1251.05 68.75H1246.95L1249 65.4717L1251.05 68.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1265.05 68.75H1260.95L1263 65.4717L1265.05 68.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1279.05 68.75H1274.95L1277 65.4717L1279.05 68.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1293.05 68.75H1288.95L1291 65.4717L1293.05 68.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1307.05 68.75H1302.95L1305 65.4717L1307.05 68.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1321.05 68.75H1316.95L1319 65.4717L1321.05 68.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1335.05 68.75H1330.95L1333 65.4717L1335.05 68.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1349.05 68.75H1344.95L1347 65.4717L1349.05 68.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1363.05 68.75H1358.95L1361 65.4717L1363.05 68.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1377.05 68.75H1372.95L1375 65.4717L1377.05 68.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1391.05 68.75H1386.95L1389 65.4717L1391.05 68.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1405.05 68.75H1400.95L1403 65.4717L1405.05 68.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1419.05 68.75H1414.95L1417 65.4717L1419.05 68.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1433.05 68.75H1428.95L1431 65.4717L1433.05 68.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M5.04894 84.75H0.951062L3 81.4717L5.04894 84.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M19.0489 84.75H14.9511L17 81.4717L19.0489 84.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M33.0489 84.75H28.9511L31 81.4717L33.0489 84.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M47.0489 84.75H42.9511L45 81.4717L47.0489 84.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M61.0489 84.75H56.9511L59 81.4717L61.0489 84.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M75.0489 84.75H70.9511L73 81.4717L75.0489 84.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M89.0489 84.75H84.9511L87 81.4717L89.0489 84.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M103.049 84.75H98.9511L101 81.4717L103.049 84.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M117.049 84.75H112.951L115 81.4717L117.049 84.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M131.049 84.75H126.951L129 81.4717L131.049 84.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M145.049 84.75H140.951L143 81.4717L145.049 84.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M159.049 84.75H154.951L157 81.4717L159.049 84.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M173.049 84.75H168.951L171 81.4717L173.049 84.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M187.049 84.75H182.951L185 81.4717L187.049 84.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M201.049 84.75H196.951L199 81.4717L201.049 84.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M215.049 84.75H210.951L213 81.4717L215.049 84.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M229.049 84.75H224.951L227 81.4717L229.049 84.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M243.049 84.75H238.951L241 81.4717L243.049 84.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M257.049 84.75H252.951L255 81.4717L257.049 84.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M271.049 84.75H266.951L269 81.4717L271.049 84.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M285.049 84.75H280.951L283 81.4717L285.049 84.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M299.049 84.75H294.951L297 81.4717L299.049 84.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M313.049 84.75H308.951L311 81.4717L313.049 84.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M327.049 84.75H322.951L325 81.4717L327.049 84.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M341.049 84.75H336.951L339 81.4717L341.049 84.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M355.049 84.75H350.951L353 81.4717L355.049 84.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M369.049 84.75H364.951L367 81.4717L369.049 84.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M383.049 84.75H378.951L381 81.4717L383.049 84.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M397.049 84.75H392.951L395 81.4717L397.049 84.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M411.049 84.75H406.951L409 81.4717L411.049 84.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M425.049 84.75H420.951L423 81.4717L425.049 84.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M439.049 84.75H434.951L437 81.4717L439.049 84.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M453.049 84.75H448.951L451 81.4717L453.049 84.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M467.049 84.75H462.951L465 81.4717L467.049 84.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M481.049 84.75H476.951L479 81.4717L481.049 84.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M495.049 84.75H490.951L493 81.4717L495.049 84.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M509.049 84.75H504.951L507 81.4717L509.049 84.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M523.049 84.75H518.951L521 81.4717L523.049 84.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M537.049 84.75H532.951L535 81.4717L537.049 84.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M551.049 84.75H546.951L549 81.4717L551.049 84.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M565.049 84.75H560.951L563 81.4717L565.049 84.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M579.049 84.75H574.951L577 81.4717L579.049 84.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M593.049 84.75H588.951L591 81.4717L593.049 84.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M607.049 84.75H602.951L605 81.4717L607.049 84.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M621.049 84.75H616.951L619 81.4717L621.049 84.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M635.049 84.75H630.951L633 81.4717L635.049 84.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M649.049 84.75H644.951L647 81.4717L649.049 84.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M663.049 84.75H658.951L661 81.4717L663.049 84.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M677.049 84.75H672.951L675 81.4717L677.049 84.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M691.049 84.75H686.951L689 81.4717L691.049 84.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M705.049 84.75H700.951L703 81.4717L705.049 84.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M719.049 84.75H714.951L717 81.4717L719.049 84.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M733.049 84.75H728.951L731 81.4717L733.049 84.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M747.049 84.75H742.951L745 81.4717L747.049 84.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M761.049 84.75H756.951L759 81.4717L761.049 84.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M775.049 84.75H770.951L773 81.4717L775.049 84.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M789.049 84.75H784.951L787 81.4717L789.049 84.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M803.049 84.75H798.951L801 81.4717L803.049 84.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M817.049 84.75H812.951L815 81.4717L817.049 84.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M831.049 84.75H826.951L829 81.4717L831.049 84.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M845.049 84.75H840.951L843 81.4717L845.049 84.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M859.049 84.75H854.951L857 81.4717L859.049 84.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M873.049 84.75H868.951L871 81.4717L873.049 84.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M887.049 84.75H882.951L885 81.4717L887.049 84.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M901.049 84.75H896.951L899 81.4717L901.049 84.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M915.049 84.75H910.951L913 81.4717L915.049 84.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M929.049 84.75H924.951L927 81.4717L929.049 84.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M943.049 84.75H938.951L941 81.4717L943.049 84.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M957.049 84.75H952.951L955 81.4717L957.049 84.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M971.049 84.75H966.951L969 81.4717L971.049 84.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M985.049 84.75H980.951L983 81.4717L985.049 84.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M999.049 84.75H994.951L997 81.4717L999.049 84.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1013.05 84.75H1008.95L1011 81.4717L1013.05 84.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1027.05 84.75H1022.95L1025 81.4717L1027.05 84.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1041.05 84.75H1036.95L1039 81.4717L1041.05 84.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1055.05 84.75H1050.95L1053 81.4717L1055.05 84.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1069.05 84.75H1064.95L1067 81.4717L1069.05 84.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1083.05 84.75H1078.95L1081 81.4717L1083.05 84.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1097.05 84.75H1092.95L1095 81.4717L1097.05 84.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1111.05 84.75H1106.95L1109 81.4717L1111.05 84.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1125.05 84.75H1120.95L1123 81.4717L1125.05 84.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1139.05 84.75H1134.95L1137 81.4717L1139.05 84.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1153.05 84.75H1148.95L1151 81.4717L1153.05 84.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1167.05 84.75H1162.95L1165 81.4717L1167.05 84.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1181.05 84.75H1176.95L1179 81.4717L1181.05 84.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1195.05 84.75H1190.95L1193 81.4717L1195.05 84.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1209.05 84.75H1204.95L1207 81.4717L1209.05 84.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1223.05 84.75H1218.95L1221 81.4717L1223.05 84.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1237.05 84.75H1232.95L1235 81.4717L1237.05 84.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1251.05 84.75H1246.95L1249 81.4717L1251.05 84.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1265.05 84.75H1260.95L1263 81.4717L1265.05 84.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1279.05 84.75H1274.95L1277 81.4717L1279.05 84.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1293.05 84.75H1288.95L1291 81.4717L1293.05 84.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1307.05 84.75H1302.95L1305 81.4717L1307.05 84.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1321.05 84.75H1316.95L1319 81.4717L1321.05 84.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1335.05 84.75H1330.95L1333 81.4717L1335.05 84.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1349.05 84.75H1344.95L1347 81.4717L1349.05 84.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1363.05 84.75H1358.95L1361 81.4717L1363.05 84.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1377.05 84.75H1372.95L1375 81.4717L1377.05 84.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1391.05 84.75H1386.95L1389 81.4717L1391.05 84.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1405.05 84.75H1400.95L1403 81.4717L1405.05 84.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1419.05 84.75H1414.95L1417 81.4717L1419.05 84.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1433.05 84.75H1428.95L1431 81.4717L1433.05 84.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M5.04894 100.75H0.951062L3 97.4717L5.04894 100.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M19.0489 100.75H14.9511L17 97.4717L19.0489 100.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M33.0489 100.75H28.9511L31 97.4717L33.0489 100.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M47.0489 100.75H42.9511L45 97.4717L47.0489 100.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M61.0489 100.75H56.9511L59 97.4717L61.0489 100.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M75.0489 100.75H70.9511L73 97.4717L75.0489 100.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M89.0489 100.75H84.9511L87 97.4717L89.0489 100.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M103.049 100.75H98.9511L101 97.4717L103.049 100.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M117.049 100.75H112.951L115 97.4717L117.049 100.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M131.049 100.75H126.951L129 97.4717L131.049 100.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M145.049 100.75H140.951L143 97.4717L145.049 100.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M159.049 100.75H154.951L157 97.4717L159.049 100.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M173.049 100.75H168.951L171 97.4717L173.049 100.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M187.049 100.75H182.951L185 97.4717L187.049 100.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M201.049 100.75H196.951L199 97.4717L201.049 100.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M215.049 100.75H210.951L213 97.4717L215.049 100.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M229.049 100.75H224.951L227 97.4717L229.049 100.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M243.049 100.75H238.951L241 97.4717L243.049 100.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M257.049 100.75H252.951L255 97.4717L257.049 100.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M271.049 100.75H266.951L269 97.4717L271.049 100.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M285.049 100.75H280.951L283 97.4717L285.049 100.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M299.049 100.75H294.951L297 97.4717L299.049 100.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M313.049 100.75H308.951L311 97.4717L313.049 100.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M327.049 100.75H322.951L325 97.4717L327.049 100.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M341.049 100.75H336.951L339 97.4717L341.049 100.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M355.049 100.75H350.951L353 97.4717L355.049 100.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M369.049 100.75H364.951L367 97.4717L369.049 100.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M383.049 100.75H378.951L381 97.4717L383.049 100.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M397.049 100.75H392.951L395 97.4717L397.049 100.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M411.049 100.75H406.951L409 97.4717L411.049 100.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M425.049 100.75H420.951L423 97.4717L425.049 100.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M439.049 100.75H434.951L437 97.4717L439.049 100.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M453.049 100.75H448.951L451 97.4717L453.049 100.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M467.049 100.75H462.951L465 97.4717L467.049 100.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M481.049 100.75H476.951L479 97.4717L481.049 100.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M495.049 100.75H490.951L493 97.4717L495.049 100.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M509.049 100.75H504.951L507 97.4717L509.049 100.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M523.049 100.75H518.951L521 97.4717L523.049 100.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M537.049 100.75H532.951L535 97.4717L537.049 100.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M551.049 100.75H546.951L549 97.4717L551.049 100.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M565.049 100.75H560.951L563 97.4717L565.049 100.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M579.049 100.75H574.951L577 97.4717L579.049 100.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M593.049 100.75H588.951L591 97.4717L593.049 100.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M607.049 100.75H602.951L605 97.4717L607.049 100.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M621.049 100.75H616.951L619 97.4717L621.049 100.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M635.049 100.75H630.951L633 97.4717L635.049 100.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M649.049 100.75H644.951L647 97.4717L649.049 100.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M663.049 100.75H658.951L661 97.4717L663.049 100.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M677.049 100.75H672.951L675 97.4717L677.049 100.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M691.049 100.75H686.951L689 97.4717L691.049 100.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M705.049 100.75H700.951L703 97.4717L705.049 100.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M719.049 100.75H714.951L717 97.4717L719.049 100.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M733.049 100.75H728.951L731 97.4717L733.049 100.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M747.049 100.75H742.951L745 97.4717L747.049 100.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M761.049 100.75H756.951L759 97.4717L761.049 100.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M775.049 100.75H770.951L773 97.4717L775.049 100.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M789.049 100.75H784.951L787 97.4717L789.049 100.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M803.049 100.75H798.951L801 97.4717L803.049 100.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M817.049 100.75H812.951L815 97.4717L817.049 100.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M831.049 100.75H826.951L829 97.4717L831.049 100.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M845.049 100.75H840.951L843 97.4717L845.049 100.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M859.049 100.75H854.951L857 97.4717L859.049 100.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M873.049 100.75H868.951L871 97.4717L873.049 100.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M887.049 100.75H882.951L885 97.4717L887.049 100.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M901.049 100.75H896.951L899 97.4717L901.049 100.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M915.049 100.75H910.951L913 97.4717L915.049 100.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M929.049 100.75H924.951L927 97.4717L929.049 100.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M943.049 100.75H938.951L941 97.4717L943.049 100.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M957.049 100.75H952.951L955 97.4717L957.049 100.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M971.049 100.75H966.951L969 97.4717L971.049 100.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M985.049 100.75H980.951L983 97.4717L985.049 100.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M999.049 100.75H994.951L997 97.4717L999.049 100.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1013.05 100.75H1008.95L1011 97.4717L1013.05 100.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1027.05 100.75H1022.95L1025 97.4717L1027.05 100.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1041.05 100.75H1036.95L1039 97.4717L1041.05 100.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1055.05 100.75H1050.95L1053 97.4717L1055.05 100.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1069.05 100.75H1064.95L1067 97.4717L1069.05 100.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1083.05 100.75H1078.95L1081 97.4717L1083.05 100.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1097.05 100.75H1092.95L1095 97.4717L1097.05 100.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1111.05 100.75H1106.95L1109 97.4717L1111.05 100.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1125.05 100.75H1120.95L1123 97.4717L1125.05 100.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1139.05 100.75H1134.95L1137 97.4717L1139.05 100.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1153.05 100.75H1148.95L1151 97.4717L1153.05 100.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1167.05 100.75H1162.95L1165 97.4717L1167.05 100.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1181.05 100.75H1176.95L1179 97.4717L1181.05 100.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1195.05 100.75H1190.95L1193 97.4717L1195.05 100.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1209.05 100.75H1204.95L1207 97.4717L1209.05 100.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1223.05 100.75H1218.95L1221 97.4717L1223.05 100.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1237.05 100.75H1232.95L1235 97.4717L1237.05 100.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1251.05 100.75H1246.95L1249 97.4717L1251.05 100.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1265.05 100.75H1260.95L1263 97.4717L1265.05 100.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1279.05 100.75H1274.95L1277 97.4717L1279.05 100.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1293.05 100.75H1288.95L1291 97.4717L1293.05 100.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1307.05 100.75H1302.95L1305 97.4717L1307.05 100.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1321.05 100.75H1316.95L1319 97.4717L1321.05 100.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1335.05 100.75H1330.95L1333 97.4717L1335.05 100.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1349.05 100.75H1344.95L1347 97.4717L1349.05 100.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1363.05 100.75H1358.95L1361 97.4717L1363.05 100.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1377.05 100.75H1372.95L1375 97.4717L1377.05 100.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1391.05 100.75H1386.95L1389 97.4717L1391.05 100.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1405.05 100.75H1400.95L1403 97.4717L1405.05 100.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1419.05 100.75H1414.95L1417 97.4717L1419.05 100.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1433.05 100.75H1428.95L1431 97.4717L1433.05 100.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M5.04894 116.75H0.951062L3 113.472L5.04894 116.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M19.0489 116.75H14.9511L17 113.472L19.0489 116.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M33.0489 116.75H28.9511L31 113.472L33.0489 116.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M47.0489 116.75H42.9511L45 113.472L47.0489 116.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M61.0489 116.75H56.9511L59 113.472L61.0489 116.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M75.0489 116.75H70.9511L73 113.472L75.0489 116.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M89.0489 116.75H84.9511L87 113.472L89.0489 116.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M103.049 116.75H98.9511L101 113.472L103.049 116.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M117.049 116.75H112.951L115 113.472L117.049 116.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M131.049 116.75H126.951L129 113.472L131.049 116.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M145.049 116.75H140.951L143 113.472L145.049 116.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M159.049 116.75H154.951L157 113.472L159.049 116.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M173.049 116.75H168.951L171 113.472L173.049 116.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M187.049 116.75H182.951L185 113.472L187.049 116.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M201.049 116.75H196.951L199 113.472L201.049 116.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M215.049 116.75H210.951L213 113.472L215.049 116.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M229.049 116.75H224.951L227 113.472L229.049 116.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M243.049 116.75H238.951L241 113.472L243.049 116.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M257.049 116.75H252.951L255 113.472L257.049 116.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M271.049 116.75H266.951L269 113.472L271.049 116.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M285.049 116.75H280.951L283 113.472L285.049 116.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M299.049 116.75H294.951L297 113.472L299.049 116.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M313.049 116.75H308.951L311 113.472L313.049 116.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M327.049 116.75H322.951L325 113.472L327.049 116.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M341.049 116.75H336.951L339 113.472L341.049 116.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M355.049 116.75H350.951L353 113.472L355.049 116.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M369.049 116.75H364.951L367 113.472L369.049 116.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M383.049 116.75H378.951L381 113.472L383.049 116.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M397.049 116.75H392.951L395 113.472L397.049 116.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M411.049 116.75H406.951L409 113.472L411.049 116.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M425.049 116.75H420.951L423 113.472L425.049 116.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M439.049 116.75H434.951L437 113.472L439.049 116.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M453.049 116.75H448.951L451 113.472L453.049 116.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M467.049 116.75H462.951L465 113.472L467.049 116.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M481.049 116.75H476.951L479 113.472L481.049 116.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M495.049 116.75H490.951L493 113.472L495.049 116.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M509.049 116.75H504.951L507 113.472L509.049 116.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M523.049 116.75H518.951L521 113.472L523.049 116.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M537.049 116.75H532.951L535 113.472L537.049 116.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M551.049 116.75H546.951L549 113.472L551.049 116.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M565.049 116.75H560.951L563 113.472L565.049 116.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M579.049 116.75H574.951L577 113.472L579.049 116.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M593.049 116.75H588.951L591 113.472L593.049 116.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M607.049 116.75H602.951L605 113.472L607.049 116.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M621.049 116.75H616.951L619 113.472L621.049 116.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M635.049 116.75H630.951L633 113.472L635.049 116.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M649.049 116.75H644.951L647 113.472L649.049 116.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M663.049 116.75H658.951L661 113.472L663.049 116.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M677.049 116.75H672.951L675 113.472L677.049 116.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M691.049 116.75H686.951L689 113.472L691.049 116.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M705.049 116.75H700.951L703 113.472L705.049 116.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M719.049 116.75H714.951L717 113.472L719.049 116.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M733.049 116.75H728.951L731 113.472L733.049 116.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M747.049 116.75H742.951L745 113.472L747.049 116.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M761.049 116.75H756.951L759 113.472L761.049 116.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M775.049 116.75H770.951L773 113.472L775.049 116.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M789.049 116.75H784.951L787 113.472L789.049 116.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M803.049 116.75H798.951L801 113.472L803.049 116.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M817.049 116.75H812.951L815 113.472L817.049 116.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M831.049 116.75H826.951L829 113.472L831.049 116.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M845.049 116.75H840.951L843 113.472L845.049 116.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M859.049 116.75H854.951L857 113.472L859.049 116.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M873.049 116.75H868.951L871 113.472L873.049 116.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M887.049 116.75H882.951L885 113.472L887.049 116.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M901.049 116.75H896.951L899 113.472L901.049 116.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M915.049 116.75H910.951L913 113.472L915.049 116.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M929.049 116.75H924.951L927 113.472L929.049 116.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M943.049 116.75H938.951L941 113.472L943.049 116.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M957.049 116.75H952.951L955 113.472L957.049 116.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M971.049 116.75H966.951L969 113.472L971.049 116.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M985.049 116.75H980.951L983 113.472L985.049 116.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M999.049 116.75H994.951L997 113.472L999.049 116.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1013.05 116.75H1008.95L1011 113.472L1013.05 116.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1027.05 116.75H1022.95L1025 113.472L1027.05 116.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1041.05 116.75H1036.95L1039 113.472L1041.05 116.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1055.05 116.75H1050.95L1053 113.472L1055.05 116.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1069.05 116.75H1064.95L1067 113.472L1069.05 116.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1083.05 116.75H1078.95L1081 113.472L1083.05 116.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1097.05 116.75H1092.95L1095 113.472L1097.05 116.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1111.05 116.75H1106.95L1109 113.472L1111.05 116.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1125.05 116.75H1120.95L1123 113.472L1125.05 116.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1139.05 116.75H1134.95L1137 113.472L1139.05 116.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1153.05 116.75H1148.95L1151 113.472L1153.05 116.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1167.05 116.75H1162.95L1165 113.472L1167.05 116.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1181.05 116.75H1176.95L1179 113.472L1181.05 116.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1195.05 116.75H1190.95L1193 113.472L1195.05 116.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1209.05 116.75H1204.95L1207 113.472L1209.05 116.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1223.05 116.75H1218.95L1221 113.472L1223.05 116.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1237.05 116.75H1232.95L1235 113.472L1237.05 116.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1251.05 116.75H1246.95L1249 113.472L1251.05 116.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1265.05 116.75H1260.95L1263 113.472L1265.05 116.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1279.05 116.75H1274.95L1277 113.472L1279.05 116.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1293.05 116.75H1288.95L1291 113.472L1293.05 116.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1307.05 116.75H1302.95L1305 113.472L1307.05 116.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1321.05 116.75H1316.95L1319 113.472L1321.05 116.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1335.05 116.75H1330.95L1333 113.472L1335.05 116.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1349.05 116.75H1344.95L1347 113.472L1349.05 116.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1363.05 116.75H1358.95L1361 113.472L1363.05 116.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1377.05 116.75H1372.95L1375 113.472L1377.05 116.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1391.05 116.75H1386.95L1389 113.472L1391.05 116.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1405.05 116.75H1400.95L1403 113.472L1405.05 116.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1419.05 116.75H1414.95L1417 113.472L1419.05 116.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1433.05 116.75H1428.95L1431 113.472L1433.05 116.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M5.04894 132.75H0.951062L3 129.472L5.04894 132.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M19.0489 132.75H14.9511L17 129.472L19.0489 132.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M33.0489 132.75H28.9511L31 129.472L33.0489 132.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M47.0489 132.75H42.9511L45 129.472L47.0489 132.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M61.0489 132.75H56.9511L59 129.472L61.0489 132.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M75.0489 132.75H70.9511L73 129.472L75.0489 132.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M89.0489 132.75H84.9511L87 129.472L89.0489 132.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M103.049 132.75H98.9511L101 129.472L103.049 132.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M117.049 132.75H112.951L115 129.472L117.049 132.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M131.049 132.75H126.951L129 129.472L131.049 132.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M145.049 132.75H140.951L143 129.472L145.049 132.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M159.049 132.75H154.951L157 129.472L159.049 132.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M173.049 132.75H168.951L171 129.472L173.049 132.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M187.049 132.75H182.951L185 129.472L187.049 132.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M201.049 132.75H196.951L199 129.472L201.049 132.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M215.049 132.75H210.951L213 129.472L215.049 132.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M229.049 132.75H224.951L227 129.472L229.049 132.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M243.049 132.75H238.951L241 129.472L243.049 132.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M257.049 132.75H252.951L255 129.472L257.049 132.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M271.049 132.75H266.951L269 129.472L271.049 132.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M285.049 132.75H280.951L283 129.472L285.049 132.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M299.049 132.75H294.951L297 129.472L299.049 132.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M313.049 132.75H308.951L311 129.472L313.049 132.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M327.049 132.75H322.951L325 129.472L327.049 132.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M341.049 132.75H336.951L339 129.472L341.049 132.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M355.049 132.75H350.951L353 129.472L355.049 132.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M369.049 132.75H364.951L367 129.472L369.049 132.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M383.049 132.75H378.951L381 129.472L383.049 132.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M397.049 132.75H392.951L395 129.472L397.049 132.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M411.049 132.75H406.951L409 129.472L411.049 132.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M425.049 132.75H420.951L423 129.472L425.049 132.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M439.049 132.75H434.951L437 129.472L439.049 132.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M453.049 132.75H448.951L451 129.472L453.049 132.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M467.049 132.75H462.951L465 129.472L467.049 132.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M481.049 132.75H476.951L479 129.472L481.049 132.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M495.049 132.75H490.951L493 129.472L495.049 132.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M509.049 132.75H504.951L507 129.472L509.049 132.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M523.049 132.75H518.951L521 129.472L523.049 132.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M537.049 132.75H532.951L535 129.472L537.049 132.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M551.049 132.75H546.951L549 129.472L551.049 132.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M565.049 132.75H560.951L563 129.472L565.049 132.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M579.049 132.75H574.951L577 129.472L579.049 132.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M593.049 132.75H588.951L591 129.472L593.049 132.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M607.049 132.75H602.951L605 129.472L607.049 132.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M621.049 132.75H616.951L619 129.472L621.049 132.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M635.049 132.75H630.951L633 129.472L635.049 132.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M649.049 132.75H644.951L647 129.472L649.049 132.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M663.049 132.75H658.951L661 129.472L663.049 132.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M677.049 132.75H672.951L675 129.472L677.049 132.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M691.049 132.75H686.951L689 129.472L691.049 132.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M705.049 132.75H700.951L703 129.472L705.049 132.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M719.049 132.75H714.951L717 129.472L719.049 132.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M733.049 132.75H728.951L731 129.472L733.049 132.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M747.049 132.75H742.951L745 129.472L747.049 132.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M761.049 132.75H756.951L759 129.472L761.049 132.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M775.049 132.75H770.951L773 129.472L775.049 132.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M789.049 132.75H784.951L787 129.472L789.049 132.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M803.049 132.75H798.951L801 129.472L803.049 132.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M817.049 132.75H812.951L815 129.472L817.049 132.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M831.049 132.75H826.951L829 129.472L831.049 132.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M845.049 132.75H840.951L843 129.472L845.049 132.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M859.049 132.75H854.951L857 129.472L859.049 132.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M873.049 132.75H868.951L871 129.472L873.049 132.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M887.049 132.75H882.951L885 129.472L887.049 132.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M901.049 132.75H896.951L899 129.472L901.049 132.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M915.049 132.75H910.951L913 129.472L915.049 132.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M929.049 132.75H924.951L927 129.472L929.049 132.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M943.049 132.75H938.951L941 129.472L943.049 132.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M957.049 132.75H952.951L955 129.472L957.049 132.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M971.049 132.75H966.951L969 129.472L971.049 132.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M985.049 132.75H980.951L983 129.472L985.049 132.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M999.049 132.75H994.951L997 129.472L999.049 132.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1013.05 132.75H1008.95L1011 129.472L1013.05 132.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1027.05 132.75H1022.95L1025 129.472L1027.05 132.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1041.05 132.75H1036.95L1039 129.472L1041.05 132.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1055.05 132.75H1050.95L1053 129.472L1055.05 132.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1069.05 132.75H1064.95L1067 129.472L1069.05 132.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1083.05 132.75H1078.95L1081 129.472L1083.05 132.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1097.05 132.75H1092.95L1095 129.472L1097.05 132.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1111.05 132.75H1106.95L1109 129.472L1111.05 132.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1125.05 132.75H1120.95L1123 129.472L1125.05 132.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1139.05 132.75H1134.95L1137 129.472L1139.05 132.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1153.05 132.75H1148.95L1151 129.472L1153.05 132.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1167.05 132.75H1162.95L1165 129.472L1167.05 132.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1181.05 132.75H1176.95L1179 129.472L1181.05 132.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1195.05 132.75H1190.95L1193 129.472L1195.05 132.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1209.05 132.75H1204.95L1207 129.472L1209.05 132.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1223.05 132.75H1218.95L1221 129.472L1223.05 132.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1237.05 132.75H1232.95L1235 129.472L1237.05 132.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1251.05 132.75H1246.95L1249 129.472L1251.05 132.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1265.05 132.75H1260.95L1263 129.472L1265.05 132.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1279.05 132.75H1274.95L1277 129.472L1279.05 132.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1293.05 132.75H1288.95L1291 129.472L1293.05 132.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1307.05 132.75H1302.95L1305 129.472L1307.05 132.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1321.05 132.75H1316.95L1319 129.472L1321.05 132.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1335.05 132.75H1330.95L1333 129.472L1335.05 132.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1349.05 132.75H1344.95L1347 129.472L1349.05 132.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1363.05 132.75H1358.95L1361 129.472L1363.05 132.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1377.05 132.75H1372.95L1375 129.472L1377.05 132.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1391.05 132.75H1386.95L1389 129.472L1391.05 132.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1405.05 132.75H1400.95L1403 129.472L1405.05 132.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1419.05 132.75H1414.95L1417 129.472L1419.05 132.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1433.05 132.75H1428.95L1431 129.472L1433.05 132.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M5.04894 148.75H0.951062L3 145.472L5.04894 148.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M19.0489 148.75H14.9511L17 145.472L19.0489 148.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M33.0489 148.75H28.9511L31 145.472L33.0489 148.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M47.0489 148.75H42.9511L45 145.472L47.0489 148.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M61.0489 148.75H56.9511L59 145.472L61.0489 148.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M75.0489 148.75H70.9511L73 145.472L75.0489 148.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M89.0489 148.75H84.9511L87 145.472L89.0489 148.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M103.049 148.75H98.9511L101 145.472L103.049 148.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M117.049 148.75H112.951L115 145.472L117.049 148.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M131.049 148.75H126.951L129 145.472L131.049 148.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M145.049 148.75H140.951L143 145.472L145.049 148.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M159.049 148.75H154.951L157 145.472L159.049 148.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M173.049 148.75H168.951L171 145.472L173.049 148.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M187.049 148.75H182.951L185 145.472L187.049 148.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M201.049 148.75H196.951L199 145.472L201.049 148.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M215.049 148.75H210.951L213 145.472L215.049 148.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M229.049 148.75H224.951L227 145.472L229.049 148.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M243.049 148.75H238.951L241 145.472L243.049 148.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M257.049 148.75H252.951L255 145.472L257.049 148.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M271.049 148.75H266.951L269 145.472L271.049 148.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M285.049 148.75H280.951L283 145.472L285.049 148.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M299.049 148.75H294.951L297 145.472L299.049 148.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M313.049 148.75H308.951L311 145.472L313.049 148.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M327.049 148.75H322.951L325 145.472L327.049 148.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M341.049 148.75H336.951L339 145.472L341.049 148.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M355.049 148.75H350.951L353 145.472L355.049 148.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M369.049 148.75H364.951L367 145.472L369.049 148.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M383.049 148.75H378.951L381 145.472L383.049 148.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M397.049 148.75H392.951L395 145.472L397.049 148.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M411.049 148.75H406.951L409 145.472L411.049 148.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M425.049 148.75H420.951L423 145.472L425.049 148.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M439.049 148.75H434.951L437 145.472L439.049 148.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M453.049 148.75H448.951L451 145.472L453.049 148.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M467.049 148.75H462.951L465 145.472L467.049 148.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M481.049 148.75H476.951L479 145.472L481.049 148.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M495.049 148.75H490.951L493 145.472L495.049 148.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M509.049 148.75H504.951L507 145.472L509.049 148.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M523.049 148.75H518.951L521 145.472L523.049 148.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M537.049 148.75H532.951L535 145.472L537.049 148.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M551.049 148.75H546.951L549 145.472L551.049 148.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M565.049 148.75H560.951L563 145.472L565.049 148.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M579.049 148.75H574.951L577 145.472L579.049 148.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M593.049 148.75H588.951L591 145.472L593.049 148.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M607.049 148.75H602.951L605 145.472L607.049 148.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M621.049 148.75H616.951L619 145.472L621.049 148.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M635.049 148.75H630.951L633 145.472L635.049 148.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M649.049 148.75H644.951L647 145.472L649.049 148.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M663.049 148.75H658.951L661 145.472L663.049 148.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M677.049 148.75H672.951L675 145.472L677.049 148.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M691.049 148.75H686.951L689 145.472L691.049 148.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M705.049 148.75H700.951L703 145.472L705.049 148.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M719.049 148.75H714.951L717 145.472L719.049 148.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M733.049 148.75H728.951L731 145.472L733.049 148.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M747.049 148.75H742.951L745 145.472L747.049 148.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M761.049 148.75H756.951L759 145.472L761.049 148.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M775.049 148.75H770.951L773 145.472L775.049 148.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M789.049 148.75H784.951L787 145.472L789.049 148.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M803.049 148.75H798.951L801 145.472L803.049 148.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M817.049 148.75H812.951L815 145.472L817.049 148.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M831.049 148.75H826.951L829 145.472L831.049 148.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M845.049 148.75H840.951L843 145.472L845.049 148.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M859.049 148.75H854.951L857 145.472L859.049 148.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M873.049 148.75H868.951L871 145.472L873.049 148.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M887.049 148.75H882.951L885 145.472L887.049 148.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M901.049 148.75H896.951L899 145.472L901.049 148.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M915.049 148.75H910.951L913 145.472L915.049 148.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M929.049 148.75H924.951L927 145.472L929.049 148.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M943.049 148.75H938.951L941 145.472L943.049 148.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M957.049 148.75H952.951L955 145.472L957.049 148.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M971.049 148.75H966.951L969 145.472L971.049 148.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M985.049 148.75H980.951L983 145.472L985.049 148.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M999.049 148.75H994.951L997 145.472L999.049 148.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1013.05 148.75H1008.95L1011 145.472L1013.05 148.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1027.05 148.75H1022.95L1025 145.472L1027.05 148.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1041.05 148.75H1036.95L1039 145.472L1041.05 148.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1055.05 148.75H1050.95L1053 145.472L1055.05 148.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1069.05 148.75H1064.95L1067 145.472L1069.05 148.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1083.05 148.75H1078.95L1081 145.472L1083.05 148.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1097.05 148.75H1092.95L1095 145.472L1097.05 148.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1111.05 148.75H1106.95L1109 145.472L1111.05 148.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1125.05 148.75H1120.95L1123 145.472L1125.05 148.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1139.05 148.75H1134.95L1137 145.472L1139.05 148.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1153.05 148.75H1148.95L1151 145.472L1153.05 148.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1167.05 148.75H1162.95L1165 145.472L1167.05 148.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1181.05 148.75H1176.95L1179 145.472L1181.05 148.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1195.05 148.75H1190.95L1193 145.472L1195.05 148.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1209.05 148.75H1204.95L1207 145.472L1209.05 148.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1223.05 148.75H1218.95L1221 145.472L1223.05 148.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1237.05 148.75H1232.95L1235 145.472L1237.05 148.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1251.05 148.75H1246.95L1249 145.472L1251.05 148.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1265.05 148.75H1260.95L1263 145.472L1265.05 148.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1279.05 148.75H1274.95L1277 145.472L1279.05 148.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1293.05 148.75H1288.95L1291 145.472L1293.05 148.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1307.05 148.75H1302.95L1305 145.472L1307.05 148.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1321.05 148.75H1316.95L1319 145.472L1321.05 148.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1335.05 148.75H1330.95L1333 145.472L1335.05 148.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1349.05 148.75H1344.95L1347 145.472L1349.05 148.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1363.05 148.75H1358.95L1361 145.472L1363.05 148.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1377.05 148.75H1372.95L1375 145.472L1377.05 148.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1391.05 148.75H1386.95L1389 145.472L1391.05 148.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1405.05 148.75H1400.95L1403 145.472L1405.05 148.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1419.05 148.75H1414.95L1417 145.472L1419.05 148.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1433.05 148.75H1428.95L1431 145.472L1433.05 148.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M5.04894 164.75H0.951062L3 161.472L5.04894 164.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M19.0489 164.75H14.9511L17 161.472L19.0489 164.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M33.0489 164.75H28.9511L31 161.472L33.0489 164.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M47.0489 164.75H42.9511L45 161.472L47.0489 164.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M61.0489 164.75H56.9511L59 161.472L61.0489 164.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M75.0489 164.75H70.9511L73 161.472L75.0489 164.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M89.0489 164.75H84.9511L87 161.472L89.0489 164.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M103.049 164.75H98.9511L101 161.472L103.049 164.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M117.049 164.75H112.951L115 161.472L117.049 164.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M131.049 164.75H126.951L129 161.472L131.049 164.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M145.049 164.75H140.951L143 161.472L145.049 164.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M159.049 164.75H154.951L157 161.472L159.049 164.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M173.049 164.75H168.951L171 161.472L173.049 164.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M187.049 164.75H182.951L185 161.472L187.049 164.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M201.049 164.75H196.951L199 161.472L201.049 164.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M215.049 164.75H210.951L213 161.472L215.049 164.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M229.049 164.75H224.951L227 161.472L229.049 164.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M243.049 164.75H238.951L241 161.472L243.049 164.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M257.049 164.75H252.951L255 161.472L257.049 164.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M271.049 164.75H266.951L269 161.472L271.049 164.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M285.049 164.75H280.951L283 161.472L285.049 164.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M299.049 164.75H294.951L297 161.472L299.049 164.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M313.049 164.75H308.951L311 161.472L313.049 164.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M327.049 164.75H322.951L325 161.472L327.049 164.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M341.049 164.75H336.951L339 161.472L341.049 164.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M355.049 164.75H350.951L353 161.472L355.049 164.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M369.049 164.75H364.951L367 161.472L369.049 164.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M383.049 164.75H378.951L381 161.472L383.049 164.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M397.049 164.75H392.951L395 161.472L397.049 164.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M411.049 164.75H406.951L409 161.472L411.049 164.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M425.049 164.75H420.951L423 161.472L425.049 164.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M439.049 164.75H434.951L437 161.472L439.049 164.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M453.049 164.75H448.951L451 161.472L453.049 164.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M467.049 164.75H462.951L465 161.472L467.049 164.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M481.049 164.75H476.951L479 161.472L481.049 164.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M495.049 164.75H490.951L493 161.472L495.049 164.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M509.049 164.75H504.951L507 161.472L509.049 164.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M523.049 164.75H518.951L521 161.472L523.049 164.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M537.049 164.75H532.951L535 161.472L537.049 164.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M551.049 164.75H546.951L549 161.472L551.049 164.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M565.049 164.75H560.951L563 161.472L565.049 164.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M579.049 164.75H574.951L577 161.472L579.049 164.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M593.049 164.75H588.951L591 161.472L593.049 164.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M607.049 164.75H602.951L605 161.472L607.049 164.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M621.049 164.75H616.951L619 161.472L621.049 164.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M635.049 164.75H630.951L633 161.472L635.049 164.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M649.049 164.75H644.951L647 161.472L649.049 164.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M663.049 164.75H658.951L661 161.472L663.049 164.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M677.049 164.75H672.951L675 161.472L677.049 164.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M691.049 164.75H686.951L689 161.472L691.049 164.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M705.049 164.75H700.951L703 161.472L705.049 164.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M719.049 164.75H714.951L717 161.472L719.049 164.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M733.049 164.75H728.951L731 161.472L733.049 164.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M747.049 164.75H742.951L745 161.472L747.049 164.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M761.049 164.75H756.951L759 161.472L761.049 164.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M775.049 164.75H770.951L773 161.472L775.049 164.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M789.049 164.75H784.951L787 161.472L789.049 164.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M803.049 164.75H798.951L801 161.472L803.049 164.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M817.049 164.75H812.951L815 161.472L817.049 164.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M831.049 164.75H826.951L829 161.472L831.049 164.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M845.049 164.75H840.951L843 161.472L845.049 164.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M859.049 164.75H854.951L857 161.472L859.049 164.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M873.049 164.75H868.951L871 161.472L873.049 164.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M887.049 164.75H882.951L885 161.472L887.049 164.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M901.049 164.75H896.951L899 161.472L901.049 164.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M915.049 164.75H910.951L913 161.472L915.049 164.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M929.049 164.75H924.951L927 161.472L929.049 164.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M943.049 164.75H938.951L941 161.472L943.049 164.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M957.049 164.75H952.951L955 161.472L957.049 164.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M971.049 164.75H966.951L969 161.472L971.049 164.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M985.049 164.75H980.951L983 161.472L985.049 164.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M999.049 164.75H994.951L997 161.472L999.049 164.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1013.05 164.75H1008.95L1011 161.472L1013.05 164.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1027.05 164.75H1022.95L1025 161.472L1027.05 164.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1041.05 164.75H1036.95L1039 161.472L1041.05 164.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1055.05 164.75H1050.95L1053 161.472L1055.05 164.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1069.05 164.75H1064.95L1067 161.472L1069.05 164.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1083.05 164.75H1078.95L1081 161.472L1083.05 164.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1097.05 164.75H1092.95L1095 161.472L1097.05 164.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1111.05 164.75H1106.95L1109 161.472L1111.05 164.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1125.05 164.75H1120.95L1123 161.472L1125.05 164.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1139.05 164.75H1134.95L1137 161.472L1139.05 164.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1153.05 164.75H1148.95L1151 161.472L1153.05 164.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1167.05 164.75H1162.95L1165 161.472L1167.05 164.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1181.05 164.75H1176.95L1179 161.472L1181.05 164.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1195.05 164.75H1190.95L1193 161.472L1195.05 164.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1209.05 164.75H1204.95L1207 161.472L1209.05 164.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1223.05 164.75H1218.95L1221 161.472L1223.05 164.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1237.05 164.75H1232.95L1235 161.472L1237.05 164.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1251.05 164.75H1246.95L1249 161.472L1251.05 164.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1265.05 164.75H1260.95L1263 161.472L1265.05 164.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1279.05 164.75H1274.95L1277 161.472L1279.05 164.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1293.05 164.75H1288.95L1291 161.472L1293.05 164.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1307.05 164.75H1302.95L1305 161.472L1307.05 164.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1321.05 164.75H1316.95L1319 161.472L1321.05 164.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1335.05 164.75H1330.95L1333 161.472L1335.05 164.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1349.05 164.75H1344.95L1347 161.472L1349.05 164.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1363.05 164.75H1358.95L1361 161.472L1363.05 164.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1377.05 164.75H1372.95L1375 161.472L1377.05 164.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1391.05 164.75H1386.95L1389 161.472L1391.05 164.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1405.05 164.75H1400.95L1403 161.472L1405.05 164.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1419.05 164.75H1414.95L1417 161.472L1419.05 164.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1433.05 164.75H1428.95L1431 161.472L1433.05 164.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M5.04894 180.75H0.951062L3 177.472L5.04894 180.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M19.0489 180.75H14.9511L17 177.472L19.0489 180.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M33.0489 180.75H28.9511L31 177.472L33.0489 180.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M47.0489 180.75H42.9511L45 177.472L47.0489 180.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M61.0489 180.75H56.9511L59 177.472L61.0489 180.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M75.0489 180.75H70.9511L73 177.472L75.0489 180.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M89.0489 180.75H84.9511L87 177.472L89.0489 180.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M103.049 180.75H98.9511L101 177.472L103.049 180.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M117.049 180.75H112.951L115 177.472L117.049 180.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M131.049 180.75H126.951L129 177.472L131.049 180.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M145.049 180.75H140.951L143 177.472L145.049 180.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M159.049 180.75H154.951L157 177.472L159.049 180.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M173.049 180.75H168.951L171 177.472L173.049 180.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M187.049 180.75H182.951L185 177.472L187.049 180.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M201.049 180.75H196.951L199 177.472L201.049 180.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M215.049 180.75H210.951L213 177.472L215.049 180.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M229.049 180.75H224.951L227 177.472L229.049 180.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M243.049 180.75H238.951L241 177.472L243.049 180.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M257.049 180.75H252.951L255 177.472L257.049 180.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M271.049 180.75H266.951L269 177.472L271.049 180.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M285.049 180.75H280.951L283 177.472L285.049 180.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M299.049 180.75H294.951L297 177.472L299.049 180.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M313.049 180.75H308.951L311 177.472L313.049 180.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M327.049 180.75H322.951L325 177.472L327.049 180.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M341.049 180.75H336.951L339 177.472L341.049 180.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M355.049 180.75H350.951L353 177.472L355.049 180.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M369.049 180.75H364.951L367 177.472L369.049 180.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M383.049 180.75H378.951L381 177.472L383.049 180.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M397.049 180.75H392.951L395 177.472L397.049 180.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M411.049 180.75H406.951L409 177.472L411.049 180.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M425.049 180.75H420.951L423 177.472L425.049 180.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M439.049 180.75H434.951L437 177.472L439.049 180.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M453.049 180.75H448.951L451 177.472L453.049 180.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M467.049 180.75H462.951L465 177.472L467.049 180.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M481.049 180.75H476.951L479 177.472L481.049 180.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M495.049 180.75H490.951L493 177.472L495.049 180.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M509.049 180.75H504.951L507 177.472L509.049 180.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M523.049 180.75H518.951L521 177.472L523.049 180.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M537.049 180.75H532.951L535 177.472L537.049 180.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M551.049 180.75H546.951L549 177.472L551.049 180.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M565.049 180.75H560.951L563 177.472L565.049 180.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M579.049 180.75H574.951L577 177.472L579.049 180.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M593.049 180.75H588.951L591 177.472L593.049 180.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M607.049 180.75H602.951L605 177.472L607.049 180.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M621.049 180.75H616.951L619 177.472L621.049 180.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M635.049 180.75H630.951L633 177.472L635.049 180.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M649.049 180.75H644.951L647 177.472L649.049 180.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M663.049 180.75H658.951L661 177.472L663.049 180.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M677.049 180.75H672.951L675 177.472L677.049 180.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M691.049 180.75H686.951L689 177.472L691.049 180.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M705.049 180.75H700.951L703 177.472L705.049 180.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M719.049 180.75H714.951L717 177.472L719.049 180.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M733.049 180.75H728.951L731 177.472L733.049 180.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M747.049 180.75H742.951L745 177.472L747.049 180.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M761.049 180.75H756.951L759 177.472L761.049 180.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M775.049 180.75H770.951L773 177.472L775.049 180.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M789.049 180.75H784.951L787 177.472L789.049 180.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M803.049 180.75H798.951L801 177.472L803.049 180.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M817.049 180.75H812.951L815 177.472L817.049 180.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M831.049 180.75H826.951L829 177.472L831.049 180.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M845.049 180.75H840.951L843 177.472L845.049 180.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M859.049 180.75H854.951L857 177.472L859.049 180.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M873.049 180.75H868.951L871 177.472L873.049 180.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M887.049 180.75H882.951L885 177.472L887.049 180.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M901.049 180.75H896.951L899 177.472L901.049 180.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M915.049 180.75H910.951L913 177.472L915.049 180.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M929.049 180.75H924.951L927 177.472L929.049 180.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M943.049 180.75H938.951L941 177.472L943.049 180.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M957.049 180.75H952.951L955 177.472L957.049 180.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M971.049 180.75H966.951L969 177.472L971.049 180.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M985.049 180.75H980.951L983 177.472L985.049 180.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M999.049 180.75H994.951L997 177.472L999.049 180.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1013.05 180.75H1008.95L1011 177.472L1013.05 180.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1027.05 180.75H1022.95L1025 177.472L1027.05 180.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1041.05 180.75H1036.95L1039 177.472L1041.05 180.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1055.05 180.75H1050.95L1053 177.472L1055.05 180.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1069.05 180.75H1064.95L1067 177.472L1069.05 180.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1083.05 180.75H1078.95L1081 177.472L1083.05 180.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1097.05 180.75H1092.95L1095 177.472L1097.05 180.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1111.05 180.75H1106.95L1109 177.472L1111.05 180.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1125.05 180.75H1120.95L1123 177.472L1125.05 180.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1139.05 180.75H1134.95L1137 177.472L1139.05 180.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1153.05 180.75H1148.95L1151 177.472L1153.05 180.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1167.05 180.75H1162.95L1165 177.472L1167.05 180.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1181.05 180.75H1176.95L1179 177.472L1181.05 180.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1195.05 180.75H1190.95L1193 177.472L1195.05 180.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1209.05 180.75H1204.95L1207 177.472L1209.05 180.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1223.05 180.75H1218.95L1221 177.472L1223.05 180.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1237.05 180.75H1232.95L1235 177.472L1237.05 180.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1251.05 180.75H1246.95L1249 177.472L1251.05 180.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1265.05 180.75H1260.95L1263 177.472L1265.05 180.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1279.05 180.75H1274.95L1277 177.472L1279.05 180.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1293.05 180.75H1288.95L1291 177.472L1293.05 180.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1307.05 180.75H1302.95L1305 177.472L1307.05 180.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1321.05 180.75H1316.95L1319 177.472L1321.05 180.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1335.05 180.75H1330.95L1333 177.472L1335.05 180.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1349.05 180.75H1344.95L1347 177.472L1349.05 180.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1363.05 180.75H1358.95L1361 177.472L1363.05 180.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1377.05 180.75H1372.95L1375 177.472L1377.05 180.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1391.05 180.75H1386.95L1389 177.472L1391.05 180.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1405.05 180.75H1400.95L1403 177.472L1405.05 180.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1419.05 180.75H1414.95L1417 177.472L1419.05 180.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1433.05 180.75H1428.95L1431 177.472L1433.05 180.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M5.04894 196.75H0.951062L3 193.472L5.04894 196.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M19.0489 196.75H14.9511L17 193.472L19.0489 196.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M33.0489 196.75H28.9511L31 193.472L33.0489 196.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M47.0489 196.75H42.9511L45 193.472L47.0489 196.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M61.0489 196.75H56.9511L59 193.472L61.0489 196.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M75.0489 196.75H70.9511L73 193.472L75.0489 196.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M89.0489 196.75H84.9511L87 193.472L89.0489 196.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M103.049 196.75H98.9511L101 193.472L103.049 196.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M117.049 196.75H112.951L115 193.472L117.049 196.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M131.049 196.75H126.951L129 193.472L131.049 196.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M145.049 196.75H140.951L143 193.472L145.049 196.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M159.049 196.75H154.951L157 193.472L159.049 196.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M173.049 196.75H168.951L171 193.472L173.049 196.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M187.049 196.75H182.951L185 193.472L187.049 196.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M201.049 196.75H196.951L199 193.472L201.049 196.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M215.049 196.75H210.951L213 193.472L215.049 196.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M229.049 196.75H224.951L227 193.472L229.049 196.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M243.049 196.75H238.951L241 193.472L243.049 196.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M257.049 196.75H252.951L255 193.472L257.049 196.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M271.049 196.75H266.951L269 193.472L271.049 196.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M285.049 196.75H280.951L283 193.472L285.049 196.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M299.049 196.75H294.951L297 193.472L299.049 196.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M313.049 196.75H308.951L311 193.472L313.049 196.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M327.049 196.75H322.951L325 193.472L327.049 196.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M341.049 196.75H336.951L339 193.472L341.049 196.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M355.049 196.75H350.951L353 193.472L355.049 196.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M369.049 196.75H364.951L367 193.472L369.049 196.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M383.049 196.75H378.951L381 193.472L383.049 196.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M397.049 196.75H392.951L395 193.472L397.049 196.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M411.049 196.75H406.951L409 193.472L411.049 196.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M425.049 196.75H420.951L423 193.472L425.049 196.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M439.049 196.75H434.951L437 193.472L439.049 196.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M453.049 196.75H448.951L451 193.472L453.049 196.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M467.049 196.75H462.951L465 193.472L467.049 196.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M481.049 196.75H476.951L479 193.472L481.049 196.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M495.049 196.75H490.951L493 193.472L495.049 196.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M509.049 196.75H504.951L507 193.472L509.049 196.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M523.049 196.75H518.951L521 193.472L523.049 196.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M537.049 196.75H532.951L535 193.472L537.049 196.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M551.049 196.75H546.951L549 193.472L551.049 196.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M565.049 196.75H560.951L563 193.472L565.049 196.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M579.049 196.75H574.951L577 193.472L579.049 196.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M593.049 196.75H588.951L591 193.472L593.049 196.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M607.049 196.75H602.951L605 193.472L607.049 196.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M621.049 196.75H616.951L619 193.472L621.049 196.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M635.049 196.75H630.951L633 193.472L635.049 196.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M649.049 196.75H644.951L647 193.472L649.049 196.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M663.049 196.75H658.951L661 193.472L663.049 196.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M677.049 196.75H672.951L675 193.472L677.049 196.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M691.049 196.75H686.951L689 193.472L691.049 196.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M705.049 196.75H700.951L703 193.472L705.049 196.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M719.049 196.75H714.951L717 193.472L719.049 196.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M733.049 196.75H728.951L731 193.472L733.049 196.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M747.049 196.75H742.951L745 193.472L747.049 196.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M761.049 196.75H756.951L759 193.472L761.049 196.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M775.049 196.75H770.951L773 193.472L775.049 196.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M789.049 196.75H784.951L787 193.472L789.049 196.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M803.049 196.75H798.951L801 193.472L803.049 196.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M817.049 196.75H812.951L815 193.472L817.049 196.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M831.049 196.75H826.951L829 193.472L831.049 196.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M845.049 196.75H840.951L843 193.472L845.049 196.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M859.049 196.75H854.951L857 193.472L859.049 196.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M873.049 196.75H868.951L871 193.472L873.049 196.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M887.049 196.75H882.951L885 193.472L887.049 196.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M901.049 196.75H896.951L899 193.472L901.049 196.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M915.049 196.75H910.951L913 193.472L915.049 196.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M929.049 196.75H924.951L927 193.472L929.049 196.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M943.049 196.75H938.951L941 193.472L943.049 196.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M957.049 196.75H952.951L955 193.472L957.049 196.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M971.049 196.75H966.951L969 193.472L971.049 196.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M985.049 196.75H980.951L983 193.472L985.049 196.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M999.049 196.75H994.951L997 193.472L999.049 196.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1013.05 196.75H1008.95L1011 193.472L1013.05 196.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1027.05 196.75H1022.95L1025 193.472L1027.05 196.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1041.05 196.75H1036.95L1039 193.472L1041.05 196.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1055.05 196.75H1050.95L1053 193.472L1055.05 196.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1069.05 196.75H1064.95L1067 193.472L1069.05 196.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1083.05 196.75H1078.95L1081 193.472L1083.05 196.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1097.05 196.75H1092.95L1095 193.472L1097.05 196.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1111.05 196.75H1106.95L1109 193.472L1111.05 196.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1125.05 196.75H1120.95L1123 193.472L1125.05 196.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1139.05 196.75H1134.95L1137 193.472L1139.05 196.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1153.05 196.75H1148.95L1151 193.472L1153.05 196.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1167.05 196.75H1162.95L1165 193.472L1167.05 196.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1181.05 196.75H1176.95L1179 193.472L1181.05 196.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1195.05 196.75H1190.95L1193 193.472L1195.05 196.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1209.05 196.75H1204.95L1207 193.472L1209.05 196.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1223.05 196.75H1218.95L1221 193.472L1223.05 196.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1237.05 196.75H1232.95L1235 193.472L1237.05 196.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1251.05 196.75H1246.95L1249 193.472L1251.05 196.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1265.05 196.75H1260.95L1263 193.472L1265.05 196.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1279.05 196.75H1274.95L1277 193.472L1279.05 196.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1293.05 196.75H1288.95L1291 193.472L1293.05 196.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1307.05 196.75H1302.95L1305 193.472L1307.05 196.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1321.05 196.75H1316.95L1319 193.472L1321.05 196.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1335.05 196.75H1330.95L1333 193.472L1335.05 196.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1349.05 196.75H1344.95L1347 193.472L1349.05 196.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1363.05 196.75H1358.95L1361 193.472L1363.05 196.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1377.05 196.75H1372.95L1375 193.472L1377.05 196.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1391.05 196.75H1386.95L1389 193.472L1391.05 196.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1405.05 196.75H1400.95L1403 193.472L1405.05 196.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1419.05 196.75H1414.95L1417 193.472L1419.05 196.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1433.05 196.75H1428.95L1431 193.472L1433.05 196.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M5.04894 212.75H0.951062L3 209.472L5.04894 212.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M19.0489 212.75H14.9511L17 209.472L19.0489 212.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M33.0489 212.75H28.9511L31 209.472L33.0489 212.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M47.0489 212.75H42.9511L45 209.472L47.0489 212.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M61.0489 212.75H56.9511L59 209.472L61.0489 212.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M75.0489 212.75H70.9511L73 209.472L75.0489 212.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M89.0489 212.75H84.9511L87 209.472L89.0489 212.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M103.049 212.75H98.9511L101 209.472L103.049 212.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M117.049 212.75H112.951L115 209.472L117.049 212.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M131.049 212.75H126.951L129 209.472L131.049 212.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M145.049 212.75H140.951L143 209.472L145.049 212.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M159.049 212.75H154.951L157 209.472L159.049 212.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M173.049 212.75H168.951L171 209.472L173.049 212.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M187.049 212.75H182.951L185 209.472L187.049 212.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M201.049 212.75H196.951L199 209.472L201.049 212.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M215.049 212.75H210.951L213 209.472L215.049 212.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M229.049 212.75H224.951L227 209.472L229.049 212.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M243.049 212.75H238.951L241 209.472L243.049 212.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M257.049 212.75H252.951L255 209.472L257.049 212.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M271.049 212.75H266.951L269 209.472L271.049 212.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M285.049 212.75H280.951L283 209.472L285.049 212.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M299.049 212.75H294.951L297 209.472L299.049 212.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M313.049 212.75H308.951L311 209.472L313.049 212.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M327.049 212.75H322.951L325 209.472L327.049 212.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M341.049 212.75H336.951L339 209.472L341.049 212.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M355.049 212.75H350.951L353 209.472L355.049 212.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M369.049 212.75H364.951L367 209.472L369.049 212.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M383.049 212.75H378.951L381 209.472L383.049 212.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M397.049 212.75H392.951L395 209.472L397.049 212.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M411.049 212.75H406.951L409 209.472L411.049 212.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M425.049 212.75H420.951L423 209.472L425.049 212.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M439.049 212.75H434.951L437 209.472L439.049 212.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M453.049 212.75H448.951L451 209.472L453.049 212.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M467.049 212.75H462.951L465 209.472L467.049 212.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M481.049 212.75H476.951L479 209.472L481.049 212.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M495.049 212.75H490.951L493 209.472L495.049 212.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M509.049 212.75H504.951L507 209.472L509.049 212.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M523.049 212.75H518.951L521 209.472L523.049 212.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M537.049 212.75H532.951L535 209.472L537.049 212.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M551.049 212.75H546.951L549 209.472L551.049 212.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M565.049 212.75H560.951L563 209.472L565.049 212.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M579.049 212.75H574.951L577 209.472L579.049 212.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M593.049 212.75H588.951L591 209.472L593.049 212.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M607.049 212.75H602.951L605 209.472L607.049 212.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M621.049 212.75H616.951L619 209.472L621.049 212.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M635.049 212.75H630.951L633 209.472L635.049 212.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M649.049 212.75H644.951L647 209.472L649.049 212.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M663.049 212.75H658.951L661 209.472L663.049 212.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M677.049 212.75H672.951L675 209.472L677.049 212.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M691.049 212.75H686.951L689 209.472L691.049 212.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M705.049 212.75H700.951L703 209.472L705.049 212.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M719.049 212.75H714.951L717 209.472L719.049 212.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M733.049 212.75H728.951L731 209.472L733.049 212.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M747.049 212.75H742.951L745 209.472L747.049 212.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M761.049 212.75H756.951L759 209.472L761.049 212.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M775.049 212.75H770.951L773 209.472L775.049 212.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M789.049 212.75H784.951L787 209.472L789.049 212.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M803.049 212.75H798.951L801 209.472L803.049 212.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M817.049 212.75H812.951L815 209.472L817.049 212.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M831.049 212.75H826.951L829 209.472L831.049 212.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M845.049 212.75H840.951L843 209.472L845.049 212.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M859.049 212.75H854.951L857 209.472L859.049 212.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M873.049 212.75H868.951L871 209.472L873.049 212.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M887.049 212.75H882.951L885 209.472L887.049 212.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M901.049 212.75H896.951L899 209.472L901.049 212.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M915.049 212.75H910.951L913 209.472L915.049 212.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M929.049 212.75H924.951L927 209.472L929.049 212.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M943.049 212.75H938.951L941 209.472L943.049 212.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M957.049 212.75H952.951L955 209.472L957.049 212.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M971.049 212.75H966.951L969 209.472L971.049 212.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M985.049 212.75H980.951L983 209.472L985.049 212.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M999.049 212.75H994.951L997 209.472L999.049 212.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1013.05 212.75H1008.95L1011 209.472L1013.05 212.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1027.05 212.75H1022.95L1025 209.472L1027.05 212.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1041.05 212.75H1036.95L1039 209.472L1041.05 212.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1055.05 212.75H1050.95L1053 209.472L1055.05 212.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1069.05 212.75H1064.95L1067 209.472L1069.05 212.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1083.05 212.75H1078.95L1081 209.472L1083.05 212.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1097.05 212.75H1092.95L1095 209.472L1097.05 212.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1111.05 212.75H1106.95L1109 209.472L1111.05 212.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1125.05 212.75H1120.95L1123 209.472L1125.05 212.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1139.05 212.75H1134.95L1137 209.472L1139.05 212.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1153.05 212.75H1148.95L1151 209.472L1153.05 212.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1167.05 212.75H1162.95L1165 209.472L1167.05 212.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1181.05 212.75H1176.95L1179 209.472L1181.05 212.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1195.05 212.75H1190.95L1193 209.472L1195.05 212.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1209.05 212.75H1204.95L1207 209.472L1209.05 212.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1223.05 212.75H1218.95L1221 209.472L1223.05 212.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1237.05 212.75H1232.95L1235 209.472L1237.05 212.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1251.05 212.75H1246.95L1249 209.472L1251.05 212.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1265.05 212.75H1260.95L1263 209.472L1265.05 212.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1279.05 212.75H1274.95L1277 209.472L1279.05 212.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1293.05 212.75H1288.95L1291 209.472L1293.05 212.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1307.05 212.75H1302.95L1305 209.472L1307.05 212.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1321.05 212.75H1316.95L1319 209.472L1321.05 212.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1335.05 212.75H1330.95L1333 209.472L1335.05 212.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1349.05 212.75H1344.95L1347 209.472L1349.05 212.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1363.05 212.75H1358.95L1361 209.472L1363.05 212.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1377.05 212.75H1372.95L1375 209.472L1377.05 212.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1391.05 212.75H1386.95L1389 209.472L1391.05 212.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1405.05 212.75H1400.95L1403 209.472L1405.05 212.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1419.05 212.75H1414.95L1417 209.472L1419.05 212.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1433.05 212.75H1428.95L1431 209.472L1433.05 212.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M5.04894 228.75H0.951062L3 225.472L5.04894 228.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M19.0489 228.75H14.9511L17 225.472L19.0489 228.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M33.0489 228.75H28.9511L31 225.472L33.0489 228.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M47.0489 228.75H42.9511L45 225.472L47.0489 228.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M61.0489 228.75H56.9511L59 225.472L61.0489 228.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M75.0489 228.75H70.9511L73 225.472L75.0489 228.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M89.0489 228.75H84.9511L87 225.472L89.0489 228.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M103.049 228.75H98.9511L101 225.472L103.049 228.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M117.049 228.75H112.951L115 225.472L117.049 228.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M131.049 228.75H126.951L129 225.472L131.049 228.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M145.049 228.75H140.951L143 225.472L145.049 228.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M159.049 228.75H154.951L157 225.472L159.049 228.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M173.049 228.75H168.951L171 225.472L173.049 228.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M187.049 228.75H182.951L185 225.472L187.049 228.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M201.049 228.75H196.951L199 225.472L201.049 228.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M215.049 228.75H210.951L213 225.472L215.049 228.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M229.049 228.75H224.951L227 225.472L229.049 228.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M243.049 228.75H238.951L241 225.472L243.049 228.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M257.049 228.75H252.951L255 225.472L257.049 228.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M271.049 228.75H266.951L269 225.472L271.049 228.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M285.049 228.75H280.951L283 225.472L285.049 228.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M299.049 228.75H294.951L297 225.472L299.049 228.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M313.049 228.75H308.951L311 225.472L313.049 228.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M327.049 228.75H322.951L325 225.472L327.049 228.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M341.049 228.75H336.951L339 225.472L341.049 228.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M355.049 228.75H350.951L353 225.472L355.049 228.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M369.049 228.75H364.951L367 225.472L369.049 228.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M383.049 228.75H378.951L381 225.472L383.049 228.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M397.049 228.75H392.951L395 225.472L397.049 228.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M411.049 228.75H406.951L409 225.472L411.049 228.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M425.049 228.75H420.951L423 225.472L425.049 228.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M439.049 228.75H434.951L437 225.472L439.049 228.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M453.049 228.75H448.951L451 225.472L453.049 228.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M467.049 228.75H462.951L465 225.472L467.049 228.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M481.049 228.75H476.951L479 225.472L481.049 228.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M495.049 228.75H490.951L493 225.472L495.049 228.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M509.049 228.75H504.951L507 225.472L509.049 228.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M523.049 228.75H518.951L521 225.472L523.049 228.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M537.049 228.75H532.951L535 225.472L537.049 228.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M551.049 228.75H546.951L549 225.472L551.049 228.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M565.049 228.75H560.951L563 225.472L565.049 228.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M579.049 228.75H574.951L577 225.472L579.049 228.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M593.049 228.75H588.951L591 225.472L593.049 228.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M607.049 228.75H602.951L605 225.472L607.049 228.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M621.049 228.75H616.951L619 225.472L621.049 228.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M635.049 228.75H630.951L633 225.472L635.049 228.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M649.049 228.75H644.951L647 225.472L649.049 228.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M663.049 228.75H658.951L661 225.472L663.049 228.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M677.049 228.75H672.951L675 225.472L677.049 228.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M691.049 228.75H686.951L689 225.472L691.049 228.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M705.049 228.75H700.951L703 225.472L705.049 228.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M719.049 228.75H714.951L717 225.472L719.049 228.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M733.049 228.75H728.951L731 225.472L733.049 228.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M747.049 228.75H742.951L745 225.472L747.049 228.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M761.049 228.75H756.951L759 225.472L761.049 228.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M775.049 228.75H770.951L773 225.472L775.049 228.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M789.049 228.75H784.951L787 225.472L789.049 228.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M803.049 228.75H798.951L801 225.472L803.049 228.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M817.049 228.75H812.951L815 225.472L817.049 228.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M831.049 228.75H826.951L829 225.472L831.049 228.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M845.049 228.75H840.951L843 225.472L845.049 228.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M859.049 228.75H854.951L857 225.472L859.049 228.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M873.049 228.75H868.951L871 225.472L873.049 228.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M887.049 228.75H882.951L885 225.472L887.049 228.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M901.049 228.75H896.951L899 225.472L901.049 228.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M915.049 228.75H910.951L913 225.472L915.049 228.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M929.049 228.75H924.951L927 225.472L929.049 228.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M943.049 228.75H938.951L941 225.472L943.049 228.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M957.049 228.75H952.951L955 225.472L957.049 228.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M971.049 228.75H966.951L969 225.472L971.049 228.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M985.049 228.75H980.951L983 225.472L985.049 228.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M999.049 228.75H994.951L997 225.472L999.049 228.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1013.05 228.75H1008.95L1011 225.472L1013.05 228.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1027.05 228.75H1022.95L1025 225.472L1027.05 228.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1041.05 228.75H1036.95L1039 225.472L1041.05 228.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1055.05 228.75H1050.95L1053 225.472L1055.05 228.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1069.05 228.75H1064.95L1067 225.472L1069.05 228.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1083.05 228.75H1078.95L1081 225.472L1083.05 228.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1097.05 228.75H1092.95L1095 225.472L1097.05 228.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1111.05 228.75H1106.95L1109 225.472L1111.05 228.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1125.05 228.75H1120.95L1123 225.472L1125.05 228.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1139.05 228.75H1134.95L1137 225.472L1139.05 228.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1153.05 228.75H1148.95L1151 225.472L1153.05 228.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1167.05 228.75H1162.95L1165 225.472L1167.05 228.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1181.05 228.75H1176.95L1179 225.472L1181.05 228.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1195.05 228.75H1190.95L1193 225.472L1195.05 228.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1209.05 228.75H1204.95L1207 225.472L1209.05 228.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1223.05 228.75H1218.95L1221 225.472L1223.05 228.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1237.05 228.75H1232.95L1235 225.472L1237.05 228.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1251.05 228.75H1246.95L1249 225.472L1251.05 228.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1265.05 228.75H1260.95L1263 225.472L1265.05 228.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1279.05 228.75H1274.95L1277 225.472L1279.05 228.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1293.05 228.75H1288.95L1291 225.472L1293.05 228.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1307.05 228.75H1302.95L1305 225.472L1307.05 228.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1321.05 228.75H1316.95L1319 225.472L1321.05 228.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1335.05 228.75H1330.95L1333 225.472L1335.05 228.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1349.05 228.75H1344.95L1347 225.472L1349.05 228.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1363.05 228.75H1358.95L1361 225.472L1363.05 228.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1377.05 228.75H1372.95L1375 225.472L1377.05 228.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1391.05 228.75H1386.95L1389 225.472L1391.05 228.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1405.05 228.75H1400.95L1403 225.472L1405.05 228.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1419.05 228.75H1414.95L1417 225.472L1419.05 228.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1433.05 228.75H1428.95L1431 225.472L1433.05 228.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M5.04894 244.75H0.951062L3 241.472L5.04894 244.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M19.0489 244.75H14.9511L17 241.472L19.0489 244.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M33.0489 244.75H28.9511L31 241.472L33.0489 244.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M47.0489 244.75H42.9511L45 241.472L47.0489 244.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M61.0489 244.75H56.9511L59 241.472L61.0489 244.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M75.0489 244.75H70.9511L73 241.472L75.0489 244.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M89.0489 244.75H84.9511L87 241.472L89.0489 244.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M103.049 244.75H98.9511L101 241.472L103.049 244.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M117.049 244.75H112.951L115 241.472L117.049 244.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M131.049 244.75H126.951L129 241.472L131.049 244.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M145.049 244.75H140.951L143 241.472L145.049 244.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M159.049 244.75H154.951L157 241.472L159.049 244.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M173.049 244.75H168.951L171 241.472L173.049 244.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M187.049 244.75H182.951L185 241.472L187.049 244.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M201.049 244.75H196.951L199 241.472L201.049 244.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M215.049 244.75H210.951L213 241.472L215.049 244.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M229.049 244.75H224.951L227 241.472L229.049 244.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M243.049 244.75H238.951L241 241.472L243.049 244.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M257.049 244.75H252.951L255 241.472L257.049 244.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M271.049 244.75H266.951L269 241.472L271.049 244.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M285.049 244.75H280.951L283 241.472L285.049 244.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M299.049 244.75H294.951L297 241.472L299.049 244.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M313.049 244.75H308.951L311 241.472L313.049 244.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M327.049 244.75H322.951L325 241.472L327.049 244.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M341.049 244.75H336.951L339 241.472L341.049 244.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M355.049 244.75H350.951L353 241.472L355.049 244.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M369.049 244.75H364.951L367 241.472L369.049 244.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M383.049 244.75H378.951L381 241.472L383.049 244.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M397.049 244.75H392.951L395 241.472L397.049 244.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M411.049 244.75H406.951L409 241.472L411.049 244.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M425.049 244.75H420.951L423 241.472L425.049 244.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M439.049 244.75H434.951L437 241.472L439.049 244.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M453.049 244.75H448.951L451 241.472L453.049 244.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M467.049 244.75H462.951L465 241.472L467.049 244.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M481.049 244.75H476.951L479 241.472L481.049 244.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M495.049 244.75H490.951L493 241.472L495.049 244.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M509.049 244.75H504.951L507 241.472L509.049 244.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M523.049 244.75H518.951L521 241.472L523.049 244.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M537.049 244.75H532.951L535 241.472L537.049 244.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M551.049 244.75H546.951L549 241.472L551.049 244.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M565.049 244.75H560.951L563 241.472L565.049 244.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M579.049 244.75H574.951L577 241.472L579.049 244.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M593.049 244.75H588.951L591 241.472L593.049 244.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M607.049 244.75H602.951L605 241.472L607.049 244.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M621.049 244.75H616.951L619 241.472L621.049 244.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M635.049 244.75H630.951L633 241.472L635.049 244.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M649.049 244.75H644.951L647 241.472L649.049 244.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M663.049 244.75H658.951L661 241.472L663.049 244.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M677.049 244.75H672.951L675 241.472L677.049 244.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M691.049 244.75H686.951L689 241.472L691.049 244.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M705.049 244.75H700.951L703 241.472L705.049 244.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M719.049 244.75H714.951L717 241.472L719.049 244.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M733.049 244.75H728.951L731 241.472L733.049 244.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M747.049 244.75H742.951L745 241.472L747.049 244.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M761.049 244.75H756.951L759 241.472L761.049 244.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M775.049 244.75H770.951L773 241.472L775.049 244.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M789.049 244.75H784.951L787 241.472L789.049 244.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M803.049 244.75H798.951L801 241.472L803.049 244.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M817.049 244.75H812.951L815 241.472L817.049 244.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M831.049 244.75H826.951L829 241.472L831.049 244.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M845.049 244.75H840.951L843 241.472L845.049 244.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M859.049 244.75H854.951L857 241.472L859.049 244.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M873.049 244.75H868.951L871 241.472L873.049 244.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M887.049 244.75H882.951L885 241.472L887.049 244.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M901.049 244.75H896.951L899 241.472L901.049 244.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M915.049 244.75H910.951L913 241.472L915.049 244.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M929.049 244.75H924.951L927 241.472L929.049 244.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M943.049 244.75H938.951L941 241.472L943.049 244.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M957.049 244.75H952.951L955 241.472L957.049 244.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M971.049 244.75H966.951L969 241.472L971.049 244.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M985.049 244.75H980.951L983 241.472L985.049 244.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M999.049 244.75H994.951L997 241.472L999.049 244.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1013.05 244.75H1008.95L1011 241.472L1013.05 244.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1027.05 244.75H1022.95L1025 241.472L1027.05 244.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1041.05 244.75H1036.95L1039 241.472L1041.05 244.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1055.05 244.75H1050.95L1053 241.472L1055.05 244.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1069.05 244.75H1064.95L1067 241.472L1069.05 244.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1083.05 244.75H1078.95L1081 241.472L1083.05 244.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1097.05 244.75H1092.95L1095 241.472L1097.05 244.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1111.05 244.75H1106.95L1109 241.472L1111.05 244.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1125.05 244.75H1120.95L1123 241.472L1125.05 244.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1139.05 244.75H1134.95L1137 241.472L1139.05 244.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1153.05 244.75H1148.95L1151 241.472L1153.05 244.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1167.05 244.75H1162.95L1165 241.472L1167.05 244.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1181.05 244.75H1176.95L1179 241.472L1181.05 244.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1195.05 244.75H1190.95L1193 241.472L1195.05 244.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1209.05 244.75H1204.95L1207 241.472L1209.05 244.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1223.05 244.75H1218.95L1221 241.472L1223.05 244.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1237.05 244.75H1232.95L1235 241.472L1237.05 244.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1251.05 244.75H1246.95L1249 241.472L1251.05 244.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1265.05 244.75H1260.95L1263 241.472L1265.05 244.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1279.05 244.75H1274.95L1277 241.472L1279.05 244.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1293.05 244.75H1288.95L1291 241.472L1293.05 244.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1307.05 244.75H1302.95L1305 241.472L1307.05 244.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1321.05 244.75H1316.95L1319 241.472L1321.05 244.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1335.05 244.75H1330.95L1333 241.472L1335.05 244.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1349.05 244.75H1344.95L1347 241.472L1349.05 244.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1363.05 244.75H1358.95L1361 241.472L1363.05 244.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1377.05 244.75H1372.95L1375 241.472L1377.05 244.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1391.05 244.75H1386.95L1389 241.472L1391.05 244.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1405.05 244.75H1400.95L1403 241.472L1405.05 244.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1419.05 244.75H1414.95L1417 241.472L1419.05 244.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1433.05 244.75H1428.95L1431 241.472L1433.05 244.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M5.04894 260.75H0.951062L3 257.472L5.04894 260.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M19.0489 260.75H14.9511L17 257.472L19.0489 260.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M33.0489 260.75H28.9511L31 257.472L33.0489 260.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M47.0489 260.75H42.9511L45 257.472L47.0489 260.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M61.0489 260.75H56.9511L59 257.472L61.0489 260.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M75.0489 260.75H70.9511L73 257.472L75.0489 260.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M89.0489 260.75H84.9511L87 257.472L89.0489 260.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M103.049 260.75H98.9511L101 257.472L103.049 260.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M117.049 260.75H112.951L115 257.472L117.049 260.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M131.049 260.75H126.951L129 257.472L131.049 260.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M145.049 260.75H140.951L143 257.472L145.049 260.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M159.049 260.75H154.951L157 257.472L159.049 260.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M173.049 260.75H168.951L171 257.472L173.049 260.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M187.049 260.75H182.951L185 257.472L187.049 260.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M201.049 260.75H196.951L199 257.472L201.049 260.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M215.049 260.75H210.951L213 257.472L215.049 260.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M229.049 260.75H224.951L227 257.472L229.049 260.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M243.049 260.75H238.951L241 257.472L243.049 260.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M257.049 260.75H252.951L255 257.472L257.049 260.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M271.049 260.75H266.951L269 257.472L271.049 260.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M285.049 260.75H280.951L283 257.472L285.049 260.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M299.049 260.75H294.951L297 257.472L299.049 260.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M313.049 260.75H308.951L311 257.472L313.049 260.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M327.049 260.75H322.951L325 257.472L327.049 260.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M341.049 260.75H336.951L339 257.472L341.049 260.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M355.049 260.75H350.951L353 257.472L355.049 260.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M369.049 260.75H364.951L367 257.472L369.049 260.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M383.049 260.75H378.951L381 257.472L383.049 260.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M397.049 260.75H392.951L395 257.472L397.049 260.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M411.049 260.75H406.951L409 257.472L411.049 260.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M425.049 260.75H420.951L423 257.472L425.049 260.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M439.049 260.75H434.951L437 257.472L439.049 260.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M453.049 260.75H448.951L451 257.472L453.049 260.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M467.049 260.75H462.951L465 257.472L467.049 260.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M481.049 260.75H476.951L479 257.472L481.049 260.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M495.049 260.75H490.951L493 257.472L495.049 260.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M509.049 260.75H504.951L507 257.472L509.049 260.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M523.049 260.75H518.951L521 257.472L523.049 260.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M537.049 260.75H532.951L535 257.472L537.049 260.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M551.049 260.75H546.951L549 257.472L551.049 260.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M565.049 260.75H560.951L563 257.472L565.049 260.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M579.049 260.75H574.951L577 257.472L579.049 260.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M593.049 260.75H588.951L591 257.472L593.049 260.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M607.049 260.75H602.951L605 257.472L607.049 260.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M621.049 260.75H616.951L619 257.472L621.049 260.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M635.049 260.75H630.951L633 257.472L635.049 260.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M649.049 260.75H644.951L647 257.472L649.049 260.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M663.049 260.75H658.951L661 257.472L663.049 260.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M677.049 260.75H672.951L675 257.472L677.049 260.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M691.049 260.75H686.951L689 257.472L691.049 260.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M705.049 260.75H700.951L703 257.472L705.049 260.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M719.049 260.75H714.951L717 257.472L719.049 260.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M733.049 260.75H728.951L731 257.472L733.049 260.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M747.049 260.75H742.951L745 257.472L747.049 260.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M761.049 260.75H756.951L759 257.472L761.049 260.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M775.049 260.75H770.951L773 257.472L775.049 260.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M789.049 260.75H784.951L787 257.472L789.049 260.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M803.049 260.75H798.951L801 257.472L803.049 260.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M817.049 260.75H812.951L815 257.472L817.049 260.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M831.049 260.75H826.951L829 257.472L831.049 260.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M845.049 260.75H840.951L843 257.472L845.049 260.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M859.049 260.75H854.951L857 257.472L859.049 260.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M873.049 260.75H868.951L871 257.472L873.049 260.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M887.049 260.75H882.951L885 257.472L887.049 260.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M901.049 260.75H896.951L899 257.472L901.049 260.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M915.049 260.75H910.951L913 257.472L915.049 260.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M929.049 260.75H924.951L927 257.472L929.049 260.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M943.049 260.75H938.951L941 257.472L943.049 260.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M957.049 260.75H952.951L955 257.472L957.049 260.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M971.049 260.75H966.951L969 257.472L971.049 260.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M985.049 260.75H980.951L983 257.472L985.049 260.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M999.049 260.75H994.951L997 257.472L999.049 260.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1013.05 260.75H1008.95L1011 257.472L1013.05 260.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1027.05 260.75H1022.95L1025 257.472L1027.05 260.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1041.05 260.75H1036.95L1039 257.472L1041.05 260.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1055.05 260.75H1050.95L1053 257.472L1055.05 260.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1069.05 260.75H1064.95L1067 257.472L1069.05 260.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1083.05 260.75H1078.95L1081 257.472L1083.05 260.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1097.05 260.75H1092.95L1095 257.472L1097.05 260.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1111.05 260.75H1106.95L1109 257.472L1111.05 260.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1125.05 260.75H1120.95L1123 257.472L1125.05 260.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1139.05 260.75H1134.95L1137 257.472L1139.05 260.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1153.05 260.75H1148.95L1151 257.472L1153.05 260.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1167.05 260.75H1162.95L1165 257.472L1167.05 260.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1181.05 260.75H1176.95L1179 257.472L1181.05 260.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1195.05 260.75H1190.95L1193 257.472L1195.05 260.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1209.05 260.75H1204.95L1207 257.472L1209.05 260.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1223.05 260.75H1218.95L1221 257.472L1223.05 260.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1237.05 260.75H1232.95L1235 257.472L1237.05 260.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1251.05 260.75H1246.95L1249 257.472L1251.05 260.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1265.05 260.75H1260.95L1263 257.472L1265.05 260.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1279.05 260.75H1274.95L1277 257.472L1279.05 260.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1293.05 260.75H1288.95L1291 257.472L1293.05 260.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1307.05 260.75H1302.95L1305 257.472L1307.05 260.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1321.05 260.75H1316.95L1319 257.472L1321.05 260.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1335.05 260.75H1330.95L1333 257.472L1335.05 260.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1349.05 260.75H1344.95L1347 257.472L1349.05 260.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1363.05 260.75H1358.95L1361 257.472L1363.05 260.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1377.05 260.75H1372.95L1375 257.472L1377.05 260.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1391.05 260.75H1386.95L1389 257.472L1391.05 260.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1405.05 260.75H1400.95L1403 257.472L1405.05 260.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1419.05 260.75H1414.95L1417 257.472L1419.05 260.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1433.05 260.75H1428.95L1431 257.472L1433.05 260.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M5.04894 276.75H0.951062L3 273.472L5.04894 276.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M19.0489 276.75H14.9511L17 273.472L19.0489 276.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M33.0489 276.75H28.9511L31 273.472L33.0489 276.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M47.0489 276.75H42.9511L45 273.472L47.0489 276.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M61.0489 276.75H56.9511L59 273.472L61.0489 276.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M75.0489 276.75H70.9511L73 273.472L75.0489 276.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M89.0489 276.75H84.9511L87 273.472L89.0489 276.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M103.049 276.75H98.9511L101 273.472L103.049 276.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M117.049 276.75H112.951L115 273.472L117.049 276.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M131.049 276.75H126.951L129 273.472L131.049 276.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M145.049 276.75H140.951L143 273.472L145.049 276.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M159.049 276.75H154.951L157 273.472L159.049 276.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M173.049 276.75H168.951L171 273.472L173.049 276.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M187.049 276.75H182.951L185 273.472L187.049 276.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M201.049 276.75H196.951L199 273.472L201.049 276.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M215.049 276.75H210.951L213 273.472L215.049 276.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M229.049 276.75H224.951L227 273.472L229.049 276.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M243.049 276.75H238.951L241 273.472L243.049 276.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M257.049 276.75H252.951L255 273.472L257.049 276.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M271.049 276.75H266.951L269 273.472L271.049 276.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M285.049 276.75H280.951L283 273.472L285.049 276.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M299.049 276.75H294.951L297 273.472L299.049 276.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M313.049 276.75H308.951L311 273.472L313.049 276.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M327.049 276.75H322.951L325 273.472L327.049 276.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M341.049 276.75H336.951L339 273.472L341.049 276.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M355.049 276.75H350.951L353 273.472L355.049 276.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M369.049 276.75H364.951L367 273.472L369.049 276.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M383.049 276.75H378.951L381 273.472L383.049 276.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M397.049 276.75H392.951L395 273.472L397.049 276.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M411.049 276.75H406.951L409 273.472L411.049 276.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M425.049 276.75H420.951L423 273.472L425.049 276.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M439.049 276.75H434.951L437 273.472L439.049 276.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M453.049 276.75H448.951L451 273.472L453.049 276.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M467.049 276.75H462.951L465 273.472L467.049 276.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M481.049 276.75H476.951L479 273.472L481.049 276.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M495.049 276.75H490.951L493 273.472L495.049 276.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M509.049 276.75H504.951L507 273.472L509.049 276.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M523.049 276.75H518.951L521 273.472L523.049 276.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M537.049 276.75H532.951L535 273.472L537.049 276.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M551.049 276.75H546.951L549 273.472L551.049 276.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M565.049 276.75H560.951L563 273.472L565.049 276.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M579.049 276.75H574.951L577 273.472L579.049 276.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M593.049 276.75H588.951L591 273.472L593.049 276.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M607.049 276.75H602.951L605 273.472L607.049 276.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M621.049 276.75H616.951L619 273.472L621.049 276.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M635.049 276.75H630.951L633 273.472L635.049 276.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M649.049 276.75H644.951L647 273.472L649.049 276.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M663.049 276.75H658.951L661 273.472L663.049 276.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M677.049 276.75H672.951L675 273.472L677.049 276.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M691.049 276.75H686.951L689 273.472L691.049 276.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M705.049 276.75H700.951L703 273.472L705.049 276.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M719.049 276.75H714.951L717 273.472L719.049 276.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M733.049 276.75H728.951L731 273.472L733.049 276.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M747.049 276.75H742.951L745 273.472L747.049 276.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M761.049 276.75H756.951L759 273.472L761.049 276.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M775.049 276.75H770.951L773 273.472L775.049 276.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M789.049 276.75H784.951L787 273.472L789.049 276.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M803.049 276.75H798.951L801 273.472L803.049 276.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M817.049 276.75H812.951L815 273.472L817.049 276.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M831.049 276.75H826.951L829 273.472L831.049 276.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M845.049 276.75H840.951L843 273.472L845.049 276.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M859.049 276.75H854.951L857 273.472L859.049 276.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M873.049 276.75H868.951L871 273.472L873.049 276.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M887.049 276.75H882.951L885 273.472L887.049 276.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M901.049 276.75H896.951L899 273.472L901.049 276.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M915.049 276.75H910.951L913 273.472L915.049 276.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M929.049 276.75H924.951L927 273.472L929.049 276.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M943.049 276.75H938.951L941 273.472L943.049 276.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M957.049 276.75H952.951L955 273.472L957.049 276.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M971.049 276.75H966.951L969 273.472L971.049 276.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M985.049 276.75H980.951L983 273.472L985.049 276.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M999.049 276.75H994.951L997 273.472L999.049 276.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1013.05 276.75H1008.95L1011 273.472L1013.05 276.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1027.05 276.75H1022.95L1025 273.472L1027.05 276.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1041.05 276.75H1036.95L1039 273.472L1041.05 276.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1055.05 276.75H1050.95L1053 273.472L1055.05 276.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1069.05 276.75H1064.95L1067 273.472L1069.05 276.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1083.05 276.75H1078.95L1081 273.472L1083.05 276.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1097.05 276.75H1092.95L1095 273.472L1097.05 276.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1111.05 276.75H1106.95L1109 273.472L1111.05 276.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1125.05 276.75H1120.95L1123 273.472L1125.05 276.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1139.05 276.75H1134.95L1137 273.472L1139.05 276.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1153.05 276.75H1148.95L1151 273.472L1153.05 276.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1167.05 276.75H1162.95L1165 273.472L1167.05 276.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1181.05 276.75H1176.95L1179 273.472L1181.05 276.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1195.05 276.75H1190.95L1193 273.472L1195.05 276.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1209.05 276.75H1204.95L1207 273.472L1209.05 276.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1223.05 276.75H1218.95L1221 273.472L1223.05 276.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1237.05 276.75H1232.95L1235 273.472L1237.05 276.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1251.05 276.75H1246.95L1249 273.472L1251.05 276.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1265.05 276.75H1260.95L1263 273.472L1265.05 276.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1279.05 276.75H1274.95L1277 273.472L1279.05 276.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1293.05 276.75H1288.95L1291 273.472L1293.05 276.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1307.05 276.75H1302.95L1305 273.472L1307.05 276.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1321.05 276.75H1316.95L1319 273.472L1321.05 276.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1335.05 276.75H1330.95L1333 273.472L1335.05 276.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1349.05 276.75H1344.95L1347 273.472L1349.05 276.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1363.05 276.75H1358.95L1361 273.472L1363.05 276.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1377.05 276.75H1372.95L1375 273.472L1377.05 276.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1391.05 276.75H1386.95L1389 273.472L1391.05 276.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1405.05 276.75H1400.95L1403 273.472L1405.05 276.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1419.05 276.75H1414.95L1417 273.472L1419.05 276.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1433.05 276.75H1428.95L1431 273.472L1433.05 276.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M5.04894 292.75H0.951062L3 289.472L5.04894 292.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M19.0489 292.75H14.9511L17 289.472L19.0489 292.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M33.0489 292.75H28.9511L31 289.472L33.0489 292.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M47.0489 292.75H42.9511L45 289.472L47.0489 292.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M61.0489 292.75H56.9511L59 289.472L61.0489 292.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M75.0489 292.75H70.9511L73 289.472L75.0489 292.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M89.0489 292.75H84.9511L87 289.472L89.0489 292.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M103.049 292.75H98.9511L101 289.472L103.049 292.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M117.049 292.75H112.951L115 289.472L117.049 292.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M131.049 292.75H126.951L129 289.472L131.049 292.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M145.049 292.75H140.951L143 289.472L145.049 292.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M159.049 292.75H154.951L157 289.472L159.049 292.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M173.049 292.75H168.951L171 289.472L173.049 292.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M187.049 292.75H182.951L185 289.472L187.049 292.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M201.049 292.75H196.951L199 289.472L201.049 292.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M215.049 292.75H210.951L213 289.472L215.049 292.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M229.049 292.75H224.951L227 289.472L229.049 292.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M243.049 292.75H238.951L241 289.472L243.049 292.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M257.049 292.75H252.951L255 289.472L257.049 292.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M271.049 292.75H266.951L269 289.472L271.049 292.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M285.049 292.75H280.951L283 289.472L285.049 292.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M299.049 292.75H294.951L297 289.472L299.049 292.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M313.049 292.75H308.951L311 289.472L313.049 292.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M327.049 292.75H322.951L325 289.472L327.049 292.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M341.049 292.75H336.951L339 289.472L341.049 292.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M355.049 292.75H350.951L353 289.472L355.049 292.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M369.049 292.75H364.951L367 289.472L369.049 292.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M383.049 292.75H378.951L381 289.472L383.049 292.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M397.049 292.75H392.951L395 289.472L397.049 292.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M411.049 292.75H406.951L409 289.472L411.049 292.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M425.049 292.75H420.951L423 289.472L425.049 292.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M439.049 292.75H434.951L437 289.472L439.049 292.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M453.049 292.75H448.951L451 289.472L453.049 292.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M467.049 292.75H462.951L465 289.472L467.049 292.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M481.049 292.75H476.951L479 289.472L481.049 292.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M495.049 292.75H490.951L493 289.472L495.049 292.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M509.049 292.75H504.951L507 289.472L509.049 292.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M523.049 292.75H518.951L521 289.472L523.049 292.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M537.049 292.75H532.951L535 289.472L537.049 292.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M551.049 292.75H546.951L549 289.472L551.049 292.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M565.049 292.75H560.951L563 289.472L565.049 292.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M579.049 292.75H574.951L577 289.472L579.049 292.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M593.049 292.75H588.951L591 289.472L593.049 292.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M607.049 292.75H602.951L605 289.472L607.049 292.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M621.049 292.75H616.951L619 289.472L621.049 292.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M635.049 292.75H630.951L633 289.472L635.049 292.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M649.049 292.75H644.951L647 289.472L649.049 292.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M663.049 292.75H658.951L661 289.472L663.049 292.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M677.049 292.75H672.951L675 289.472L677.049 292.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M691.049 292.75H686.951L689 289.472L691.049 292.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M705.049 292.75H700.951L703 289.472L705.049 292.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M719.049 292.75H714.951L717 289.472L719.049 292.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M733.049 292.75H728.951L731 289.472L733.049 292.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M747.049 292.75H742.951L745 289.472L747.049 292.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M761.049 292.75H756.951L759 289.472L761.049 292.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M775.049 292.75H770.951L773 289.472L775.049 292.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M789.049 292.75H784.951L787 289.472L789.049 292.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M803.049 292.75H798.951L801 289.472L803.049 292.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M817.049 292.75H812.951L815 289.472L817.049 292.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M831.049 292.75H826.951L829 289.472L831.049 292.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M845.049 292.75H840.951L843 289.472L845.049 292.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M859.049 292.75H854.951L857 289.472L859.049 292.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M873.049 292.75H868.951L871 289.472L873.049 292.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M887.049 292.75H882.951L885 289.472L887.049 292.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M901.049 292.75H896.951L899 289.472L901.049 292.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M915.049 292.75H910.951L913 289.472L915.049 292.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M929.049 292.75H924.951L927 289.472L929.049 292.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M943.049 292.75H938.951L941 289.472L943.049 292.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M957.049 292.75H952.951L955 289.472L957.049 292.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M971.049 292.75H966.951L969 289.472L971.049 292.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M985.049 292.75H980.951L983 289.472L985.049 292.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M999.049 292.75H994.951L997 289.472L999.049 292.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1013.05 292.75H1008.95L1011 289.472L1013.05 292.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1027.05 292.75H1022.95L1025 289.472L1027.05 292.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1041.05 292.75H1036.95L1039 289.472L1041.05 292.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1055.05 292.75H1050.95L1053 289.472L1055.05 292.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1069.05 292.75H1064.95L1067 289.472L1069.05 292.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1083.05 292.75H1078.95L1081 289.472L1083.05 292.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1097.05 292.75H1092.95L1095 289.472L1097.05 292.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1111.05 292.75H1106.95L1109 289.472L1111.05 292.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1125.05 292.75H1120.95L1123 289.472L1125.05 292.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1139.05 292.75H1134.95L1137 289.472L1139.05 292.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1153.05 292.75H1148.95L1151 289.472L1153.05 292.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1167.05 292.75H1162.95L1165 289.472L1167.05 292.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1181.05 292.75H1176.95L1179 289.472L1181.05 292.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1195.05 292.75H1190.95L1193 289.472L1195.05 292.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1209.05 292.75H1204.95L1207 289.472L1209.05 292.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1223.05 292.75H1218.95L1221 289.472L1223.05 292.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1237.05 292.75H1232.95L1235 289.472L1237.05 292.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1251.05 292.75H1246.95L1249 289.472L1251.05 292.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1265.05 292.75H1260.95L1263 289.472L1265.05 292.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1279.05 292.75H1274.95L1277 289.472L1279.05 292.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1293.05 292.75H1288.95L1291 289.472L1293.05 292.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1307.05 292.75H1302.95L1305 289.472L1307.05 292.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1321.05 292.75H1316.95L1319 289.472L1321.05 292.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1335.05 292.75H1330.95L1333 289.472L1335.05 292.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1349.05 292.75H1344.95L1347 289.472L1349.05 292.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1363.05 292.75H1358.95L1361 289.472L1363.05 292.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1377.05 292.75H1372.95L1375 289.472L1377.05 292.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1391.05 292.75H1386.95L1389 289.472L1391.05 292.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1405.05 292.75H1400.95L1403 289.472L1405.05 292.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1419.05 292.75H1414.95L1417 289.472L1419.05 292.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1433.05 292.75H1428.95L1431 289.472L1433.05 292.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M5.04894 308.75H0.951062L3 305.472L5.04894 308.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M19.0489 308.75H14.9511L17 305.472L19.0489 308.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M33.0489 308.75H28.9511L31 305.472L33.0489 308.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M47.0489 308.75H42.9511L45 305.472L47.0489 308.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M61.0489 308.75H56.9511L59 305.472L61.0489 308.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M75.0489 308.75H70.9511L73 305.472L75.0489 308.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M89.0489 308.75H84.9511L87 305.472L89.0489 308.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M103.049 308.75H98.9511L101 305.472L103.049 308.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M117.049 308.75H112.951L115 305.472L117.049 308.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M131.049 308.75H126.951L129 305.472L131.049 308.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M145.049 308.75H140.951L143 305.472L145.049 308.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M159.049 308.75H154.951L157 305.472L159.049 308.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M173.049 308.75H168.951L171 305.472L173.049 308.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M187.049 308.75H182.951L185 305.472L187.049 308.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M201.049 308.75H196.951L199 305.472L201.049 308.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M215.049 308.75H210.951L213 305.472L215.049 308.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M229.049 308.75H224.951L227 305.472L229.049 308.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M243.049 308.75H238.951L241 305.472L243.049 308.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M257.049 308.75H252.951L255 305.472L257.049 308.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M271.049 308.75H266.951L269 305.472L271.049 308.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M285.049 308.75H280.951L283 305.472L285.049 308.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M299.049 308.75H294.951L297 305.472L299.049 308.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M313.049 308.75H308.951L311 305.472L313.049 308.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M327.049 308.75H322.951L325 305.472L327.049 308.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M341.049 308.75H336.951L339 305.472L341.049 308.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M355.049 308.75H350.951L353 305.472L355.049 308.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M369.049 308.75H364.951L367 305.472L369.049 308.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M383.049 308.75H378.951L381 305.472L383.049 308.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M397.049 308.75H392.951L395 305.472L397.049 308.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M411.049 308.75H406.951L409 305.472L411.049 308.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M425.049 308.75H420.951L423 305.472L425.049 308.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M439.049 308.75H434.951L437 305.472L439.049 308.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M453.049 308.75H448.951L451 305.472L453.049 308.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M467.049 308.75H462.951L465 305.472L467.049 308.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M481.049 308.75H476.951L479 305.472L481.049 308.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M495.049 308.75H490.951L493 305.472L495.049 308.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M509.049 308.75H504.951L507 305.472L509.049 308.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M523.049 308.75H518.951L521 305.472L523.049 308.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M537.049 308.75H532.951L535 305.472L537.049 308.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M551.049 308.75H546.951L549 305.472L551.049 308.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M565.049 308.75H560.951L563 305.472L565.049 308.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M579.049 308.75H574.951L577 305.472L579.049 308.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M593.049 308.75H588.951L591 305.472L593.049 308.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M607.049 308.75H602.951L605 305.472L607.049 308.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M621.049 308.75H616.951L619 305.472L621.049 308.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M635.049 308.75H630.951L633 305.472L635.049 308.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M649.049 308.75H644.951L647 305.472L649.049 308.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M663.049 308.75H658.951L661 305.472L663.049 308.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M677.049 308.75H672.951L675 305.472L677.049 308.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M691.049 308.75H686.951L689 305.472L691.049 308.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M705.049 308.75H700.951L703 305.472L705.049 308.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M719.049 308.75H714.951L717 305.472L719.049 308.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M733.049 308.75H728.951L731 305.472L733.049 308.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M747.049 308.75H742.951L745 305.472L747.049 308.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M761.049 308.75H756.951L759 305.472L761.049 308.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M775.049 308.75H770.951L773 305.472L775.049 308.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M789.049 308.75H784.951L787 305.472L789.049 308.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M803.049 308.75H798.951L801 305.472L803.049 308.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M817.049 308.75H812.951L815 305.472L817.049 308.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M831.049 308.75H826.951L829 305.472L831.049 308.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M845.049 308.75H840.951L843 305.472L845.049 308.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M859.049 308.75H854.951L857 305.472L859.049 308.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M873.049 308.75H868.951L871 305.472L873.049 308.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M887.049 308.75H882.951L885 305.472L887.049 308.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M901.049 308.75H896.951L899 305.472L901.049 308.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M915.049 308.75H910.951L913 305.472L915.049 308.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M929.049 308.75H924.951L927 305.472L929.049 308.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M943.049 308.75H938.951L941 305.472L943.049 308.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M957.049 308.75H952.951L955 305.472L957.049 308.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M971.049 308.75H966.951L969 305.472L971.049 308.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M985.049 308.75H980.951L983 305.472L985.049 308.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M999.049 308.75H994.951L997 305.472L999.049 308.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1013.05 308.75H1008.95L1011 305.472L1013.05 308.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1027.05 308.75H1022.95L1025 305.472L1027.05 308.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1041.05 308.75H1036.95L1039 305.472L1041.05 308.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1055.05 308.75H1050.95L1053 305.472L1055.05 308.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1069.05 308.75H1064.95L1067 305.472L1069.05 308.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1083.05 308.75H1078.95L1081 305.472L1083.05 308.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1097.05 308.75H1092.95L1095 305.472L1097.05 308.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1111.05 308.75H1106.95L1109 305.472L1111.05 308.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1125.05 308.75H1120.95L1123 305.472L1125.05 308.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1139.05 308.75H1134.95L1137 305.472L1139.05 308.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1153.05 308.75H1148.95L1151 305.472L1153.05 308.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1167.05 308.75H1162.95L1165 305.472L1167.05 308.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1181.05 308.75H1176.95L1179 305.472L1181.05 308.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1195.05 308.75H1190.95L1193 305.472L1195.05 308.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1209.05 308.75H1204.95L1207 305.472L1209.05 308.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1223.05 308.75H1218.95L1221 305.472L1223.05 308.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1237.05 308.75H1232.95L1235 305.472L1237.05 308.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1251.05 308.75H1246.95L1249 305.472L1251.05 308.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1265.05 308.75H1260.95L1263 305.472L1265.05 308.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1279.05 308.75H1274.95L1277 305.472L1279.05 308.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1293.05 308.75H1288.95L1291 305.472L1293.05 308.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1307.05 308.75H1302.95L1305 305.472L1307.05 308.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1321.05 308.75H1316.95L1319 305.472L1321.05 308.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1335.05 308.75H1330.95L1333 305.472L1335.05 308.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1349.05 308.75H1344.95L1347 305.472L1349.05 308.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1363.05 308.75H1358.95L1361 305.472L1363.05 308.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1377.05 308.75H1372.95L1375 305.472L1377.05 308.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1391.05 308.75H1386.95L1389 305.472L1391.05 308.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1405.05 308.75H1400.95L1403 305.472L1405.05 308.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1419.05 308.75H1414.95L1417 305.472L1419.05 308.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1433.05 308.75H1428.95L1431 305.472L1433.05 308.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M5.04894 324.75H0.951062L3 321.472L5.04894 324.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M19.0489 324.75H14.9511L17 321.472L19.0489 324.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M33.0489 324.75H28.9511L31 321.472L33.0489 324.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M47.0489 324.75H42.9511L45 321.472L47.0489 324.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M61.0489 324.75H56.9511L59 321.472L61.0489 324.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M75.0489 324.75H70.9511L73 321.472L75.0489 324.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M89.0489 324.75H84.9511L87 321.472L89.0489 324.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M103.049 324.75H98.9511L101 321.472L103.049 324.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M117.049 324.75H112.951L115 321.472L117.049 324.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M131.049 324.75H126.951L129 321.472L131.049 324.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M145.049 324.75H140.951L143 321.472L145.049 324.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M159.049 324.75H154.951L157 321.472L159.049 324.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M173.049 324.75H168.951L171 321.472L173.049 324.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M187.049 324.75H182.951L185 321.472L187.049 324.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M201.049 324.75H196.951L199 321.472L201.049 324.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M215.049 324.75H210.951L213 321.472L215.049 324.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M229.049 324.75H224.951L227 321.472L229.049 324.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M243.049 324.75H238.951L241 321.472L243.049 324.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M257.049 324.75H252.951L255 321.472L257.049 324.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M271.049 324.75H266.951L269 321.472L271.049 324.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M285.049 324.75H280.951L283 321.472L285.049 324.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M299.049 324.75H294.951L297 321.472L299.049 324.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M313.049 324.75H308.951L311 321.472L313.049 324.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M327.049 324.75H322.951L325 321.472L327.049 324.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M341.049 324.75H336.951L339 321.472L341.049 324.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M355.049 324.75H350.951L353 321.472L355.049 324.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M369.049 324.75H364.951L367 321.472L369.049 324.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M383.049 324.75H378.951L381 321.472L383.049 324.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M397.049 324.75H392.951L395 321.472L397.049 324.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M411.049 324.75H406.951L409 321.472L411.049 324.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M425.049 324.75H420.951L423 321.472L425.049 324.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M439.049 324.75H434.951L437 321.472L439.049 324.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M453.049 324.75H448.951L451 321.472L453.049 324.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M467.049 324.75H462.951L465 321.472L467.049 324.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M481.049 324.75H476.951L479 321.472L481.049 324.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M495.049 324.75H490.951L493 321.472L495.049 324.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M509.049 324.75H504.951L507 321.472L509.049 324.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M523.049 324.75H518.951L521 321.472L523.049 324.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M537.049 324.75H532.951L535 321.472L537.049 324.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M551.049 324.75H546.951L549 321.472L551.049 324.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M565.049 324.75H560.951L563 321.472L565.049 324.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M579.049 324.75H574.951L577 321.472L579.049 324.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M593.049 324.75H588.951L591 321.472L593.049 324.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M607.049 324.75H602.951L605 321.472L607.049 324.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M621.049 324.75H616.951L619 321.472L621.049 324.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M635.049 324.75H630.951L633 321.472L635.049 324.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M649.049 324.75H644.951L647 321.472L649.049 324.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M663.049 324.75H658.951L661 321.472L663.049 324.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M677.049 324.75H672.951L675 321.472L677.049 324.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M691.049 324.75H686.951L689 321.472L691.049 324.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M705.049 324.75H700.951L703 321.472L705.049 324.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M719.049 324.75H714.951L717 321.472L719.049 324.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M733.049 324.75H728.951L731 321.472L733.049 324.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M747.049 324.75H742.951L745 321.472L747.049 324.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M761.049 324.75H756.951L759 321.472L761.049 324.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M775.049 324.75H770.951L773 321.472L775.049 324.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M789.049 324.75H784.951L787 321.472L789.049 324.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M803.049 324.75H798.951L801 321.472L803.049 324.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M817.049 324.75H812.951L815 321.472L817.049 324.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M831.049 324.75H826.951L829 321.472L831.049 324.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M845.049 324.75H840.951L843 321.472L845.049 324.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M859.049 324.75H854.951L857 321.472L859.049 324.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M873.049 324.75H868.951L871 321.472L873.049 324.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M887.049 324.75H882.951L885 321.472L887.049 324.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M901.049 324.75H896.951L899 321.472L901.049 324.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M915.049 324.75H910.951L913 321.472L915.049 324.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M929.049 324.75H924.951L927 321.472L929.049 324.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M943.049 324.75H938.951L941 321.472L943.049 324.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M957.049 324.75H952.951L955 321.472L957.049 324.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M971.049 324.75H966.951L969 321.472L971.049 324.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M985.049 324.75H980.951L983 321.472L985.049 324.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M999.049 324.75H994.951L997 321.472L999.049 324.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1013.05 324.75H1008.95L1011 321.472L1013.05 324.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1027.05 324.75H1022.95L1025 321.472L1027.05 324.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1041.05 324.75H1036.95L1039 321.472L1041.05 324.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1055.05 324.75H1050.95L1053 321.472L1055.05 324.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1069.05 324.75H1064.95L1067 321.472L1069.05 324.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1083.05 324.75H1078.95L1081 321.472L1083.05 324.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1097.05 324.75H1092.95L1095 321.472L1097.05 324.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1111.05 324.75H1106.95L1109 321.472L1111.05 324.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1125.05 324.75H1120.95L1123 321.472L1125.05 324.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1139.05 324.75H1134.95L1137 321.472L1139.05 324.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1153.05 324.75H1148.95L1151 321.472L1153.05 324.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1167.05 324.75H1162.95L1165 321.472L1167.05 324.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1181.05 324.75H1176.95L1179 321.472L1181.05 324.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1195.05 324.75H1190.95L1193 321.472L1195.05 324.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1209.05 324.75H1204.95L1207 321.472L1209.05 324.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1223.05 324.75H1218.95L1221 321.472L1223.05 324.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1237.05 324.75H1232.95L1235 321.472L1237.05 324.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1251.05 324.75H1246.95L1249 321.472L1251.05 324.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1265.05 324.75H1260.95L1263 321.472L1265.05 324.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1279.05 324.75H1274.95L1277 321.472L1279.05 324.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1293.05 324.75H1288.95L1291 321.472L1293.05 324.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1307.05 324.75H1302.95L1305 321.472L1307.05 324.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1321.05 324.75H1316.95L1319 321.472L1321.05 324.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1335.05 324.75H1330.95L1333 321.472L1335.05 324.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1349.05 324.75H1344.95L1347 321.472L1349.05 324.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1363.05 324.75H1358.95L1361 321.472L1363.05 324.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1377.05 324.75H1372.95L1375 321.472L1377.05 324.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1391.05 324.75H1386.95L1389 321.472L1391.05 324.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1405.05 324.75H1400.95L1403 321.472L1405.05 324.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1419.05 324.75H1414.95L1417 321.472L1419.05 324.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1433.05 324.75H1428.95L1431 321.472L1433.05 324.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M5.04894 340.75H0.951062L3 337.472L5.04894 340.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M19.0489 340.75H14.9511L17 337.472L19.0489 340.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M33.0489 340.75H28.9511L31 337.472L33.0489 340.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M47.0489 340.75H42.9511L45 337.472L47.0489 340.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M61.0489 340.75H56.9511L59 337.472L61.0489 340.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M75.0489 340.75H70.9511L73 337.472L75.0489 340.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M89.0489 340.75H84.9511L87 337.472L89.0489 340.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M103.049 340.75H98.9511L101 337.472L103.049 340.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M117.049 340.75H112.951L115 337.472L117.049 340.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M131.049 340.75H126.951L129 337.472L131.049 340.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M145.049 340.75H140.951L143 337.472L145.049 340.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M159.049 340.75H154.951L157 337.472L159.049 340.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M173.049 340.75H168.951L171 337.472L173.049 340.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M187.049 340.75H182.951L185 337.472L187.049 340.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M201.049 340.75H196.951L199 337.472L201.049 340.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M215.049 340.75H210.951L213 337.472L215.049 340.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M229.049 340.75H224.951L227 337.472L229.049 340.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M243.049 340.75H238.951L241 337.472L243.049 340.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M257.049 340.75H252.951L255 337.472L257.049 340.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M271.049 340.75H266.951L269 337.472L271.049 340.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M285.049 340.75H280.951L283 337.472L285.049 340.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M299.049 340.75H294.951L297 337.472L299.049 340.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M313.049 340.75H308.951L311 337.472L313.049 340.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M327.049 340.75H322.951L325 337.472L327.049 340.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M341.049 340.75H336.951L339 337.472L341.049 340.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M355.049 340.75H350.951L353 337.472L355.049 340.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M369.049 340.75H364.951L367 337.472L369.049 340.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M383.049 340.75H378.951L381 337.472L383.049 340.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M397.049 340.75H392.951L395 337.472L397.049 340.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M411.049 340.75H406.951L409 337.472L411.049 340.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M425.049 340.75H420.951L423 337.472L425.049 340.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M439.049 340.75H434.951L437 337.472L439.049 340.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M453.049 340.75H448.951L451 337.472L453.049 340.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M467.049 340.75H462.951L465 337.472L467.049 340.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M481.049 340.75H476.951L479 337.472L481.049 340.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M495.049 340.75H490.951L493 337.472L495.049 340.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M509.049 340.75H504.951L507 337.472L509.049 340.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M523.049 340.75H518.951L521 337.472L523.049 340.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M537.049 340.75H532.951L535 337.472L537.049 340.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M551.049 340.75H546.951L549 337.472L551.049 340.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M565.049 340.75H560.951L563 337.472L565.049 340.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M579.049 340.75H574.951L577 337.472L579.049 340.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M593.049 340.75H588.951L591 337.472L593.049 340.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M607.049 340.75H602.951L605 337.472L607.049 340.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M621.049 340.75H616.951L619 337.472L621.049 340.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M635.049 340.75H630.951L633 337.472L635.049 340.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M649.049 340.75H644.951L647 337.472L649.049 340.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M663.049 340.75H658.951L661 337.472L663.049 340.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M677.049 340.75H672.951L675 337.472L677.049 340.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M691.049 340.75H686.951L689 337.472L691.049 340.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M705.049 340.75H700.951L703 337.472L705.049 340.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M719.049 340.75H714.951L717 337.472L719.049 340.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M733.049 340.75H728.951L731 337.472L733.049 340.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M747.049 340.75H742.951L745 337.472L747.049 340.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M761.049 340.75H756.951L759 337.472L761.049 340.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M775.049 340.75H770.951L773 337.472L775.049 340.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M789.049 340.75H784.951L787 337.472L789.049 340.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M803.049 340.75H798.951L801 337.472L803.049 340.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M817.049 340.75H812.951L815 337.472L817.049 340.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M831.049 340.75H826.951L829 337.472L831.049 340.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M845.049 340.75H840.951L843 337.472L845.049 340.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M859.049 340.75H854.951L857 337.472L859.049 340.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M873.049 340.75H868.951L871 337.472L873.049 340.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M887.049 340.75H882.951L885 337.472L887.049 340.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M901.049 340.75H896.951L899 337.472L901.049 340.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M915.049 340.75H910.951L913 337.472L915.049 340.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M929.049 340.75H924.951L927 337.472L929.049 340.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M943.049 340.75H938.951L941 337.472L943.049 340.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M957.049 340.75H952.951L955 337.472L957.049 340.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M971.049 340.75H966.951L969 337.472L971.049 340.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M985.049 340.75H980.951L983 337.472L985.049 340.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M999.049 340.75H994.951L997 337.472L999.049 340.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1013.05 340.75H1008.95L1011 337.472L1013.05 340.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1027.05 340.75H1022.95L1025 337.472L1027.05 340.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1041.05 340.75H1036.95L1039 337.472L1041.05 340.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1055.05 340.75H1050.95L1053 337.472L1055.05 340.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1069.05 340.75H1064.95L1067 337.472L1069.05 340.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1083.05 340.75H1078.95L1081 337.472L1083.05 340.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1097.05 340.75H1092.95L1095 337.472L1097.05 340.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1111.05 340.75H1106.95L1109 337.472L1111.05 340.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1125.05 340.75H1120.95L1123 337.472L1125.05 340.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1139.05 340.75H1134.95L1137 337.472L1139.05 340.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1153.05 340.75H1148.95L1151 337.472L1153.05 340.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1167.05 340.75H1162.95L1165 337.472L1167.05 340.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1181.05 340.75H1176.95L1179 337.472L1181.05 340.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1195.05 340.75H1190.95L1193 337.472L1195.05 340.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1209.05 340.75H1204.95L1207 337.472L1209.05 340.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1223.05 340.75H1218.95L1221 337.472L1223.05 340.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1237.05 340.75H1232.95L1235 337.472L1237.05 340.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1251.05 340.75H1246.95L1249 337.472L1251.05 340.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1265.05 340.75H1260.95L1263 337.472L1265.05 340.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1279.05 340.75H1274.95L1277 337.472L1279.05 340.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1293.05 340.75H1288.95L1291 337.472L1293.05 340.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1307.05 340.75H1302.95L1305 337.472L1307.05 340.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1321.05 340.75H1316.95L1319 337.472L1321.05 340.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1335.05 340.75H1330.95L1333 337.472L1335.05 340.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1349.05 340.75H1344.95L1347 337.472L1349.05 340.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1363.05 340.75H1358.95L1361 337.472L1363.05 340.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1377.05 340.75H1372.95L1375 337.472L1377.05 340.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1391.05 340.75H1386.95L1389 337.472L1391.05 340.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1405.05 340.75H1400.95L1403 337.472L1405.05 340.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1419.05 340.75H1414.95L1417 337.472L1419.05 340.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1433.05 340.75H1428.95L1431 337.472L1433.05 340.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M5.04894 356.75H0.951062L3 353.472L5.04894 356.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M19.0489 356.75H14.9511L17 353.472L19.0489 356.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M33.0489 356.75H28.9511L31 353.472L33.0489 356.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M47.0489 356.75H42.9511L45 353.472L47.0489 356.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M61.0489 356.75H56.9511L59 353.472L61.0489 356.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M75.0489 356.75H70.9511L73 353.472L75.0489 356.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M89.0489 356.75H84.9511L87 353.472L89.0489 356.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M103.049 356.75H98.9511L101 353.472L103.049 356.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M117.049 356.75H112.951L115 353.472L117.049 356.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M131.049 356.75H126.951L129 353.472L131.049 356.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M145.049 356.75H140.951L143 353.472L145.049 356.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M159.049 356.75H154.951L157 353.472L159.049 356.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M173.049 356.75H168.951L171 353.472L173.049 356.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M187.049 356.75H182.951L185 353.472L187.049 356.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M201.049 356.75H196.951L199 353.472L201.049 356.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M215.049 356.75H210.951L213 353.472L215.049 356.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M229.049 356.75H224.951L227 353.472L229.049 356.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M243.049 356.75H238.951L241 353.472L243.049 356.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M257.049 356.75H252.951L255 353.472L257.049 356.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M271.049 356.75H266.951L269 353.472L271.049 356.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M285.049 356.75H280.951L283 353.472L285.049 356.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M299.049 356.75H294.951L297 353.472L299.049 356.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M313.049 356.75H308.951L311 353.472L313.049 356.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M327.049 356.75H322.951L325 353.472L327.049 356.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M341.049 356.75H336.951L339 353.472L341.049 356.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M355.049 356.75H350.951L353 353.472L355.049 356.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M369.049 356.75H364.951L367 353.472L369.049 356.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M383.049 356.75H378.951L381 353.472L383.049 356.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M397.049 356.75H392.951L395 353.472L397.049 356.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M411.049 356.75H406.951L409 353.472L411.049 356.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M425.049 356.75H420.951L423 353.472L425.049 356.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M439.049 356.75H434.951L437 353.472L439.049 356.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M453.049 356.75H448.951L451 353.472L453.049 356.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M467.049 356.75H462.951L465 353.472L467.049 356.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M481.049 356.75H476.951L479 353.472L481.049 356.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M495.049 356.75H490.951L493 353.472L495.049 356.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M509.049 356.75H504.951L507 353.472L509.049 356.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M523.049 356.75H518.951L521 353.472L523.049 356.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M537.049 356.75H532.951L535 353.472L537.049 356.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M551.049 356.75H546.951L549 353.472L551.049 356.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M565.049 356.75H560.951L563 353.472L565.049 356.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M579.049 356.75H574.951L577 353.472L579.049 356.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M593.049 356.75H588.951L591 353.472L593.049 356.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M607.049 356.75H602.951L605 353.472L607.049 356.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M621.049 356.75H616.951L619 353.472L621.049 356.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M635.049 356.75H630.951L633 353.472L635.049 356.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M649.049 356.75H644.951L647 353.472L649.049 356.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M663.049 356.75H658.951L661 353.472L663.049 356.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M677.049 356.75H672.951L675 353.472L677.049 356.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M691.049 356.75H686.951L689 353.472L691.049 356.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M705.049 356.75H700.951L703 353.472L705.049 356.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M719.049 356.75H714.951L717 353.472L719.049 356.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M733.049 356.75H728.951L731 353.472L733.049 356.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M747.049 356.75H742.951L745 353.472L747.049 356.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M761.049 356.75H756.951L759 353.472L761.049 356.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M775.049 356.75H770.951L773 353.472L775.049 356.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M789.049 356.75H784.951L787 353.472L789.049 356.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M803.049 356.75H798.951L801 353.472L803.049 356.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M817.049 356.75H812.951L815 353.472L817.049 356.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M831.049 356.75H826.951L829 353.472L831.049 356.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M845.049 356.75H840.951L843 353.472L845.049 356.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M859.049 356.75H854.951L857 353.472L859.049 356.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M873.049 356.75H868.951L871 353.472L873.049 356.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M887.049 356.75H882.951L885 353.472L887.049 356.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M901.049 356.75H896.951L899 353.472L901.049 356.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M915.049 356.75H910.951L913 353.472L915.049 356.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M929.049 356.75H924.951L927 353.472L929.049 356.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M943.049 356.75H938.951L941 353.472L943.049 356.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M957.049 356.75H952.951L955 353.472L957.049 356.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M971.049 356.75H966.951L969 353.472L971.049 356.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M985.049 356.75H980.951L983 353.472L985.049 356.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M999.049 356.75H994.951L997 353.472L999.049 356.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1013.05 356.75H1008.95L1011 353.472L1013.05 356.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1027.05 356.75H1022.95L1025 353.472L1027.05 356.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1041.05 356.75H1036.95L1039 353.472L1041.05 356.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1055.05 356.75H1050.95L1053 353.472L1055.05 356.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1069.05 356.75H1064.95L1067 353.472L1069.05 356.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1083.05 356.75H1078.95L1081 353.472L1083.05 356.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1097.05 356.75H1092.95L1095 353.472L1097.05 356.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1111.05 356.75H1106.95L1109 353.472L1111.05 356.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1125.05 356.75H1120.95L1123 353.472L1125.05 356.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1139.05 356.75H1134.95L1137 353.472L1139.05 356.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1153.05 356.75H1148.95L1151 353.472L1153.05 356.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1167.05 356.75H1162.95L1165 353.472L1167.05 356.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1181.05 356.75H1176.95L1179 353.472L1181.05 356.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1195.05 356.75H1190.95L1193 353.472L1195.05 356.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1209.05 356.75H1204.95L1207 353.472L1209.05 356.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1223.05 356.75H1218.95L1221 353.472L1223.05 356.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1237.05 356.75H1232.95L1235 353.472L1237.05 356.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1251.05 356.75H1246.95L1249 353.472L1251.05 356.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1265.05 356.75H1260.95L1263 353.472L1265.05 356.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1279.05 356.75H1274.95L1277 353.472L1279.05 356.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1293.05 356.75H1288.95L1291 353.472L1293.05 356.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1307.05 356.75H1302.95L1305 353.472L1307.05 356.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1321.05 356.75H1316.95L1319 353.472L1321.05 356.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1335.05 356.75H1330.95L1333 353.472L1335.05 356.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1349.05 356.75H1344.95L1347 353.472L1349.05 356.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1363.05 356.75H1358.95L1361 353.472L1363.05 356.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1377.05 356.75H1372.95L1375 353.472L1377.05 356.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1391.05 356.75H1386.95L1389 353.472L1391.05 356.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1405.05 356.75H1400.95L1403 353.472L1405.05 356.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1419.05 356.75H1414.95L1417 353.472L1419.05 356.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1433.05 356.75H1428.95L1431 353.472L1433.05 356.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M5.04894 372.75H0.951062L3 369.472L5.04894 372.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M19.0489 372.75H14.9511L17 369.472L19.0489 372.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M33.0489 372.75H28.9511L31 369.472L33.0489 372.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M47.0489 372.75H42.9511L45 369.472L47.0489 372.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M61.0489 372.75H56.9511L59 369.472L61.0489 372.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M75.0489 372.75H70.9511L73 369.472L75.0489 372.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M89.0489 372.75H84.9511L87 369.472L89.0489 372.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M103.049 372.75H98.9511L101 369.472L103.049 372.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M117.049 372.75H112.951L115 369.472L117.049 372.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M131.049 372.75H126.951L129 369.472L131.049 372.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M145.049 372.75H140.951L143 369.472L145.049 372.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M159.049 372.75H154.951L157 369.472L159.049 372.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M173.049 372.75H168.951L171 369.472L173.049 372.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M187.049 372.75H182.951L185 369.472L187.049 372.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M201.049 372.75H196.951L199 369.472L201.049 372.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M215.049 372.75H210.951L213 369.472L215.049 372.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M229.049 372.75H224.951L227 369.472L229.049 372.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M243.049 372.75H238.951L241 369.472L243.049 372.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M257.049 372.75H252.951L255 369.472L257.049 372.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M271.049 372.75H266.951L269 369.472L271.049 372.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M285.049 372.75H280.951L283 369.472L285.049 372.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M299.049 372.75H294.951L297 369.472L299.049 372.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M313.049 372.75H308.951L311 369.472L313.049 372.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M327.049 372.75H322.951L325 369.472L327.049 372.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M341.049 372.75H336.951L339 369.472L341.049 372.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M355.049 372.75H350.951L353 369.472L355.049 372.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M369.049 372.75H364.951L367 369.472L369.049 372.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M383.049 372.75H378.951L381 369.472L383.049 372.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M397.049 372.75H392.951L395 369.472L397.049 372.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M411.049 372.75H406.951L409 369.472L411.049 372.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M425.049 372.75H420.951L423 369.472L425.049 372.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M439.049 372.75H434.951L437 369.472L439.049 372.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M453.049 372.75H448.951L451 369.472L453.049 372.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M467.049 372.75H462.951L465 369.472L467.049 372.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M481.049 372.75H476.951L479 369.472L481.049 372.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M495.049 372.75H490.951L493 369.472L495.049 372.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M509.049 372.75H504.951L507 369.472L509.049 372.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M523.049 372.75H518.951L521 369.472L523.049 372.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M537.049 372.75H532.951L535 369.472L537.049 372.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M551.049 372.75H546.951L549 369.472L551.049 372.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M565.049 372.75H560.951L563 369.472L565.049 372.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M579.049 372.75H574.951L577 369.472L579.049 372.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M593.049 372.75H588.951L591 369.472L593.049 372.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M607.049 372.75H602.951L605 369.472L607.049 372.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M621.049 372.75H616.951L619 369.472L621.049 372.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M635.049 372.75H630.951L633 369.472L635.049 372.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M649.049 372.75H644.951L647 369.472L649.049 372.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M663.049 372.75H658.951L661 369.472L663.049 372.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M677.049 372.75H672.951L675 369.472L677.049 372.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M691.049 372.75H686.951L689 369.472L691.049 372.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M705.049 372.75H700.951L703 369.472L705.049 372.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M719.049 372.75H714.951L717 369.472L719.049 372.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M733.049 372.75H728.951L731 369.472L733.049 372.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M747.049 372.75H742.951L745 369.472L747.049 372.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M761.049 372.75H756.951L759 369.472L761.049 372.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M775.049 372.75H770.951L773 369.472L775.049 372.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M789.049 372.75H784.951L787 369.472L789.049 372.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M803.049 372.75H798.951L801 369.472L803.049 372.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M817.049 372.75H812.951L815 369.472L817.049 372.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M831.049 372.75H826.951L829 369.472L831.049 372.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M845.049 372.75H840.951L843 369.472L845.049 372.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M859.049 372.75H854.951L857 369.472L859.049 372.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M873.049 372.75H868.951L871 369.472L873.049 372.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M887.049 372.75H882.951L885 369.472L887.049 372.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M901.049 372.75H896.951L899 369.472L901.049 372.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M915.049 372.75H910.951L913 369.472L915.049 372.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M929.049 372.75H924.951L927 369.472L929.049 372.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M943.049 372.75H938.951L941 369.472L943.049 372.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M957.049 372.75H952.951L955 369.472L957.049 372.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M971.049 372.75H966.951L969 369.472L971.049 372.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M985.049 372.75H980.951L983 369.472L985.049 372.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M999.049 372.75H994.951L997 369.472L999.049 372.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1013.05 372.75H1008.95L1011 369.472L1013.05 372.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1027.05 372.75H1022.95L1025 369.472L1027.05 372.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1041.05 372.75H1036.95L1039 369.472L1041.05 372.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1055.05 372.75H1050.95L1053 369.472L1055.05 372.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1069.05 372.75H1064.95L1067 369.472L1069.05 372.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1083.05 372.75H1078.95L1081 369.472L1083.05 372.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1097.05 372.75H1092.95L1095 369.472L1097.05 372.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1111.05 372.75H1106.95L1109 369.472L1111.05 372.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1125.05 372.75H1120.95L1123 369.472L1125.05 372.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1139.05 372.75H1134.95L1137 369.472L1139.05 372.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1153.05 372.75H1148.95L1151 369.472L1153.05 372.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1167.05 372.75H1162.95L1165 369.472L1167.05 372.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1181.05 372.75H1176.95L1179 369.472L1181.05 372.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1195.05 372.75H1190.95L1193 369.472L1195.05 372.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1209.05 372.75H1204.95L1207 369.472L1209.05 372.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1223.05 372.75H1218.95L1221 369.472L1223.05 372.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1237.05 372.75H1232.95L1235 369.472L1237.05 372.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1251.05 372.75H1246.95L1249 369.472L1251.05 372.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1265.05 372.75H1260.95L1263 369.472L1265.05 372.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1279.05 372.75H1274.95L1277 369.472L1279.05 372.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1293.05 372.75H1288.95L1291 369.472L1293.05 372.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1307.05 372.75H1302.95L1305 369.472L1307.05 372.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1321.05 372.75H1316.95L1319 369.472L1321.05 372.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1335.05 372.75H1330.95L1333 369.472L1335.05 372.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1349.05 372.75H1344.95L1347 369.472L1349.05 372.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1363.05 372.75H1358.95L1361 369.472L1363.05 372.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1377.05 372.75H1372.95L1375 369.472L1377.05 372.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1391.05 372.75H1386.95L1389 369.472L1391.05 372.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1405.05 372.75H1400.95L1403 369.472L1405.05 372.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1419.05 372.75H1414.95L1417 369.472L1419.05 372.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1433.05 372.75H1428.95L1431 369.472L1433.05 372.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M5.04894 388.75H0.951062L3 385.472L5.04894 388.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M19.0489 388.75H14.9511L17 385.472L19.0489 388.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M33.0489 388.75H28.9511L31 385.472L33.0489 388.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M47.0489 388.75H42.9511L45 385.472L47.0489 388.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M61.0489 388.75H56.9511L59 385.472L61.0489 388.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M75.0489 388.75H70.9511L73 385.472L75.0489 388.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M89.0489 388.75H84.9511L87 385.472L89.0489 388.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M103.049 388.75H98.9511L101 385.472L103.049 388.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M117.049 388.75H112.951L115 385.472L117.049 388.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M131.049 388.75H126.951L129 385.472L131.049 388.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M145.049 388.75H140.951L143 385.472L145.049 388.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M159.049 388.75H154.951L157 385.472L159.049 388.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M173.049 388.75H168.951L171 385.472L173.049 388.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M187.049 388.75H182.951L185 385.472L187.049 388.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M201.049 388.75H196.951L199 385.472L201.049 388.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M215.049 388.75H210.951L213 385.472L215.049 388.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M229.049 388.75H224.951L227 385.472L229.049 388.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M243.049 388.75H238.951L241 385.472L243.049 388.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M257.049 388.75H252.951L255 385.472L257.049 388.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M271.049 388.75H266.951L269 385.472L271.049 388.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M285.049 388.75H280.951L283 385.472L285.049 388.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M299.049 388.75H294.951L297 385.472L299.049 388.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M313.049 388.75H308.951L311 385.472L313.049 388.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M327.049 388.75H322.951L325 385.472L327.049 388.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M341.049 388.75H336.951L339 385.472L341.049 388.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M355.049 388.75H350.951L353 385.472L355.049 388.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M369.049 388.75H364.951L367 385.472L369.049 388.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M383.049 388.75H378.951L381 385.472L383.049 388.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M397.049 388.75H392.951L395 385.472L397.049 388.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M411.049 388.75H406.951L409 385.472L411.049 388.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M425.049 388.75H420.951L423 385.472L425.049 388.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M439.049 388.75H434.951L437 385.472L439.049 388.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M453.049 388.75H448.951L451 385.472L453.049 388.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M467.049 388.75H462.951L465 385.472L467.049 388.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M481.049 388.75H476.951L479 385.472L481.049 388.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M495.049 388.75H490.951L493 385.472L495.049 388.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M509.049 388.75H504.951L507 385.472L509.049 388.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M523.049 388.75H518.951L521 385.472L523.049 388.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M537.049 388.75H532.951L535 385.472L537.049 388.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M551.049 388.75H546.951L549 385.472L551.049 388.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M565.049 388.75H560.951L563 385.472L565.049 388.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M579.049 388.75H574.951L577 385.472L579.049 388.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M593.049 388.75H588.951L591 385.472L593.049 388.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M607.049 388.75H602.951L605 385.472L607.049 388.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M621.049 388.75H616.951L619 385.472L621.049 388.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M635.049 388.75H630.951L633 385.472L635.049 388.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M649.049 388.75H644.951L647 385.472L649.049 388.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M663.049 388.75H658.951L661 385.472L663.049 388.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M677.049 388.75H672.951L675 385.472L677.049 388.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M691.049 388.75H686.951L689 385.472L691.049 388.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M705.049 388.75H700.951L703 385.472L705.049 388.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M719.049 388.75H714.951L717 385.472L719.049 388.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M733.049 388.75H728.951L731 385.472L733.049 388.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M747.049 388.75H742.951L745 385.472L747.049 388.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M761.049 388.75H756.951L759 385.472L761.049 388.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M775.049 388.75H770.951L773 385.472L775.049 388.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M789.049 388.75H784.951L787 385.472L789.049 388.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M803.049 388.75H798.951L801 385.472L803.049 388.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M817.049 388.75H812.951L815 385.472L817.049 388.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M831.049 388.75H826.951L829 385.472L831.049 388.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M845.049 388.75H840.951L843 385.472L845.049 388.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M859.049 388.75H854.951L857 385.472L859.049 388.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M873.049 388.75H868.951L871 385.472L873.049 388.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M887.049 388.75H882.951L885 385.472L887.049 388.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M901.049 388.75H896.951L899 385.472L901.049 388.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M915.049 388.75H910.951L913 385.472L915.049 388.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M929.049 388.75H924.951L927 385.472L929.049 388.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M943.049 388.75H938.951L941 385.472L943.049 388.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M957.049 388.75H952.951L955 385.472L957.049 388.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M971.049 388.75H966.951L969 385.472L971.049 388.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M985.049 388.75H980.951L983 385.472L985.049 388.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M999.049 388.75H994.951L997 385.472L999.049 388.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1013.05 388.75H1008.95L1011 385.472L1013.05 388.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1027.05 388.75H1022.95L1025 385.472L1027.05 388.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1041.05 388.75H1036.95L1039 385.472L1041.05 388.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1055.05 388.75H1050.95L1053 385.472L1055.05 388.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1069.05 388.75H1064.95L1067 385.472L1069.05 388.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1083.05 388.75H1078.95L1081 385.472L1083.05 388.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1097.05 388.75H1092.95L1095 385.472L1097.05 388.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1111.05 388.75H1106.95L1109 385.472L1111.05 388.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1125.05 388.75H1120.95L1123 385.472L1125.05 388.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1139.05 388.75H1134.95L1137 385.472L1139.05 388.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1153.05 388.75H1148.95L1151 385.472L1153.05 388.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1167.05 388.75H1162.95L1165 385.472L1167.05 388.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1181.05 388.75H1176.95L1179 385.472L1181.05 388.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1195.05 388.75H1190.95L1193 385.472L1195.05 388.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1209.05 388.75H1204.95L1207 385.472L1209.05 388.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1223.05 388.75H1218.95L1221 385.472L1223.05 388.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1237.05 388.75H1232.95L1235 385.472L1237.05 388.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1251.05 388.75H1246.95L1249 385.472L1251.05 388.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1265.05 388.75H1260.95L1263 385.472L1265.05 388.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1279.05 388.75H1274.95L1277 385.472L1279.05 388.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1293.05 388.75H1288.95L1291 385.472L1293.05 388.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1307.05 388.75H1302.95L1305 385.472L1307.05 388.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1321.05 388.75H1316.95L1319 385.472L1321.05 388.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1335.05 388.75H1330.95L1333 385.472L1335.05 388.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1349.05 388.75H1344.95L1347 385.472L1349.05 388.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1363.05 388.75H1358.95L1361 385.472L1363.05 388.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1377.05 388.75H1372.95L1375 385.472L1377.05 388.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1391.05 388.75H1386.95L1389 385.472L1391.05 388.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1405.05 388.75H1400.95L1403 385.472L1405.05 388.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1419.05 388.75H1414.95L1417 385.472L1419.05 388.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1433.05 388.75H1428.95L1431 385.472L1433.05 388.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M5.04894 404.75H0.951062L3 401.472L5.04894 404.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M19.0489 404.75H14.9511L17 401.472L19.0489 404.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M33.0489 404.75H28.9511L31 401.472L33.0489 404.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M47.0489 404.75H42.9511L45 401.472L47.0489 404.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M61.0489 404.75H56.9511L59 401.472L61.0489 404.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M75.0489 404.75H70.9511L73 401.472L75.0489 404.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M89.0489 404.75H84.9511L87 401.472L89.0489 404.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M103.049 404.75H98.9511L101 401.472L103.049 404.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M117.049 404.75H112.951L115 401.472L117.049 404.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M131.049 404.75H126.951L129 401.472L131.049 404.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M145.049 404.75H140.951L143 401.472L145.049 404.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M159.049 404.75H154.951L157 401.472L159.049 404.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M173.049 404.75H168.951L171 401.472L173.049 404.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M187.049 404.75H182.951L185 401.472L187.049 404.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M201.049 404.75H196.951L199 401.472L201.049 404.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M215.049 404.75H210.951L213 401.472L215.049 404.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M229.049 404.75H224.951L227 401.472L229.049 404.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M243.049 404.75H238.951L241 401.472L243.049 404.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M257.049 404.75H252.951L255 401.472L257.049 404.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M271.049 404.75H266.951L269 401.472L271.049 404.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M285.049 404.75H280.951L283 401.472L285.049 404.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M299.049 404.75H294.951L297 401.472L299.049 404.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M313.049 404.75H308.951L311 401.472L313.049 404.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M327.049 404.75H322.951L325 401.472L327.049 404.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M341.049 404.75H336.951L339 401.472L341.049 404.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M355.049 404.75H350.951L353 401.472L355.049 404.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M369.049 404.75H364.951L367 401.472L369.049 404.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M383.049 404.75H378.951L381 401.472L383.049 404.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M397.049 404.75H392.951L395 401.472L397.049 404.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M411.049 404.75H406.951L409 401.472L411.049 404.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M425.049 404.75H420.951L423 401.472L425.049 404.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M439.049 404.75H434.951L437 401.472L439.049 404.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M453.049 404.75H448.951L451 401.472L453.049 404.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M467.049 404.75H462.951L465 401.472L467.049 404.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M481.049 404.75H476.951L479 401.472L481.049 404.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M495.049 404.75H490.951L493 401.472L495.049 404.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M509.049 404.75H504.951L507 401.472L509.049 404.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M523.049 404.75H518.951L521 401.472L523.049 404.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M537.049 404.75H532.951L535 401.472L537.049 404.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M551.049 404.75H546.951L549 401.472L551.049 404.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M565.049 404.75H560.951L563 401.472L565.049 404.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M579.049 404.75H574.951L577 401.472L579.049 404.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M593.049 404.75H588.951L591 401.472L593.049 404.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M607.049 404.75H602.951L605 401.472L607.049 404.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M621.049 404.75H616.951L619 401.472L621.049 404.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M635.049 404.75H630.951L633 401.472L635.049 404.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M649.049 404.75H644.951L647 401.472L649.049 404.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M663.049 404.75H658.951L661 401.472L663.049 404.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M677.049 404.75H672.951L675 401.472L677.049 404.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M691.049 404.75H686.951L689 401.472L691.049 404.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M705.049 404.75H700.951L703 401.472L705.049 404.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M719.049 404.75H714.951L717 401.472L719.049 404.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M733.049 404.75H728.951L731 401.472L733.049 404.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M747.049 404.75H742.951L745 401.472L747.049 404.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M761.049 404.75H756.951L759 401.472L761.049 404.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M775.049 404.75H770.951L773 401.472L775.049 404.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M789.049 404.75H784.951L787 401.472L789.049 404.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M803.049 404.75H798.951L801 401.472L803.049 404.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M817.049 404.75H812.951L815 401.472L817.049 404.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M831.049 404.75H826.951L829 401.472L831.049 404.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M845.049 404.75H840.951L843 401.472L845.049 404.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M859.049 404.75H854.951L857 401.472L859.049 404.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M873.049 404.75H868.951L871 401.472L873.049 404.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M887.049 404.75H882.951L885 401.472L887.049 404.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M901.049 404.75H896.951L899 401.472L901.049 404.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M915.049 404.75H910.951L913 401.472L915.049 404.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M929.049 404.75H924.951L927 401.472L929.049 404.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M943.049 404.75H938.951L941 401.472L943.049 404.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M957.049 404.75H952.951L955 401.472L957.049 404.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M971.049 404.75H966.951L969 401.472L971.049 404.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M985.049 404.75H980.951L983 401.472L985.049 404.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M999.049 404.75H994.951L997 401.472L999.049 404.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1013.05 404.75H1008.95L1011 401.472L1013.05 404.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1027.05 404.75H1022.95L1025 401.472L1027.05 404.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1041.05 404.75H1036.95L1039 401.472L1041.05 404.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1055.05 404.75H1050.95L1053 401.472L1055.05 404.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1069.05 404.75H1064.95L1067 401.472L1069.05 404.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1083.05 404.75H1078.95L1081 401.472L1083.05 404.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1097.05 404.75H1092.95L1095 401.472L1097.05 404.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1111.05 404.75H1106.95L1109 401.472L1111.05 404.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1125.05 404.75H1120.95L1123 401.472L1125.05 404.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1139.05 404.75H1134.95L1137 401.472L1139.05 404.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1153.05 404.75H1148.95L1151 401.472L1153.05 404.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1167.05 404.75H1162.95L1165 401.472L1167.05 404.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1181.05 404.75H1176.95L1179 401.472L1181.05 404.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1195.05 404.75H1190.95L1193 401.472L1195.05 404.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1209.05 404.75H1204.95L1207 401.472L1209.05 404.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1223.05 404.75H1218.95L1221 401.472L1223.05 404.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1237.05 404.75H1232.95L1235 401.472L1237.05 404.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1251.05 404.75H1246.95L1249 401.472L1251.05 404.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1265.05 404.75H1260.95L1263 401.472L1265.05 404.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1279.05 404.75H1274.95L1277 401.472L1279.05 404.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1293.05 404.75H1288.95L1291 401.472L1293.05 404.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1307.05 404.75H1302.95L1305 401.472L1307.05 404.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1321.05 404.75H1316.95L1319 401.472L1321.05 404.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1335.05 404.75H1330.95L1333 401.472L1335.05 404.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1349.05 404.75H1344.95L1347 401.472L1349.05 404.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1363.05 404.75H1358.95L1361 401.472L1363.05 404.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1377.05 404.75H1372.95L1375 401.472L1377.05 404.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1391.05 404.75H1386.95L1389 401.472L1391.05 404.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1405.05 404.75H1400.95L1403 401.472L1405.05 404.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1419.05 404.75H1414.95L1417 401.472L1419.05 404.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1433.05 404.75H1428.95L1431 401.472L1433.05 404.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M5.04894 420.75H0.951062L3 417.472L5.04894 420.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M19.0489 420.75H14.9511L17 417.472L19.0489 420.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M33.0489 420.75H28.9511L31 417.472L33.0489 420.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M47.0489 420.75H42.9511L45 417.472L47.0489 420.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M61.0489 420.75H56.9511L59 417.472L61.0489 420.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M75.0489 420.75H70.9511L73 417.472L75.0489 420.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M89.0489 420.75H84.9511L87 417.472L89.0489 420.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M103.049 420.75H98.9511L101 417.472L103.049 420.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M117.049 420.75H112.951L115 417.472L117.049 420.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M131.049 420.75H126.951L129 417.472L131.049 420.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M145.049 420.75H140.951L143 417.472L145.049 420.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M159.049 420.75H154.951L157 417.472L159.049 420.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M173.049 420.75H168.951L171 417.472L173.049 420.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M187.049 420.75H182.951L185 417.472L187.049 420.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M201.049 420.75H196.951L199 417.472L201.049 420.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M215.049 420.75H210.951L213 417.472L215.049 420.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M229.049 420.75H224.951L227 417.472L229.049 420.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M243.049 420.75H238.951L241 417.472L243.049 420.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M257.049 420.75H252.951L255 417.472L257.049 420.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M271.049 420.75H266.951L269 417.472L271.049 420.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M285.049 420.75H280.951L283 417.472L285.049 420.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M299.049 420.75H294.951L297 417.472L299.049 420.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M313.049 420.75H308.951L311 417.472L313.049 420.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M327.049 420.75H322.951L325 417.472L327.049 420.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M341.049 420.75H336.951L339 417.472L341.049 420.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M355.049 420.75H350.951L353 417.472L355.049 420.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M369.049 420.75H364.951L367 417.472L369.049 420.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M383.049 420.75H378.951L381 417.472L383.049 420.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M397.049 420.75H392.951L395 417.472L397.049 420.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M411.049 420.75H406.951L409 417.472L411.049 420.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M425.049 420.75H420.951L423 417.472L425.049 420.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M439.049 420.75H434.951L437 417.472L439.049 420.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M453.049 420.75H448.951L451 417.472L453.049 420.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M467.049 420.75H462.951L465 417.472L467.049 420.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M481.049 420.75H476.951L479 417.472L481.049 420.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M495.049 420.75H490.951L493 417.472L495.049 420.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M509.049 420.75H504.951L507 417.472L509.049 420.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M523.049 420.75H518.951L521 417.472L523.049 420.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M537.049 420.75H532.951L535 417.472L537.049 420.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M551.049 420.75H546.951L549 417.472L551.049 420.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M565.049 420.75H560.951L563 417.472L565.049 420.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M579.049 420.75H574.951L577 417.472L579.049 420.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M593.049 420.75H588.951L591 417.472L593.049 420.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M607.049 420.75H602.951L605 417.472L607.049 420.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M621.049 420.75H616.951L619 417.472L621.049 420.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M635.049 420.75H630.951L633 417.472L635.049 420.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M649.049 420.75H644.951L647 417.472L649.049 420.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M663.049 420.75H658.951L661 417.472L663.049 420.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M677.049 420.75H672.951L675 417.472L677.049 420.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M691.049 420.75H686.951L689 417.472L691.049 420.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M705.049 420.75H700.951L703 417.472L705.049 420.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M719.049 420.75H714.951L717 417.472L719.049 420.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M733.049 420.75H728.951L731 417.472L733.049 420.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M747.049 420.75H742.951L745 417.472L747.049 420.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M761.049 420.75H756.951L759 417.472L761.049 420.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M775.049 420.75H770.951L773 417.472L775.049 420.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M789.049 420.75H784.951L787 417.472L789.049 420.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M803.049 420.75H798.951L801 417.472L803.049 420.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M817.049 420.75H812.951L815 417.472L817.049 420.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M831.049 420.75H826.951L829 417.472L831.049 420.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M845.049 420.75H840.951L843 417.472L845.049 420.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M859.049 420.75H854.951L857 417.472L859.049 420.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M873.049 420.75H868.951L871 417.472L873.049 420.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M887.049 420.75H882.951L885 417.472L887.049 420.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M901.049 420.75H896.951L899 417.472L901.049 420.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M915.049 420.75H910.951L913 417.472L915.049 420.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M929.049 420.75H924.951L927 417.472L929.049 420.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M943.049 420.75H938.951L941 417.472L943.049 420.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M957.049 420.75H952.951L955 417.472L957.049 420.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M971.049 420.75H966.951L969 417.472L971.049 420.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M985.049 420.75H980.951L983 417.472L985.049 420.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M999.049 420.75H994.951L997 417.472L999.049 420.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1013.05 420.75H1008.95L1011 417.472L1013.05 420.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1027.05 420.75H1022.95L1025 417.472L1027.05 420.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1041.05 420.75H1036.95L1039 417.472L1041.05 420.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1055.05 420.75H1050.95L1053 417.472L1055.05 420.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1069.05 420.75H1064.95L1067 417.472L1069.05 420.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1083.05 420.75H1078.95L1081 417.472L1083.05 420.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1097.05 420.75H1092.95L1095 417.472L1097.05 420.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1111.05 420.75H1106.95L1109 417.472L1111.05 420.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1125.05 420.75H1120.95L1123 417.472L1125.05 420.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1139.05 420.75H1134.95L1137 417.472L1139.05 420.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1153.05 420.75H1148.95L1151 417.472L1153.05 420.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1167.05 420.75H1162.95L1165 417.472L1167.05 420.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1181.05 420.75H1176.95L1179 417.472L1181.05 420.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1195.05 420.75H1190.95L1193 417.472L1195.05 420.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1209.05 420.75H1204.95L1207 417.472L1209.05 420.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1223.05 420.75H1218.95L1221 417.472L1223.05 420.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1237.05 420.75H1232.95L1235 417.472L1237.05 420.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1251.05 420.75H1246.95L1249 417.472L1251.05 420.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1265.05 420.75H1260.95L1263 417.472L1265.05 420.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1279.05 420.75H1274.95L1277 417.472L1279.05 420.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1293.05 420.75H1288.95L1291 417.472L1293.05 420.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1307.05 420.75H1302.95L1305 417.472L1307.05 420.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1321.05 420.75H1316.95L1319 417.472L1321.05 420.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1335.05 420.75H1330.95L1333 417.472L1335.05 420.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1349.05 420.75H1344.95L1347 417.472L1349.05 420.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1363.05 420.75H1358.95L1361 417.472L1363.05 420.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1377.05 420.75H1372.95L1375 417.472L1377.05 420.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1391.05 420.75H1386.95L1389 417.472L1391.05 420.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1405.05 420.75H1400.95L1403 417.472L1405.05 420.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1419.05 420.75H1414.95L1417 417.472L1419.05 420.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1433.05 420.75H1428.95L1431 417.472L1433.05 420.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M5.04894 436.75H0.951062L3 433.472L5.04894 436.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M19.0489 436.75H14.9511L17 433.472L19.0489 436.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M33.0489 436.75H28.9511L31 433.472L33.0489 436.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M47.0489 436.75H42.9511L45 433.472L47.0489 436.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M61.0489 436.75H56.9511L59 433.472L61.0489 436.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M75.0489 436.75H70.9511L73 433.472L75.0489 436.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M89.0489 436.75H84.9511L87 433.472L89.0489 436.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M103.049 436.75H98.9511L101 433.472L103.049 436.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M117.049 436.75H112.951L115 433.472L117.049 436.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M131.049 436.75H126.951L129 433.472L131.049 436.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M145.049 436.75H140.951L143 433.472L145.049 436.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M159.049 436.75H154.951L157 433.472L159.049 436.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M173.049 436.75H168.951L171 433.472L173.049 436.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M187.049 436.75H182.951L185 433.472L187.049 436.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M201.049 436.75H196.951L199 433.472L201.049 436.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M215.049 436.75H210.951L213 433.472L215.049 436.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M229.049 436.75H224.951L227 433.472L229.049 436.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M243.049 436.75H238.951L241 433.472L243.049 436.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M257.049 436.75H252.951L255 433.472L257.049 436.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M271.049 436.75H266.951L269 433.472L271.049 436.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M285.049 436.75H280.951L283 433.472L285.049 436.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M299.049 436.75H294.951L297 433.472L299.049 436.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M313.049 436.75H308.951L311 433.472L313.049 436.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M327.049 436.75H322.951L325 433.472L327.049 436.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M341.049 436.75H336.951L339 433.472L341.049 436.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M355.049 436.75H350.951L353 433.472L355.049 436.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M369.049 436.75H364.951L367 433.472L369.049 436.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M383.049 436.75H378.951L381 433.472L383.049 436.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M397.049 436.75H392.951L395 433.472L397.049 436.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M411.049 436.75H406.951L409 433.472L411.049 436.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M425.049 436.75H420.951L423 433.472L425.049 436.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M439.049 436.75H434.951L437 433.472L439.049 436.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M453.049 436.75H448.951L451 433.472L453.049 436.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M467.049 436.75H462.951L465 433.472L467.049 436.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M481.049 436.75H476.951L479 433.472L481.049 436.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M495.049 436.75H490.951L493 433.472L495.049 436.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M509.049 436.75H504.951L507 433.472L509.049 436.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M523.049 436.75H518.951L521 433.472L523.049 436.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M537.049 436.75H532.951L535 433.472L537.049 436.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M551.049 436.75H546.951L549 433.472L551.049 436.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M565.049 436.75H560.951L563 433.472L565.049 436.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M579.049 436.75H574.951L577 433.472L579.049 436.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M593.049 436.75H588.951L591 433.472L593.049 436.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M607.049 436.75H602.951L605 433.472L607.049 436.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M621.049 436.75H616.951L619 433.472L621.049 436.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M635.049 436.75H630.951L633 433.472L635.049 436.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M649.049 436.75H644.951L647 433.472L649.049 436.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M663.049 436.75H658.951L661 433.472L663.049 436.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M677.049 436.75H672.951L675 433.472L677.049 436.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M691.049 436.75H686.951L689 433.472L691.049 436.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M705.049 436.75H700.951L703 433.472L705.049 436.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M719.049 436.75H714.951L717 433.472L719.049 436.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M733.049 436.75H728.951L731 433.472L733.049 436.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M747.049 436.75H742.951L745 433.472L747.049 436.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M761.049 436.75H756.951L759 433.472L761.049 436.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M775.049 436.75H770.951L773 433.472L775.049 436.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M789.049 436.75H784.951L787 433.472L789.049 436.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M803.049 436.75H798.951L801 433.472L803.049 436.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M817.049 436.75H812.951L815 433.472L817.049 436.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M831.049 436.75H826.951L829 433.472L831.049 436.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M845.049 436.75H840.951L843 433.472L845.049 436.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M859.049 436.75H854.951L857 433.472L859.049 436.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M873.049 436.75H868.951L871 433.472L873.049 436.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M887.049 436.75H882.951L885 433.472L887.049 436.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M901.049 436.75H896.951L899 433.472L901.049 436.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M915.049 436.75H910.951L913 433.472L915.049 436.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M929.049 436.75H924.951L927 433.472L929.049 436.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M943.049 436.75H938.951L941 433.472L943.049 436.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M957.049 436.75H952.951L955 433.472L957.049 436.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M971.049 436.75H966.951L969 433.472L971.049 436.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M985.049 436.75H980.951L983 433.472L985.049 436.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M999.049 436.75H994.951L997 433.472L999.049 436.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1013.05 436.75H1008.95L1011 433.472L1013.05 436.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1027.05 436.75H1022.95L1025 433.472L1027.05 436.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1041.05 436.75H1036.95L1039 433.472L1041.05 436.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1055.05 436.75H1050.95L1053 433.472L1055.05 436.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1069.05 436.75H1064.95L1067 433.472L1069.05 436.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1083.05 436.75H1078.95L1081 433.472L1083.05 436.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1097.05 436.75H1092.95L1095 433.472L1097.05 436.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1111.05 436.75H1106.95L1109 433.472L1111.05 436.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1125.05 436.75H1120.95L1123 433.472L1125.05 436.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1139.05 436.75H1134.95L1137 433.472L1139.05 436.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1153.05 436.75H1148.95L1151 433.472L1153.05 436.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1167.05 436.75H1162.95L1165 433.472L1167.05 436.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1181.05 436.75H1176.95L1179 433.472L1181.05 436.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1195.05 436.75H1190.95L1193 433.472L1195.05 436.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1209.05 436.75H1204.95L1207 433.472L1209.05 436.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1223.05 436.75H1218.95L1221 433.472L1223.05 436.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1237.05 436.75H1232.95L1235 433.472L1237.05 436.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1251.05 436.75H1246.95L1249 433.472L1251.05 436.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1265.05 436.75H1260.95L1263 433.472L1265.05 436.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1279.05 436.75H1274.95L1277 433.472L1279.05 436.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1293.05 436.75H1288.95L1291 433.472L1293.05 436.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1307.05 436.75H1302.95L1305 433.472L1307.05 436.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1321.05 436.75H1316.95L1319 433.472L1321.05 436.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1335.05 436.75H1330.95L1333 433.472L1335.05 436.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1349.05 436.75H1344.95L1347 433.472L1349.05 436.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1363.05 436.75H1358.95L1361 433.472L1363.05 436.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1377.05 436.75H1372.95L1375 433.472L1377.05 436.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1391.05 436.75H1386.95L1389 433.472L1391.05 436.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1405.05 436.75H1400.95L1403 433.472L1405.05 436.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1419.05 436.75H1414.95L1417 433.472L1419.05 436.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1433.05 436.75H1428.95L1431 433.472L1433.05 436.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M5.04894 452.75H0.951062L3 449.472L5.04894 452.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M19.0489 452.75H14.9511L17 449.472L19.0489 452.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M33.0489 452.75H28.9511L31 449.472L33.0489 452.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M47.0489 452.75H42.9511L45 449.472L47.0489 452.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M61.0489 452.75H56.9511L59 449.472L61.0489 452.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M75.0489 452.75H70.9511L73 449.472L75.0489 452.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M89.0489 452.75H84.9511L87 449.472L89.0489 452.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M103.049 452.75H98.9511L101 449.472L103.049 452.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M117.049 452.75H112.951L115 449.472L117.049 452.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M131.049 452.75H126.951L129 449.472L131.049 452.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M145.049 452.75H140.951L143 449.472L145.049 452.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M159.049 452.75H154.951L157 449.472L159.049 452.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M173.049 452.75H168.951L171 449.472L173.049 452.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M187.049 452.75H182.951L185 449.472L187.049 452.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M201.049 452.75H196.951L199 449.472L201.049 452.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M215.049 452.75H210.951L213 449.472L215.049 452.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M229.049 452.75H224.951L227 449.472L229.049 452.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M243.049 452.75H238.951L241 449.472L243.049 452.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M257.049 452.75H252.951L255 449.472L257.049 452.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M271.049 452.75H266.951L269 449.472L271.049 452.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M285.049 452.75H280.951L283 449.472L285.049 452.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M299.049 452.75H294.951L297 449.472L299.049 452.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M313.049 452.75H308.951L311 449.472L313.049 452.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M327.049 452.75H322.951L325 449.472L327.049 452.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M341.049 452.75H336.951L339 449.472L341.049 452.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M355.049 452.75H350.951L353 449.472L355.049 452.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M369.049 452.75H364.951L367 449.472L369.049 452.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M383.049 452.75H378.951L381 449.472L383.049 452.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M397.049 452.75H392.951L395 449.472L397.049 452.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M411.049 452.75H406.951L409 449.472L411.049 452.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M425.049 452.75H420.951L423 449.472L425.049 452.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M439.049 452.75H434.951L437 449.472L439.049 452.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M453.049 452.75H448.951L451 449.472L453.049 452.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M467.049 452.75H462.951L465 449.472L467.049 452.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M481.049 452.75H476.951L479 449.472L481.049 452.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M495.049 452.75H490.951L493 449.472L495.049 452.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M509.049 452.75H504.951L507 449.472L509.049 452.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M523.049 452.75H518.951L521 449.472L523.049 452.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M537.049 452.75H532.951L535 449.472L537.049 452.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M551.049 452.75H546.951L549 449.472L551.049 452.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M565.049 452.75H560.951L563 449.472L565.049 452.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M579.049 452.75H574.951L577 449.472L579.049 452.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M593.049 452.75H588.951L591 449.472L593.049 452.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M607.049 452.75H602.951L605 449.472L607.049 452.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M621.049 452.75H616.951L619 449.472L621.049 452.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M635.049 452.75H630.951L633 449.472L635.049 452.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M649.049 452.75H644.951L647 449.472L649.049 452.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M663.049 452.75H658.951L661 449.472L663.049 452.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M677.049 452.75H672.951L675 449.472L677.049 452.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M691.049 452.75H686.951L689 449.472L691.049 452.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M705.049 452.75H700.951L703 449.472L705.049 452.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M719.049 452.75H714.951L717 449.472L719.049 452.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M733.049 452.75H728.951L731 449.472L733.049 452.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M747.049 452.75H742.951L745 449.472L747.049 452.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M761.049 452.75H756.951L759 449.472L761.049 452.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M775.049 452.75H770.951L773 449.472L775.049 452.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M789.049 452.75H784.951L787 449.472L789.049 452.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M803.049 452.75H798.951L801 449.472L803.049 452.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M817.049 452.75H812.951L815 449.472L817.049 452.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M831.049 452.75H826.951L829 449.472L831.049 452.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M845.049 452.75H840.951L843 449.472L845.049 452.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M859.049 452.75H854.951L857 449.472L859.049 452.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M873.049 452.75H868.951L871 449.472L873.049 452.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M887.049 452.75H882.951L885 449.472L887.049 452.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M901.049 452.75H896.951L899 449.472L901.049 452.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M915.049 452.75H910.951L913 449.472L915.049 452.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M929.049 452.75H924.951L927 449.472L929.049 452.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M943.049 452.75H938.951L941 449.472L943.049 452.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M957.049 452.75H952.951L955 449.472L957.049 452.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M971.049 452.75H966.951L969 449.472L971.049 452.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M985.049 452.75H980.951L983 449.472L985.049 452.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M999.049 452.75H994.951L997 449.472L999.049 452.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1013.05 452.75H1008.95L1011 449.472L1013.05 452.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1027.05 452.75H1022.95L1025 449.472L1027.05 452.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1041.05 452.75H1036.95L1039 449.472L1041.05 452.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1055.05 452.75H1050.95L1053 449.472L1055.05 452.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1069.05 452.75H1064.95L1067 449.472L1069.05 452.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1083.05 452.75H1078.95L1081 449.472L1083.05 452.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1097.05 452.75H1092.95L1095 449.472L1097.05 452.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1111.05 452.75H1106.95L1109 449.472L1111.05 452.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1125.05 452.75H1120.95L1123 449.472L1125.05 452.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1139.05 452.75H1134.95L1137 449.472L1139.05 452.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1153.05 452.75H1148.95L1151 449.472L1153.05 452.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1167.05 452.75H1162.95L1165 449.472L1167.05 452.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1181.05 452.75H1176.95L1179 449.472L1181.05 452.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1195.05 452.75H1190.95L1193 449.472L1195.05 452.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1209.05 452.75H1204.95L1207 449.472L1209.05 452.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1223.05 452.75H1218.95L1221 449.472L1223.05 452.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1237.05 452.75H1232.95L1235 449.472L1237.05 452.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1251.05 452.75H1246.95L1249 449.472L1251.05 452.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1265.05 452.75H1260.95L1263 449.472L1265.05 452.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1279.05 452.75H1274.95L1277 449.472L1279.05 452.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1293.05 452.75H1288.95L1291 449.472L1293.05 452.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1307.05 452.75H1302.95L1305 449.472L1307.05 452.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1321.05 452.75H1316.95L1319 449.472L1321.05 452.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1335.05 452.75H1330.95L1333 449.472L1335.05 452.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1349.05 452.75H1344.95L1347 449.472L1349.05 452.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1363.05 452.75H1358.95L1361 449.472L1363.05 452.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1377.05 452.75H1372.95L1375 449.472L1377.05 452.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1391.05 452.75H1386.95L1389 449.472L1391.05 452.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1405.05 452.75H1400.95L1403 449.472L1405.05 452.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1419.05 452.75H1414.95L1417 449.472L1419.05 452.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1433.05 452.75H1428.95L1431 449.472L1433.05 452.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M5.04894 468.75H0.951062L3 465.472L5.04894 468.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M19.0489 468.75H14.9511L17 465.472L19.0489 468.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M33.0489 468.75H28.9511L31 465.472L33.0489 468.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M47.0489 468.75H42.9511L45 465.472L47.0489 468.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M61.0489 468.75H56.9511L59 465.472L61.0489 468.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M75.0489 468.75H70.9511L73 465.472L75.0489 468.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M89.0489 468.75H84.9511L87 465.472L89.0489 468.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M103.049 468.75H98.9511L101 465.472L103.049 468.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M117.049 468.75H112.951L115 465.472L117.049 468.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M131.049 468.75H126.951L129 465.472L131.049 468.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M145.049 468.75H140.951L143 465.472L145.049 468.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M159.049 468.75H154.951L157 465.472L159.049 468.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M173.049 468.75H168.951L171 465.472L173.049 468.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M187.049 468.75H182.951L185 465.472L187.049 468.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M201.049 468.75H196.951L199 465.472L201.049 468.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M215.049 468.75H210.951L213 465.472L215.049 468.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M229.049 468.75H224.951L227 465.472L229.049 468.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M243.049 468.75H238.951L241 465.472L243.049 468.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M257.049 468.75H252.951L255 465.472L257.049 468.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M271.049 468.75H266.951L269 465.472L271.049 468.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M285.049 468.75H280.951L283 465.472L285.049 468.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M299.049 468.75H294.951L297 465.472L299.049 468.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M313.049 468.75H308.951L311 465.472L313.049 468.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M327.049 468.75H322.951L325 465.472L327.049 468.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M341.049 468.75H336.951L339 465.472L341.049 468.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M355.049 468.75H350.951L353 465.472L355.049 468.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M369.049 468.75H364.951L367 465.472L369.049 468.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M383.049 468.75H378.951L381 465.472L383.049 468.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M397.049 468.75H392.951L395 465.472L397.049 468.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M411.049 468.75H406.951L409 465.472L411.049 468.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M425.049 468.75H420.951L423 465.472L425.049 468.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M439.049 468.75H434.951L437 465.472L439.049 468.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M453.049 468.75H448.951L451 465.472L453.049 468.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M467.049 468.75H462.951L465 465.472L467.049 468.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M481.049 468.75H476.951L479 465.472L481.049 468.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M495.049 468.75H490.951L493 465.472L495.049 468.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M509.049 468.75H504.951L507 465.472L509.049 468.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M523.049 468.75H518.951L521 465.472L523.049 468.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M537.049 468.75H532.951L535 465.472L537.049 468.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M551.049 468.75H546.951L549 465.472L551.049 468.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M565.049 468.75H560.951L563 465.472L565.049 468.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M579.049 468.75H574.951L577 465.472L579.049 468.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M593.049 468.75H588.951L591 465.472L593.049 468.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M607.049 468.75H602.951L605 465.472L607.049 468.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M621.049 468.75H616.951L619 465.472L621.049 468.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M635.049 468.75H630.951L633 465.472L635.049 468.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M649.049 468.75H644.951L647 465.472L649.049 468.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M663.049 468.75H658.951L661 465.472L663.049 468.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M677.049 468.75H672.951L675 465.472L677.049 468.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M691.049 468.75H686.951L689 465.472L691.049 468.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M705.049 468.75H700.951L703 465.472L705.049 468.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M719.049 468.75H714.951L717 465.472L719.049 468.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M733.049 468.75H728.951L731 465.472L733.049 468.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M747.049 468.75H742.951L745 465.472L747.049 468.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M761.049 468.75H756.951L759 465.472L761.049 468.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M775.049 468.75H770.951L773 465.472L775.049 468.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M789.049 468.75H784.951L787 465.472L789.049 468.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M803.049 468.75H798.951L801 465.472L803.049 468.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M817.049 468.75H812.951L815 465.472L817.049 468.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M831.049 468.75H826.951L829 465.472L831.049 468.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M845.049 468.75H840.951L843 465.472L845.049 468.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M859.049 468.75H854.951L857 465.472L859.049 468.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M873.049 468.75H868.951L871 465.472L873.049 468.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M887.049 468.75H882.951L885 465.472L887.049 468.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M901.049 468.75H896.951L899 465.472L901.049 468.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M915.049 468.75H910.951L913 465.472L915.049 468.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M929.049 468.75H924.951L927 465.472L929.049 468.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M943.049 468.75H938.951L941 465.472L943.049 468.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M957.049 468.75H952.951L955 465.472L957.049 468.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M971.049 468.75H966.951L969 465.472L971.049 468.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M985.049 468.75H980.951L983 465.472L985.049 468.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M999.049 468.75H994.951L997 465.472L999.049 468.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1013.05 468.75H1008.95L1011 465.472L1013.05 468.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1027.05 468.75H1022.95L1025 465.472L1027.05 468.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1041.05 468.75H1036.95L1039 465.472L1041.05 468.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1055.05 468.75H1050.95L1053 465.472L1055.05 468.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1069.05 468.75H1064.95L1067 465.472L1069.05 468.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1083.05 468.75H1078.95L1081 465.472L1083.05 468.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1097.05 468.75H1092.95L1095 465.472L1097.05 468.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1111.05 468.75H1106.95L1109 465.472L1111.05 468.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1125.05 468.75H1120.95L1123 465.472L1125.05 468.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1139.05 468.75H1134.95L1137 465.472L1139.05 468.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1153.05 468.75H1148.95L1151 465.472L1153.05 468.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1167.05 468.75H1162.95L1165 465.472L1167.05 468.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1181.05 468.75H1176.95L1179 465.472L1181.05 468.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1195.05 468.75H1190.95L1193 465.472L1195.05 468.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1209.05 468.75H1204.95L1207 465.472L1209.05 468.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1223.05 468.75H1218.95L1221 465.472L1223.05 468.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1237.05 468.75H1232.95L1235 465.472L1237.05 468.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1251.05 468.75H1246.95L1249 465.472L1251.05 468.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1265.05 468.75H1260.95L1263 465.472L1265.05 468.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1279.05 468.75H1274.95L1277 465.472L1279.05 468.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1293.05 468.75H1288.95L1291 465.472L1293.05 468.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1307.05 468.75H1302.95L1305 465.472L1307.05 468.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1321.05 468.75H1316.95L1319 465.472L1321.05 468.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1335.05 468.75H1330.95L1333 465.472L1335.05 468.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1349.05 468.75H1344.95L1347 465.472L1349.05 468.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1363.05 468.75H1358.95L1361 465.472L1363.05 468.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1377.05 468.75H1372.95L1375 465.472L1377.05 468.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1391.05 468.75H1386.95L1389 465.472L1391.05 468.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1405.05 468.75H1400.95L1403 465.472L1405.05 468.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1419.05 468.75H1414.95L1417 465.472L1419.05 468.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1433.05 468.75H1428.95L1431 465.472L1433.05 468.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M5.04894 484.75H0.951062L3 481.472L5.04894 484.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M19.0489 484.75H14.9511L17 481.472L19.0489 484.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M33.0489 484.75H28.9511L31 481.472L33.0489 484.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M47.0489 484.75H42.9511L45 481.472L47.0489 484.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M61.0489 484.75H56.9511L59 481.472L61.0489 484.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M75.0489 484.75H70.9511L73 481.472L75.0489 484.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M89.0489 484.75H84.9511L87 481.472L89.0489 484.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M103.049 484.75H98.9511L101 481.472L103.049 484.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M117.049 484.75H112.951L115 481.472L117.049 484.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M131.049 484.75H126.951L129 481.472L131.049 484.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M145.049 484.75H140.951L143 481.472L145.049 484.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M159.049 484.75H154.951L157 481.472L159.049 484.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M173.049 484.75H168.951L171 481.472L173.049 484.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M187.049 484.75H182.951L185 481.472L187.049 484.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M201.049 484.75H196.951L199 481.472L201.049 484.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M215.049 484.75H210.951L213 481.472L215.049 484.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M229.049 484.75H224.951L227 481.472L229.049 484.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M243.049 484.75H238.951L241 481.472L243.049 484.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M257.049 484.75H252.951L255 481.472L257.049 484.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M271.049 484.75H266.951L269 481.472L271.049 484.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M285.049 484.75H280.951L283 481.472L285.049 484.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M299.049 484.75H294.951L297 481.472L299.049 484.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M313.049 484.75H308.951L311 481.472L313.049 484.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M327.049 484.75H322.951L325 481.472L327.049 484.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M341.049 484.75H336.951L339 481.472L341.049 484.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M355.049 484.75H350.951L353 481.472L355.049 484.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M369.049 484.75H364.951L367 481.472L369.049 484.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M383.049 484.75H378.951L381 481.472L383.049 484.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M397.049 484.75H392.951L395 481.472L397.049 484.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M411.049 484.75H406.951L409 481.472L411.049 484.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M425.049 484.75H420.951L423 481.472L425.049 484.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M439.049 484.75H434.951L437 481.472L439.049 484.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M453.049 484.75H448.951L451 481.472L453.049 484.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M467.049 484.75H462.951L465 481.472L467.049 484.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M481.049 484.75H476.951L479 481.472L481.049 484.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M495.049 484.75H490.951L493 481.472L495.049 484.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M509.049 484.75H504.951L507 481.472L509.049 484.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M523.049 484.75H518.951L521 481.472L523.049 484.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M537.049 484.75H532.951L535 481.472L537.049 484.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M551.049 484.75H546.951L549 481.472L551.049 484.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M565.049 484.75H560.951L563 481.472L565.049 484.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M579.049 484.75H574.951L577 481.472L579.049 484.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M593.049 484.75H588.951L591 481.472L593.049 484.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M607.049 484.75H602.951L605 481.472L607.049 484.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M621.049 484.75H616.951L619 481.472L621.049 484.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M635.049 484.75H630.951L633 481.472L635.049 484.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M649.049 484.75H644.951L647 481.472L649.049 484.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M663.049 484.75H658.951L661 481.472L663.049 484.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M677.049 484.75H672.951L675 481.472L677.049 484.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M691.049 484.75H686.951L689 481.472L691.049 484.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M705.049 484.75H700.951L703 481.472L705.049 484.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M719.049 484.75H714.951L717 481.472L719.049 484.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M733.049 484.75H728.951L731 481.472L733.049 484.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M747.049 484.75H742.951L745 481.472L747.049 484.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M761.049 484.75H756.951L759 481.472L761.049 484.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M775.049 484.75H770.951L773 481.472L775.049 484.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M789.049 484.75H784.951L787 481.472L789.049 484.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M803.049 484.75H798.951L801 481.472L803.049 484.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M817.049 484.75H812.951L815 481.472L817.049 484.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M831.049 484.75H826.951L829 481.472L831.049 484.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M845.049 484.75H840.951L843 481.472L845.049 484.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M859.049 484.75H854.951L857 481.472L859.049 484.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M873.049 484.75H868.951L871 481.472L873.049 484.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M887.049 484.75H882.951L885 481.472L887.049 484.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M901.049 484.75H896.951L899 481.472L901.049 484.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M915.049 484.75H910.951L913 481.472L915.049 484.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M929.049 484.75H924.951L927 481.472L929.049 484.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M943.049 484.75H938.951L941 481.472L943.049 484.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M957.049 484.75H952.951L955 481.472L957.049 484.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M971.049 484.75H966.951L969 481.472L971.049 484.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M985.049 484.75H980.951L983 481.472L985.049 484.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M999.049 484.75H994.951L997 481.472L999.049 484.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1013.05 484.75H1008.95L1011 481.472L1013.05 484.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1027.05 484.75H1022.95L1025 481.472L1027.05 484.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1041.05 484.75H1036.95L1039 481.472L1041.05 484.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1055.05 484.75H1050.95L1053 481.472L1055.05 484.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1069.05 484.75H1064.95L1067 481.472L1069.05 484.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1083.05 484.75H1078.95L1081 481.472L1083.05 484.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1097.05 484.75H1092.95L1095 481.472L1097.05 484.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1111.05 484.75H1106.95L1109 481.472L1111.05 484.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1125.05 484.75H1120.95L1123 481.472L1125.05 484.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1139.05 484.75H1134.95L1137 481.472L1139.05 484.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1153.05 484.75H1148.95L1151 481.472L1153.05 484.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1167.05 484.75H1162.95L1165 481.472L1167.05 484.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1181.05 484.75H1176.95L1179 481.472L1181.05 484.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1195.05 484.75H1190.95L1193 481.472L1195.05 484.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1209.05 484.75H1204.95L1207 481.472L1209.05 484.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1223.05 484.75H1218.95L1221 481.472L1223.05 484.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1237.05 484.75H1232.95L1235 481.472L1237.05 484.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1251.05 484.75H1246.95L1249 481.472L1251.05 484.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1265.05 484.75H1260.95L1263 481.472L1265.05 484.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1279.05 484.75H1274.95L1277 481.472L1279.05 484.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1293.05 484.75H1288.95L1291 481.472L1293.05 484.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1307.05 484.75H1302.95L1305 481.472L1307.05 484.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1321.05 484.75H1316.95L1319 481.472L1321.05 484.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1335.05 484.75H1330.95L1333 481.472L1335.05 484.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1349.05 484.75H1344.95L1347 481.472L1349.05 484.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1363.05 484.75H1358.95L1361 481.472L1363.05 484.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1377.05 484.75H1372.95L1375 481.472L1377.05 484.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1391.05 484.75H1386.95L1389 481.472L1391.05 484.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1405.05 484.75H1400.95L1403 481.472L1405.05 484.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1419.05 484.75H1414.95L1417 481.472L1419.05 484.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1433.05 484.75H1428.95L1431 481.472L1433.05 484.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M5.04894 500.75H0.951062L3 497.472L5.04894 500.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M19.0489 500.75H14.9511L17 497.472L19.0489 500.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M33.0489 500.75H28.9511L31 497.472L33.0489 500.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M47.0489 500.75H42.9511L45 497.472L47.0489 500.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M61.0489 500.75H56.9511L59 497.472L61.0489 500.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M75.0489 500.75H70.9511L73 497.472L75.0489 500.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M89.0489 500.75H84.9511L87 497.472L89.0489 500.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M103.049 500.75H98.9511L101 497.472L103.049 500.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M117.049 500.75H112.951L115 497.472L117.049 500.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M131.049 500.75H126.951L129 497.472L131.049 500.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M145.049 500.75H140.951L143 497.472L145.049 500.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M159.049 500.75H154.951L157 497.472L159.049 500.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M173.049 500.75H168.951L171 497.472L173.049 500.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M187.049 500.75H182.951L185 497.472L187.049 500.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M201.049 500.75H196.951L199 497.472L201.049 500.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M215.049 500.75H210.951L213 497.472L215.049 500.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M229.049 500.75H224.951L227 497.472L229.049 500.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M243.049 500.75H238.951L241 497.472L243.049 500.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M257.049 500.75H252.951L255 497.472L257.049 500.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M271.049 500.75H266.951L269 497.472L271.049 500.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M285.049 500.75H280.951L283 497.472L285.049 500.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M299.049 500.75H294.951L297 497.472L299.049 500.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M313.049 500.75H308.951L311 497.472L313.049 500.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M327.049 500.75H322.951L325 497.472L327.049 500.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M341.049 500.75H336.951L339 497.472L341.049 500.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M355.049 500.75H350.951L353 497.472L355.049 500.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M369.049 500.75H364.951L367 497.472L369.049 500.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M383.049 500.75H378.951L381 497.472L383.049 500.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M397.049 500.75H392.951L395 497.472L397.049 500.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M411.049 500.75H406.951L409 497.472L411.049 500.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M425.049 500.75H420.951L423 497.472L425.049 500.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M439.049 500.75H434.951L437 497.472L439.049 500.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M453.049 500.75H448.951L451 497.472L453.049 500.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M467.049 500.75H462.951L465 497.472L467.049 500.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M481.049 500.75H476.951L479 497.472L481.049 500.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M495.049 500.75H490.951L493 497.472L495.049 500.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M509.049 500.75H504.951L507 497.472L509.049 500.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M523.049 500.75H518.951L521 497.472L523.049 500.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M537.049 500.75H532.951L535 497.472L537.049 500.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M551.049 500.75H546.951L549 497.472L551.049 500.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M565.049 500.75H560.951L563 497.472L565.049 500.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M579.049 500.75H574.951L577 497.472L579.049 500.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M593.049 500.75H588.951L591 497.472L593.049 500.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M607.049 500.75H602.951L605 497.472L607.049 500.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M621.049 500.75H616.951L619 497.472L621.049 500.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M635.049 500.75H630.951L633 497.472L635.049 500.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M649.049 500.75H644.951L647 497.472L649.049 500.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M663.049 500.75H658.951L661 497.472L663.049 500.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M677.049 500.75H672.951L675 497.472L677.049 500.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M691.049 500.75H686.951L689 497.472L691.049 500.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M705.049 500.75H700.951L703 497.472L705.049 500.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M719.049 500.75H714.951L717 497.472L719.049 500.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M733.049 500.75H728.951L731 497.472L733.049 500.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M747.049 500.75H742.951L745 497.472L747.049 500.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M761.049 500.75H756.951L759 497.472L761.049 500.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M775.049 500.75H770.951L773 497.472L775.049 500.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M789.049 500.75H784.951L787 497.472L789.049 500.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M803.049 500.75H798.951L801 497.472L803.049 500.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M817.049 500.75H812.951L815 497.472L817.049 500.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M831.049 500.75H826.951L829 497.472L831.049 500.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M845.049 500.75H840.951L843 497.472L845.049 500.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M859.049 500.75H854.951L857 497.472L859.049 500.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M873.049 500.75H868.951L871 497.472L873.049 500.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M887.049 500.75H882.951L885 497.472L887.049 500.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M901.049 500.75H896.951L899 497.472L901.049 500.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M915.049 500.75H910.951L913 497.472L915.049 500.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M929.049 500.75H924.951L927 497.472L929.049 500.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M943.049 500.75H938.951L941 497.472L943.049 500.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M957.049 500.75H952.951L955 497.472L957.049 500.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M971.049 500.75H966.951L969 497.472L971.049 500.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M985.049 500.75H980.951L983 497.472L985.049 500.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M999.049 500.75H994.951L997 497.472L999.049 500.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1013.05 500.75H1008.95L1011 497.472L1013.05 500.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1027.05 500.75H1022.95L1025 497.472L1027.05 500.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1041.05 500.75H1036.95L1039 497.472L1041.05 500.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1055.05 500.75H1050.95L1053 497.472L1055.05 500.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1069.05 500.75H1064.95L1067 497.472L1069.05 500.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1083.05 500.75H1078.95L1081 497.472L1083.05 500.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1097.05 500.75H1092.95L1095 497.472L1097.05 500.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1111.05 500.75H1106.95L1109 497.472L1111.05 500.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1125.05 500.75H1120.95L1123 497.472L1125.05 500.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1139.05 500.75H1134.95L1137 497.472L1139.05 500.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1153.05 500.75H1148.95L1151 497.472L1153.05 500.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1167.05 500.75H1162.95L1165 497.472L1167.05 500.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1181.05 500.75H1176.95L1179 497.472L1181.05 500.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1195.05 500.75H1190.95L1193 497.472L1195.05 500.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1209.05 500.75H1204.95L1207 497.472L1209.05 500.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1223.05 500.75H1218.95L1221 497.472L1223.05 500.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1237.05 500.75H1232.95L1235 497.472L1237.05 500.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1251.05 500.75H1246.95L1249 497.472L1251.05 500.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1265.05 500.75H1260.95L1263 497.472L1265.05 500.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1279.05 500.75H1274.95L1277 497.472L1279.05 500.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1293.05 500.75H1288.95L1291 497.472L1293.05 500.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1307.05 500.75H1302.95L1305 497.472L1307.05 500.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1321.05 500.75H1316.95L1319 497.472L1321.05 500.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1335.05 500.75H1330.95L1333 497.472L1335.05 500.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1349.05 500.75H1344.95L1347 497.472L1349.05 500.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1363.05 500.75H1358.95L1361 497.472L1363.05 500.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1377.05 500.75H1372.95L1375 497.472L1377.05 500.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1391.05 500.75H1386.95L1389 497.472L1391.05 500.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1405.05 500.75H1400.95L1403 497.472L1405.05 500.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1419.05 500.75H1414.95L1417 497.472L1419.05 500.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1433.05 500.75H1428.95L1431 497.472L1433.05 500.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M5.04894 516.75H0.951062L3 513.472L5.04894 516.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M19.0489 516.75H14.9511L17 513.472L19.0489 516.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M33.0489 516.75H28.9511L31 513.472L33.0489 516.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M47.0489 516.75H42.9511L45 513.472L47.0489 516.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M61.0489 516.75H56.9511L59 513.472L61.0489 516.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M75.0489 516.75H70.9511L73 513.472L75.0489 516.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M89.0489 516.75H84.9511L87 513.472L89.0489 516.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M103.049 516.75H98.9511L101 513.472L103.049 516.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M117.049 516.75H112.951L115 513.472L117.049 516.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M131.049 516.75H126.951L129 513.472L131.049 516.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M145.049 516.75H140.951L143 513.472L145.049 516.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M159.049 516.75H154.951L157 513.472L159.049 516.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M173.049 516.75H168.951L171 513.472L173.049 516.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M187.049 516.75H182.951L185 513.472L187.049 516.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M201.049 516.75H196.951L199 513.472L201.049 516.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M215.049 516.75H210.951L213 513.472L215.049 516.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M229.049 516.75H224.951L227 513.472L229.049 516.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M243.049 516.75H238.951L241 513.472L243.049 516.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M257.049 516.75H252.951L255 513.472L257.049 516.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M271.049 516.75H266.951L269 513.472L271.049 516.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M285.049 516.75H280.951L283 513.472L285.049 516.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M299.049 516.75H294.951L297 513.472L299.049 516.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M313.049 516.75H308.951L311 513.472L313.049 516.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M327.049 516.75H322.951L325 513.472L327.049 516.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M341.049 516.75H336.951L339 513.472L341.049 516.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M355.049 516.75H350.951L353 513.472L355.049 516.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M369.049 516.75H364.951L367 513.472L369.049 516.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M383.049 516.75H378.951L381 513.472L383.049 516.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M397.049 516.75H392.951L395 513.472L397.049 516.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M411.049 516.75H406.951L409 513.472L411.049 516.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M425.049 516.75H420.951L423 513.472L425.049 516.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M439.049 516.75H434.951L437 513.472L439.049 516.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M453.049 516.75H448.951L451 513.472L453.049 516.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M467.049 516.75H462.951L465 513.472L467.049 516.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M481.049 516.75H476.951L479 513.472L481.049 516.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M495.049 516.75H490.951L493 513.472L495.049 516.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M509.049 516.75H504.951L507 513.472L509.049 516.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M523.049 516.75H518.951L521 513.472L523.049 516.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M537.049 516.75H532.951L535 513.472L537.049 516.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M551.049 516.75H546.951L549 513.472L551.049 516.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M565.049 516.75H560.951L563 513.472L565.049 516.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M579.049 516.75H574.951L577 513.472L579.049 516.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M593.049 516.75H588.951L591 513.472L593.049 516.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M607.049 516.75H602.951L605 513.472L607.049 516.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M621.049 516.75H616.951L619 513.472L621.049 516.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M635.049 516.75H630.951L633 513.472L635.049 516.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M649.049 516.75H644.951L647 513.472L649.049 516.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M663.049 516.75H658.951L661 513.472L663.049 516.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M677.049 516.75H672.951L675 513.472L677.049 516.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M691.049 516.75H686.951L689 513.472L691.049 516.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M705.049 516.75H700.951L703 513.472L705.049 516.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M719.049 516.75H714.951L717 513.472L719.049 516.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M733.049 516.75H728.951L731 513.472L733.049 516.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M747.049 516.75H742.951L745 513.472L747.049 516.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M761.049 516.75H756.951L759 513.472L761.049 516.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M775.049 516.75H770.951L773 513.472L775.049 516.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M789.049 516.75H784.951L787 513.472L789.049 516.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M803.049 516.75H798.951L801 513.472L803.049 516.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M817.049 516.75H812.951L815 513.472L817.049 516.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M831.049 516.75H826.951L829 513.472L831.049 516.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M845.049 516.75H840.951L843 513.472L845.049 516.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M859.049 516.75H854.951L857 513.472L859.049 516.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M873.049 516.75H868.951L871 513.472L873.049 516.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M887.049 516.75H882.951L885 513.472L887.049 516.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M901.049 516.75H896.951L899 513.472L901.049 516.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M915.049 516.75H910.951L913 513.472L915.049 516.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M929.049 516.75H924.951L927 513.472L929.049 516.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M943.049 516.75H938.951L941 513.472L943.049 516.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M957.049 516.75H952.951L955 513.472L957.049 516.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M971.049 516.75H966.951L969 513.472L971.049 516.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M985.049 516.75H980.951L983 513.472L985.049 516.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M999.049 516.75H994.951L997 513.472L999.049 516.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1013.05 516.75H1008.95L1011 513.472L1013.05 516.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1027.05 516.75H1022.95L1025 513.472L1027.05 516.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1041.05 516.75H1036.95L1039 513.472L1041.05 516.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1055.05 516.75H1050.95L1053 513.472L1055.05 516.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1069.05 516.75H1064.95L1067 513.472L1069.05 516.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1083.05 516.75H1078.95L1081 513.472L1083.05 516.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1097.05 516.75H1092.95L1095 513.472L1097.05 516.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1111.05 516.75H1106.95L1109 513.472L1111.05 516.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1125.05 516.75H1120.95L1123 513.472L1125.05 516.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1139.05 516.75H1134.95L1137 513.472L1139.05 516.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1153.05 516.75H1148.95L1151 513.472L1153.05 516.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1167.05 516.75H1162.95L1165 513.472L1167.05 516.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1181.05 516.75H1176.95L1179 513.472L1181.05 516.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1195.05 516.75H1190.95L1193 513.472L1195.05 516.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1209.05 516.75H1204.95L1207 513.472L1209.05 516.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1223.05 516.75H1218.95L1221 513.472L1223.05 516.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1237.05 516.75H1232.95L1235 513.472L1237.05 516.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1251.05 516.75H1246.95L1249 513.472L1251.05 516.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1265.05 516.75H1260.95L1263 513.472L1265.05 516.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1279.05 516.75H1274.95L1277 513.472L1279.05 516.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1293.05 516.75H1288.95L1291 513.472L1293.05 516.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1307.05 516.75H1302.95L1305 513.472L1307.05 516.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1321.05 516.75H1316.95L1319 513.472L1321.05 516.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1335.05 516.75H1330.95L1333 513.472L1335.05 516.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1349.05 516.75H1344.95L1347 513.472L1349.05 516.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1363.05 516.75H1358.95L1361 513.472L1363.05 516.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1377.05 516.75H1372.95L1375 513.472L1377.05 516.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1391.05 516.75H1386.95L1389 513.472L1391.05 516.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1405.05 516.75H1400.95L1403 513.472L1405.05 516.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1419.05 516.75H1414.95L1417 513.472L1419.05 516.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1433.05 516.75H1428.95L1431 513.472L1433.05 516.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M5.04894 532.75H0.951062L3 529.472L5.04894 532.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M19.0489 532.75H14.9511L17 529.472L19.0489 532.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M33.0489 532.75H28.9511L31 529.472L33.0489 532.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M47.0489 532.75H42.9511L45 529.472L47.0489 532.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M61.0489 532.75H56.9511L59 529.472L61.0489 532.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M75.0489 532.75H70.9511L73 529.472L75.0489 532.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M89.0489 532.75H84.9511L87 529.472L89.0489 532.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M103.049 532.75H98.9511L101 529.472L103.049 532.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M117.049 532.75H112.951L115 529.472L117.049 532.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M131.049 532.75H126.951L129 529.472L131.049 532.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M145.049 532.75H140.951L143 529.472L145.049 532.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M159.049 532.75H154.951L157 529.472L159.049 532.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M173.049 532.75H168.951L171 529.472L173.049 532.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M187.049 532.75H182.951L185 529.472L187.049 532.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M201.049 532.75H196.951L199 529.472L201.049 532.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M215.049 532.75H210.951L213 529.472L215.049 532.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M229.049 532.75H224.951L227 529.472L229.049 532.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M243.049 532.75H238.951L241 529.472L243.049 532.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M257.049 532.75H252.951L255 529.472L257.049 532.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M271.049 532.75H266.951L269 529.472L271.049 532.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M285.049 532.75H280.951L283 529.472L285.049 532.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M299.049 532.75H294.951L297 529.472L299.049 532.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M313.049 532.75H308.951L311 529.472L313.049 532.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M327.049 532.75H322.951L325 529.472L327.049 532.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M341.049 532.75H336.951L339 529.472L341.049 532.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M355.049 532.75H350.951L353 529.472L355.049 532.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M369.049 532.75H364.951L367 529.472L369.049 532.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M383.049 532.75H378.951L381 529.472L383.049 532.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M397.049 532.75H392.951L395 529.472L397.049 532.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M411.049 532.75H406.951L409 529.472L411.049 532.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M425.049 532.75H420.951L423 529.472L425.049 532.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M439.049 532.75H434.951L437 529.472L439.049 532.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M453.049 532.75H448.951L451 529.472L453.049 532.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M467.049 532.75H462.951L465 529.472L467.049 532.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M481.049 532.75H476.951L479 529.472L481.049 532.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M495.049 532.75H490.951L493 529.472L495.049 532.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M509.049 532.75H504.951L507 529.472L509.049 532.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M523.049 532.75H518.951L521 529.472L523.049 532.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M537.049 532.75H532.951L535 529.472L537.049 532.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M551.049 532.75H546.951L549 529.472L551.049 532.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M565.049 532.75H560.951L563 529.472L565.049 532.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M579.049 532.75H574.951L577 529.472L579.049 532.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M593.049 532.75H588.951L591 529.472L593.049 532.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M607.049 532.75H602.951L605 529.472L607.049 532.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M621.049 532.75H616.951L619 529.472L621.049 532.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M635.049 532.75H630.951L633 529.472L635.049 532.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M649.049 532.75H644.951L647 529.472L649.049 532.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M663.049 532.75H658.951L661 529.472L663.049 532.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M677.049 532.75H672.951L675 529.472L677.049 532.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M691.049 532.75H686.951L689 529.472L691.049 532.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M705.049 532.75H700.951L703 529.472L705.049 532.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M719.049 532.75H714.951L717 529.472L719.049 532.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M733.049 532.75H728.951L731 529.472L733.049 532.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M747.049 532.75H742.951L745 529.472L747.049 532.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M761.049 532.75H756.951L759 529.472L761.049 532.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M775.049 532.75H770.951L773 529.472L775.049 532.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M789.049 532.75H784.951L787 529.472L789.049 532.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M803.049 532.75H798.951L801 529.472L803.049 532.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M817.049 532.75H812.951L815 529.472L817.049 532.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M831.049 532.75H826.951L829 529.472L831.049 532.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M845.049 532.75H840.951L843 529.472L845.049 532.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M859.049 532.75H854.951L857 529.472L859.049 532.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M873.049 532.75H868.951L871 529.472L873.049 532.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M887.049 532.75H882.951L885 529.472L887.049 532.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M901.049 532.75H896.951L899 529.472L901.049 532.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M915.049 532.75H910.951L913 529.472L915.049 532.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M929.049 532.75H924.951L927 529.472L929.049 532.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M943.049 532.75H938.951L941 529.472L943.049 532.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M957.049 532.75H952.951L955 529.472L957.049 532.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M971.049 532.75H966.951L969 529.472L971.049 532.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M985.049 532.75H980.951L983 529.472L985.049 532.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M999.049 532.75H994.951L997 529.472L999.049 532.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1013.05 532.75H1008.95L1011 529.472L1013.05 532.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1027.05 532.75H1022.95L1025 529.472L1027.05 532.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1041.05 532.75H1036.95L1039 529.472L1041.05 532.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1055.05 532.75H1050.95L1053 529.472L1055.05 532.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1069.05 532.75H1064.95L1067 529.472L1069.05 532.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1083.05 532.75H1078.95L1081 529.472L1083.05 532.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1097.05 532.75H1092.95L1095 529.472L1097.05 532.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1111.05 532.75H1106.95L1109 529.472L1111.05 532.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1125.05 532.75H1120.95L1123 529.472L1125.05 532.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1139.05 532.75H1134.95L1137 529.472L1139.05 532.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1153.05 532.75H1148.95L1151 529.472L1153.05 532.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1167.05 532.75H1162.95L1165 529.472L1167.05 532.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1181.05 532.75H1176.95L1179 529.472L1181.05 532.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1195.05 532.75H1190.95L1193 529.472L1195.05 532.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1209.05 532.75H1204.95L1207 529.472L1209.05 532.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1223.05 532.75H1218.95L1221 529.472L1223.05 532.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1237.05 532.75H1232.95L1235 529.472L1237.05 532.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1251.05 532.75H1246.95L1249 529.472L1251.05 532.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1265.05 532.75H1260.95L1263 529.472L1265.05 532.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1279.05 532.75H1274.95L1277 529.472L1279.05 532.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1293.05 532.75H1288.95L1291 529.472L1293.05 532.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1307.05 532.75H1302.95L1305 529.472L1307.05 532.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1321.05 532.75H1316.95L1319 529.472L1321.05 532.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1335.05 532.75H1330.95L1333 529.472L1335.05 532.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1349.05 532.75H1344.95L1347 529.472L1349.05 532.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1363.05 532.75H1358.95L1361 529.472L1363.05 532.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1377.05 532.75H1372.95L1375 529.472L1377.05 532.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1391.05 532.75H1386.95L1389 529.472L1391.05 532.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1405.05 532.75H1400.95L1403 529.472L1405.05 532.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1419.05 532.75H1414.95L1417 529.472L1419.05 532.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1433.05 532.75H1428.95L1431 529.472L1433.05 532.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M5.04894 548.75H0.951062L3 545.472L5.04894 548.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M19.0489 548.75H14.9511L17 545.472L19.0489 548.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M33.0489 548.75H28.9511L31 545.472L33.0489 548.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M47.0489 548.75H42.9511L45 545.472L47.0489 548.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M61.0489 548.75H56.9511L59 545.472L61.0489 548.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M75.0489 548.75H70.9511L73 545.472L75.0489 548.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M89.0489 548.75H84.9511L87 545.472L89.0489 548.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M103.049 548.75H98.9511L101 545.472L103.049 548.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M117.049 548.75H112.951L115 545.472L117.049 548.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M131.049 548.75H126.951L129 545.472L131.049 548.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M145.049 548.75H140.951L143 545.472L145.049 548.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M159.049 548.75H154.951L157 545.472L159.049 548.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M173.049 548.75H168.951L171 545.472L173.049 548.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M187.049 548.75H182.951L185 545.472L187.049 548.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M201.049 548.75H196.951L199 545.472L201.049 548.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M215.049 548.75H210.951L213 545.472L215.049 548.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M229.049 548.75H224.951L227 545.472L229.049 548.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M243.049 548.75H238.951L241 545.472L243.049 548.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M257.049 548.75H252.951L255 545.472L257.049 548.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M271.049 548.75H266.951L269 545.472L271.049 548.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M285.049 548.75H280.951L283 545.472L285.049 548.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M299.049 548.75H294.951L297 545.472L299.049 548.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M313.049 548.75H308.951L311 545.472L313.049 548.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M327.049 548.75H322.951L325 545.472L327.049 548.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M341.049 548.75H336.951L339 545.472L341.049 548.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M355.049 548.75H350.951L353 545.472L355.049 548.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M369.049 548.75H364.951L367 545.472L369.049 548.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M383.049 548.75H378.951L381 545.472L383.049 548.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M397.049 548.75H392.951L395 545.472L397.049 548.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M411.049 548.75H406.951L409 545.472L411.049 548.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M425.049 548.75H420.951L423 545.472L425.049 548.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M439.049 548.75H434.951L437 545.472L439.049 548.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M453.049 548.75H448.951L451 545.472L453.049 548.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M467.049 548.75H462.951L465 545.472L467.049 548.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M481.049 548.75H476.951L479 545.472L481.049 548.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M495.049 548.75H490.951L493 545.472L495.049 548.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M509.049 548.75H504.951L507 545.472L509.049 548.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M523.049 548.75H518.951L521 545.472L523.049 548.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M537.049 548.75H532.951L535 545.472L537.049 548.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M551.049 548.75H546.951L549 545.472L551.049 548.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M565.049 548.75H560.951L563 545.472L565.049 548.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M579.049 548.75H574.951L577 545.472L579.049 548.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M593.049 548.75H588.951L591 545.472L593.049 548.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M607.049 548.75H602.951L605 545.472L607.049 548.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M621.049 548.75H616.951L619 545.472L621.049 548.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M635.049 548.75H630.951L633 545.472L635.049 548.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M649.049 548.75H644.951L647 545.472L649.049 548.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M663.049 548.75H658.951L661 545.472L663.049 548.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M677.049 548.75H672.951L675 545.472L677.049 548.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M691.049 548.75H686.951L689 545.472L691.049 548.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M705.049 548.75H700.951L703 545.472L705.049 548.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M719.049 548.75H714.951L717 545.472L719.049 548.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M733.049 548.75H728.951L731 545.472L733.049 548.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M747.049 548.75H742.951L745 545.472L747.049 548.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M761.049 548.75H756.951L759 545.472L761.049 548.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M775.049 548.75H770.951L773 545.472L775.049 548.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M789.049 548.75H784.951L787 545.472L789.049 548.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M803.049 548.75H798.951L801 545.472L803.049 548.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M817.049 548.75H812.951L815 545.472L817.049 548.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M831.049 548.75H826.951L829 545.472L831.049 548.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M845.049 548.75H840.951L843 545.472L845.049 548.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M859.049 548.75H854.951L857 545.472L859.049 548.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M873.049 548.75H868.951L871 545.472L873.049 548.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M887.049 548.75H882.951L885 545.472L887.049 548.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M901.049 548.75H896.951L899 545.472L901.049 548.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M915.049 548.75H910.951L913 545.472L915.049 548.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M929.049 548.75H924.951L927 545.472L929.049 548.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M943.049 548.75H938.951L941 545.472L943.049 548.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M957.049 548.75H952.951L955 545.472L957.049 548.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M971.049 548.75H966.951L969 545.472L971.049 548.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M985.049 548.75H980.951L983 545.472L985.049 548.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M999.049 548.75H994.951L997 545.472L999.049 548.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1013.05 548.75H1008.95L1011 545.472L1013.05 548.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1027.05 548.75H1022.95L1025 545.472L1027.05 548.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1041.05 548.75H1036.95L1039 545.472L1041.05 548.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1055.05 548.75H1050.95L1053 545.472L1055.05 548.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1069.05 548.75H1064.95L1067 545.472L1069.05 548.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1083.05 548.75H1078.95L1081 545.472L1083.05 548.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1097.05 548.75H1092.95L1095 545.472L1097.05 548.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1111.05 548.75H1106.95L1109 545.472L1111.05 548.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1125.05 548.75H1120.95L1123 545.472L1125.05 548.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1139.05 548.75H1134.95L1137 545.472L1139.05 548.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1153.05 548.75H1148.95L1151 545.472L1153.05 548.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1167.05 548.75H1162.95L1165 545.472L1167.05 548.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1181.05 548.75H1176.95L1179 545.472L1181.05 548.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1195.05 548.75H1190.95L1193 545.472L1195.05 548.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1209.05 548.75H1204.95L1207 545.472L1209.05 548.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1223.05 548.75H1218.95L1221 545.472L1223.05 548.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1237.05 548.75H1232.95L1235 545.472L1237.05 548.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1251.05 548.75H1246.95L1249 545.472L1251.05 548.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1265.05 548.75H1260.95L1263 545.472L1265.05 548.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1279.05 548.75H1274.95L1277 545.472L1279.05 548.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1293.05 548.75H1288.95L1291 545.472L1293.05 548.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1307.05 548.75H1302.95L1305 545.472L1307.05 548.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1321.05 548.75H1316.95L1319 545.472L1321.05 548.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1335.05 548.75H1330.95L1333 545.472L1335.05 548.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1349.05 548.75H1344.95L1347 545.472L1349.05 548.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1363.05 548.75H1358.95L1361 545.472L1363.05 548.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1377.05 548.75H1372.95L1375 545.472L1377.05 548.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1391.05 548.75H1386.95L1389 545.472L1391.05 548.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1405.05 548.75H1400.95L1403 545.472L1405.05 548.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1419.05 548.75H1414.95L1417 545.472L1419.05 548.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1433.05 548.75H1428.95L1431 545.472L1433.05 548.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M5.04894 564.75H0.951062L3 561.472L5.04894 564.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M19.0489 564.75H14.9511L17 561.472L19.0489 564.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M33.0489 564.75H28.9511L31 561.472L33.0489 564.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M47.0489 564.75H42.9511L45 561.472L47.0489 564.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M61.0489 564.75H56.9511L59 561.472L61.0489 564.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M75.0489 564.75H70.9511L73 561.472L75.0489 564.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M89.0489 564.75H84.9511L87 561.472L89.0489 564.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M103.049 564.75H98.9511L101 561.472L103.049 564.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M117.049 564.75H112.951L115 561.472L117.049 564.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M131.049 564.75H126.951L129 561.472L131.049 564.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M145.049 564.75H140.951L143 561.472L145.049 564.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M159.049 564.75H154.951L157 561.472L159.049 564.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M173.049 564.75H168.951L171 561.472L173.049 564.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M187.049 564.75H182.951L185 561.472L187.049 564.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M201.049 564.75H196.951L199 561.472L201.049 564.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M215.049 564.75H210.951L213 561.472L215.049 564.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M229.049 564.75H224.951L227 561.472L229.049 564.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M243.049 564.75H238.951L241 561.472L243.049 564.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M257.049 564.75H252.951L255 561.472L257.049 564.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M271.049 564.75H266.951L269 561.472L271.049 564.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M285.049 564.75H280.951L283 561.472L285.049 564.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M299.049 564.75H294.951L297 561.472L299.049 564.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M313.049 564.75H308.951L311 561.472L313.049 564.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M327.049 564.75H322.951L325 561.472L327.049 564.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M341.049 564.75H336.951L339 561.472L341.049 564.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M355.049 564.75H350.951L353 561.472L355.049 564.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M369.049 564.75H364.951L367 561.472L369.049 564.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M383.049 564.75H378.951L381 561.472L383.049 564.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M397.049 564.75H392.951L395 561.472L397.049 564.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M411.049 564.75H406.951L409 561.472L411.049 564.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M425.049 564.75H420.951L423 561.472L425.049 564.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M439.049 564.75H434.951L437 561.472L439.049 564.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M453.049 564.75H448.951L451 561.472L453.049 564.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M467.049 564.75H462.951L465 561.472L467.049 564.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M481.049 564.75H476.951L479 561.472L481.049 564.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M495.049 564.75H490.951L493 561.472L495.049 564.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M509.049 564.75H504.951L507 561.472L509.049 564.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M523.049 564.75H518.951L521 561.472L523.049 564.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M537.049 564.75H532.951L535 561.472L537.049 564.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M551.049 564.75H546.951L549 561.472L551.049 564.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M565.049 564.75H560.951L563 561.472L565.049 564.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M579.049 564.75H574.951L577 561.472L579.049 564.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M593.049 564.75H588.951L591 561.472L593.049 564.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M607.049 564.75H602.951L605 561.472L607.049 564.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M621.049 564.75H616.951L619 561.472L621.049 564.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M635.049 564.75H630.951L633 561.472L635.049 564.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M649.049 564.75H644.951L647 561.472L649.049 564.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M663.049 564.75H658.951L661 561.472L663.049 564.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M677.049 564.75H672.951L675 561.472L677.049 564.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M691.049 564.75H686.951L689 561.472L691.049 564.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M705.049 564.75H700.951L703 561.472L705.049 564.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M719.049 564.75H714.951L717 561.472L719.049 564.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M733.049 564.75H728.951L731 561.472L733.049 564.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M747.049 564.75H742.951L745 561.472L747.049 564.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M761.049 564.75H756.951L759 561.472L761.049 564.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M775.049 564.75H770.951L773 561.472L775.049 564.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M789.049 564.75H784.951L787 561.472L789.049 564.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M803.049 564.75H798.951L801 561.472L803.049 564.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M817.049 564.75H812.951L815 561.472L817.049 564.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M831.049 564.75H826.951L829 561.472L831.049 564.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M845.049 564.75H840.951L843 561.472L845.049 564.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M859.049 564.75H854.951L857 561.472L859.049 564.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M873.049 564.75H868.951L871 561.472L873.049 564.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M887.049 564.75H882.951L885 561.472L887.049 564.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M901.049 564.75H896.951L899 561.472L901.049 564.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M915.049 564.75H910.951L913 561.472L915.049 564.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M929.049 564.75H924.951L927 561.472L929.049 564.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M943.049 564.75H938.951L941 561.472L943.049 564.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M957.049 564.75H952.951L955 561.472L957.049 564.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M971.049 564.75H966.951L969 561.472L971.049 564.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M985.049 564.75H980.951L983 561.472L985.049 564.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M999.049 564.75H994.951L997 561.472L999.049 564.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1013.05 564.75H1008.95L1011 561.472L1013.05 564.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1027.05 564.75H1022.95L1025 561.472L1027.05 564.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1041.05 564.75H1036.95L1039 561.472L1041.05 564.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1055.05 564.75H1050.95L1053 561.472L1055.05 564.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1069.05 564.75H1064.95L1067 561.472L1069.05 564.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1083.05 564.75H1078.95L1081 561.472L1083.05 564.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1097.05 564.75H1092.95L1095 561.472L1097.05 564.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1111.05 564.75H1106.95L1109 561.472L1111.05 564.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1125.05 564.75H1120.95L1123 561.472L1125.05 564.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1139.05 564.75H1134.95L1137 561.472L1139.05 564.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1153.05 564.75H1148.95L1151 561.472L1153.05 564.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1167.05 564.75H1162.95L1165 561.472L1167.05 564.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1181.05 564.75H1176.95L1179 561.472L1181.05 564.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1195.05 564.75H1190.95L1193 561.472L1195.05 564.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1209.05 564.75H1204.95L1207 561.472L1209.05 564.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1223.05 564.75H1218.95L1221 561.472L1223.05 564.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1237.05 564.75H1232.95L1235 561.472L1237.05 564.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1251.05 564.75H1246.95L1249 561.472L1251.05 564.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1265.05 564.75H1260.95L1263 561.472L1265.05 564.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1279.05 564.75H1274.95L1277 561.472L1279.05 564.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1293.05 564.75H1288.95L1291 561.472L1293.05 564.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1307.05 564.75H1302.95L1305 561.472L1307.05 564.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1321.05 564.75H1316.95L1319 561.472L1321.05 564.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1335.05 564.75H1330.95L1333 561.472L1335.05 564.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1349.05 564.75H1344.95L1347 561.472L1349.05 564.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1363.05 564.75H1358.95L1361 561.472L1363.05 564.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1377.05 564.75H1372.95L1375 561.472L1377.05 564.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1391.05 564.75H1386.95L1389 561.472L1391.05 564.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1405.05 564.75H1400.95L1403 561.472L1405.05 564.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1419.05 564.75H1414.95L1417 561.472L1419.05 564.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1433.05 564.75H1428.95L1431 561.472L1433.05 564.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M5.04894 580.75H0.951062L3 577.472L5.04894 580.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M19.0489 580.75H14.9511L17 577.472L19.0489 580.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M33.0489 580.75H28.9511L31 577.472L33.0489 580.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M47.0489 580.75H42.9511L45 577.472L47.0489 580.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M61.0489 580.75H56.9511L59 577.472L61.0489 580.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M75.0489 580.75H70.9511L73 577.472L75.0489 580.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M89.0489 580.75H84.9511L87 577.472L89.0489 580.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M103.049 580.75H98.9511L101 577.472L103.049 580.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M117.049 580.75H112.951L115 577.472L117.049 580.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M131.049 580.75H126.951L129 577.472L131.049 580.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M145.049 580.75H140.951L143 577.472L145.049 580.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M159.049 580.75H154.951L157 577.472L159.049 580.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M173.049 580.75H168.951L171 577.472L173.049 580.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M187.049 580.75H182.951L185 577.472L187.049 580.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M201.049 580.75H196.951L199 577.472L201.049 580.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M215.049 580.75H210.951L213 577.472L215.049 580.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M229.049 580.75H224.951L227 577.472L229.049 580.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M243.049 580.75H238.951L241 577.472L243.049 580.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M257.049 580.75H252.951L255 577.472L257.049 580.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M271.049 580.75H266.951L269 577.472L271.049 580.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M285.049 580.75H280.951L283 577.472L285.049 580.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M299.049 580.75H294.951L297 577.472L299.049 580.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M313.049 580.75H308.951L311 577.472L313.049 580.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M327.049 580.75H322.951L325 577.472L327.049 580.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M341.049 580.75H336.951L339 577.472L341.049 580.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M355.049 580.75H350.951L353 577.472L355.049 580.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M369.049 580.75H364.951L367 577.472L369.049 580.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M383.049 580.75H378.951L381 577.472L383.049 580.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M397.049 580.75H392.951L395 577.472L397.049 580.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M411.049 580.75H406.951L409 577.472L411.049 580.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M425.049 580.75H420.951L423 577.472L425.049 580.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M439.049 580.75H434.951L437 577.472L439.049 580.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M453.049 580.75H448.951L451 577.472L453.049 580.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M467.049 580.75H462.951L465 577.472L467.049 580.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M481.049 580.75H476.951L479 577.472L481.049 580.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M495.049 580.75H490.951L493 577.472L495.049 580.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M509.049 580.75H504.951L507 577.472L509.049 580.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M523.049 580.75H518.951L521 577.472L523.049 580.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M537.049 580.75H532.951L535 577.472L537.049 580.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M551.049 580.75H546.951L549 577.472L551.049 580.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M565.049 580.75H560.951L563 577.472L565.049 580.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M579.049 580.75H574.951L577 577.472L579.049 580.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M593.049 580.75H588.951L591 577.472L593.049 580.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M607.049 580.75H602.951L605 577.472L607.049 580.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M621.049 580.75H616.951L619 577.472L621.049 580.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M635.049 580.75H630.951L633 577.472L635.049 580.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M649.049 580.75H644.951L647 577.472L649.049 580.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M663.049 580.75H658.951L661 577.472L663.049 580.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M677.049 580.75H672.951L675 577.472L677.049 580.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M691.049 580.75H686.951L689 577.472L691.049 580.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M705.049 580.75H700.951L703 577.472L705.049 580.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M719.049 580.75H714.951L717 577.472L719.049 580.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M733.049 580.75H728.951L731 577.472L733.049 580.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M747.049 580.75H742.951L745 577.472L747.049 580.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M761.049 580.75H756.951L759 577.472L761.049 580.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M775.049 580.75H770.951L773 577.472L775.049 580.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M789.049 580.75H784.951L787 577.472L789.049 580.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M803.049 580.75H798.951L801 577.472L803.049 580.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M817.049 580.75H812.951L815 577.472L817.049 580.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M831.049 580.75H826.951L829 577.472L831.049 580.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M845.049 580.75H840.951L843 577.472L845.049 580.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M859.049 580.75H854.951L857 577.472L859.049 580.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M873.049 580.75H868.951L871 577.472L873.049 580.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M887.049 580.75H882.951L885 577.472L887.049 580.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M901.049 580.75H896.951L899 577.472L901.049 580.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M915.049 580.75H910.951L913 577.472L915.049 580.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M929.049 580.75H924.951L927 577.472L929.049 580.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M943.049 580.75H938.951L941 577.472L943.049 580.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M957.049 580.75H952.951L955 577.472L957.049 580.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M971.049 580.75H966.951L969 577.472L971.049 580.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M985.049 580.75H980.951L983 577.472L985.049 580.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M999.049 580.75H994.951L997 577.472L999.049 580.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1013.05 580.75H1008.95L1011 577.472L1013.05 580.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1027.05 580.75H1022.95L1025 577.472L1027.05 580.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1041.05 580.75H1036.95L1039 577.472L1041.05 580.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1055.05 580.75H1050.95L1053 577.472L1055.05 580.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1069.05 580.75H1064.95L1067 577.472L1069.05 580.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1083.05 580.75H1078.95L1081 577.472L1083.05 580.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1097.05 580.75H1092.95L1095 577.472L1097.05 580.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1111.05 580.75H1106.95L1109 577.472L1111.05 580.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1125.05 580.75H1120.95L1123 577.472L1125.05 580.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1139.05 580.75H1134.95L1137 577.472L1139.05 580.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1153.05 580.75H1148.95L1151 577.472L1153.05 580.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1167.05 580.75H1162.95L1165 577.472L1167.05 580.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1181.05 580.75H1176.95L1179 577.472L1181.05 580.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1195.05 580.75H1190.95L1193 577.472L1195.05 580.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1209.05 580.75H1204.95L1207 577.472L1209.05 580.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1223.05 580.75H1218.95L1221 577.472L1223.05 580.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1237.05 580.75H1232.95L1235 577.472L1237.05 580.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1251.05 580.75H1246.95L1249 577.472L1251.05 580.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1265.05 580.75H1260.95L1263 577.472L1265.05 580.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1279.05 580.75H1274.95L1277 577.472L1279.05 580.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1293.05 580.75H1288.95L1291 577.472L1293.05 580.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1307.05 580.75H1302.95L1305 577.472L1307.05 580.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1321.05 580.75H1316.95L1319 577.472L1321.05 580.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1335.05 580.75H1330.95L1333 577.472L1335.05 580.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1349.05 580.75H1344.95L1347 577.472L1349.05 580.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1363.05 580.75H1358.95L1361 577.472L1363.05 580.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1377.05 580.75H1372.95L1375 577.472L1377.05 580.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1391.05 580.75H1386.95L1389 577.472L1391.05 580.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1405.05 580.75H1400.95L1403 577.472L1405.05 580.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1419.05 580.75H1414.95L1417 577.472L1419.05 580.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1433.05 580.75H1428.95L1431 577.472L1433.05 580.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M5.04894 596.75H0.951062L3 593.472L5.04894 596.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M19.0489 596.75H14.9511L17 593.472L19.0489 596.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M33.0489 596.75H28.9511L31 593.472L33.0489 596.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M47.0489 596.75H42.9511L45 593.472L47.0489 596.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M61.0489 596.75H56.9511L59 593.472L61.0489 596.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M75.0489 596.75H70.9511L73 593.472L75.0489 596.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M89.0489 596.75H84.9511L87 593.472L89.0489 596.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M103.049 596.75H98.9511L101 593.472L103.049 596.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M117.049 596.75H112.951L115 593.472L117.049 596.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M131.049 596.75H126.951L129 593.472L131.049 596.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M145.049 596.75H140.951L143 593.472L145.049 596.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M159.049 596.75H154.951L157 593.472L159.049 596.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M173.049 596.75H168.951L171 593.472L173.049 596.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M187.049 596.75H182.951L185 593.472L187.049 596.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M201.049 596.75H196.951L199 593.472L201.049 596.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M215.049 596.75H210.951L213 593.472L215.049 596.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M229.049 596.75H224.951L227 593.472L229.049 596.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M243.049 596.75H238.951L241 593.472L243.049 596.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M257.049 596.75H252.951L255 593.472L257.049 596.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M271.049 596.75H266.951L269 593.472L271.049 596.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M285.049 596.75H280.951L283 593.472L285.049 596.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M299.049 596.75H294.951L297 593.472L299.049 596.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M313.049 596.75H308.951L311 593.472L313.049 596.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M327.049 596.75H322.951L325 593.472L327.049 596.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M341.049 596.75H336.951L339 593.472L341.049 596.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M355.049 596.75H350.951L353 593.472L355.049 596.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M369.049 596.75H364.951L367 593.472L369.049 596.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M383.049 596.75H378.951L381 593.472L383.049 596.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M397.049 596.75H392.951L395 593.472L397.049 596.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M411.049 596.75H406.951L409 593.472L411.049 596.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M425.049 596.75H420.951L423 593.472L425.049 596.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M439.049 596.75H434.951L437 593.472L439.049 596.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M453.049 596.75H448.951L451 593.472L453.049 596.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M467.049 596.75H462.951L465 593.472L467.049 596.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M481.049 596.75H476.951L479 593.472L481.049 596.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M495.049 596.75H490.951L493 593.472L495.049 596.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M509.049 596.75H504.951L507 593.472L509.049 596.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M523.049 596.75H518.951L521 593.472L523.049 596.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M537.049 596.75H532.951L535 593.472L537.049 596.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M551.049 596.75H546.951L549 593.472L551.049 596.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M565.049 596.75H560.951L563 593.472L565.049 596.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M579.049 596.75H574.951L577 593.472L579.049 596.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M593.049 596.75H588.951L591 593.472L593.049 596.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M607.049 596.75H602.951L605 593.472L607.049 596.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M621.049 596.75H616.951L619 593.472L621.049 596.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M635.049 596.75H630.951L633 593.472L635.049 596.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M649.049 596.75H644.951L647 593.472L649.049 596.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M663.049 596.75H658.951L661 593.472L663.049 596.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M677.049 596.75H672.951L675 593.472L677.049 596.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M691.049 596.75H686.951L689 593.472L691.049 596.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M705.049 596.75H700.951L703 593.472L705.049 596.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M719.049 596.75H714.951L717 593.472L719.049 596.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M733.049 596.75H728.951L731 593.472L733.049 596.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M747.049 596.75H742.951L745 593.472L747.049 596.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M761.049 596.75H756.951L759 593.472L761.049 596.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M775.049 596.75H770.951L773 593.472L775.049 596.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M789.049 596.75H784.951L787 593.472L789.049 596.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M803.049 596.75H798.951L801 593.472L803.049 596.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M817.049 596.75H812.951L815 593.472L817.049 596.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M831.049 596.75H826.951L829 593.472L831.049 596.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M845.049 596.75H840.951L843 593.472L845.049 596.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M859.049 596.75H854.951L857 593.472L859.049 596.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M873.049 596.75H868.951L871 593.472L873.049 596.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M887.049 596.75H882.951L885 593.472L887.049 596.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M901.049 596.75H896.951L899 593.472L901.049 596.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M915.049 596.75H910.951L913 593.472L915.049 596.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M929.049 596.75H924.951L927 593.472L929.049 596.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M943.049 596.75H938.951L941 593.472L943.049 596.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M957.049 596.75H952.951L955 593.472L957.049 596.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M971.049 596.75H966.951L969 593.472L971.049 596.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M985.049 596.75H980.951L983 593.472L985.049 596.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M999.049 596.75H994.951L997 593.472L999.049 596.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1013.05 596.75H1008.95L1011 593.472L1013.05 596.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1027.05 596.75H1022.95L1025 593.472L1027.05 596.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1041.05 596.75H1036.95L1039 593.472L1041.05 596.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1055.05 596.75H1050.95L1053 593.472L1055.05 596.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1069.05 596.75H1064.95L1067 593.472L1069.05 596.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1083.05 596.75H1078.95L1081 593.472L1083.05 596.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1097.05 596.75H1092.95L1095 593.472L1097.05 596.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1111.05 596.75H1106.95L1109 593.472L1111.05 596.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1125.05 596.75H1120.95L1123 593.472L1125.05 596.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1139.05 596.75H1134.95L1137 593.472L1139.05 596.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1153.05 596.75H1148.95L1151 593.472L1153.05 596.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1167.05 596.75H1162.95L1165 593.472L1167.05 596.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1181.05 596.75H1176.95L1179 593.472L1181.05 596.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1195.05 596.75H1190.95L1193 593.472L1195.05 596.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1209.05 596.75H1204.95L1207 593.472L1209.05 596.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1223.05 596.75H1218.95L1221 593.472L1223.05 596.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1237.05 596.75H1232.95L1235 593.472L1237.05 596.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1251.05 596.75H1246.95L1249 593.472L1251.05 596.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1265.05 596.75H1260.95L1263 593.472L1265.05 596.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1279.05 596.75H1274.95L1277 593.472L1279.05 596.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1293.05 596.75H1288.95L1291 593.472L1293.05 596.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1307.05 596.75H1302.95L1305 593.472L1307.05 596.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1321.05 596.75H1316.95L1319 593.472L1321.05 596.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1335.05 596.75H1330.95L1333 593.472L1335.05 596.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1349.05 596.75H1344.95L1347 593.472L1349.05 596.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1363.05 596.75H1358.95L1361 593.472L1363.05 596.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1377.05 596.75H1372.95L1375 593.472L1377.05 596.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1391.05 596.75H1386.95L1389 593.472L1391.05 596.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1405.05 596.75H1400.95L1403 593.472L1405.05 596.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1419.05 596.75H1414.95L1417 593.472L1419.05 596.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1433.05 596.75H1428.95L1431 593.472L1433.05 596.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M5.04894 612.75H0.951062L3 609.472L5.04894 612.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M19.0489 612.75H14.9511L17 609.472L19.0489 612.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M33.0489 612.75H28.9511L31 609.472L33.0489 612.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M47.0489 612.75H42.9511L45 609.472L47.0489 612.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M61.0489 612.75H56.9511L59 609.472L61.0489 612.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M75.0489 612.75H70.9511L73 609.472L75.0489 612.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M89.0489 612.75H84.9511L87 609.472L89.0489 612.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M103.049 612.75H98.9511L101 609.472L103.049 612.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M117.049 612.75H112.951L115 609.472L117.049 612.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M131.049 612.75H126.951L129 609.472L131.049 612.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M145.049 612.75H140.951L143 609.472L145.049 612.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M159.049 612.75H154.951L157 609.472L159.049 612.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M173.049 612.75H168.951L171 609.472L173.049 612.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M187.049 612.75H182.951L185 609.472L187.049 612.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M201.049 612.75H196.951L199 609.472L201.049 612.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M215.049 612.75H210.951L213 609.472L215.049 612.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M229.049 612.75H224.951L227 609.472L229.049 612.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M243.049 612.75H238.951L241 609.472L243.049 612.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M257.049 612.75H252.951L255 609.472L257.049 612.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M271.049 612.75H266.951L269 609.472L271.049 612.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M285.049 612.75H280.951L283 609.472L285.049 612.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M299.049 612.75H294.951L297 609.472L299.049 612.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M313.049 612.75H308.951L311 609.472L313.049 612.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M327.049 612.75H322.951L325 609.472L327.049 612.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M341.049 612.75H336.951L339 609.472L341.049 612.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M355.049 612.75H350.951L353 609.472L355.049 612.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M369.049 612.75H364.951L367 609.472L369.049 612.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M383.049 612.75H378.951L381 609.472L383.049 612.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M397.049 612.75H392.951L395 609.472L397.049 612.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M411.049 612.75H406.951L409 609.472L411.049 612.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M425.049 612.75H420.951L423 609.472L425.049 612.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M439.049 612.75H434.951L437 609.472L439.049 612.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M453.049 612.75H448.951L451 609.472L453.049 612.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M467.049 612.75H462.951L465 609.472L467.049 612.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M481.049 612.75H476.951L479 609.472L481.049 612.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M495.049 612.75H490.951L493 609.472L495.049 612.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M509.049 612.75H504.951L507 609.472L509.049 612.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M523.049 612.75H518.951L521 609.472L523.049 612.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M537.049 612.75H532.951L535 609.472L537.049 612.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M551.049 612.75H546.951L549 609.472L551.049 612.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M565.049 612.75H560.951L563 609.472L565.049 612.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M579.049 612.75H574.951L577 609.472L579.049 612.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M593.049 612.75H588.951L591 609.472L593.049 612.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M607.049 612.75H602.951L605 609.472L607.049 612.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M621.049 612.75H616.951L619 609.472L621.049 612.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M635.049 612.75H630.951L633 609.472L635.049 612.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M649.049 612.75H644.951L647 609.472L649.049 612.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M663.049 612.75H658.951L661 609.472L663.049 612.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M677.049 612.75H672.951L675 609.472L677.049 612.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M691.049 612.75H686.951L689 609.472L691.049 612.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M705.049 612.75H700.951L703 609.472L705.049 612.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M719.049 612.75H714.951L717 609.472L719.049 612.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M733.049 612.75H728.951L731 609.472L733.049 612.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M747.049 612.75H742.951L745 609.472L747.049 612.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M761.049 612.75H756.951L759 609.472L761.049 612.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M775.049 612.75H770.951L773 609.472L775.049 612.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M789.049 612.75H784.951L787 609.472L789.049 612.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M803.049 612.75H798.951L801 609.472L803.049 612.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M817.049 612.75H812.951L815 609.472L817.049 612.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M831.049 612.75H826.951L829 609.472L831.049 612.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M845.049 612.75H840.951L843 609.472L845.049 612.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M859.049 612.75H854.951L857 609.472L859.049 612.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M873.049 612.75H868.951L871 609.472L873.049 612.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M887.049 612.75H882.951L885 609.472L887.049 612.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M901.049 612.75H896.951L899 609.472L901.049 612.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M915.049 612.75H910.951L913 609.472L915.049 612.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M929.049 612.75H924.951L927 609.472L929.049 612.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M943.049 612.75H938.951L941 609.472L943.049 612.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M957.049 612.75H952.951L955 609.472L957.049 612.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M971.049 612.75H966.951L969 609.472L971.049 612.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M985.049 612.75H980.951L983 609.472L985.049 612.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M999.049 612.75H994.951L997 609.472L999.049 612.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1013.05 612.75H1008.95L1011 609.472L1013.05 612.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1027.05 612.75H1022.95L1025 609.472L1027.05 612.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1041.05 612.75H1036.95L1039 609.472L1041.05 612.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1055.05 612.75H1050.95L1053 609.472L1055.05 612.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1069.05 612.75H1064.95L1067 609.472L1069.05 612.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1083.05 612.75H1078.95L1081 609.472L1083.05 612.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1097.05 612.75H1092.95L1095 609.472L1097.05 612.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1111.05 612.75H1106.95L1109 609.472L1111.05 612.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1125.05 612.75H1120.95L1123 609.472L1125.05 612.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1139.05 612.75H1134.95L1137 609.472L1139.05 612.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1153.05 612.75H1148.95L1151 609.472L1153.05 612.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1167.05 612.75H1162.95L1165 609.472L1167.05 612.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1181.05 612.75H1176.95L1179 609.472L1181.05 612.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1195.05 612.75H1190.95L1193 609.472L1195.05 612.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1209.05 612.75H1204.95L1207 609.472L1209.05 612.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1223.05 612.75H1218.95L1221 609.472L1223.05 612.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1237.05 612.75H1232.95L1235 609.472L1237.05 612.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1251.05 612.75H1246.95L1249 609.472L1251.05 612.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1265.05 612.75H1260.95L1263 609.472L1265.05 612.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1279.05 612.75H1274.95L1277 609.472L1279.05 612.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1293.05 612.75H1288.95L1291 609.472L1293.05 612.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1307.05 612.75H1302.95L1305 609.472L1307.05 612.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1321.05 612.75H1316.95L1319 609.472L1321.05 612.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1335.05 612.75H1330.95L1333 609.472L1335.05 612.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1349.05 612.75H1344.95L1347 609.472L1349.05 612.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1363.05 612.75H1358.95L1361 609.472L1363.05 612.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1377.05 612.75H1372.95L1375 609.472L1377.05 612.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1391.05 612.75H1386.95L1389 609.472L1391.05 612.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1405.05 612.75H1400.95L1403 609.472L1405.05 612.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1419.05 612.75H1414.95L1417 609.472L1419.05 612.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1433.05 612.75H1428.95L1431 609.472L1433.05 612.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M5.04894 628.75H0.951062L3 625.472L5.04894 628.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M19.0489 628.75H14.9511L17 625.472L19.0489 628.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M33.0489 628.75H28.9511L31 625.472L33.0489 628.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M47.0489 628.75H42.9511L45 625.472L47.0489 628.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M61.0489 628.75H56.9511L59 625.472L61.0489 628.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M75.0489 628.75H70.9511L73 625.472L75.0489 628.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M89.0489 628.75H84.9511L87 625.472L89.0489 628.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M103.049 628.75H98.9511L101 625.472L103.049 628.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M117.049 628.75H112.951L115 625.472L117.049 628.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M131.049 628.75H126.951L129 625.472L131.049 628.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M145.049 628.75H140.951L143 625.472L145.049 628.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M159.049 628.75H154.951L157 625.472L159.049 628.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M173.049 628.75H168.951L171 625.472L173.049 628.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M187.049 628.75H182.951L185 625.472L187.049 628.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M201.049 628.75H196.951L199 625.472L201.049 628.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M215.049 628.75H210.951L213 625.472L215.049 628.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M229.049 628.75H224.951L227 625.472L229.049 628.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M243.049 628.75H238.951L241 625.472L243.049 628.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M257.049 628.75H252.951L255 625.472L257.049 628.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M271.049 628.75H266.951L269 625.472L271.049 628.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M285.049 628.75H280.951L283 625.472L285.049 628.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M299.049 628.75H294.951L297 625.472L299.049 628.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M313.049 628.75H308.951L311 625.472L313.049 628.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M327.049 628.75H322.951L325 625.472L327.049 628.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M341.049 628.75H336.951L339 625.472L341.049 628.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M355.049 628.75H350.951L353 625.472L355.049 628.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M369.049 628.75H364.951L367 625.472L369.049 628.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M383.049 628.75H378.951L381 625.472L383.049 628.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M397.049 628.75H392.951L395 625.472L397.049 628.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M411.049 628.75H406.951L409 625.472L411.049 628.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M425.049 628.75H420.951L423 625.472L425.049 628.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M439.049 628.75H434.951L437 625.472L439.049 628.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M453.049 628.75H448.951L451 625.472L453.049 628.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M467.049 628.75H462.951L465 625.472L467.049 628.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M481.049 628.75H476.951L479 625.472L481.049 628.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M495.049 628.75H490.951L493 625.472L495.049 628.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M509.049 628.75H504.951L507 625.472L509.049 628.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M523.049 628.75H518.951L521 625.472L523.049 628.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M537.049 628.75H532.951L535 625.472L537.049 628.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M551.049 628.75H546.951L549 625.472L551.049 628.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M565.049 628.75H560.951L563 625.472L565.049 628.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M579.049 628.75H574.951L577 625.472L579.049 628.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M593.049 628.75H588.951L591 625.472L593.049 628.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M607.049 628.75H602.951L605 625.472L607.049 628.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M621.049 628.75H616.951L619 625.472L621.049 628.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M635.049 628.75H630.951L633 625.472L635.049 628.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M649.049 628.75H644.951L647 625.472L649.049 628.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M663.049 628.75H658.951L661 625.472L663.049 628.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M677.049 628.75H672.951L675 625.472L677.049 628.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M691.049 628.75H686.951L689 625.472L691.049 628.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M705.049 628.75H700.951L703 625.472L705.049 628.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M719.049 628.75H714.951L717 625.472L719.049 628.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M733.049 628.75H728.951L731 625.472L733.049 628.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M747.049 628.75H742.951L745 625.472L747.049 628.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M761.049 628.75H756.951L759 625.472L761.049 628.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M775.049 628.75H770.951L773 625.472L775.049 628.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M789.049 628.75H784.951L787 625.472L789.049 628.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M803.049 628.75H798.951L801 625.472L803.049 628.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M817.049 628.75H812.951L815 625.472L817.049 628.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M831.049 628.75H826.951L829 625.472L831.049 628.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M845.049 628.75H840.951L843 625.472L845.049 628.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M859.049 628.75H854.951L857 625.472L859.049 628.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M873.049 628.75H868.951L871 625.472L873.049 628.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M887.049 628.75H882.951L885 625.472L887.049 628.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M901.049 628.75H896.951L899 625.472L901.049 628.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M915.049 628.75H910.951L913 625.472L915.049 628.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M929.049 628.75H924.951L927 625.472L929.049 628.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M943.049 628.75H938.951L941 625.472L943.049 628.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M957.049 628.75H952.951L955 625.472L957.049 628.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M971.049 628.75H966.951L969 625.472L971.049 628.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M985.049 628.75H980.951L983 625.472L985.049 628.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M999.049 628.75H994.951L997 625.472L999.049 628.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1013.05 628.75H1008.95L1011 625.472L1013.05 628.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1027.05 628.75H1022.95L1025 625.472L1027.05 628.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1041.05 628.75H1036.95L1039 625.472L1041.05 628.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1055.05 628.75H1050.95L1053 625.472L1055.05 628.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1069.05 628.75H1064.95L1067 625.472L1069.05 628.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1083.05 628.75H1078.95L1081 625.472L1083.05 628.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1097.05 628.75H1092.95L1095 625.472L1097.05 628.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1111.05 628.75H1106.95L1109 625.472L1111.05 628.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1125.05 628.75H1120.95L1123 625.472L1125.05 628.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1139.05 628.75H1134.95L1137 625.472L1139.05 628.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1153.05 628.75H1148.95L1151 625.472L1153.05 628.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1167.05 628.75H1162.95L1165 625.472L1167.05 628.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1181.05 628.75H1176.95L1179 625.472L1181.05 628.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1195.05 628.75H1190.95L1193 625.472L1195.05 628.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1209.05 628.75H1204.95L1207 625.472L1209.05 628.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1223.05 628.75H1218.95L1221 625.472L1223.05 628.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1237.05 628.75H1232.95L1235 625.472L1237.05 628.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1251.05 628.75H1246.95L1249 625.472L1251.05 628.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1265.05 628.75H1260.95L1263 625.472L1265.05 628.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1279.05 628.75H1274.95L1277 625.472L1279.05 628.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1293.05 628.75H1288.95L1291 625.472L1293.05 628.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1307.05 628.75H1302.95L1305 625.472L1307.05 628.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1321.05 628.75H1316.95L1319 625.472L1321.05 628.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1335.05 628.75H1330.95L1333 625.472L1335.05 628.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1349.05 628.75H1344.95L1347 625.472L1349.05 628.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1363.05 628.75H1358.95L1361 625.472L1363.05 628.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1377.05 628.75H1372.95L1375 625.472L1377.05 628.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1391.05 628.75H1386.95L1389 625.472L1391.05 628.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1405.05 628.75H1400.95L1403 625.472L1405.05 628.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1419.05 628.75H1414.95L1417 625.472L1419.05 628.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1433.05 628.75H1428.95L1431 625.472L1433.05 628.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M5.04894 644.75H0.951062L3 641.472L5.04894 644.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M19.0489 644.75H14.9511L17 641.472L19.0489 644.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M33.0489 644.75H28.9511L31 641.472L33.0489 644.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M47.0489 644.75H42.9511L45 641.472L47.0489 644.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M61.0489 644.75H56.9511L59 641.472L61.0489 644.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M75.0489 644.75H70.9511L73 641.472L75.0489 644.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M89.0489 644.75H84.9511L87 641.472L89.0489 644.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M103.049 644.75H98.9511L101 641.472L103.049 644.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M117.049 644.75H112.951L115 641.472L117.049 644.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M131.049 644.75H126.951L129 641.472L131.049 644.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M145.049 644.75H140.951L143 641.472L145.049 644.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M159.049 644.75H154.951L157 641.472L159.049 644.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M173.049 644.75H168.951L171 641.472L173.049 644.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M187.049 644.75H182.951L185 641.472L187.049 644.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M201.049 644.75H196.951L199 641.472L201.049 644.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M215.049 644.75H210.951L213 641.472L215.049 644.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M229.049 644.75H224.951L227 641.472L229.049 644.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M243.049 644.75H238.951L241 641.472L243.049 644.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M257.049 644.75H252.951L255 641.472L257.049 644.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M271.049 644.75H266.951L269 641.472L271.049 644.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M285.049 644.75H280.951L283 641.472L285.049 644.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M299.049 644.75H294.951L297 641.472L299.049 644.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M313.049 644.75H308.951L311 641.472L313.049 644.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M327.049 644.75H322.951L325 641.472L327.049 644.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M341.049 644.75H336.951L339 641.472L341.049 644.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M355.049 644.75H350.951L353 641.472L355.049 644.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M369.049 644.75H364.951L367 641.472L369.049 644.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M383.049 644.75H378.951L381 641.472L383.049 644.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M397.049 644.75H392.951L395 641.472L397.049 644.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M411.049 644.75H406.951L409 641.472L411.049 644.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M425.049 644.75H420.951L423 641.472L425.049 644.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M439.049 644.75H434.951L437 641.472L439.049 644.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M453.049 644.75H448.951L451 641.472L453.049 644.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M467.049 644.75H462.951L465 641.472L467.049 644.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M481.049 644.75H476.951L479 641.472L481.049 644.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M495.049 644.75H490.951L493 641.472L495.049 644.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M509.049 644.75H504.951L507 641.472L509.049 644.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M523.049 644.75H518.951L521 641.472L523.049 644.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M537.049 644.75H532.951L535 641.472L537.049 644.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M551.049 644.75H546.951L549 641.472L551.049 644.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M565.049 644.75H560.951L563 641.472L565.049 644.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M579.049 644.75H574.951L577 641.472L579.049 644.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M593.049 644.75H588.951L591 641.472L593.049 644.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M607.049 644.75H602.951L605 641.472L607.049 644.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M621.049 644.75H616.951L619 641.472L621.049 644.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M635.049 644.75H630.951L633 641.472L635.049 644.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M649.049 644.75H644.951L647 641.472L649.049 644.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M663.049 644.75H658.951L661 641.472L663.049 644.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M677.049 644.75H672.951L675 641.472L677.049 644.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M691.049 644.75H686.951L689 641.472L691.049 644.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M705.049 644.75H700.951L703 641.472L705.049 644.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M719.049 644.75H714.951L717 641.472L719.049 644.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M733.049 644.75H728.951L731 641.472L733.049 644.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M747.049 644.75H742.951L745 641.472L747.049 644.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M761.049 644.75H756.951L759 641.472L761.049 644.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M775.049 644.75H770.951L773 641.472L775.049 644.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M789.049 644.75H784.951L787 641.472L789.049 644.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M803.049 644.75H798.951L801 641.472L803.049 644.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M817.049 644.75H812.951L815 641.472L817.049 644.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M831.049 644.75H826.951L829 641.472L831.049 644.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M845.049 644.75H840.951L843 641.472L845.049 644.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M859.049 644.75H854.951L857 641.472L859.049 644.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M873.049 644.75H868.951L871 641.472L873.049 644.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M887.049 644.75H882.951L885 641.472L887.049 644.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M901.049 644.75H896.951L899 641.472L901.049 644.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M915.049 644.75H910.951L913 641.472L915.049 644.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M929.049 644.75H924.951L927 641.472L929.049 644.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M943.049 644.75H938.951L941 641.472L943.049 644.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M957.049 644.75H952.951L955 641.472L957.049 644.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M971.049 644.75H966.951L969 641.472L971.049 644.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M985.049 644.75H980.951L983 641.472L985.049 644.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M999.049 644.75H994.951L997 641.472L999.049 644.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1013.05 644.75H1008.95L1011 641.472L1013.05 644.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1027.05 644.75H1022.95L1025 641.472L1027.05 644.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1041.05 644.75H1036.95L1039 641.472L1041.05 644.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1055.05 644.75H1050.95L1053 641.472L1055.05 644.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1069.05 644.75H1064.95L1067 641.472L1069.05 644.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1083.05 644.75H1078.95L1081 641.472L1083.05 644.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1097.05 644.75H1092.95L1095 641.472L1097.05 644.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1111.05 644.75H1106.95L1109 641.472L1111.05 644.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1125.05 644.75H1120.95L1123 641.472L1125.05 644.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1139.05 644.75H1134.95L1137 641.472L1139.05 644.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1153.05 644.75H1148.95L1151 641.472L1153.05 644.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1167.05 644.75H1162.95L1165 641.472L1167.05 644.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1181.05 644.75H1176.95L1179 641.472L1181.05 644.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1195.05 644.75H1190.95L1193 641.472L1195.05 644.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1209.05 644.75H1204.95L1207 641.472L1209.05 644.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1223.05 644.75H1218.95L1221 641.472L1223.05 644.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1237.05 644.75H1232.95L1235 641.472L1237.05 644.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1251.05 644.75H1246.95L1249 641.472L1251.05 644.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1265.05 644.75H1260.95L1263 641.472L1265.05 644.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1279.05 644.75H1274.95L1277 641.472L1279.05 644.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1293.05 644.75H1288.95L1291 641.472L1293.05 644.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1307.05 644.75H1302.95L1305 641.472L1307.05 644.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1321.05 644.75H1316.95L1319 641.472L1321.05 644.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1335.05 644.75H1330.95L1333 641.472L1335.05 644.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1349.05 644.75H1344.95L1347 641.472L1349.05 644.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1363.05 644.75H1358.95L1361 641.472L1363.05 644.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1377.05 644.75H1372.95L1375 641.472L1377.05 644.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1391.05 644.75H1386.95L1389 641.472L1391.05 644.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1405.05 644.75H1400.95L1403 641.472L1405.05 644.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1419.05 644.75H1414.95L1417 641.472L1419.05 644.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1433.05 644.75H1428.95L1431 641.472L1433.05 644.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M5.04894 660.75H0.951062L3 657.472L5.04894 660.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M19.0489 660.75H14.9511L17 657.472L19.0489 660.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M33.0489 660.75H28.9511L31 657.472L33.0489 660.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M47.0489 660.75H42.9511L45 657.472L47.0489 660.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M61.0489 660.75H56.9511L59 657.472L61.0489 660.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M75.0489 660.75H70.9511L73 657.472L75.0489 660.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M89.0489 660.75H84.9511L87 657.472L89.0489 660.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M103.049 660.75H98.9511L101 657.472L103.049 660.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M117.049 660.75H112.951L115 657.472L117.049 660.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M131.049 660.75H126.951L129 657.472L131.049 660.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M145.049 660.75H140.951L143 657.472L145.049 660.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M159.049 660.75H154.951L157 657.472L159.049 660.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M173.049 660.75H168.951L171 657.472L173.049 660.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M187.049 660.75H182.951L185 657.472L187.049 660.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M201.049 660.75H196.951L199 657.472L201.049 660.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M215.049 660.75H210.951L213 657.472L215.049 660.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M229.049 660.75H224.951L227 657.472L229.049 660.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M243.049 660.75H238.951L241 657.472L243.049 660.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M257.049 660.75H252.951L255 657.472L257.049 660.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M271.049 660.75H266.951L269 657.472L271.049 660.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M285.049 660.75H280.951L283 657.472L285.049 660.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M299.049 660.75H294.951L297 657.472L299.049 660.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M313.049 660.75H308.951L311 657.472L313.049 660.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M327.049 660.75H322.951L325 657.472L327.049 660.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M341.049 660.75H336.951L339 657.472L341.049 660.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M355.049 660.75H350.951L353 657.472L355.049 660.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M369.049 660.75H364.951L367 657.472L369.049 660.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M383.049 660.75H378.951L381 657.472L383.049 660.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M397.049 660.75H392.951L395 657.472L397.049 660.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M411.049 660.75H406.951L409 657.472L411.049 660.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M425.049 660.75H420.951L423 657.472L425.049 660.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M439.049 660.75H434.951L437 657.472L439.049 660.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M453.049 660.75H448.951L451 657.472L453.049 660.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M467.049 660.75H462.951L465 657.472L467.049 660.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M481.049 660.75H476.951L479 657.472L481.049 660.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M495.049 660.75H490.951L493 657.472L495.049 660.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M509.049 660.75H504.951L507 657.472L509.049 660.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M523.049 660.75H518.951L521 657.472L523.049 660.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M537.049 660.75H532.951L535 657.472L537.049 660.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M551.049 660.75H546.951L549 657.472L551.049 660.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M565.049 660.75H560.951L563 657.472L565.049 660.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M579.049 660.75H574.951L577 657.472L579.049 660.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M593.049 660.75H588.951L591 657.472L593.049 660.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M607.049 660.75H602.951L605 657.472L607.049 660.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M621.049 660.75H616.951L619 657.472L621.049 660.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M635.049 660.75H630.951L633 657.472L635.049 660.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M649.049 660.75H644.951L647 657.472L649.049 660.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M663.049 660.75H658.951L661 657.472L663.049 660.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M677.049 660.75H672.951L675 657.472L677.049 660.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M691.049 660.75H686.951L689 657.472L691.049 660.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M705.049 660.75H700.951L703 657.472L705.049 660.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M719.049 660.75H714.951L717 657.472L719.049 660.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M733.049 660.75H728.951L731 657.472L733.049 660.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M747.049 660.75H742.951L745 657.472L747.049 660.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M761.049 660.75H756.951L759 657.472L761.049 660.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M775.049 660.75H770.951L773 657.472L775.049 660.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M789.049 660.75H784.951L787 657.472L789.049 660.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M803.049 660.75H798.951L801 657.472L803.049 660.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M817.049 660.75H812.951L815 657.472L817.049 660.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M831.049 660.75H826.951L829 657.472L831.049 660.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M845.049 660.75H840.951L843 657.472L845.049 660.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M859.049 660.75H854.951L857 657.472L859.049 660.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M873.049 660.75H868.951L871 657.472L873.049 660.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M887.049 660.75H882.951L885 657.472L887.049 660.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M901.049 660.75H896.951L899 657.472L901.049 660.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M915.049 660.75H910.951L913 657.472L915.049 660.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M929.049 660.75H924.951L927 657.472L929.049 660.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M943.049 660.75H938.951L941 657.472L943.049 660.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M957.049 660.75H952.951L955 657.472L957.049 660.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M971.049 660.75H966.951L969 657.472L971.049 660.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M985.049 660.75H980.951L983 657.472L985.049 660.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M999.049 660.75H994.951L997 657.472L999.049 660.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1013.05 660.75H1008.95L1011 657.472L1013.05 660.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1027.05 660.75H1022.95L1025 657.472L1027.05 660.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1041.05 660.75H1036.95L1039 657.472L1041.05 660.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1055.05 660.75H1050.95L1053 657.472L1055.05 660.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1069.05 660.75H1064.95L1067 657.472L1069.05 660.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1083.05 660.75H1078.95L1081 657.472L1083.05 660.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1097.05 660.75H1092.95L1095 657.472L1097.05 660.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1111.05 660.75H1106.95L1109 657.472L1111.05 660.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1125.05 660.75H1120.95L1123 657.472L1125.05 660.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1139.05 660.75H1134.95L1137 657.472L1139.05 660.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1153.05 660.75H1148.95L1151 657.472L1153.05 660.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1167.05 660.75H1162.95L1165 657.472L1167.05 660.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1181.05 660.75H1176.95L1179 657.472L1181.05 660.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1195.05 660.75H1190.95L1193 657.472L1195.05 660.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1209.05 660.75H1204.95L1207 657.472L1209.05 660.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1223.05 660.75H1218.95L1221 657.472L1223.05 660.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1237.05 660.75H1232.95L1235 657.472L1237.05 660.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1251.05 660.75H1246.95L1249 657.472L1251.05 660.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1265.05 660.75H1260.95L1263 657.472L1265.05 660.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1279.05 660.75H1274.95L1277 657.472L1279.05 660.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1293.05 660.75H1288.95L1291 657.472L1293.05 660.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1307.05 660.75H1302.95L1305 657.472L1307.05 660.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1321.05 660.75H1316.95L1319 657.472L1321.05 660.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1335.05 660.75H1330.95L1333 657.472L1335.05 660.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1349.05 660.75H1344.95L1347 657.472L1349.05 660.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1363.05 660.75H1358.95L1361 657.472L1363.05 660.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1377.05 660.75H1372.95L1375 657.472L1377.05 660.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1391.05 660.75H1386.95L1389 657.472L1391.05 660.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1405.05 660.75H1400.95L1403 657.472L1405.05 660.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1419.05 660.75H1414.95L1417 657.472L1419.05 660.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1433.05 660.75H1428.95L1431 657.472L1433.05 660.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M5.04894 676.75H0.951062L3 673.472L5.04894 676.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M19.0489 676.75H14.9511L17 673.472L19.0489 676.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M33.0489 676.75H28.9511L31 673.472L33.0489 676.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M47.0489 676.75H42.9511L45 673.472L47.0489 676.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M61.0489 676.75H56.9511L59 673.472L61.0489 676.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M75.0489 676.75H70.9511L73 673.472L75.0489 676.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M89.0489 676.75H84.9511L87 673.472L89.0489 676.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M103.049 676.75H98.9511L101 673.472L103.049 676.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M117.049 676.75H112.951L115 673.472L117.049 676.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M131.049 676.75H126.951L129 673.472L131.049 676.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M145.049 676.75H140.951L143 673.472L145.049 676.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M159.049 676.75H154.951L157 673.472L159.049 676.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M173.049 676.75H168.951L171 673.472L173.049 676.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M187.049 676.75H182.951L185 673.472L187.049 676.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M201.049 676.75H196.951L199 673.472L201.049 676.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M215.049 676.75H210.951L213 673.472L215.049 676.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M229.049 676.75H224.951L227 673.472L229.049 676.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M243.049 676.75H238.951L241 673.472L243.049 676.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M257.049 676.75H252.951L255 673.472L257.049 676.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M271.049 676.75H266.951L269 673.472L271.049 676.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M285.049 676.75H280.951L283 673.472L285.049 676.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M299.049 676.75H294.951L297 673.472L299.049 676.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M313.049 676.75H308.951L311 673.472L313.049 676.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M327.049 676.75H322.951L325 673.472L327.049 676.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M341.049 676.75H336.951L339 673.472L341.049 676.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M355.049 676.75H350.951L353 673.472L355.049 676.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M369.049 676.75H364.951L367 673.472L369.049 676.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M383.049 676.75H378.951L381 673.472L383.049 676.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M397.049 676.75H392.951L395 673.472L397.049 676.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M411.049 676.75H406.951L409 673.472L411.049 676.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M425.049 676.75H420.951L423 673.472L425.049 676.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M439.049 676.75H434.951L437 673.472L439.049 676.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M453.049 676.75H448.951L451 673.472L453.049 676.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M467.049 676.75H462.951L465 673.472L467.049 676.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M481.049 676.75H476.951L479 673.472L481.049 676.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M495.049 676.75H490.951L493 673.472L495.049 676.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M509.049 676.75H504.951L507 673.472L509.049 676.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M523.049 676.75H518.951L521 673.472L523.049 676.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M537.049 676.75H532.951L535 673.472L537.049 676.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M551.049 676.75H546.951L549 673.472L551.049 676.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M565.049 676.75H560.951L563 673.472L565.049 676.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M579.049 676.75H574.951L577 673.472L579.049 676.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M593.049 676.75H588.951L591 673.472L593.049 676.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M607.049 676.75H602.951L605 673.472L607.049 676.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M621.049 676.75H616.951L619 673.472L621.049 676.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M635.049 676.75H630.951L633 673.472L635.049 676.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M649.049 676.75H644.951L647 673.472L649.049 676.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M663.049 676.75H658.951L661 673.472L663.049 676.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M677.049 676.75H672.951L675 673.472L677.049 676.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M691.049 676.75H686.951L689 673.472L691.049 676.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M705.049 676.75H700.951L703 673.472L705.049 676.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M719.049 676.75H714.951L717 673.472L719.049 676.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M733.049 676.75H728.951L731 673.472L733.049 676.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M747.049 676.75H742.951L745 673.472L747.049 676.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M761.049 676.75H756.951L759 673.472L761.049 676.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M775.049 676.75H770.951L773 673.472L775.049 676.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M789.049 676.75H784.951L787 673.472L789.049 676.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M803.049 676.75H798.951L801 673.472L803.049 676.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M817.049 676.75H812.951L815 673.472L817.049 676.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M831.049 676.75H826.951L829 673.472L831.049 676.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M845.049 676.75H840.951L843 673.472L845.049 676.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M859.049 676.75H854.951L857 673.472L859.049 676.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M873.049 676.75H868.951L871 673.472L873.049 676.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M887.049 676.75H882.951L885 673.472L887.049 676.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M901.049 676.75H896.951L899 673.472L901.049 676.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M915.049 676.75H910.951L913 673.472L915.049 676.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M929.049 676.75H924.951L927 673.472L929.049 676.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M943.049 676.75H938.951L941 673.472L943.049 676.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M957.049 676.75H952.951L955 673.472L957.049 676.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M971.049 676.75H966.951L969 673.472L971.049 676.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M985.049 676.75H980.951L983 673.472L985.049 676.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M999.049 676.75H994.951L997 673.472L999.049 676.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1013.05 676.75H1008.95L1011 673.472L1013.05 676.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1027.05 676.75H1022.95L1025 673.472L1027.05 676.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1041.05 676.75H1036.95L1039 673.472L1041.05 676.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1055.05 676.75H1050.95L1053 673.472L1055.05 676.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1069.05 676.75H1064.95L1067 673.472L1069.05 676.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1083.05 676.75H1078.95L1081 673.472L1083.05 676.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1097.05 676.75H1092.95L1095 673.472L1097.05 676.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1111.05 676.75H1106.95L1109 673.472L1111.05 676.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1125.05 676.75H1120.95L1123 673.472L1125.05 676.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1139.05 676.75H1134.95L1137 673.472L1139.05 676.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1153.05 676.75H1148.95L1151 673.472L1153.05 676.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1167.05 676.75H1162.95L1165 673.472L1167.05 676.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1181.05 676.75H1176.95L1179 673.472L1181.05 676.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1195.05 676.75H1190.95L1193 673.472L1195.05 676.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1209.05 676.75H1204.95L1207 673.472L1209.05 676.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1223.05 676.75H1218.95L1221 673.472L1223.05 676.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1237.05 676.75H1232.95L1235 673.472L1237.05 676.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1251.05 676.75H1246.95L1249 673.472L1251.05 676.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1265.05 676.75H1260.95L1263 673.472L1265.05 676.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1279.05 676.75H1274.95L1277 673.472L1279.05 676.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1293.05 676.75H1288.95L1291 673.472L1293.05 676.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1307.05 676.75H1302.95L1305 673.472L1307.05 676.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1321.05 676.75H1316.95L1319 673.472L1321.05 676.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1335.05 676.75H1330.95L1333 673.472L1335.05 676.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1349.05 676.75H1344.95L1347 673.472L1349.05 676.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1363.05 676.75H1358.95L1361 673.472L1363.05 676.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1377.05 676.75H1372.95L1375 673.472L1377.05 676.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1391.05 676.75H1386.95L1389 673.472L1391.05 676.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1405.05 676.75H1400.95L1403 673.472L1405.05 676.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1419.05 676.75H1414.95L1417 673.472L1419.05 676.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1433.05 676.75H1428.95L1431 673.472L1433.05 676.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M5.04894 692.75H0.951062L3 689.472L5.04894 692.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M19.0489 692.75H14.9511L17 689.472L19.0489 692.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M33.0489 692.75H28.9511L31 689.472L33.0489 692.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M47.0489 692.75H42.9511L45 689.472L47.0489 692.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M61.0489 692.75H56.9511L59 689.472L61.0489 692.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M75.0489 692.75H70.9511L73 689.472L75.0489 692.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M89.0489 692.75H84.9511L87 689.472L89.0489 692.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M103.049 692.75H98.9511L101 689.472L103.049 692.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M117.049 692.75H112.951L115 689.472L117.049 692.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M131.049 692.75H126.951L129 689.472L131.049 692.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M145.049 692.75H140.951L143 689.472L145.049 692.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M159.049 692.75H154.951L157 689.472L159.049 692.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M173.049 692.75H168.951L171 689.472L173.049 692.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M187.049 692.75H182.951L185 689.472L187.049 692.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M201.049 692.75H196.951L199 689.472L201.049 692.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M215.049 692.75H210.951L213 689.472L215.049 692.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M229.049 692.75H224.951L227 689.472L229.049 692.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M243.049 692.75H238.951L241 689.472L243.049 692.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M257.049 692.75H252.951L255 689.472L257.049 692.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M271.049 692.75H266.951L269 689.472L271.049 692.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M285.049 692.75H280.951L283 689.472L285.049 692.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M299.049 692.75H294.951L297 689.472L299.049 692.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M313.049 692.75H308.951L311 689.472L313.049 692.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M327.049 692.75H322.951L325 689.472L327.049 692.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M341.049 692.75H336.951L339 689.472L341.049 692.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M355.049 692.75H350.951L353 689.472L355.049 692.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M369.049 692.75H364.951L367 689.472L369.049 692.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M383.049 692.75H378.951L381 689.472L383.049 692.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M397.049 692.75H392.951L395 689.472L397.049 692.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M411.049 692.75H406.951L409 689.472L411.049 692.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M425.049 692.75H420.951L423 689.472L425.049 692.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M439.049 692.75H434.951L437 689.472L439.049 692.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M453.049 692.75H448.951L451 689.472L453.049 692.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M467.049 692.75H462.951L465 689.472L467.049 692.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M481.049 692.75H476.951L479 689.472L481.049 692.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M495.049 692.75H490.951L493 689.472L495.049 692.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M509.049 692.75H504.951L507 689.472L509.049 692.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M523.049 692.75H518.951L521 689.472L523.049 692.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M537.049 692.75H532.951L535 689.472L537.049 692.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M551.049 692.75H546.951L549 689.472L551.049 692.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M565.049 692.75H560.951L563 689.472L565.049 692.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M579.049 692.75H574.951L577 689.472L579.049 692.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M593.049 692.75H588.951L591 689.472L593.049 692.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M607.049 692.75H602.951L605 689.472L607.049 692.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M621.049 692.75H616.951L619 689.472L621.049 692.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M635.049 692.75H630.951L633 689.472L635.049 692.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M649.049 692.75H644.951L647 689.472L649.049 692.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M663.049 692.75H658.951L661 689.472L663.049 692.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M677.049 692.75H672.951L675 689.472L677.049 692.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M691.049 692.75H686.951L689 689.472L691.049 692.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M705.049 692.75H700.951L703 689.472L705.049 692.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M719.049 692.75H714.951L717 689.472L719.049 692.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M733.049 692.75H728.951L731 689.472L733.049 692.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M747.049 692.75H742.951L745 689.472L747.049 692.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M761.049 692.75H756.951L759 689.472L761.049 692.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M775.049 692.75H770.951L773 689.472L775.049 692.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M789.049 692.75H784.951L787 689.472L789.049 692.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M803.049 692.75H798.951L801 689.472L803.049 692.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M817.049 692.75H812.951L815 689.472L817.049 692.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M831.049 692.75H826.951L829 689.472L831.049 692.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M845.049 692.75H840.951L843 689.472L845.049 692.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M859.049 692.75H854.951L857 689.472L859.049 692.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M873.049 692.75H868.951L871 689.472L873.049 692.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M887.049 692.75H882.951L885 689.472L887.049 692.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M901.049 692.75H896.951L899 689.472L901.049 692.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M915.049 692.75H910.951L913 689.472L915.049 692.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M929.049 692.75H924.951L927 689.472L929.049 692.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M943.049 692.75H938.951L941 689.472L943.049 692.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M957.049 692.75H952.951L955 689.472L957.049 692.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M971.049 692.75H966.951L969 689.472L971.049 692.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M985.049 692.75H980.951L983 689.472L985.049 692.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M999.049 692.75H994.951L997 689.472L999.049 692.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1013.05 692.75H1008.95L1011 689.472L1013.05 692.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1027.05 692.75H1022.95L1025 689.472L1027.05 692.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1041.05 692.75H1036.95L1039 689.472L1041.05 692.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1055.05 692.75H1050.95L1053 689.472L1055.05 692.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1069.05 692.75H1064.95L1067 689.472L1069.05 692.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1083.05 692.75H1078.95L1081 689.472L1083.05 692.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1097.05 692.75H1092.95L1095 689.472L1097.05 692.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1111.05 692.75H1106.95L1109 689.472L1111.05 692.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1125.05 692.75H1120.95L1123 689.472L1125.05 692.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1139.05 692.75H1134.95L1137 689.472L1139.05 692.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1153.05 692.75H1148.95L1151 689.472L1153.05 692.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1167.05 692.75H1162.95L1165 689.472L1167.05 692.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1181.05 692.75H1176.95L1179 689.472L1181.05 692.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1195.05 692.75H1190.95L1193 689.472L1195.05 692.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1209.05 692.75H1204.95L1207 689.472L1209.05 692.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1223.05 692.75H1218.95L1221 689.472L1223.05 692.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1237.05 692.75H1232.95L1235 689.472L1237.05 692.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1251.05 692.75H1246.95L1249 689.472L1251.05 692.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1265.05 692.75H1260.95L1263 689.472L1265.05 692.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1279.05 692.75H1274.95L1277 689.472L1279.05 692.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1293.05 692.75H1288.95L1291 689.472L1293.05 692.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1307.05 692.75H1302.95L1305 689.472L1307.05 692.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1321.05 692.75H1316.95L1319 689.472L1321.05 692.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1335.05 692.75H1330.95L1333 689.472L1335.05 692.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1349.05 692.75H1344.95L1347 689.472L1349.05 692.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1363.05 692.75H1358.95L1361 689.472L1363.05 692.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1377.05 692.75H1372.95L1375 689.472L1377.05 692.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1391.05 692.75H1386.95L1389 689.472L1391.05 692.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1405.05 692.75H1400.95L1403 689.472L1405.05 692.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1419.05 692.75H1414.95L1417 689.472L1419.05 692.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1433.05 692.75H1428.95L1431 689.472L1433.05 692.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M5.04894 708.75H0.951062L3 705.472L5.04894 708.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M19.0489 708.75H14.9511L17 705.472L19.0489 708.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M33.0489 708.75H28.9511L31 705.472L33.0489 708.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M47.0489 708.75H42.9511L45 705.472L47.0489 708.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M61.0489 708.75H56.9511L59 705.472L61.0489 708.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M75.0489 708.75H70.9511L73 705.472L75.0489 708.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M89.0489 708.75H84.9511L87 705.472L89.0489 708.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M103.049 708.75H98.9511L101 705.472L103.049 708.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M117.049 708.75H112.951L115 705.472L117.049 708.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M131.049 708.75H126.951L129 705.472L131.049 708.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M145.049 708.75H140.951L143 705.472L145.049 708.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M159.049 708.75H154.951L157 705.472L159.049 708.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M173.049 708.75H168.951L171 705.472L173.049 708.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M187.049 708.75H182.951L185 705.472L187.049 708.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M201.049 708.75H196.951L199 705.472L201.049 708.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M215.049 708.75H210.951L213 705.472L215.049 708.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M229.049 708.75H224.951L227 705.472L229.049 708.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M243.049 708.75H238.951L241 705.472L243.049 708.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M257.049 708.75H252.951L255 705.472L257.049 708.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M271.049 708.75H266.951L269 705.472L271.049 708.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M285.049 708.75H280.951L283 705.472L285.049 708.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M299.049 708.75H294.951L297 705.472L299.049 708.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M313.049 708.75H308.951L311 705.472L313.049 708.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M327.049 708.75H322.951L325 705.472L327.049 708.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M341.049 708.75H336.951L339 705.472L341.049 708.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M355.049 708.75H350.951L353 705.472L355.049 708.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M369.049 708.75H364.951L367 705.472L369.049 708.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M383.049 708.75H378.951L381 705.472L383.049 708.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M397.049 708.75H392.951L395 705.472L397.049 708.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M411.049 708.75H406.951L409 705.472L411.049 708.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M425.049 708.75H420.951L423 705.472L425.049 708.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M439.049 708.75H434.951L437 705.472L439.049 708.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M453.049 708.75H448.951L451 705.472L453.049 708.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M467.049 708.75H462.951L465 705.472L467.049 708.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M481.049 708.75H476.951L479 705.472L481.049 708.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M495.049 708.75H490.951L493 705.472L495.049 708.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M509.049 708.75H504.951L507 705.472L509.049 708.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M523.049 708.75H518.951L521 705.472L523.049 708.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M537.049 708.75H532.951L535 705.472L537.049 708.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M551.049 708.75H546.951L549 705.472L551.049 708.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M565.049 708.75H560.951L563 705.472L565.049 708.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M579.049 708.75H574.951L577 705.472L579.049 708.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M593.049 708.75H588.951L591 705.472L593.049 708.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M607.049 708.75H602.951L605 705.472L607.049 708.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M621.049 708.75H616.951L619 705.472L621.049 708.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M635.049 708.75H630.951L633 705.472L635.049 708.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M649.049 708.75H644.951L647 705.472L649.049 708.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M663.049 708.75H658.951L661 705.472L663.049 708.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M677.049 708.75H672.951L675 705.472L677.049 708.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M691.049 708.75H686.951L689 705.472L691.049 708.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M705.049 708.75H700.951L703 705.472L705.049 708.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M719.049 708.75H714.951L717 705.472L719.049 708.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M733.049 708.75H728.951L731 705.472L733.049 708.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M747.049 708.75H742.951L745 705.472L747.049 708.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M761.049 708.75H756.951L759 705.472L761.049 708.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M775.049 708.75H770.951L773 705.472L775.049 708.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M789.049 708.75H784.951L787 705.472L789.049 708.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M803.049 708.75H798.951L801 705.472L803.049 708.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M817.049 708.75H812.951L815 705.472L817.049 708.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M831.049 708.75H826.951L829 705.472L831.049 708.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M845.049 708.75H840.951L843 705.472L845.049 708.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M859.049 708.75H854.951L857 705.472L859.049 708.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M873.049 708.75H868.951L871 705.472L873.049 708.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M887.049 708.75H882.951L885 705.472L887.049 708.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M901.049 708.75H896.951L899 705.472L901.049 708.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M915.049 708.75H910.951L913 705.472L915.049 708.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M929.049 708.75H924.951L927 705.472L929.049 708.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M943.049 708.75H938.951L941 705.472L943.049 708.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M957.049 708.75H952.951L955 705.472L957.049 708.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M971.049 708.75H966.951L969 705.472L971.049 708.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M985.049 708.75H980.951L983 705.472L985.049 708.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M999.049 708.75H994.951L997 705.472L999.049 708.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1013.05 708.75H1008.95L1011 705.472L1013.05 708.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1027.05 708.75H1022.95L1025 705.472L1027.05 708.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1041.05 708.75H1036.95L1039 705.472L1041.05 708.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1055.05 708.75H1050.95L1053 705.472L1055.05 708.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1069.05 708.75H1064.95L1067 705.472L1069.05 708.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1083.05 708.75H1078.95L1081 705.472L1083.05 708.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1097.05 708.75H1092.95L1095 705.472L1097.05 708.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1111.05 708.75H1106.95L1109 705.472L1111.05 708.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1125.05 708.75H1120.95L1123 705.472L1125.05 708.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1139.05 708.75H1134.95L1137 705.472L1139.05 708.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1153.05 708.75H1148.95L1151 705.472L1153.05 708.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1167.05 708.75H1162.95L1165 705.472L1167.05 708.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1181.05 708.75H1176.95L1179 705.472L1181.05 708.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1195.05 708.75H1190.95L1193 705.472L1195.05 708.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1209.05 708.75H1204.95L1207 705.472L1209.05 708.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1223.05 708.75H1218.95L1221 705.472L1223.05 708.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1237.05 708.75H1232.95L1235 705.472L1237.05 708.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1251.05 708.75H1246.95L1249 705.472L1251.05 708.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1265.05 708.75H1260.95L1263 705.472L1265.05 708.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1279.05 708.75H1274.95L1277 705.472L1279.05 708.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1293.05 708.75H1288.95L1291 705.472L1293.05 708.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1307.05 708.75H1302.95L1305 705.472L1307.05 708.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1321.05 708.75H1316.95L1319 705.472L1321.05 708.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1335.05 708.75H1330.95L1333 705.472L1335.05 708.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1349.05 708.75H1344.95L1347 705.472L1349.05 708.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1363.05 708.75H1358.95L1361 705.472L1363.05 708.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1377.05 708.75H1372.95L1375 705.472L1377.05 708.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1391.05 708.75H1386.95L1389 705.472L1391.05 708.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1405.05 708.75H1400.95L1403 705.472L1405.05 708.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1419.05 708.75H1414.95L1417 705.472L1419.05 708.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1433.05 708.75H1428.95L1431 705.472L1433.05 708.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M5.04894 724.75H0.951062L3 721.472L5.04894 724.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M19.0489 724.75H14.9511L17 721.472L19.0489 724.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M33.0489 724.75H28.9511L31 721.472L33.0489 724.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M47.0489 724.75H42.9511L45 721.472L47.0489 724.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M61.0489 724.75H56.9511L59 721.472L61.0489 724.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M75.0489 724.75H70.9511L73 721.472L75.0489 724.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M89.0489 724.75H84.9511L87 721.472L89.0489 724.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M103.049 724.75H98.9511L101 721.472L103.049 724.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M117.049 724.75H112.951L115 721.472L117.049 724.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M131.049 724.75H126.951L129 721.472L131.049 724.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M145.049 724.75H140.951L143 721.472L145.049 724.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M159.049 724.75H154.951L157 721.472L159.049 724.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M173.049 724.75H168.951L171 721.472L173.049 724.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M187.049 724.75H182.951L185 721.472L187.049 724.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M201.049 724.75H196.951L199 721.472L201.049 724.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M215.049 724.75H210.951L213 721.472L215.049 724.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M229.049 724.75H224.951L227 721.472L229.049 724.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M243.049 724.75H238.951L241 721.472L243.049 724.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M257.049 724.75H252.951L255 721.472L257.049 724.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M271.049 724.75H266.951L269 721.472L271.049 724.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M285.049 724.75H280.951L283 721.472L285.049 724.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M299.049 724.75H294.951L297 721.472L299.049 724.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M313.049 724.75H308.951L311 721.472L313.049 724.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M327.049 724.75H322.951L325 721.472L327.049 724.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M341.049 724.75H336.951L339 721.472L341.049 724.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M355.049 724.75H350.951L353 721.472L355.049 724.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M369.049 724.75H364.951L367 721.472L369.049 724.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M383.049 724.75H378.951L381 721.472L383.049 724.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M397.049 724.75H392.951L395 721.472L397.049 724.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M411.049 724.75H406.951L409 721.472L411.049 724.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M425.049 724.75H420.951L423 721.472L425.049 724.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M439.049 724.75H434.951L437 721.472L439.049 724.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M453.049 724.75H448.951L451 721.472L453.049 724.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M467.049 724.75H462.951L465 721.472L467.049 724.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M481.049 724.75H476.951L479 721.472L481.049 724.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M495.049 724.75H490.951L493 721.472L495.049 724.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M509.049 724.75H504.951L507 721.472L509.049 724.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M523.049 724.75H518.951L521 721.472L523.049 724.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M537.049 724.75H532.951L535 721.472L537.049 724.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M551.049 724.75H546.951L549 721.472L551.049 724.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M565.049 724.75H560.951L563 721.472L565.049 724.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M579.049 724.75H574.951L577 721.472L579.049 724.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M593.049 724.75H588.951L591 721.472L593.049 724.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M607.049 724.75H602.951L605 721.472L607.049 724.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M621.049 724.75H616.951L619 721.472L621.049 724.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M635.049 724.75H630.951L633 721.472L635.049 724.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M649.049 724.75H644.951L647 721.472L649.049 724.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M663.049 724.75H658.951L661 721.472L663.049 724.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M677.049 724.75H672.951L675 721.472L677.049 724.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M691.049 724.75H686.951L689 721.472L691.049 724.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M705.049 724.75H700.951L703 721.472L705.049 724.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M719.049 724.75H714.951L717 721.472L719.049 724.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M733.049 724.75H728.951L731 721.472L733.049 724.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M747.049 724.75H742.951L745 721.472L747.049 724.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M761.049 724.75H756.951L759 721.472L761.049 724.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M775.049 724.75H770.951L773 721.472L775.049 724.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M789.049 724.75H784.951L787 721.472L789.049 724.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M803.049 724.75H798.951L801 721.472L803.049 724.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M817.049 724.75H812.951L815 721.472L817.049 724.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M831.049 724.75H826.951L829 721.472L831.049 724.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M845.049 724.75H840.951L843 721.472L845.049 724.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M859.049 724.75H854.951L857 721.472L859.049 724.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M873.049 724.75H868.951L871 721.472L873.049 724.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M887.049 724.75H882.951L885 721.472L887.049 724.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M901.049 724.75H896.951L899 721.472L901.049 724.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M915.049 724.75H910.951L913 721.472L915.049 724.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M929.049 724.75H924.951L927 721.472L929.049 724.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M943.049 724.75H938.951L941 721.472L943.049 724.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M957.049 724.75H952.951L955 721.472L957.049 724.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M971.049 724.75H966.951L969 721.472L971.049 724.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M985.049 724.75H980.951L983 721.472L985.049 724.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M999.049 724.75H994.951L997 721.472L999.049 724.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1013.05 724.75H1008.95L1011 721.472L1013.05 724.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1027.05 724.75H1022.95L1025 721.472L1027.05 724.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1041.05 724.75H1036.95L1039 721.472L1041.05 724.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1055.05 724.75H1050.95L1053 721.472L1055.05 724.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1069.05 724.75H1064.95L1067 721.472L1069.05 724.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1083.05 724.75H1078.95L1081 721.472L1083.05 724.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1097.05 724.75H1092.95L1095 721.472L1097.05 724.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1111.05 724.75H1106.95L1109 721.472L1111.05 724.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1125.05 724.75H1120.95L1123 721.472L1125.05 724.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1139.05 724.75H1134.95L1137 721.472L1139.05 724.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1153.05 724.75H1148.95L1151 721.472L1153.05 724.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1167.05 724.75H1162.95L1165 721.472L1167.05 724.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1181.05 724.75H1176.95L1179 721.472L1181.05 724.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1195.05 724.75H1190.95L1193 721.472L1195.05 724.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1209.05 724.75H1204.95L1207 721.472L1209.05 724.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1223.05 724.75H1218.95L1221 721.472L1223.05 724.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1237.05 724.75H1232.95L1235 721.472L1237.05 724.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1251.05 724.75H1246.95L1249 721.472L1251.05 724.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1265.05 724.75H1260.95L1263 721.472L1265.05 724.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1279.05 724.75H1274.95L1277 721.472L1279.05 724.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1293.05 724.75H1288.95L1291 721.472L1293.05 724.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1307.05 724.75H1302.95L1305 721.472L1307.05 724.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1321.05 724.75H1316.95L1319 721.472L1321.05 724.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1335.05 724.75H1330.95L1333 721.472L1335.05 724.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1349.05 724.75H1344.95L1347 721.472L1349.05 724.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1363.05 724.75H1358.95L1361 721.472L1363.05 724.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1377.05 724.75H1372.95L1375 721.472L1377.05 724.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1391.05 724.75H1386.95L1389 721.472L1391.05 724.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1405.05 724.75H1400.95L1403 721.472L1405.05 724.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1419.05 724.75H1414.95L1417 721.472L1419.05 724.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1433.05 724.75H1428.95L1431 721.472L1433.05 724.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M5.04894 740.75H0.951062L3 737.472L5.04894 740.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M19.0489 740.75H14.9511L17 737.472L19.0489 740.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M33.0489 740.75H28.9511L31 737.472L33.0489 740.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M47.0489 740.75H42.9511L45 737.472L47.0489 740.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M61.0489 740.75H56.9511L59 737.472L61.0489 740.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M75.0489 740.75H70.9511L73 737.472L75.0489 740.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M89.0489 740.75H84.9511L87 737.472L89.0489 740.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M103.049 740.75H98.9511L101 737.472L103.049 740.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M117.049 740.75H112.951L115 737.472L117.049 740.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M131.049 740.75H126.951L129 737.472L131.049 740.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M145.049 740.75H140.951L143 737.472L145.049 740.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M159.049 740.75H154.951L157 737.472L159.049 740.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M173.049 740.75H168.951L171 737.472L173.049 740.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M187.049 740.75H182.951L185 737.472L187.049 740.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M201.049 740.75H196.951L199 737.472L201.049 740.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M215.049 740.75H210.951L213 737.472L215.049 740.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M229.049 740.75H224.951L227 737.472L229.049 740.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M243.049 740.75H238.951L241 737.472L243.049 740.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M257.049 740.75H252.951L255 737.472L257.049 740.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M271.049 740.75H266.951L269 737.472L271.049 740.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M285.049 740.75H280.951L283 737.472L285.049 740.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M299.049 740.75H294.951L297 737.472L299.049 740.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M313.049 740.75H308.951L311 737.472L313.049 740.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M327.049 740.75H322.951L325 737.472L327.049 740.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M341.049 740.75H336.951L339 737.472L341.049 740.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M355.049 740.75H350.951L353 737.472L355.049 740.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M369.049 740.75H364.951L367 737.472L369.049 740.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M383.049 740.75H378.951L381 737.472L383.049 740.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M397.049 740.75H392.951L395 737.472L397.049 740.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M411.049 740.75H406.951L409 737.472L411.049 740.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M425.049 740.75H420.951L423 737.472L425.049 740.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M439.049 740.75H434.951L437 737.472L439.049 740.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M453.049 740.75H448.951L451 737.472L453.049 740.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M467.049 740.75H462.951L465 737.472L467.049 740.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M481.049 740.75H476.951L479 737.472L481.049 740.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M495.049 740.75H490.951L493 737.472L495.049 740.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M509.049 740.75H504.951L507 737.472L509.049 740.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M523.049 740.75H518.951L521 737.472L523.049 740.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M537.049 740.75H532.951L535 737.472L537.049 740.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M551.049 740.75H546.951L549 737.472L551.049 740.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M565.049 740.75H560.951L563 737.472L565.049 740.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M579.049 740.75H574.951L577 737.472L579.049 740.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M593.049 740.75H588.951L591 737.472L593.049 740.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M607.049 740.75H602.951L605 737.472L607.049 740.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M621.049 740.75H616.951L619 737.472L621.049 740.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M635.049 740.75H630.951L633 737.472L635.049 740.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M649.049 740.75H644.951L647 737.472L649.049 740.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M663.049 740.75H658.951L661 737.472L663.049 740.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M677.049 740.75H672.951L675 737.472L677.049 740.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M691.049 740.75H686.951L689 737.472L691.049 740.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M705.049 740.75H700.951L703 737.472L705.049 740.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M719.049 740.75H714.951L717 737.472L719.049 740.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M733.049 740.75H728.951L731 737.472L733.049 740.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M747.049 740.75H742.951L745 737.472L747.049 740.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M761.049 740.75H756.951L759 737.472L761.049 740.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M775.049 740.75H770.951L773 737.472L775.049 740.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M789.049 740.75H784.951L787 737.472L789.049 740.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M803.049 740.75H798.951L801 737.472L803.049 740.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M817.049 740.75H812.951L815 737.472L817.049 740.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M831.049 740.75H826.951L829 737.472L831.049 740.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M845.049 740.75H840.951L843 737.472L845.049 740.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M859.049 740.75H854.951L857 737.472L859.049 740.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M873.049 740.75H868.951L871 737.472L873.049 740.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M887.049 740.75H882.951L885 737.472L887.049 740.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M901.049 740.75H896.951L899 737.472L901.049 740.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M915.049 740.75H910.951L913 737.472L915.049 740.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M929.049 740.75H924.951L927 737.472L929.049 740.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M943.049 740.75H938.951L941 737.472L943.049 740.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M957.049 740.75H952.951L955 737.472L957.049 740.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M971.049 740.75H966.951L969 737.472L971.049 740.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M985.049 740.75H980.951L983 737.472L985.049 740.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M999.049 740.75H994.951L997 737.472L999.049 740.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1013.05 740.75H1008.95L1011 737.472L1013.05 740.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1027.05 740.75H1022.95L1025 737.472L1027.05 740.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1041.05 740.75H1036.95L1039 737.472L1041.05 740.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1055.05 740.75H1050.95L1053 737.472L1055.05 740.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1069.05 740.75H1064.95L1067 737.472L1069.05 740.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1083.05 740.75H1078.95L1081 737.472L1083.05 740.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1097.05 740.75H1092.95L1095 737.472L1097.05 740.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1111.05 740.75H1106.95L1109 737.472L1111.05 740.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1125.05 740.75H1120.95L1123 737.472L1125.05 740.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1139.05 740.75H1134.95L1137 737.472L1139.05 740.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1153.05 740.75H1148.95L1151 737.472L1153.05 740.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1167.05 740.75H1162.95L1165 737.472L1167.05 740.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1181.05 740.75H1176.95L1179 737.472L1181.05 740.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1195.05 740.75H1190.95L1193 737.472L1195.05 740.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1209.05 740.75H1204.95L1207 737.472L1209.05 740.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1223.05 740.75H1218.95L1221 737.472L1223.05 740.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1237.05 740.75H1232.95L1235 737.472L1237.05 740.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1251.05 740.75H1246.95L1249 737.472L1251.05 740.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1265.05 740.75H1260.95L1263 737.472L1265.05 740.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1279.05 740.75H1274.95L1277 737.472L1279.05 740.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1293.05 740.75H1288.95L1291 737.472L1293.05 740.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1307.05 740.75H1302.95L1305 737.472L1307.05 740.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1321.05 740.75H1316.95L1319 737.472L1321.05 740.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1335.05 740.75H1330.95L1333 737.472L1335.05 740.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1349.05 740.75H1344.95L1347 737.472L1349.05 740.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1363.05 740.75H1358.95L1361 737.472L1363.05 740.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1377.05 740.75H1372.95L1375 737.472L1377.05 740.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1391.05 740.75H1386.95L1389 737.472L1391.05 740.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1405.05 740.75H1400.95L1403 737.472L1405.05 740.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1419.05 740.75H1414.95L1417 737.472L1419.05 740.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1433.05 740.75H1428.95L1431 737.472L1433.05 740.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M5.04894 756.75H0.951062L3 753.472L5.04894 756.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M19.0489 756.75H14.9511L17 753.472L19.0489 756.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M33.0489 756.75H28.9511L31 753.472L33.0489 756.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M47.0489 756.75H42.9511L45 753.472L47.0489 756.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M61.0489 756.75H56.9511L59 753.472L61.0489 756.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M75.0489 756.75H70.9511L73 753.472L75.0489 756.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M89.0489 756.75H84.9511L87 753.472L89.0489 756.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M103.049 756.75H98.9511L101 753.472L103.049 756.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M117.049 756.75H112.951L115 753.472L117.049 756.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M131.049 756.75H126.951L129 753.472L131.049 756.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M145.049 756.75H140.951L143 753.472L145.049 756.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M159.049 756.75H154.951L157 753.472L159.049 756.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M173.049 756.75H168.951L171 753.472L173.049 756.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M187.049 756.75H182.951L185 753.472L187.049 756.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M201.049 756.75H196.951L199 753.472L201.049 756.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M215.049 756.75H210.951L213 753.472L215.049 756.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M229.049 756.75H224.951L227 753.472L229.049 756.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M243.049 756.75H238.951L241 753.472L243.049 756.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M257.049 756.75H252.951L255 753.472L257.049 756.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M271.049 756.75H266.951L269 753.472L271.049 756.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M285.049 756.75H280.951L283 753.472L285.049 756.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M299.049 756.75H294.951L297 753.472L299.049 756.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M313.049 756.75H308.951L311 753.472L313.049 756.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M327.049 756.75H322.951L325 753.472L327.049 756.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M341.049 756.75H336.951L339 753.472L341.049 756.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M355.049 756.75H350.951L353 753.472L355.049 756.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M369.049 756.75H364.951L367 753.472L369.049 756.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M383.049 756.75H378.951L381 753.472L383.049 756.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M397.049 756.75H392.951L395 753.472L397.049 756.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M411.049 756.75H406.951L409 753.472L411.049 756.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M425.049 756.75H420.951L423 753.472L425.049 756.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M439.049 756.75H434.951L437 753.472L439.049 756.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M453.049 756.75H448.951L451 753.472L453.049 756.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M467.049 756.75H462.951L465 753.472L467.049 756.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M481.049 756.75H476.951L479 753.472L481.049 756.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M495.049 756.75H490.951L493 753.472L495.049 756.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M509.049 756.75H504.951L507 753.472L509.049 756.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M523.049 756.75H518.951L521 753.472L523.049 756.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M537.049 756.75H532.951L535 753.472L537.049 756.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M551.049 756.75H546.951L549 753.472L551.049 756.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M565.049 756.75H560.951L563 753.472L565.049 756.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M579.049 756.75H574.951L577 753.472L579.049 756.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M593.049 756.75H588.951L591 753.472L593.049 756.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M607.049 756.75H602.951L605 753.472L607.049 756.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M621.049 756.75H616.951L619 753.472L621.049 756.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M635.049 756.75H630.951L633 753.472L635.049 756.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M649.049 756.75H644.951L647 753.472L649.049 756.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M663.049 756.75H658.951L661 753.472L663.049 756.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M677.049 756.75H672.951L675 753.472L677.049 756.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M691.049 756.75H686.951L689 753.472L691.049 756.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M705.049 756.75H700.951L703 753.472L705.049 756.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M719.049 756.75H714.951L717 753.472L719.049 756.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M733.049 756.75H728.951L731 753.472L733.049 756.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M747.049 756.75H742.951L745 753.472L747.049 756.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M761.049 756.75H756.951L759 753.472L761.049 756.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M775.049 756.75H770.951L773 753.472L775.049 756.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M789.049 756.75H784.951L787 753.472L789.049 756.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M803.049 756.75H798.951L801 753.472L803.049 756.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M817.049 756.75H812.951L815 753.472L817.049 756.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M831.049 756.75H826.951L829 753.472L831.049 756.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M845.049 756.75H840.951L843 753.472L845.049 756.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M859.049 756.75H854.951L857 753.472L859.049 756.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M873.049 756.75H868.951L871 753.472L873.049 756.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M887.049 756.75H882.951L885 753.472L887.049 756.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M901.049 756.75H896.951L899 753.472L901.049 756.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M915.049 756.75H910.951L913 753.472L915.049 756.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M929.049 756.75H924.951L927 753.472L929.049 756.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M943.049 756.75H938.951L941 753.472L943.049 756.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M957.049 756.75H952.951L955 753.472L957.049 756.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M971.049 756.75H966.951L969 753.472L971.049 756.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M985.049 756.75H980.951L983 753.472L985.049 756.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M999.049 756.75H994.951L997 753.472L999.049 756.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1013.05 756.75H1008.95L1011 753.472L1013.05 756.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1027.05 756.75H1022.95L1025 753.472L1027.05 756.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1041.05 756.75H1036.95L1039 753.472L1041.05 756.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1055.05 756.75H1050.95L1053 753.472L1055.05 756.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1069.05 756.75H1064.95L1067 753.472L1069.05 756.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1083.05 756.75H1078.95L1081 753.472L1083.05 756.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1097.05 756.75H1092.95L1095 753.472L1097.05 756.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1111.05 756.75H1106.95L1109 753.472L1111.05 756.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1125.05 756.75H1120.95L1123 753.472L1125.05 756.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1139.05 756.75H1134.95L1137 753.472L1139.05 756.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1153.05 756.75H1148.95L1151 753.472L1153.05 756.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1167.05 756.75H1162.95L1165 753.472L1167.05 756.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1181.05 756.75H1176.95L1179 753.472L1181.05 756.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1195.05 756.75H1190.95L1193 753.472L1195.05 756.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1209.05 756.75H1204.95L1207 753.472L1209.05 756.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1223.05 756.75H1218.95L1221 753.472L1223.05 756.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1237.05 756.75H1232.95L1235 753.472L1237.05 756.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1251.05 756.75H1246.95L1249 753.472L1251.05 756.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1265.05 756.75H1260.95L1263 753.472L1265.05 756.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1279.05 756.75H1274.95L1277 753.472L1279.05 756.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1293.05 756.75H1288.95L1291 753.472L1293.05 756.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1307.05 756.75H1302.95L1305 753.472L1307.05 756.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1321.05 756.75H1316.95L1319 753.472L1321.05 756.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1335.05 756.75H1330.95L1333 753.472L1335.05 756.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1349.05 756.75H1344.95L1347 753.472L1349.05 756.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1363.05 756.75H1358.95L1361 753.472L1363.05 756.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1377.05 756.75H1372.95L1375 753.472L1377.05 756.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1391.05 756.75H1386.95L1389 753.472L1391.05 756.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1405.05 756.75H1400.95L1403 753.472L1405.05 756.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1419.05 756.75H1414.95L1417 753.472L1419.05 756.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1433.05 756.75H1428.95L1431 753.472L1433.05 756.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M5.04894 772.75H0.951062L3 769.472L5.04894 772.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M19.0489 772.75H14.9511L17 769.472L19.0489 772.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M33.0489 772.75H28.9511L31 769.472L33.0489 772.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M47.0489 772.75H42.9511L45 769.472L47.0489 772.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M61.0489 772.75H56.9511L59 769.472L61.0489 772.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M75.0489 772.75H70.9511L73 769.472L75.0489 772.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M89.0489 772.75H84.9511L87 769.472L89.0489 772.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M103.049 772.75H98.9511L101 769.472L103.049 772.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M117.049 772.75H112.951L115 769.472L117.049 772.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M131.049 772.75H126.951L129 769.472L131.049 772.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M145.049 772.75H140.951L143 769.472L145.049 772.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M159.049 772.75H154.951L157 769.472L159.049 772.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M173.049 772.75H168.951L171 769.472L173.049 772.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M187.049 772.75H182.951L185 769.472L187.049 772.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M201.049 772.75H196.951L199 769.472L201.049 772.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M215.049 772.75H210.951L213 769.472L215.049 772.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M229.049 772.75H224.951L227 769.472L229.049 772.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M243.049 772.75H238.951L241 769.472L243.049 772.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M257.049 772.75H252.951L255 769.472L257.049 772.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M271.049 772.75H266.951L269 769.472L271.049 772.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M285.049 772.75H280.951L283 769.472L285.049 772.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M299.049 772.75H294.951L297 769.472L299.049 772.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M313.049 772.75H308.951L311 769.472L313.049 772.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M327.049 772.75H322.951L325 769.472L327.049 772.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M341.049 772.75H336.951L339 769.472L341.049 772.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M355.049 772.75H350.951L353 769.472L355.049 772.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M369.049 772.75H364.951L367 769.472L369.049 772.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M383.049 772.75H378.951L381 769.472L383.049 772.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M397.049 772.75H392.951L395 769.472L397.049 772.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M411.049 772.75H406.951L409 769.472L411.049 772.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M425.049 772.75H420.951L423 769.472L425.049 772.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M439.049 772.75H434.951L437 769.472L439.049 772.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M453.049 772.75H448.951L451 769.472L453.049 772.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M467.049 772.75H462.951L465 769.472L467.049 772.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M481.049 772.75H476.951L479 769.472L481.049 772.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M495.049 772.75H490.951L493 769.472L495.049 772.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M509.049 772.75H504.951L507 769.472L509.049 772.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M523.049 772.75H518.951L521 769.472L523.049 772.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M537.049 772.75H532.951L535 769.472L537.049 772.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M551.049 772.75H546.951L549 769.472L551.049 772.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M565.049 772.75H560.951L563 769.472L565.049 772.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M579.049 772.75H574.951L577 769.472L579.049 772.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M593.049 772.75H588.951L591 769.472L593.049 772.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M607.049 772.75H602.951L605 769.472L607.049 772.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M621.049 772.75H616.951L619 769.472L621.049 772.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M635.049 772.75H630.951L633 769.472L635.049 772.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M649.049 772.75H644.951L647 769.472L649.049 772.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M663.049 772.75H658.951L661 769.472L663.049 772.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M677.049 772.75H672.951L675 769.472L677.049 772.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M691.049 772.75H686.951L689 769.472L691.049 772.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M705.049 772.75H700.951L703 769.472L705.049 772.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M719.049 772.75H714.951L717 769.472L719.049 772.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M733.049 772.75H728.951L731 769.472L733.049 772.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M747.049 772.75H742.951L745 769.472L747.049 772.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M761.049 772.75H756.951L759 769.472L761.049 772.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M775.049 772.75H770.951L773 769.472L775.049 772.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M789.049 772.75H784.951L787 769.472L789.049 772.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M803.049 772.75H798.951L801 769.472L803.049 772.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M817.049 772.75H812.951L815 769.472L817.049 772.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M831.049 772.75H826.951L829 769.472L831.049 772.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M845.049 772.75H840.951L843 769.472L845.049 772.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M859.049 772.75H854.951L857 769.472L859.049 772.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M873.049 772.75H868.951L871 769.472L873.049 772.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M887.049 772.75H882.951L885 769.472L887.049 772.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M901.049 772.75H896.951L899 769.472L901.049 772.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M915.049 772.75H910.951L913 769.472L915.049 772.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M929.049 772.75H924.951L927 769.472L929.049 772.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M943.049 772.75H938.951L941 769.472L943.049 772.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M957.049 772.75H952.951L955 769.472L957.049 772.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M971.049 772.75H966.951L969 769.472L971.049 772.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M985.049 772.75H980.951L983 769.472L985.049 772.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M999.049 772.75H994.951L997 769.472L999.049 772.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1013.05 772.75H1008.95L1011 769.472L1013.05 772.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1027.05 772.75H1022.95L1025 769.472L1027.05 772.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1041.05 772.75H1036.95L1039 769.472L1041.05 772.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1055.05 772.75H1050.95L1053 769.472L1055.05 772.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1069.05 772.75H1064.95L1067 769.472L1069.05 772.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1083.05 772.75H1078.95L1081 769.472L1083.05 772.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1097.05 772.75H1092.95L1095 769.472L1097.05 772.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1111.05 772.75H1106.95L1109 769.472L1111.05 772.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1125.05 772.75H1120.95L1123 769.472L1125.05 772.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1139.05 772.75H1134.95L1137 769.472L1139.05 772.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1153.05 772.75H1148.95L1151 769.472L1153.05 772.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1167.05 772.75H1162.95L1165 769.472L1167.05 772.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1181.05 772.75H1176.95L1179 769.472L1181.05 772.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1195.05 772.75H1190.95L1193 769.472L1195.05 772.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1209.05 772.75H1204.95L1207 769.472L1209.05 772.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1223.05 772.75H1218.95L1221 769.472L1223.05 772.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1237.05 772.75H1232.95L1235 769.472L1237.05 772.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1251.05 772.75H1246.95L1249 769.472L1251.05 772.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1265.05 772.75H1260.95L1263 769.472L1265.05 772.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1279.05 772.75H1274.95L1277 769.472L1279.05 772.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1293.05 772.75H1288.95L1291 769.472L1293.05 772.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1307.05 772.75H1302.95L1305 769.472L1307.05 772.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1321.05 772.75H1316.95L1319 769.472L1321.05 772.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1335.05 772.75H1330.95L1333 769.472L1335.05 772.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1349.05 772.75H1344.95L1347 769.472L1349.05 772.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1363.05 772.75H1358.95L1361 769.472L1363.05 772.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1377.05 772.75H1372.95L1375 769.472L1377.05 772.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1391.05 772.75H1386.95L1389 769.472L1391.05 772.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1405.05 772.75H1400.95L1403 769.472L1405.05 772.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1419.05 772.75H1414.95L1417 769.472L1419.05 772.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1433.05 772.75H1428.95L1431 769.472L1433.05 772.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M5.04894 788.75H0.951062L3 785.472L5.04894 788.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M19.0489 788.75H14.9511L17 785.472L19.0489 788.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M33.0489 788.75H28.9511L31 785.472L33.0489 788.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M47.0489 788.75H42.9511L45 785.472L47.0489 788.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M61.0489 788.75H56.9511L59 785.472L61.0489 788.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M75.0489 788.75H70.9511L73 785.472L75.0489 788.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M89.0489 788.75H84.9511L87 785.472L89.0489 788.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M103.049 788.75H98.9511L101 785.472L103.049 788.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M117.049 788.75H112.951L115 785.472L117.049 788.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M131.049 788.75H126.951L129 785.472L131.049 788.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M145.049 788.75H140.951L143 785.472L145.049 788.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M159.049 788.75H154.951L157 785.472L159.049 788.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M173.049 788.75H168.951L171 785.472L173.049 788.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M187.049 788.75H182.951L185 785.472L187.049 788.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M201.049 788.75H196.951L199 785.472L201.049 788.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M215.049 788.75H210.951L213 785.472L215.049 788.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M229.049 788.75H224.951L227 785.472L229.049 788.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M243.049 788.75H238.951L241 785.472L243.049 788.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M257.049 788.75H252.951L255 785.472L257.049 788.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M271.049 788.75H266.951L269 785.472L271.049 788.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M285.049 788.75H280.951L283 785.472L285.049 788.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M299.049 788.75H294.951L297 785.472L299.049 788.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M313.049 788.75H308.951L311 785.472L313.049 788.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M327.049 788.75H322.951L325 785.472L327.049 788.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M341.049 788.75H336.951L339 785.472L341.049 788.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M355.049 788.75H350.951L353 785.472L355.049 788.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M369.049 788.75H364.951L367 785.472L369.049 788.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M383.049 788.75H378.951L381 785.472L383.049 788.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M397.049 788.75H392.951L395 785.472L397.049 788.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M411.049 788.75H406.951L409 785.472L411.049 788.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M425.049 788.75H420.951L423 785.472L425.049 788.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M439.049 788.75H434.951L437 785.472L439.049 788.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M453.049 788.75H448.951L451 785.472L453.049 788.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M467.049 788.75H462.951L465 785.472L467.049 788.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M481.049 788.75H476.951L479 785.472L481.049 788.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M495.049 788.75H490.951L493 785.472L495.049 788.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M509.049 788.75H504.951L507 785.472L509.049 788.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M523.049 788.75H518.951L521 785.472L523.049 788.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M537.049 788.75H532.951L535 785.472L537.049 788.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M551.049 788.75H546.951L549 785.472L551.049 788.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M565.049 788.75H560.951L563 785.472L565.049 788.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M579.049 788.75H574.951L577 785.472L579.049 788.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M593.049 788.75H588.951L591 785.472L593.049 788.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M607.049 788.75H602.951L605 785.472L607.049 788.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M621.049 788.75H616.951L619 785.472L621.049 788.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M635.049 788.75H630.951L633 785.472L635.049 788.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M649.049 788.75H644.951L647 785.472L649.049 788.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M663.049 788.75H658.951L661 785.472L663.049 788.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M677.049 788.75H672.951L675 785.472L677.049 788.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M691.049 788.75H686.951L689 785.472L691.049 788.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M705.049 788.75H700.951L703 785.472L705.049 788.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M719.049 788.75H714.951L717 785.472L719.049 788.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M733.049 788.75H728.951L731 785.472L733.049 788.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M747.049 788.75H742.951L745 785.472L747.049 788.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M761.049 788.75H756.951L759 785.472L761.049 788.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M775.049 788.75H770.951L773 785.472L775.049 788.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M789.049 788.75H784.951L787 785.472L789.049 788.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M803.049 788.75H798.951L801 785.472L803.049 788.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M817.049 788.75H812.951L815 785.472L817.049 788.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M831.049 788.75H826.951L829 785.472L831.049 788.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M845.049 788.75H840.951L843 785.472L845.049 788.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M859.049 788.75H854.951L857 785.472L859.049 788.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M873.049 788.75H868.951L871 785.472L873.049 788.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M887.049 788.75H882.951L885 785.472L887.049 788.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M901.049 788.75H896.951L899 785.472L901.049 788.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M915.049 788.75H910.951L913 785.472L915.049 788.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M929.049 788.75H924.951L927 785.472L929.049 788.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M943.049 788.75H938.951L941 785.472L943.049 788.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M957.049 788.75H952.951L955 785.472L957.049 788.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M971.049 788.75H966.951L969 785.472L971.049 788.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M985.049 788.75H980.951L983 785.472L985.049 788.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M999.049 788.75H994.951L997 785.472L999.049 788.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1013.05 788.75H1008.95L1011 785.472L1013.05 788.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1027.05 788.75H1022.95L1025 785.472L1027.05 788.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1041.05 788.75H1036.95L1039 785.472L1041.05 788.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1055.05 788.75H1050.95L1053 785.472L1055.05 788.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1069.05 788.75H1064.95L1067 785.472L1069.05 788.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1083.05 788.75H1078.95L1081 785.472L1083.05 788.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1097.05 788.75H1092.95L1095 785.472L1097.05 788.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1111.05 788.75H1106.95L1109 785.472L1111.05 788.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1125.05 788.75H1120.95L1123 785.472L1125.05 788.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1139.05 788.75H1134.95L1137 785.472L1139.05 788.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1153.05 788.75H1148.95L1151 785.472L1153.05 788.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1167.05 788.75H1162.95L1165 785.472L1167.05 788.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1181.05 788.75H1176.95L1179 785.472L1181.05 788.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1195.05 788.75H1190.95L1193 785.472L1195.05 788.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1209.05 788.75H1204.95L1207 785.472L1209.05 788.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1223.05 788.75H1218.95L1221 785.472L1223.05 788.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1237.05 788.75H1232.95L1235 785.472L1237.05 788.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1251.05 788.75H1246.95L1249 785.472L1251.05 788.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1265.05 788.75H1260.95L1263 785.472L1265.05 788.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1279.05 788.75H1274.95L1277 785.472L1279.05 788.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1293.05 788.75H1288.95L1291 785.472L1293.05 788.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1307.05 788.75H1302.95L1305 785.472L1307.05 788.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1321.05 788.75H1316.95L1319 785.472L1321.05 788.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1335.05 788.75H1330.95L1333 785.472L1335.05 788.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1349.05 788.75H1344.95L1347 785.472L1349.05 788.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1363.05 788.75H1358.95L1361 785.472L1363.05 788.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1377.05 788.75H1372.95L1375 785.472L1377.05 788.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1391.05 788.75H1386.95L1389 785.472L1391.05 788.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1405.05 788.75H1400.95L1403 785.472L1405.05 788.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1419.05 788.75H1414.95L1417 785.472L1419.05 788.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1433.05 788.75H1428.95L1431 785.472L1433.05 788.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M5.04894 804.75H0.951062L3 801.472L5.04894 804.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M19.0489 804.75H14.9511L17 801.472L19.0489 804.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M33.0489 804.75H28.9511L31 801.472L33.0489 804.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M47.0489 804.75H42.9511L45 801.472L47.0489 804.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M61.0489 804.75H56.9511L59 801.472L61.0489 804.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M75.0489 804.75H70.9511L73 801.472L75.0489 804.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M89.0489 804.75H84.9511L87 801.472L89.0489 804.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M103.049 804.75H98.9511L101 801.472L103.049 804.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M117.049 804.75H112.951L115 801.472L117.049 804.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M131.049 804.75H126.951L129 801.472L131.049 804.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M145.049 804.75H140.951L143 801.472L145.049 804.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M159.049 804.75H154.951L157 801.472L159.049 804.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M173.049 804.75H168.951L171 801.472L173.049 804.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M187.049 804.75H182.951L185 801.472L187.049 804.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M201.049 804.75H196.951L199 801.472L201.049 804.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M215.049 804.75H210.951L213 801.472L215.049 804.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M229.049 804.75H224.951L227 801.472L229.049 804.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M243.049 804.75H238.951L241 801.472L243.049 804.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M257.049 804.75H252.951L255 801.472L257.049 804.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M271.049 804.75H266.951L269 801.472L271.049 804.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M285.049 804.75H280.951L283 801.472L285.049 804.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M299.049 804.75H294.951L297 801.472L299.049 804.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M313.049 804.75H308.951L311 801.472L313.049 804.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M327.049 804.75H322.951L325 801.472L327.049 804.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M341.049 804.75H336.951L339 801.472L341.049 804.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M355.049 804.75H350.951L353 801.472L355.049 804.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M369.049 804.75H364.951L367 801.472L369.049 804.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M383.049 804.75H378.951L381 801.472L383.049 804.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M397.049 804.75H392.951L395 801.472L397.049 804.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M411.049 804.75H406.951L409 801.472L411.049 804.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M425.049 804.75H420.951L423 801.472L425.049 804.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M439.049 804.75H434.951L437 801.472L439.049 804.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M453.049 804.75H448.951L451 801.472L453.049 804.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M467.049 804.75H462.951L465 801.472L467.049 804.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M481.049 804.75H476.951L479 801.472L481.049 804.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M495.049 804.75H490.951L493 801.472L495.049 804.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M509.049 804.75H504.951L507 801.472L509.049 804.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M523.049 804.75H518.951L521 801.472L523.049 804.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M537.049 804.75H532.951L535 801.472L537.049 804.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M551.049 804.75H546.951L549 801.472L551.049 804.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M565.049 804.75H560.951L563 801.472L565.049 804.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M579.049 804.75H574.951L577 801.472L579.049 804.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M593.049 804.75H588.951L591 801.472L593.049 804.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M607.049 804.75H602.951L605 801.472L607.049 804.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M621.049 804.75H616.951L619 801.472L621.049 804.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M635.049 804.75H630.951L633 801.472L635.049 804.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M649.049 804.75H644.951L647 801.472L649.049 804.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M663.049 804.75H658.951L661 801.472L663.049 804.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M677.049 804.75H672.951L675 801.472L677.049 804.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M691.049 804.75H686.951L689 801.472L691.049 804.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M705.049 804.75H700.951L703 801.472L705.049 804.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M719.049 804.75H714.951L717 801.472L719.049 804.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M733.049 804.75H728.951L731 801.472L733.049 804.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M747.049 804.75H742.951L745 801.472L747.049 804.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M761.049 804.75H756.951L759 801.472L761.049 804.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M775.049 804.75H770.951L773 801.472L775.049 804.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M789.049 804.75H784.951L787 801.472L789.049 804.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M803.049 804.75H798.951L801 801.472L803.049 804.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M817.049 804.75H812.951L815 801.472L817.049 804.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M831.049 804.75H826.951L829 801.472L831.049 804.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M845.049 804.75H840.951L843 801.472L845.049 804.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M859.049 804.75H854.951L857 801.472L859.049 804.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M873.049 804.75H868.951L871 801.472L873.049 804.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M887.049 804.75H882.951L885 801.472L887.049 804.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M901.049 804.75H896.951L899 801.472L901.049 804.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M915.049 804.75H910.951L913 801.472L915.049 804.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M929.049 804.75H924.951L927 801.472L929.049 804.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M943.049 804.75H938.951L941 801.472L943.049 804.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M957.049 804.75H952.951L955 801.472L957.049 804.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M971.049 804.75H966.951L969 801.472L971.049 804.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M985.049 804.75H980.951L983 801.472L985.049 804.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M999.049 804.75H994.951L997 801.472L999.049 804.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1013.05 804.75H1008.95L1011 801.472L1013.05 804.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1027.05 804.75H1022.95L1025 801.472L1027.05 804.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1041.05 804.75H1036.95L1039 801.472L1041.05 804.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1055.05 804.75H1050.95L1053 801.472L1055.05 804.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1069.05 804.75H1064.95L1067 801.472L1069.05 804.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1083.05 804.75H1078.95L1081 801.472L1083.05 804.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1097.05 804.75H1092.95L1095 801.472L1097.05 804.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1111.05 804.75H1106.95L1109 801.472L1111.05 804.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1125.05 804.75H1120.95L1123 801.472L1125.05 804.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1139.05 804.75H1134.95L1137 801.472L1139.05 804.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1153.05 804.75H1148.95L1151 801.472L1153.05 804.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1167.05 804.75H1162.95L1165 801.472L1167.05 804.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1181.05 804.75H1176.95L1179 801.472L1181.05 804.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1195.05 804.75H1190.95L1193 801.472L1195.05 804.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1209.05 804.75H1204.95L1207 801.472L1209.05 804.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1223.05 804.75H1218.95L1221 801.472L1223.05 804.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1237.05 804.75H1232.95L1235 801.472L1237.05 804.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1251.05 804.75H1246.95L1249 801.472L1251.05 804.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1265.05 804.75H1260.95L1263 801.472L1265.05 804.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1279.05 804.75H1274.95L1277 801.472L1279.05 804.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1293.05 804.75H1288.95L1291 801.472L1293.05 804.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1307.05 804.75H1302.95L1305 801.472L1307.05 804.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1321.05 804.75H1316.95L1319 801.472L1321.05 804.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1335.05 804.75H1330.95L1333 801.472L1335.05 804.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1349.05 804.75H1344.95L1347 801.472L1349.05 804.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1363.05 804.75H1358.95L1361 801.472L1363.05 804.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1377.05 804.75H1372.95L1375 801.472L1377.05 804.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1391.05 804.75H1386.95L1389 801.472L1391.05 804.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1405.05 804.75H1400.95L1403 801.472L1405.05 804.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1419.05 804.75H1414.95L1417 801.472L1419.05 804.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1433.05 804.75H1428.95L1431 801.472L1433.05 804.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M5.04894 820.75H0.951062L3 817.472L5.04894 820.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M19.0489 820.75H14.9511L17 817.472L19.0489 820.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M33.0489 820.75H28.9511L31 817.472L33.0489 820.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M47.0489 820.75H42.9511L45 817.472L47.0489 820.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M61.0489 820.75H56.9511L59 817.472L61.0489 820.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M75.0489 820.75H70.9511L73 817.472L75.0489 820.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M89.0489 820.75H84.9511L87 817.472L89.0489 820.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M103.049 820.75H98.9511L101 817.472L103.049 820.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M117.049 820.75H112.951L115 817.472L117.049 820.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M131.049 820.75H126.951L129 817.472L131.049 820.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M145.049 820.75H140.951L143 817.472L145.049 820.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M159.049 820.75H154.951L157 817.472L159.049 820.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M173.049 820.75H168.951L171 817.472L173.049 820.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M187.049 820.75H182.951L185 817.472L187.049 820.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M201.049 820.75H196.951L199 817.472L201.049 820.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M215.049 820.75H210.951L213 817.472L215.049 820.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M229.049 820.75H224.951L227 817.472L229.049 820.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M243.049 820.75H238.951L241 817.472L243.049 820.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M257.049 820.75H252.951L255 817.472L257.049 820.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M271.049 820.75H266.951L269 817.472L271.049 820.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M285.049 820.75H280.951L283 817.472L285.049 820.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M299.049 820.75H294.951L297 817.472L299.049 820.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M313.049 820.75H308.951L311 817.472L313.049 820.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M327.049 820.75H322.951L325 817.472L327.049 820.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M341.049 820.75H336.951L339 817.472L341.049 820.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M355.049 820.75H350.951L353 817.472L355.049 820.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M369.049 820.75H364.951L367 817.472L369.049 820.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M383.049 820.75H378.951L381 817.472L383.049 820.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M397.049 820.75H392.951L395 817.472L397.049 820.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M411.049 820.75H406.951L409 817.472L411.049 820.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M425.049 820.75H420.951L423 817.472L425.049 820.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M439.049 820.75H434.951L437 817.472L439.049 820.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M453.049 820.75H448.951L451 817.472L453.049 820.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M467.049 820.75H462.951L465 817.472L467.049 820.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M481.049 820.75H476.951L479 817.472L481.049 820.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M495.049 820.75H490.951L493 817.472L495.049 820.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M509.049 820.75H504.951L507 817.472L509.049 820.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M523.049 820.75H518.951L521 817.472L523.049 820.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M537.049 820.75H532.951L535 817.472L537.049 820.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M551.049 820.75H546.951L549 817.472L551.049 820.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M565.049 820.75H560.951L563 817.472L565.049 820.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M579.049 820.75H574.951L577 817.472L579.049 820.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M593.049 820.75H588.951L591 817.472L593.049 820.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M607.049 820.75H602.951L605 817.472L607.049 820.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M621.049 820.75H616.951L619 817.472L621.049 820.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M635.049 820.75H630.951L633 817.472L635.049 820.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M649.049 820.75H644.951L647 817.472L649.049 820.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M663.049 820.75H658.951L661 817.472L663.049 820.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M677.049 820.75H672.951L675 817.472L677.049 820.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M691.049 820.75H686.951L689 817.472L691.049 820.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M705.049 820.75H700.951L703 817.472L705.049 820.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M719.049 820.75H714.951L717 817.472L719.049 820.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M733.049 820.75H728.951L731 817.472L733.049 820.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M747.049 820.75H742.951L745 817.472L747.049 820.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M761.049 820.75H756.951L759 817.472L761.049 820.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M775.049 820.75H770.951L773 817.472L775.049 820.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M789.049 820.75H784.951L787 817.472L789.049 820.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M803.049 820.75H798.951L801 817.472L803.049 820.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M817.049 820.75H812.951L815 817.472L817.049 820.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M831.049 820.75H826.951L829 817.472L831.049 820.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M845.049 820.75H840.951L843 817.472L845.049 820.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M859.049 820.75H854.951L857 817.472L859.049 820.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M873.049 820.75H868.951L871 817.472L873.049 820.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M887.049 820.75H882.951L885 817.472L887.049 820.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M901.049 820.75H896.951L899 817.472L901.049 820.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M915.049 820.75H910.951L913 817.472L915.049 820.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M929.049 820.75H924.951L927 817.472L929.049 820.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M943.049 820.75H938.951L941 817.472L943.049 820.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M957.049 820.75H952.951L955 817.472L957.049 820.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M971.049 820.75H966.951L969 817.472L971.049 820.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M985.049 820.75H980.951L983 817.472L985.049 820.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M999.049 820.75H994.951L997 817.472L999.049 820.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1013.05 820.75H1008.95L1011 817.472L1013.05 820.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1027.05 820.75H1022.95L1025 817.472L1027.05 820.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1041.05 820.75H1036.95L1039 817.472L1041.05 820.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1055.05 820.75H1050.95L1053 817.472L1055.05 820.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1069.05 820.75H1064.95L1067 817.472L1069.05 820.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1083.05 820.75H1078.95L1081 817.472L1083.05 820.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1097.05 820.75H1092.95L1095 817.472L1097.05 820.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1111.05 820.75H1106.95L1109 817.472L1111.05 820.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1125.05 820.75H1120.95L1123 817.472L1125.05 820.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1139.05 820.75H1134.95L1137 817.472L1139.05 820.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1153.05 820.75H1148.95L1151 817.472L1153.05 820.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1167.05 820.75H1162.95L1165 817.472L1167.05 820.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1181.05 820.75H1176.95L1179 817.472L1181.05 820.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1195.05 820.75H1190.95L1193 817.472L1195.05 820.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1209.05 820.75H1204.95L1207 817.472L1209.05 820.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1223.05 820.75H1218.95L1221 817.472L1223.05 820.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1237.05 820.75H1232.95L1235 817.472L1237.05 820.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1251.05 820.75H1246.95L1249 817.472L1251.05 820.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1265.05 820.75H1260.95L1263 817.472L1265.05 820.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1279.05 820.75H1274.95L1277 817.472L1279.05 820.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1293.05 820.75H1288.95L1291 817.472L1293.05 820.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1307.05 820.75H1302.95L1305 817.472L1307.05 820.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1321.05 820.75H1316.95L1319 817.472L1321.05 820.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1335.05 820.75H1330.95L1333 817.472L1335.05 820.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1349.05 820.75H1344.95L1347 817.472L1349.05 820.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1363.05 820.75H1358.95L1361 817.472L1363.05 820.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1377.05 820.75H1372.95L1375 817.472L1377.05 820.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1391.05 820.75H1386.95L1389 817.472L1391.05 820.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1405.05 820.75H1400.95L1403 817.472L1405.05 820.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1419.05 820.75H1414.95L1417 817.472L1419.05 820.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1433.05 820.75H1428.95L1431 817.472L1433.05 820.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M5.04894 836.75H0.951062L3 833.472L5.04894 836.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M19.0489 836.75H14.9511L17 833.472L19.0489 836.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M33.0489 836.75H28.9511L31 833.472L33.0489 836.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M47.0489 836.75H42.9511L45 833.472L47.0489 836.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M61.0489 836.75H56.9511L59 833.472L61.0489 836.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M75.0489 836.75H70.9511L73 833.472L75.0489 836.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M89.0489 836.75H84.9511L87 833.472L89.0489 836.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M103.049 836.75H98.9511L101 833.472L103.049 836.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M117.049 836.75H112.951L115 833.472L117.049 836.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M131.049 836.75H126.951L129 833.472L131.049 836.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M145.049 836.75H140.951L143 833.472L145.049 836.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M159.049 836.75H154.951L157 833.472L159.049 836.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M173.049 836.75H168.951L171 833.472L173.049 836.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M187.049 836.75H182.951L185 833.472L187.049 836.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M201.049 836.75H196.951L199 833.472L201.049 836.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M215.049 836.75H210.951L213 833.472L215.049 836.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M229.049 836.75H224.951L227 833.472L229.049 836.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M243.049 836.75H238.951L241 833.472L243.049 836.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M257.049 836.75H252.951L255 833.472L257.049 836.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M271.049 836.75H266.951L269 833.472L271.049 836.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M285.049 836.75H280.951L283 833.472L285.049 836.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M299.049 836.75H294.951L297 833.472L299.049 836.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M313.049 836.75H308.951L311 833.472L313.049 836.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M327.049 836.75H322.951L325 833.472L327.049 836.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M341.049 836.75H336.951L339 833.472L341.049 836.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M355.049 836.75H350.951L353 833.472L355.049 836.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M369.049 836.75H364.951L367 833.472L369.049 836.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M383.049 836.75H378.951L381 833.472L383.049 836.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M397.049 836.75H392.951L395 833.472L397.049 836.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M411.049 836.75H406.951L409 833.472L411.049 836.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M425.049 836.75H420.951L423 833.472L425.049 836.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M439.049 836.75H434.951L437 833.472L439.049 836.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M453.049 836.75H448.951L451 833.472L453.049 836.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M467.049 836.75H462.951L465 833.472L467.049 836.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M481.049 836.75H476.951L479 833.472L481.049 836.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M495.049 836.75H490.951L493 833.472L495.049 836.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M509.049 836.75H504.951L507 833.472L509.049 836.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M523.049 836.75H518.951L521 833.472L523.049 836.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M537.049 836.75H532.951L535 833.472L537.049 836.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M551.049 836.75H546.951L549 833.472L551.049 836.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M565.049 836.75H560.951L563 833.472L565.049 836.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M579.049 836.75H574.951L577 833.472L579.049 836.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M593.049 836.75H588.951L591 833.472L593.049 836.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M607.049 836.75H602.951L605 833.472L607.049 836.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M621.049 836.75H616.951L619 833.472L621.049 836.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M635.049 836.75H630.951L633 833.472L635.049 836.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M649.049 836.75H644.951L647 833.472L649.049 836.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M663.049 836.75H658.951L661 833.472L663.049 836.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M677.049 836.75H672.951L675 833.472L677.049 836.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M691.049 836.75H686.951L689 833.472L691.049 836.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M705.049 836.75H700.951L703 833.472L705.049 836.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M719.049 836.75H714.951L717 833.472L719.049 836.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M733.049 836.75H728.951L731 833.472L733.049 836.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M747.049 836.75H742.951L745 833.472L747.049 836.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M761.049 836.75H756.951L759 833.472L761.049 836.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M775.049 836.75H770.951L773 833.472L775.049 836.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M789.049 836.75H784.951L787 833.472L789.049 836.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M803.049 836.75H798.951L801 833.472L803.049 836.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M817.049 836.75H812.951L815 833.472L817.049 836.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M831.049 836.75H826.951L829 833.472L831.049 836.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M845.049 836.75H840.951L843 833.472L845.049 836.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M859.049 836.75H854.951L857 833.472L859.049 836.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M873.049 836.75H868.951L871 833.472L873.049 836.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M887.049 836.75H882.951L885 833.472L887.049 836.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M901.049 836.75H896.951L899 833.472L901.049 836.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M915.049 836.75H910.951L913 833.472L915.049 836.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M929.049 836.75H924.951L927 833.472L929.049 836.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M943.049 836.75H938.951L941 833.472L943.049 836.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M957.049 836.75H952.951L955 833.472L957.049 836.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M971.049 836.75H966.951L969 833.472L971.049 836.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M985.049 836.75H980.951L983 833.472L985.049 836.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M999.049 836.75H994.951L997 833.472L999.049 836.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1013.05 836.75H1008.95L1011 833.472L1013.05 836.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1027.05 836.75H1022.95L1025 833.472L1027.05 836.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1041.05 836.75H1036.95L1039 833.472L1041.05 836.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1055.05 836.75H1050.95L1053 833.472L1055.05 836.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1069.05 836.75H1064.95L1067 833.472L1069.05 836.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1083.05 836.75H1078.95L1081 833.472L1083.05 836.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1097.05 836.75H1092.95L1095 833.472L1097.05 836.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1111.05 836.75H1106.95L1109 833.472L1111.05 836.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1125.05 836.75H1120.95L1123 833.472L1125.05 836.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1139.05 836.75H1134.95L1137 833.472L1139.05 836.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1153.05 836.75H1148.95L1151 833.472L1153.05 836.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1167.05 836.75H1162.95L1165 833.472L1167.05 836.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1181.05 836.75H1176.95L1179 833.472L1181.05 836.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1195.05 836.75H1190.95L1193 833.472L1195.05 836.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1209.05 836.75H1204.95L1207 833.472L1209.05 836.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1223.05 836.75H1218.95L1221 833.472L1223.05 836.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1237.05 836.75H1232.95L1235 833.472L1237.05 836.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1251.05 836.75H1246.95L1249 833.472L1251.05 836.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1265.05 836.75H1260.95L1263 833.472L1265.05 836.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1279.05 836.75H1274.95L1277 833.472L1279.05 836.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1293.05 836.75H1288.95L1291 833.472L1293.05 836.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1307.05 836.75H1302.95L1305 833.472L1307.05 836.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1321.05 836.75H1316.95L1319 833.472L1321.05 836.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1335.05 836.75H1330.95L1333 833.472L1335.05 836.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1349.05 836.75H1344.95L1347 833.472L1349.05 836.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1363.05 836.75H1358.95L1361 833.472L1363.05 836.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1377.05 836.75H1372.95L1375 833.472L1377.05 836.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1391.05 836.75H1386.95L1389 833.472L1391.05 836.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1405.05 836.75H1400.95L1403 833.472L1405.05 836.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1419.05 836.75H1414.95L1417 833.472L1419.05 836.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1433.05 836.75H1428.95L1431 833.472L1433.05 836.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M5.04894 852.75H0.951062L3 849.472L5.04894 852.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M19.0489 852.75H14.9511L17 849.472L19.0489 852.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M33.0489 852.75H28.9511L31 849.472L33.0489 852.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M47.0489 852.75H42.9511L45 849.472L47.0489 852.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M61.0489 852.75H56.9511L59 849.472L61.0489 852.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M75.0489 852.75H70.9511L73 849.472L75.0489 852.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M89.0489 852.75H84.9511L87 849.472L89.0489 852.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M103.049 852.75H98.9511L101 849.472L103.049 852.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M117.049 852.75H112.951L115 849.472L117.049 852.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M131.049 852.75H126.951L129 849.472L131.049 852.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M145.049 852.75H140.951L143 849.472L145.049 852.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M159.049 852.75H154.951L157 849.472L159.049 852.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M173.049 852.75H168.951L171 849.472L173.049 852.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M187.049 852.75H182.951L185 849.472L187.049 852.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M201.049 852.75H196.951L199 849.472L201.049 852.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M215.049 852.75H210.951L213 849.472L215.049 852.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M229.049 852.75H224.951L227 849.472L229.049 852.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M243.049 852.75H238.951L241 849.472L243.049 852.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M257.049 852.75H252.951L255 849.472L257.049 852.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M271.049 852.75H266.951L269 849.472L271.049 852.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M285.049 852.75H280.951L283 849.472L285.049 852.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M299.049 852.75H294.951L297 849.472L299.049 852.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M313.049 852.75H308.951L311 849.472L313.049 852.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M327.049 852.75H322.951L325 849.472L327.049 852.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M341.049 852.75H336.951L339 849.472L341.049 852.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M355.049 852.75H350.951L353 849.472L355.049 852.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M369.049 852.75H364.951L367 849.472L369.049 852.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M383.049 852.75H378.951L381 849.472L383.049 852.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M397.049 852.75H392.951L395 849.472L397.049 852.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M411.049 852.75H406.951L409 849.472L411.049 852.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M425.049 852.75H420.951L423 849.472L425.049 852.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M439.049 852.75H434.951L437 849.472L439.049 852.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M453.049 852.75H448.951L451 849.472L453.049 852.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M467.049 852.75H462.951L465 849.472L467.049 852.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M481.049 852.75H476.951L479 849.472L481.049 852.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M495.049 852.75H490.951L493 849.472L495.049 852.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M509.049 852.75H504.951L507 849.472L509.049 852.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M523.049 852.75H518.951L521 849.472L523.049 852.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M537.049 852.75H532.951L535 849.472L537.049 852.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M551.049 852.75H546.951L549 849.472L551.049 852.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M565.049 852.75H560.951L563 849.472L565.049 852.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M579.049 852.75H574.951L577 849.472L579.049 852.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M593.049 852.75H588.951L591 849.472L593.049 852.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M607.049 852.75H602.951L605 849.472L607.049 852.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M621.049 852.75H616.951L619 849.472L621.049 852.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M635.049 852.75H630.951L633 849.472L635.049 852.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M649.049 852.75H644.951L647 849.472L649.049 852.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M663.049 852.75H658.951L661 849.472L663.049 852.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M677.049 852.75H672.951L675 849.472L677.049 852.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M691.049 852.75H686.951L689 849.472L691.049 852.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M705.049 852.75H700.951L703 849.472L705.049 852.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M719.049 852.75H714.951L717 849.472L719.049 852.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M733.049 852.75H728.951L731 849.472L733.049 852.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M747.049 852.75H742.951L745 849.472L747.049 852.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M761.049 852.75H756.951L759 849.472L761.049 852.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M775.049 852.75H770.951L773 849.472L775.049 852.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M789.049 852.75H784.951L787 849.472L789.049 852.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M803.049 852.75H798.951L801 849.472L803.049 852.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M817.049 852.75H812.951L815 849.472L817.049 852.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M831.049 852.75H826.951L829 849.472L831.049 852.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M845.049 852.75H840.951L843 849.472L845.049 852.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M859.049 852.75H854.951L857 849.472L859.049 852.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M873.049 852.75H868.951L871 849.472L873.049 852.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M887.049 852.75H882.951L885 849.472L887.049 852.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M901.049 852.75H896.951L899 849.472L901.049 852.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M915.049 852.75H910.951L913 849.472L915.049 852.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M929.049 852.75H924.951L927 849.472L929.049 852.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M943.049 852.75H938.951L941 849.472L943.049 852.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M957.049 852.75H952.951L955 849.472L957.049 852.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M971.049 852.75H966.951L969 849.472L971.049 852.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M985.049 852.75H980.951L983 849.472L985.049 852.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M999.049 852.75H994.951L997 849.472L999.049 852.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1013.05 852.75H1008.95L1011 849.472L1013.05 852.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1027.05 852.75H1022.95L1025 849.472L1027.05 852.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1041.05 852.75H1036.95L1039 849.472L1041.05 852.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1055.05 852.75H1050.95L1053 849.472L1055.05 852.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1069.05 852.75H1064.95L1067 849.472L1069.05 852.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1083.05 852.75H1078.95L1081 849.472L1083.05 852.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1097.05 852.75H1092.95L1095 849.472L1097.05 852.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1111.05 852.75H1106.95L1109 849.472L1111.05 852.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1125.05 852.75H1120.95L1123 849.472L1125.05 852.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1139.05 852.75H1134.95L1137 849.472L1139.05 852.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1153.05 852.75H1148.95L1151 849.472L1153.05 852.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1167.05 852.75H1162.95L1165 849.472L1167.05 852.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1181.05 852.75H1176.95L1179 849.472L1181.05 852.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1195.05 852.75H1190.95L1193 849.472L1195.05 852.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1209.05 852.75H1204.95L1207 849.472L1209.05 852.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1223.05 852.75H1218.95L1221 849.472L1223.05 852.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1237.05 852.75H1232.95L1235 849.472L1237.05 852.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1251.05 852.75H1246.95L1249 849.472L1251.05 852.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1265.05 852.75H1260.95L1263 849.472L1265.05 852.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1279.05 852.75H1274.95L1277 849.472L1279.05 852.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1293.05 852.75H1288.95L1291 849.472L1293.05 852.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1307.05 852.75H1302.95L1305 849.472L1307.05 852.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1321.05 852.75H1316.95L1319 849.472L1321.05 852.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1335.05 852.75H1330.95L1333 849.472L1335.05 852.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1349.05 852.75H1344.95L1347 849.472L1349.05 852.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1363.05 852.75H1358.95L1361 849.472L1363.05 852.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1377.05 852.75H1372.95L1375 849.472L1377.05 852.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1391.05 852.75H1386.95L1389 849.472L1391.05 852.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1405.05 852.75H1400.95L1403 849.472L1405.05 852.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1419.05 852.75H1414.95L1417 849.472L1419.05 852.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1433.05 852.75H1428.95L1431 849.472L1433.05 852.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M5.04894 868.75H0.951062L3 865.472L5.04894 868.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M19.0489 868.75H14.9511L17 865.472L19.0489 868.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M33.0489 868.75H28.9511L31 865.472L33.0489 868.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M47.0489 868.75H42.9511L45 865.472L47.0489 868.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M61.0489 868.75H56.9511L59 865.472L61.0489 868.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M75.0489 868.75H70.9511L73 865.472L75.0489 868.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M89.0489 868.75H84.9511L87 865.472L89.0489 868.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M103.049 868.75H98.9511L101 865.472L103.049 868.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M117.049 868.75H112.951L115 865.472L117.049 868.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M131.049 868.75H126.951L129 865.472L131.049 868.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M145.049 868.75H140.951L143 865.472L145.049 868.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M159.049 868.75H154.951L157 865.472L159.049 868.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M173.049 868.75H168.951L171 865.472L173.049 868.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M187.049 868.75H182.951L185 865.472L187.049 868.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M201.049 868.75H196.951L199 865.472L201.049 868.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M215.049 868.75H210.951L213 865.472L215.049 868.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M229.049 868.75H224.951L227 865.472L229.049 868.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M243.049 868.75H238.951L241 865.472L243.049 868.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M257.049 868.75H252.951L255 865.472L257.049 868.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M271.049 868.75H266.951L269 865.472L271.049 868.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M285.049 868.75H280.951L283 865.472L285.049 868.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M299.049 868.75H294.951L297 865.472L299.049 868.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M313.049 868.75H308.951L311 865.472L313.049 868.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M327.049 868.75H322.951L325 865.472L327.049 868.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M341.049 868.75H336.951L339 865.472L341.049 868.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M355.049 868.75H350.951L353 865.472L355.049 868.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M369.049 868.75H364.951L367 865.472L369.049 868.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M383.049 868.75H378.951L381 865.472L383.049 868.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M397.049 868.75H392.951L395 865.472L397.049 868.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M411.049 868.75H406.951L409 865.472L411.049 868.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M425.049 868.75H420.951L423 865.472L425.049 868.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M439.049 868.75H434.951L437 865.472L439.049 868.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M453.049 868.75H448.951L451 865.472L453.049 868.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M467.049 868.75H462.951L465 865.472L467.049 868.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M481.049 868.75H476.951L479 865.472L481.049 868.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M495.049 868.75H490.951L493 865.472L495.049 868.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M509.049 868.75H504.951L507 865.472L509.049 868.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M523.049 868.75H518.951L521 865.472L523.049 868.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M537.049 868.75H532.951L535 865.472L537.049 868.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M551.049 868.75H546.951L549 865.472L551.049 868.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M565.049 868.75H560.951L563 865.472L565.049 868.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M579.049 868.75H574.951L577 865.472L579.049 868.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M593.049 868.75H588.951L591 865.472L593.049 868.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M607.049 868.75H602.951L605 865.472L607.049 868.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M621.049 868.75H616.951L619 865.472L621.049 868.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M635.049 868.75H630.951L633 865.472L635.049 868.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M649.049 868.75H644.951L647 865.472L649.049 868.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M663.049 868.75H658.951L661 865.472L663.049 868.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M677.049 868.75H672.951L675 865.472L677.049 868.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M691.049 868.75H686.951L689 865.472L691.049 868.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M705.049 868.75H700.951L703 865.472L705.049 868.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M719.049 868.75H714.951L717 865.472L719.049 868.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M733.049 868.75H728.951L731 865.472L733.049 868.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M747.049 868.75H742.951L745 865.472L747.049 868.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M761.049 868.75H756.951L759 865.472L761.049 868.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M775.049 868.75H770.951L773 865.472L775.049 868.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M789.049 868.75H784.951L787 865.472L789.049 868.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M803.049 868.75H798.951L801 865.472L803.049 868.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M817.049 868.75H812.951L815 865.472L817.049 868.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M831.049 868.75H826.951L829 865.472L831.049 868.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M845.049 868.75H840.951L843 865.472L845.049 868.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M859.049 868.75H854.951L857 865.472L859.049 868.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M873.049 868.75H868.951L871 865.472L873.049 868.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M887.049 868.75H882.951L885 865.472L887.049 868.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M901.049 868.75H896.951L899 865.472L901.049 868.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M915.049 868.75H910.951L913 865.472L915.049 868.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M929.049 868.75H924.951L927 865.472L929.049 868.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M943.049 868.75H938.951L941 865.472L943.049 868.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M957.049 868.75H952.951L955 865.472L957.049 868.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M971.049 868.75H966.951L969 865.472L971.049 868.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M985.049 868.75H980.951L983 865.472L985.049 868.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M999.049 868.75H994.951L997 865.472L999.049 868.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1013.05 868.75H1008.95L1011 865.472L1013.05 868.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1027.05 868.75H1022.95L1025 865.472L1027.05 868.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1041.05 868.75H1036.95L1039 865.472L1041.05 868.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1055.05 868.75H1050.95L1053 865.472L1055.05 868.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1069.05 868.75H1064.95L1067 865.472L1069.05 868.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1083.05 868.75H1078.95L1081 865.472L1083.05 868.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1097.05 868.75H1092.95L1095 865.472L1097.05 868.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1111.05 868.75H1106.95L1109 865.472L1111.05 868.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1125.05 868.75H1120.95L1123 865.472L1125.05 868.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1139.05 868.75H1134.95L1137 865.472L1139.05 868.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1153.05 868.75H1148.95L1151 865.472L1153.05 868.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1167.05 868.75H1162.95L1165 865.472L1167.05 868.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1181.05 868.75H1176.95L1179 865.472L1181.05 868.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1195.05 868.75H1190.95L1193 865.472L1195.05 868.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1209.05 868.75H1204.95L1207 865.472L1209.05 868.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1223.05 868.75H1218.95L1221 865.472L1223.05 868.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1237.05 868.75H1232.95L1235 865.472L1237.05 868.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1251.05 868.75H1246.95L1249 865.472L1251.05 868.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1265.05 868.75H1260.95L1263 865.472L1265.05 868.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1279.05 868.75H1274.95L1277 865.472L1279.05 868.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1293.05 868.75H1288.95L1291 865.472L1293.05 868.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1307.05 868.75H1302.95L1305 865.472L1307.05 868.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1321.05 868.75H1316.95L1319 865.472L1321.05 868.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1335.05 868.75H1330.95L1333 865.472L1335.05 868.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1349.05 868.75H1344.95L1347 865.472L1349.05 868.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1363.05 868.75H1358.95L1361 865.472L1363.05 868.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1377.05 868.75H1372.95L1375 865.472L1377.05 868.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1391.05 868.75H1386.95L1389 865.472L1391.05 868.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1405.05 868.75H1400.95L1403 865.472L1405.05 868.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1419.05 868.75H1414.95L1417 865.472L1419.05 868.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1433.05 868.75H1428.95L1431 865.472L1433.05 868.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M5.04894 884.75H0.951062L3 881.472L5.04894 884.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M19.0489 884.75H14.9511L17 881.472L19.0489 884.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M33.0489 884.75H28.9511L31 881.472L33.0489 884.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M47.0489 884.75H42.9511L45 881.472L47.0489 884.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M61.0489 884.75H56.9511L59 881.472L61.0489 884.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M75.0489 884.75H70.9511L73 881.472L75.0489 884.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M89.0489 884.75H84.9511L87 881.472L89.0489 884.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M103.049 884.75H98.9511L101 881.472L103.049 884.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M117.049 884.75H112.951L115 881.472L117.049 884.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M131.049 884.75H126.951L129 881.472L131.049 884.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M145.049 884.75H140.951L143 881.472L145.049 884.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M159.049 884.75H154.951L157 881.472L159.049 884.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M173.049 884.75H168.951L171 881.472L173.049 884.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M187.049 884.75H182.951L185 881.472L187.049 884.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M201.049 884.75H196.951L199 881.472L201.049 884.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M215.049 884.75H210.951L213 881.472L215.049 884.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M229.049 884.75H224.951L227 881.472L229.049 884.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M243.049 884.75H238.951L241 881.472L243.049 884.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M257.049 884.75H252.951L255 881.472L257.049 884.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M271.049 884.75H266.951L269 881.472L271.049 884.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M285.049 884.75H280.951L283 881.472L285.049 884.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M299.049 884.75H294.951L297 881.472L299.049 884.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M313.049 884.75H308.951L311 881.472L313.049 884.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M327.049 884.75H322.951L325 881.472L327.049 884.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M341.049 884.75H336.951L339 881.472L341.049 884.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M355.049 884.75H350.951L353 881.472L355.049 884.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M369.049 884.75H364.951L367 881.472L369.049 884.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M383.049 884.75H378.951L381 881.472L383.049 884.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M397.049 884.75H392.951L395 881.472L397.049 884.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M411.049 884.75H406.951L409 881.472L411.049 884.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M425.049 884.75H420.951L423 881.472L425.049 884.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M439.049 884.75H434.951L437 881.472L439.049 884.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M453.049 884.75H448.951L451 881.472L453.049 884.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M467.049 884.75H462.951L465 881.472L467.049 884.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M481.049 884.75H476.951L479 881.472L481.049 884.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M495.049 884.75H490.951L493 881.472L495.049 884.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M509.049 884.75H504.951L507 881.472L509.049 884.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M523.049 884.75H518.951L521 881.472L523.049 884.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M537.049 884.75H532.951L535 881.472L537.049 884.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M551.049 884.75H546.951L549 881.472L551.049 884.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M565.049 884.75H560.951L563 881.472L565.049 884.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M579.049 884.75H574.951L577 881.472L579.049 884.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M593.049 884.75H588.951L591 881.472L593.049 884.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M607.049 884.75H602.951L605 881.472L607.049 884.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M621.049 884.75H616.951L619 881.472L621.049 884.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M635.049 884.75H630.951L633 881.472L635.049 884.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M649.049 884.75H644.951L647 881.472L649.049 884.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M663.049 884.75H658.951L661 881.472L663.049 884.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M677.049 884.75H672.951L675 881.472L677.049 884.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M691.049 884.75H686.951L689 881.472L691.049 884.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M705.049 884.75H700.951L703 881.472L705.049 884.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M719.049 884.75H714.951L717 881.472L719.049 884.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M733.049 884.75H728.951L731 881.472L733.049 884.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M747.049 884.75H742.951L745 881.472L747.049 884.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M761.049 884.75H756.951L759 881.472L761.049 884.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M775.049 884.75H770.951L773 881.472L775.049 884.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M789.049 884.75H784.951L787 881.472L789.049 884.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M803.049 884.75H798.951L801 881.472L803.049 884.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M817.049 884.75H812.951L815 881.472L817.049 884.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M831.049 884.75H826.951L829 881.472L831.049 884.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M845.049 884.75H840.951L843 881.472L845.049 884.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M859.049 884.75H854.951L857 881.472L859.049 884.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M873.049 884.75H868.951L871 881.472L873.049 884.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M887.049 884.75H882.951L885 881.472L887.049 884.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M901.049 884.75H896.951L899 881.472L901.049 884.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M915.049 884.75H910.951L913 881.472L915.049 884.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M929.049 884.75H924.951L927 881.472L929.049 884.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M943.049 884.75H938.951L941 881.472L943.049 884.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M957.049 884.75H952.951L955 881.472L957.049 884.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M971.049 884.75H966.951L969 881.472L971.049 884.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M985.049 884.75H980.951L983 881.472L985.049 884.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M999.049 884.75H994.951L997 881.472L999.049 884.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1013.05 884.75H1008.95L1011 881.472L1013.05 884.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1027.05 884.75H1022.95L1025 881.472L1027.05 884.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1041.05 884.75H1036.95L1039 881.472L1041.05 884.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1055.05 884.75H1050.95L1053 881.472L1055.05 884.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1069.05 884.75H1064.95L1067 881.472L1069.05 884.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1083.05 884.75H1078.95L1081 881.472L1083.05 884.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1097.05 884.75H1092.95L1095 881.472L1097.05 884.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1111.05 884.75H1106.95L1109 881.472L1111.05 884.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1125.05 884.75H1120.95L1123 881.472L1125.05 884.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1139.05 884.75H1134.95L1137 881.472L1139.05 884.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1153.05 884.75H1148.95L1151 881.472L1153.05 884.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1167.05 884.75H1162.95L1165 881.472L1167.05 884.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1181.05 884.75H1176.95L1179 881.472L1181.05 884.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1195.05 884.75H1190.95L1193 881.472L1195.05 884.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1209.05 884.75H1204.95L1207 881.472L1209.05 884.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1223.05 884.75H1218.95L1221 881.472L1223.05 884.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1237.05 884.75H1232.95L1235 881.472L1237.05 884.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1251.05 884.75H1246.95L1249 881.472L1251.05 884.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1265.05 884.75H1260.95L1263 881.472L1265.05 884.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1279.05 884.75H1274.95L1277 881.472L1279.05 884.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1293.05 884.75H1288.95L1291 881.472L1293.05 884.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1307.05 884.75H1302.95L1305 881.472L1307.05 884.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1321.05 884.75H1316.95L1319 881.472L1321.05 884.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1335.05 884.75H1330.95L1333 881.472L1335.05 884.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1349.05 884.75H1344.95L1347 881.472L1349.05 884.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1363.05 884.75H1358.95L1361 881.472L1363.05 884.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1377.05 884.75H1372.95L1375 881.472L1377.05 884.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1391.05 884.75H1386.95L1389 881.472L1391.05 884.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1405.05 884.75H1400.95L1403 881.472L1405.05 884.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1419.05 884.75H1414.95L1417 881.472L1419.05 884.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1433.05 884.75H1428.95L1431 881.472L1433.05 884.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M5.04894 900.75H0.951062L3 897.472L5.04894 900.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M19.0489 900.75H14.9511L17 897.472L19.0489 900.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M33.0489 900.75H28.9511L31 897.472L33.0489 900.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M47.0489 900.75H42.9511L45 897.472L47.0489 900.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M61.0489 900.75H56.9511L59 897.472L61.0489 900.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M75.0489 900.75H70.9511L73 897.472L75.0489 900.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M89.0489 900.75H84.9511L87 897.472L89.0489 900.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M103.049 900.75H98.9511L101 897.472L103.049 900.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M117.049 900.75H112.951L115 897.472L117.049 900.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M131.049 900.75H126.951L129 897.472L131.049 900.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M145.049 900.75H140.951L143 897.472L145.049 900.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M159.049 900.75H154.951L157 897.472L159.049 900.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M173.049 900.75H168.951L171 897.472L173.049 900.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M187.049 900.75H182.951L185 897.472L187.049 900.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M201.049 900.75H196.951L199 897.472L201.049 900.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M215.049 900.75H210.951L213 897.472L215.049 900.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M229.049 900.75H224.951L227 897.472L229.049 900.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M243.049 900.75H238.951L241 897.472L243.049 900.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M257.049 900.75H252.951L255 897.472L257.049 900.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M271.049 900.75H266.951L269 897.472L271.049 900.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M285.049 900.75H280.951L283 897.472L285.049 900.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M299.049 900.75H294.951L297 897.472L299.049 900.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M313.049 900.75H308.951L311 897.472L313.049 900.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M327.049 900.75H322.951L325 897.472L327.049 900.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M341.049 900.75H336.951L339 897.472L341.049 900.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M355.049 900.75H350.951L353 897.472L355.049 900.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M369.049 900.75H364.951L367 897.472L369.049 900.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M383.049 900.75H378.951L381 897.472L383.049 900.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M397.049 900.75H392.951L395 897.472L397.049 900.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M411.049 900.75H406.951L409 897.472L411.049 900.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M425.049 900.75H420.951L423 897.472L425.049 900.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M439.049 900.75H434.951L437 897.472L439.049 900.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M453.049 900.75H448.951L451 897.472L453.049 900.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M467.049 900.75H462.951L465 897.472L467.049 900.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M481.049 900.75H476.951L479 897.472L481.049 900.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M495.049 900.75H490.951L493 897.472L495.049 900.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M509.049 900.75H504.951L507 897.472L509.049 900.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M523.049 900.75H518.951L521 897.472L523.049 900.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M537.049 900.75H532.951L535 897.472L537.049 900.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M551.049 900.75H546.951L549 897.472L551.049 900.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M565.049 900.75H560.951L563 897.472L565.049 900.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M579.049 900.75H574.951L577 897.472L579.049 900.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M593.049 900.75H588.951L591 897.472L593.049 900.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M607.049 900.75H602.951L605 897.472L607.049 900.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M621.049 900.75H616.951L619 897.472L621.049 900.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M635.049 900.75H630.951L633 897.472L635.049 900.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M649.049 900.75H644.951L647 897.472L649.049 900.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M663.049 900.75H658.951L661 897.472L663.049 900.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M677.049 900.75H672.951L675 897.472L677.049 900.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M691.049 900.75H686.951L689 897.472L691.049 900.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M705.049 900.75H700.951L703 897.472L705.049 900.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M719.049 900.75H714.951L717 897.472L719.049 900.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M733.049 900.75H728.951L731 897.472L733.049 900.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M747.049 900.75H742.951L745 897.472L747.049 900.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M761.049 900.75H756.951L759 897.472L761.049 900.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M775.049 900.75H770.951L773 897.472L775.049 900.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M789.049 900.75H784.951L787 897.472L789.049 900.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M803.049 900.75H798.951L801 897.472L803.049 900.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M817.049 900.75H812.951L815 897.472L817.049 900.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M831.049 900.75H826.951L829 897.472L831.049 900.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M845.049 900.75H840.951L843 897.472L845.049 900.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M859.049 900.75H854.951L857 897.472L859.049 900.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M873.049 900.75H868.951L871 897.472L873.049 900.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M887.049 900.75H882.951L885 897.472L887.049 900.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M901.049 900.75H896.951L899 897.472L901.049 900.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M915.049 900.75H910.951L913 897.472L915.049 900.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M929.049 900.75H924.951L927 897.472L929.049 900.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M943.049 900.75H938.951L941 897.472L943.049 900.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M957.049 900.75H952.951L955 897.472L957.049 900.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M971.049 900.75H966.951L969 897.472L971.049 900.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M985.049 900.75H980.951L983 897.472L985.049 900.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M999.049 900.75H994.951L997 897.472L999.049 900.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1013.05 900.75H1008.95L1011 897.472L1013.05 900.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1027.05 900.75H1022.95L1025 897.472L1027.05 900.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1041.05 900.75H1036.95L1039 897.472L1041.05 900.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1055.05 900.75H1050.95L1053 897.472L1055.05 900.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1069.05 900.75H1064.95L1067 897.472L1069.05 900.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1083.05 900.75H1078.95L1081 897.472L1083.05 900.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1097.05 900.75H1092.95L1095 897.472L1097.05 900.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1111.05 900.75H1106.95L1109 897.472L1111.05 900.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1125.05 900.75H1120.95L1123 897.472L1125.05 900.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1139.05 900.75H1134.95L1137 897.472L1139.05 900.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1153.05 900.75H1148.95L1151 897.472L1153.05 900.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1167.05 900.75H1162.95L1165 897.472L1167.05 900.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1181.05 900.75H1176.95L1179 897.472L1181.05 900.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1195.05 900.75H1190.95L1193 897.472L1195.05 900.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1209.05 900.75H1204.95L1207 897.472L1209.05 900.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1223.05 900.75H1218.95L1221 897.472L1223.05 900.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1237.05 900.75H1232.95L1235 897.472L1237.05 900.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1251.05 900.75H1246.95L1249 897.472L1251.05 900.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1265.05 900.75H1260.95L1263 897.472L1265.05 900.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1279.05 900.75H1274.95L1277 897.472L1279.05 900.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1293.05 900.75H1288.95L1291 897.472L1293.05 900.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1307.05 900.75H1302.95L1305 897.472L1307.05 900.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1321.05 900.75H1316.95L1319 897.472L1321.05 900.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1335.05 900.75H1330.95L1333 897.472L1335.05 900.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1349.05 900.75H1344.95L1347 897.472L1349.05 900.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1363.05 900.75H1358.95L1361 897.472L1363.05 900.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1377.05 900.75H1372.95L1375 897.472L1377.05 900.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1391.05 900.75H1386.95L1389 897.472L1391.05 900.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1405.05 900.75H1400.95L1403 897.472L1405.05 900.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1419.05 900.75H1414.95L1417 897.472L1419.05 900.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1433.05 900.75H1428.95L1431 897.472L1433.05 900.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M5.04894 916.75H0.951062L3 913.472L5.04894 916.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M19.0489 916.75H14.9511L17 913.472L19.0489 916.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M33.0489 916.75H28.9511L31 913.472L33.0489 916.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M47.0489 916.75H42.9511L45 913.472L47.0489 916.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M61.0489 916.75H56.9511L59 913.472L61.0489 916.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M75.0489 916.75H70.9511L73 913.472L75.0489 916.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M89.0489 916.75H84.9511L87 913.472L89.0489 916.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M103.049 916.75H98.9511L101 913.472L103.049 916.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M117.049 916.75H112.951L115 913.472L117.049 916.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M131.049 916.75H126.951L129 913.472L131.049 916.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M145.049 916.75H140.951L143 913.472L145.049 916.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M159.049 916.75H154.951L157 913.472L159.049 916.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M173.049 916.75H168.951L171 913.472L173.049 916.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M187.049 916.75H182.951L185 913.472L187.049 916.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M201.049 916.75H196.951L199 913.472L201.049 916.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M215.049 916.75H210.951L213 913.472L215.049 916.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M229.049 916.75H224.951L227 913.472L229.049 916.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M243.049 916.75H238.951L241 913.472L243.049 916.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M257.049 916.75H252.951L255 913.472L257.049 916.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M271.049 916.75H266.951L269 913.472L271.049 916.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M285.049 916.75H280.951L283 913.472L285.049 916.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M299.049 916.75H294.951L297 913.472L299.049 916.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M313.049 916.75H308.951L311 913.472L313.049 916.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M327.049 916.75H322.951L325 913.472L327.049 916.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M341.049 916.75H336.951L339 913.472L341.049 916.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M355.049 916.75H350.951L353 913.472L355.049 916.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M369.049 916.75H364.951L367 913.472L369.049 916.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M383.049 916.75H378.951L381 913.472L383.049 916.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M397.049 916.75H392.951L395 913.472L397.049 916.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M411.049 916.75H406.951L409 913.472L411.049 916.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M425.049 916.75H420.951L423 913.472L425.049 916.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M439.049 916.75H434.951L437 913.472L439.049 916.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M453.049 916.75H448.951L451 913.472L453.049 916.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M467.049 916.75H462.951L465 913.472L467.049 916.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M481.049 916.75H476.951L479 913.472L481.049 916.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M495.049 916.75H490.951L493 913.472L495.049 916.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M509.049 916.75H504.951L507 913.472L509.049 916.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M523.049 916.75H518.951L521 913.472L523.049 916.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M537.049 916.75H532.951L535 913.472L537.049 916.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M551.049 916.75H546.951L549 913.472L551.049 916.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M565.049 916.75H560.951L563 913.472L565.049 916.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M579.049 916.75H574.951L577 913.472L579.049 916.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M593.049 916.75H588.951L591 913.472L593.049 916.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M607.049 916.75H602.951L605 913.472L607.049 916.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M621.049 916.75H616.951L619 913.472L621.049 916.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M635.049 916.75H630.951L633 913.472L635.049 916.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M649.049 916.75H644.951L647 913.472L649.049 916.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M663.049 916.75H658.951L661 913.472L663.049 916.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M677.049 916.75H672.951L675 913.472L677.049 916.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M691.049 916.75H686.951L689 913.472L691.049 916.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M705.049 916.75H700.951L703 913.472L705.049 916.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M719.049 916.75H714.951L717 913.472L719.049 916.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M733.049 916.75H728.951L731 913.472L733.049 916.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M747.049 916.75H742.951L745 913.472L747.049 916.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M761.049 916.75H756.951L759 913.472L761.049 916.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M775.049 916.75H770.951L773 913.472L775.049 916.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M789.049 916.75H784.951L787 913.472L789.049 916.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M803.049 916.75H798.951L801 913.472L803.049 916.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M817.049 916.75H812.951L815 913.472L817.049 916.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M831.049 916.75H826.951L829 913.472L831.049 916.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M845.049 916.75H840.951L843 913.472L845.049 916.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M859.049 916.75H854.951L857 913.472L859.049 916.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M873.049 916.75H868.951L871 913.472L873.049 916.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M887.049 916.75H882.951L885 913.472L887.049 916.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M901.049 916.75H896.951L899 913.472L901.049 916.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M915.049 916.75H910.951L913 913.472L915.049 916.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M929.049 916.75H924.951L927 913.472L929.049 916.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M943.049 916.75H938.951L941 913.472L943.049 916.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M957.049 916.75H952.951L955 913.472L957.049 916.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M971.049 916.75H966.951L969 913.472L971.049 916.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M985.049 916.75H980.951L983 913.472L985.049 916.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M999.049 916.75H994.951L997 913.472L999.049 916.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1013.05 916.75H1008.95L1011 913.472L1013.05 916.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1027.05 916.75H1022.95L1025 913.472L1027.05 916.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1041.05 916.75H1036.95L1039 913.472L1041.05 916.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1055.05 916.75H1050.95L1053 913.472L1055.05 916.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1069.05 916.75H1064.95L1067 913.472L1069.05 916.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1083.05 916.75H1078.95L1081 913.472L1083.05 916.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1097.05 916.75H1092.95L1095 913.472L1097.05 916.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1111.05 916.75H1106.95L1109 913.472L1111.05 916.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1125.05 916.75H1120.95L1123 913.472L1125.05 916.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1139.05 916.75H1134.95L1137 913.472L1139.05 916.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1153.05 916.75H1148.95L1151 913.472L1153.05 916.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1167.05 916.75H1162.95L1165 913.472L1167.05 916.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1181.05 916.75H1176.95L1179 913.472L1181.05 916.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1195.05 916.75H1190.95L1193 913.472L1195.05 916.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1209.05 916.75H1204.95L1207 913.472L1209.05 916.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1223.05 916.75H1218.95L1221 913.472L1223.05 916.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1237.05 916.75H1232.95L1235 913.472L1237.05 916.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1251.05 916.75H1246.95L1249 913.472L1251.05 916.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1265.05 916.75H1260.95L1263 913.472L1265.05 916.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1279.05 916.75H1274.95L1277 913.472L1279.05 916.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1293.05 916.75H1288.95L1291 913.472L1293.05 916.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1307.05 916.75H1302.95L1305 913.472L1307.05 916.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1321.05 916.75H1316.95L1319 913.472L1321.05 916.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1335.05 916.75H1330.95L1333 913.472L1335.05 916.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1349.05 916.75H1344.95L1347 913.472L1349.05 916.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1363.05 916.75H1358.95L1361 913.472L1363.05 916.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1377.05 916.75H1372.95L1375 913.472L1377.05 916.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1391.05 916.75H1386.95L1389 913.472L1391.05 916.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1405.05 916.75H1400.95L1403 913.472L1405.05 916.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1419.05 916.75H1414.95L1417 913.472L1419.05 916.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1433.05 916.75H1428.95L1431 913.472L1433.05 916.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M5.04894 932.75H0.951062L3 929.472L5.04894 932.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M19.0489 932.75H14.9511L17 929.472L19.0489 932.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M33.0489 932.75H28.9511L31 929.472L33.0489 932.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M47.0489 932.75H42.9511L45 929.472L47.0489 932.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M61.0489 932.75H56.9511L59 929.472L61.0489 932.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M75.0489 932.75H70.9511L73 929.472L75.0489 932.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M89.0489 932.75H84.9511L87 929.472L89.0489 932.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M103.049 932.75H98.9511L101 929.472L103.049 932.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M117.049 932.75H112.951L115 929.472L117.049 932.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M131.049 932.75H126.951L129 929.472L131.049 932.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M145.049 932.75H140.951L143 929.472L145.049 932.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M159.049 932.75H154.951L157 929.472L159.049 932.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M173.049 932.75H168.951L171 929.472L173.049 932.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M187.049 932.75H182.951L185 929.472L187.049 932.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M201.049 932.75H196.951L199 929.472L201.049 932.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M215.049 932.75H210.951L213 929.472L215.049 932.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M229.049 932.75H224.951L227 929.472L229.049 932.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M243.049 932.75H238.951L241 929.472L243.049 932.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M257.049 932.75H252.951L255 929.472L257.049 932.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M271.049 932.75H266.951L269 929.472L271.049 932.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M285.049 932.75H280.951L283 929.472L285.049 932.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M299.049 932.75H294.951L297 929.472L299.049 932.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M313.049 932.75H308.951L311 929.472L313.049 932.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M327.049 932.75H322.951L325 929.472L327.049 932.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M341.049 932.75H336.951L339 929.472L341.049 932.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M355.049 932.75H350.951L353 929.472L355.049 932.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M369.049 932.75H364.951L367 929.472L369.049 932.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M383.049 932.75H378.951L381 929.472L383.049 932.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M397.049 932.75H392.951L395 929.472L397.049 932.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M411.049 932.75H406.951L409 929.472L411.049 932.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M425.049 932.75H420.951L423 929.472L425.049 932.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M439.049 932.75H434.951L437 929.472L439.049 932.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M453.049 932.75H448.951L451 929.472L453.049 932.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M467.049 932.75H462.951L465 929.472L467.049 932.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M481.049 932.75H476.951L479 929.472L481.049 932.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M495.049 932.75H490.951L493 929.472L495.049 932.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M509.049 932.75H504.951L507 929.472L509.049 932.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M523.049 932.75H518.951L521 929.472L523.049 932.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M537.049 932.75H532.951L535 929.472L537.049 932.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M551.049 932.75H546.951L549 929.472L551.049 932.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M565.049 932.75H560.951L563 929.472L565.049 932.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M579.049 932.75H574.951L577 929.472L579.049 932.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M593.049 932.75H588.951L591 929.472L593.049 932.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M607.049 932.75H602.951L605 929.472L607.049 932.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M621.049 932.75H616.951L619 929.472L621.049 932.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M635.049 932.75H630.951L633 929.472L635.049 932.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M649.049 932.75H644.951L647 929.472L649.049 932.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M663.049 932.75H658.951L661 929.472L663.049 932.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M677.049 932.75H672.951L675 929.472L677.049 932.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M691.049 932.75H686.951L689 929.472L691.049 932.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M705.049 932.75H700.951L703 929.472L705.049 932.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M719.049 932.75H714.951L717 929.472L719.049 932.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M733.049 932.75H728.951L731 929.472L733.049 932.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M747.049 932.75H742.951L745 929.472L747.049 932.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M761.049 932.75H756.951L759 929.472L761.049 932.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M775.049 932.75H770.951L773 929.472L775.049 932.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M789.049 932.75H784.951L787 929.472L789.049 932.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M803.049 932.75H798.951L801 929.472L803.049 932.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M817.049 932.75H812.951L815 929.472L817.049 932.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M831.049 932.75H826.951L829 929.472L831.049 932.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M845.049 932.75H840.951L843 929.472L845.049 932.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M859.049 932.75H854.951L857 929.472L859.049 932.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M873.049 932.75H868.951L871 929.472L873.049 932.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M887.049 932.75H882.951L885 929.472L887.049 932.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M901.049 932.75H896.951L899 929.472L901.049 932.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M915.049 932.75H910.951L913 929.472L915.049 932.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M929.049 932.75H924.951L927 929.472L929.049 932.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M943.049 932.75H938.951L941 929.472L943.049 932.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M957.049 932.75H952.951L955 929.472L957.049 932.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M971.049 932.75H966.951L969 929.472L971.049 932.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M985.049 932.75H980.951L983 929.472L985.049 932.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M999.049 932.75H994.951L997 929.472L999.049 932.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1013.05 932.75H1008.95L1011 929.472L1013.05 932.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1027.05 932.75H1022.95L1025 929.472L1027.05 932.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1041.05 932.75H1036.95L1039 929.472L1041.05 932.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1055.05 932.75H1050.95L1053 929.472L1055.05 932.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1069.05 932.75H1064.95L1067 929.472L1069.05 932.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1083.05 932.75H1078.95L1081 929.472L1083.05 932.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1097.05 932.75H1092.95L1095 929.472L1097.05 932.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1111.05 932.75H1106.95L1109 929.472L1111.05 932.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1125.05 932.75H1120.95L1123 929.472L1125.05 932.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1139.05 932.75H1134.95L1137 929.472L1139.05 932.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1153.05 932.75H1148.95L1151 929.472L1153.05 932.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1167.05 932.75H1162.95L1165 929.472L1167.05 932.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1181.05 932.75H1176.95L1179 929.472L1181.05 932.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1195.05 932.75H1190.95L1193 929.472L1195.05 932.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1209.05 932.75H1204.95L1207 929.472L1209.05 932.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1223.05 932.75H1218.95L1221 929.472L1223.05 932.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1237.05 932.75H1232.95L1235 929.472L1237.05 932.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1251.05 932.75H1246.95L1249 929.472L1251.05 932.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1265.05 932.75H1260.95L1263 929.472L1265.05 932.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1279.05 932.75H1274.95L1277 929.472L1279.05 932.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1293.05 932.75H1288.95L1291 929.472L1293.05 932.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1307.05 932.75H1302.95L1305 929.472L1307.05 932.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1321.05 932.75H1316.95L1319 929.472L1321.05 932.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1335.05 932.75H1330.95L1333 929.472L1335.05 932.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1349.05 932.75H1344.95L1347 929.472L1349.05 932.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1363.05 932.75H1358.95L1361 929.472L1363.05 932.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1377.05 932.75H1372.95L1375 929.472L1377.05 932.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1391.05 932.75H1386.95L1389 929.472L1391.05 932.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1405.05 932.75H1400.95L1403 929.472L1405.05 932.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1419.05 932.75H1414.95L1417 929.472L1419.05 932.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1433.05 932.75H1428.95L1431 929.472L1433.05 932.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M5.04894 948.75H0.951062L3 945.472L5.04894 948.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M19.0489 948.75H14.9511L17 945.472L19.0489 948.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M33.0489 948.75H28.9511L31 945.472L33.0489 948.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M47.0489 948.75H42.9511L45 945.472L47.0489 948.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M61.0489 948.75H56.9511L59 945.472L61.0489 948.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M75.0489 948.75H70.9511L73 945.472L75.0489 948.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M89.0489 948.75H84.9511L87 945.472L89.0489 948.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M103.049 948.75H98.9511L101 945.472L103.049 948.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M117.049 948.75H112.951L115 945.472L117.049 948.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M131.049 948.75H126.951L129 945.472L131.049 948.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M145.049 948.75H140.951L143 945.472L145.049 948.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M159.049 948.75H154.951L157 945.472L159.049 948.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M173.049 948.75H168.951L171 945.472L173.049 948.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M187.049 948.75H182.951L185 945.472L187.049 948.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M201.049 948.75H196.951L199 945.472L201.049 948.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M215.049 948.75H210.951L213 945.472L215.049 948.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M229.049 948.75H224.951L227 945.472L229.049 948.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M243.049 948.75H238.951L241 945.472L243.049 948.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M257.049 948.75H252.951L255 945.472L257.049 948.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M271.049 948.75H266.951L269 945.472L271.049 948.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M285.049 948.75H280.951L283 945.472L285.049 948.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M299.049 948.75H294.951L297 945.472L299.049 948.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M313.049 948.75H308.951L311 945.472L313.049 948.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M327.049 948.75H322.951L325 945.472L327.049 948.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M341.049 948.75H336.951L339 945.472L341.049 948.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M355.049 948.75H350.951L353 945.472L355.049 948.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M369.049 948.75H364.951L367 945.472L369.049 948.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M383.049 948.75H378.951L381 945.472L383.049 948.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M397.049 948.75H392.951L395 945.472L397.049 948.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M411.049 948.75H406.951L409 945.472L411.049 948.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M425.049 948.75H420.951L423 945.472L425.049 948.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M439.049 948.75H434.951L437 945.472L439.049 948.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M453.049 948.75H448.951L451 945.472L453.049 948.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M467.049 948.75H462.951L465 945.472L467.049 948.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M481.049 948.75H476.951L479 945.472L481.049 948.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M495.049 948.75H490.951L493 945.472L495.049 948.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M509.049 948.75H504.951L507 945.472L509.049 948.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M523.049 948.75H518.951L521 945.472L523.049 948.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M537.049 948.75H532.951L535 945.472L537.049 948.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M551.049 948.75H546.951L549 945.472L551.049 948.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M565.049 948.75H560.951L563 945.472L565.049 948.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M579.049 948.75H574.951L577 945.472L579.049 948.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M593.049 948.75H588.951L591 945.472L593.049 948.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M607.049 948.75H602.951L605 945.472L607.049 948.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M621.049 948.75H616.951L619 945.472L621.049 948.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M635.049 948.75H630.951L633 945.472L635.049 948.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M649.049 948.75H644.951L647 945.472L649.049 948.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M663.049 948.75H658.951L661 945.472L663.049 948.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M677.049 948.75H672.951L675 945.472L677.049 948.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M691.049 948.75H686.951L689 945.472L691.049 948.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M705.049 948.75H700.951L703 945.472L705.049 948.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M719.049 948.75H714.951L717 945.472L719.049 948.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M733.049 948.75H728.951L731 945.472L733.049 948.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M747.049 948.75H742.951L745 945.472L747.049 948.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M761.049 948.75H756.951L759 945.472L761.049 948.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M775.049 948.75H770.951L773 945.472L775.049 948.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M789.049 948.75H784.951L787 945.472L789.049 948.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M803.049 948.75H798.951L801 945.472L803.049 948.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M817.049 948.75H812.951L815 945.472L817.049 948.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M831.049 948.75H826.951L829 945.472L831.049 948.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M845.049 948.75H840.951L843 945.472L845.049 948.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M859.049 948.75H854.951L857 945.472L859.049 948.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M873.049 948.75H868.951L871 945.472L873.049 948.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M887.049 948.75H882.951L885 945.472L887.049 948.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M901.049 948.75H896.951L899 945.472L901.049 948.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M915.049 948.75H910.951L913 945.472L915.049 948.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M929.049 948.75H924.951L927 945.472L929.049 948.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M943.049 948.75H938.951L941 945.472L943.049 948.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M957.049 948.75H952.951L955 945.472L957.049 948.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M971.049 948.75H966.951L969 945.472L971.049 948.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M985.049 948.75H980.951L983 945.472L985.049 948.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M999.049 948.75H994.951L997 945.472L999.049 948.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1013.05 948.75H1008.95L1011 945.472L1013.05 948.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1027.05 948.75H1022.95L1025 945.472L1027.05 948.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1041.05 948.75H1036.95L1039 945.472L1041.05 948.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1055.05 948.75H1050.95L1053 945.472L1055.05 948.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1069.05 948.75H1064.95L1067 945.472L1069.05 948.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1083.05 948.75H1078.95L1081 945.472L1083.05 948.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1097.05 948.75H1092.95L1095 945.472L1097.05 948.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1111.05 948.75H1106.95L1109 945.472L1111.05 948.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1125.05 948.75H1120.95L1123 945.472L1125.05 948.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1139.05 948.75H1134.95L1137 945.472L1139.05 948.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1153.05 948.75H1148.95L1151 945.472L1153.05 948.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1167.05 948.75H1162.95L1165 945.472L1167.05 948.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1181.05 948.75H1176.95L1179 945.472L1181.05 948.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1195.05 948.75H1190.95L1193 945.472L1195.05 948.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1209.05 948.75H1204.95L1207 945.472L1209.05 948.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1223.05 948.75H1218.95L1221 945.472L1223.05 948.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1237.05 948.75H1232.95L1235 945.472L1237.05 948.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1251.05 948.75H1246.95L1249 945.472L1251.05 948.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1265.05 948.75H1260.95L1263 945.472L1265.05 948.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1279.05 948.75H1274.95L1277 945.472L1279.05 948.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1293.05 948.75H1288.95L1291 945.472L1293.05 948.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1307.05 948.75H1302.95L1305 945.472L1307.05 948.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1321.05 948.75H1316.95L1319 945.472L1321.05 948.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1335.05 948.75H1330.95L1333 945.472L1335.05 948.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1349.05 948.75H1344.95L1347 945.472L1349.05 948.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1363.05 948.75H1358.95L1361 945.472L1363.05 948.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1377.05 948.75H1372.95L1375 945.472L1377.05 948.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1391.05 948.75H1386.95L1389 945.472L1391.05 948.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1405.05 948.75H1400.95L1403 945.472L1405.05 948.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1419.05 948.75H1414.95L1417 945.472L1419.05 948.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1433.05 948.75H1428.95L1431 945.472L1433.05 948.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M5.04894 964.75H0.951062L3 961.472L5.04894 964.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M19.0489 964.75H14.9511L17 961.472L19.0489 964.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M33.0489 964.75H28.9511L31 961.472L33.0489 964.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M47.0489 964.75H42.9511L45 961.472L47.0489 964.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M61.0489 964.75H56.9511L59 961.472L61.0489 964.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M75.0489 964.75H70.9511L73 961.472L75.0489 964.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M89.0489 964.75H84.9511L87 961.472L89.0489 964.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M103.049 964.75H98.9511L101 961.472L103.049 964.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M117.049 964.75H112.951L115 961.472L117.049 964.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M131.049 964.75H126.951L129 961.472L131.049 964.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M145.049 964.75H140.951L143 961.472L145.049 964.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M159.049 964.75H154.951L157 961.472L159.049 964.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M173.049 964.75H168.951L171 961.472L173.049 964.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M187.049 964.75H182.951L185 961.472L187.049 964.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M201.049 964.75H196.951L199 961.472L201.049 964.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M215.049 964.75H210.951L213 961.472L215.049 964.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M229.049 964.75H224.951L227 961.472L229.049 964.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M243.049 964.75H238.951L241 961.472L243.049 964.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M257.049 964.75H252.951L255 961.472L257.049 964.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M271.049 964.75H266.951L269 961.472L271.049 964.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M285.049 964.75H280.951L283 961.472L285.049 964.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M299.049 964.75H294.951L297 961.472L299.049 964.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M313.049 964.75H308.951L311 961.472L313.049 964.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M327.049 964.75H322.951L325 961.472L327.049 964.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M341.049 964.75H336.951L339 961.472L341.049 964.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M355.049 964.75H350.951L353 961.472L355.049 964.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M369.049 964.75H364.951L367 961.472L369.049 964.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M383.049 964.75H378.951L381 961.472L383.049 964.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M397.049 964.75H392.951L395 961.472L397.049 964.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M411.049 964.75H406.951L409 961.472L411.049 964.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M425.049 964.75H420.951L423 961.472L425.049 964.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M439.049 964.75H434.951L437 961.472L439.049 964.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M453.049 964.75H448.951L451 961.472L453.049 964.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M467.049 964.75H462.951L465 961.472L467.049 964.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M481.049 964.75H476.951L479 961.472L481.049 964.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M495.049 964.75H490.951L493 961.472L495.049 964.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M509.049 964.75H504.951L507 961.472L509.049 964.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M523.049 964.75H518.951L521 961.472L523.049 964.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M537.049 964.75H532.951L535 961.472L537.049 964.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M551.049 964.75H546.951L549 961.472L551.049 964.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M565.049 964.75H560.951L563 961.472L565.049 964.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M579.049 964.75H574.951L577 961.472L579.049 964.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M593.049 964.75H588.951L591 961.472L593.049 964.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M607.049 964.75H602.951L605 961.472L607.049 964.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M621.049 964.75H616.951L619 961.472L621.049 964.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M635.049 964.75H630.951L633 961.472L635.049 964.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M649.049 964.75H644.951L647 961.472L649.049 964.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M663.049 964.75H658.951L661 961.472L663.049 964.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M677.049 964.75H672.951L675 961.472L677.049 964.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M691.049 964.75H686.951L689 961.472L691.049 964.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M705.049 964.75H700.951L703 961.472L705.049 964.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M719.049 964.75H714.951L717 961.472L719.049 964.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M733.049 964.75H728.951L731 961.472L733.049 964.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M747.049 964.75H742.951L745 961.472L747.049 964.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M761.049 964.75H756.951L759 961.472L761.049 964.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M775.049 964.75H770.951L773 961.472L775.049 964.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M789.049 964.75H784.951L787 961.472L789.049 964.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M803.049 964.75H798.951L801 961.472L803.049 964.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M817.049 964.75H812.951L815 961.472L817.049 964.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M831.049 964.75H826.951L829 961.472L831.049 964.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M845.049 964.75H840.951L843 961.472L845.049 964.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M859.049 964.75H854.951L857 961.472L859.049 964.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M873.049 964.75H868.951L871 961.472L873.049 964.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M887.049 964.75H882.951L885 961.472L887.049 964.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M901.049 964.75H896.951L899 961.472L901.049 964.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M915.049 964.75H910.951L913 961.472L915.049 964.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M929.049 964.75H924.951L927 961.472L929.049 964.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M943.049 964.75H938.951L941 961.472L943.049 964.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M957.049 964.75H952.951L955 961.472L957.049 964.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M971.049 964.75H966.951L969 961.472L971.049 964.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M985.049 964.75H980.951L983 961.472L985.049 964.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M999.049 964.75H994.951L997 961.472L999.049 964.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1013.05 964.75H1008.95L1011 961.472L1013.05 964.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1027.05 964.75H1022.95L1025 961.472L1027.05 964.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1041.05 964.75H1036.95L1039 961.472L1041.05 964.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1055.05 964.75H1050.95L1053 961.472L1055.05 964.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1069.05 964.75H1064.95L1067 961.472L1069.05 964.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1083.05 964.75H1078.95L1081 961.472L1083.05 964.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1097.05 964.75H1092.95L1095 961.472L1097.05 964.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1111.05 964.75H1106.95L1109 961.472L1111.05 964.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1125.05 964.75H1120.95L1123 961.472L1125.05 964.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1139.05 964.75H1134.95L1137 961.472L1139.05 964.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1153.05 964.75H1148.95L1151 961.472L1153.05 964.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1167.05 964.75H1162.95L1165 961.472L1167.05 964.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1181.05 964.75H1176.95L1179 961.472L1181.05 964.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1195.05 964.75H1190.95L1193 961.472L1195.05 964.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1209.05 964.75H1204.95L1207 961.472L1209.05 964.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1223.05 964.75H1218.95L1221 961.472L1223.05 964.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1237.05 964.75H1232.95L1235 961.472L1237.05 964.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1251.05 964.75H1246.95L1249 961.472L1251.05 964.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1265.05 964.75H1260.95L1263 961.472L1265.05 964.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1279.05 964.75H1274.95L1277 961.472L1279.05 964.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1293.05 964.75H1288.95L1291 961.472L1293.05 964.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1307.05 964.75H1302.95L1305 961.472L1307.05 964.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1321.05 964.75H1316.95L1319 961.472L1321.05 964.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1335.05 964.75H1330.95L1333 961.472L1335.05 964.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1349.05 964.75H1344.95L1347 961.472L1349.05 964.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1363.05 964.75H1358.95L1361 961.472L1363.05 964.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1377.05 964.75H1372.95L1375 961.472L1377.05 964.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1391.05 964.75H1386.95L1389 961.472L1391.05 964.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1405.05 964.75H1400.95L1403 961.472L1405.05 964.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1419.05 964.75H1414.95L1417 961.472L1419.05 964.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
			<path
				d="M1433.05 964.75H1428.95L1431 961.472L1433.05 964.75Z"
				stroke="#1E13F8"
				strokeOpacity="0.2"
				strokeWidth="0.5"
			/>
		</svg>
	);
}

export { GradientBackground, PatternedBackground };
