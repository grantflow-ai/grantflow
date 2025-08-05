import { Editor } from "@/editor";
import "./app.scss";

function App() {
	return (
		<div className="prose prose-sm app-container">
			<Editor content="Hello grantflow" crdtUrl="ws://127.0.0.1:1234" documentId="insert-documentId-from-db" />
		</div>
	);
}

export default App;
