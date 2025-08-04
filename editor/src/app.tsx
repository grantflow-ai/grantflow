import { Editor } from "@/editor";
import "./app.scss";

function App() {
	return (
		<div className="prose prose-sm app-container">
			<Editor content="Hello grantflow" />
		</div>
	);
}

export default App;
