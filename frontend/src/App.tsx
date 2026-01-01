import { BrowserRouter, Routes, Route } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { ExtractionPage } from "@/pages/ExtractionPage";
import { DataPage } from "@/pages/DataPage";
import { ModelingPage } from "@/pages/ModelingPage";

function App() {
  return (
    <BrowserRouter>
      <MainLayout>
        <Routes>
          <Route path="/" element={<ExtractionPage />} />
          <Route path="/data" element={<DataPage />} />
          <Route path="/modeling" element={<ModelingPage />} />
        </Routes>
      </MainLayout>
    </BrowserRouter>
  );
}

export default App;
