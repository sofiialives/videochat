import { Route, Routes } from "react-router-dom";
import MainPage from "./pages/Main/MainPage";
import NotFoundPage from "./pages/NotFound/NotFoundPage";
import RoomPage from "./pages/Room/RoomPage";

function App() {
  return (
    <Routes>
      <Route path="/" element={<MainPage />} />
      <Route path="/room/:id" element={<RoomPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default App;
