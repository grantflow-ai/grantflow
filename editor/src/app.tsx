import { Greeting } from "./components/greeting";
import { Button } from "./components/ui/button";

function App() {
	return (
		<>
			<Greeting name="World" />
			<Button>Click me</Button>
		</>
	);
}

export default App;
