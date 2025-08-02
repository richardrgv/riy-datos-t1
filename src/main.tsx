import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import './App.css'; // <-- ¡Esta línea es CRUCIAL para que los estilos se apliquen!

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
