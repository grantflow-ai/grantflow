import { Editor } from "@/editor";
import "./app.scss";

function App() {
	return (
		<div className="prose prose-sm app-container">
			<Editor
				crdtUrl="ws://127.0.0.1:1234"
				documentId="49d33aae-b3a5-42bd-b756-e43dd5343a15"
				initialMarkdownContent="# hello world"
			/>
		</div>
	);
}

export default App;
