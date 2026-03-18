import React from "react";
import { useTheme } from "../../context/theme.jsx";

const ModeToggle = () => {
  const { theme, toggleTheme } = useTheme();
  return (
    <button className="mode-toggle" onClick={toggleTheme}>
      {theme === "light" ? "Dark" : "Light"} Mode
    </button>
  );
};

export default ModeToggle;
