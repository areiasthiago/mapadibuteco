import { BrowserRouter, Route, Routes } from "react-router-dom";
import Index from "./pages/Index";

function App() {
  return (
    <BrowserRouter basename="/mapadibuteco">
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="*" element={<Index />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
