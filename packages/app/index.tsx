import React from "react";
import ReactDOM from "react-dom/client";
import "@knowledge/ui/dist/index.esm.css";
import { Button } from "@knowledge/ui";

function App() {
  return (
    <div>
      <Button type="primary" onClick={() => alert("点击")}>
        点我
      </Button>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(<App />);
export default App;
