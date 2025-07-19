import { Button } from "./ui/button";

interface GreetingProps {
	name: string;
}

export const Greeting: React.FC<GreetingProps> = ({ name }) => {
	return (
		<>
			<h1 className="text-black underline">Hello, {name}!</h1>
			<Button className="bg-blue-500 text-white">Click Me</Button>
			<p className="text-gray-700">This is a simple greeting component.</p>
		</>
	);
};
