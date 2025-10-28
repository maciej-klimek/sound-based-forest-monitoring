import { createBrowserRouter, RouterProvider, Navigate } from "react-router-dom";
import AppLayout from "./layouts/AppLayout";
import MapPage from "./pages/MapPage";
import HistoryPage from "./pages/HistoryPage";

const router = createBrowserRouter([
  { path: "/", element: <AppLayout />, children: [
      { index: true, element: <Navigate to="/mapa" replace /> },
      { path: "mapa", element: <MapPage /> },
      { path: "historia", element: <HistoryPage /> },
  ]},
]);

export default function App() { return <RouterProvider router={router} />; }
