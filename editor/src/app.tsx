import { Greeting } from "./components/greeting";
import { AppButton } from "grantflow-frontend/components/app/buttons/app-button";

function App() {
	return (
		<>
			<Greeting name="World" />
			<AppButton>Click me</AppButton>
		</>
	);
}

export default App;
