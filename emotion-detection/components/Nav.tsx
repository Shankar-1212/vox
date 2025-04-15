"use client";

import { useLayoutEffect, useState } from "react";
import { Button } from "./ui/button";
import { Moon, Sun } from "lucide-react";

export const Nav = () => {
  const [isDarkMode, setIsDarkMode] = useState(false); // State for tracking theme

  // Effect to set initial state based on HTML class when component mounts
  useLayoutEffect(() => {
    const el = document.documentElement;
    // Set state based on whether 'dark' class is already present
    setIsDarkMode(el.classList.contains("dark"));
  }, []); // Empty dependency array ensures this runs only once

  // Function to toggle the theme
  const toggleDark = () => {
    const el = document.documentElement;
    el.classList.toggle("dark"); // Add/remove 'dark' class from <html>
    setIsDarkMode((prev) => !prev); // Update React state
  };

  return (
    <div
      className={
        "px-4 py-2 flex items-center h-14 z-50 bg-card border-b border-border"
      }
    >
      {/* Title on the left - Using medium weight and default size */}
      <div className="font-medium"> {/* <-- Adjusted font weight and size */}
        Emotion Detection
      </div>

      {/* Spacer div pushes button to the right */}
      <div className={"flex-1"}></div>

      {/* Container for the theme toggle button */}
      <div className={"flex items-center"}>
        {/* Dark Mode Button */}
        <Button
          onClick={toggleDark}
          variant={"ghost"}
          size={"icon"} // Use "icon" size for a compact button
          aria-label={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
          {isDarkMode ? (
            <Sun className={"h-5 w-5"} /> // Sun icon when dark
          ) : (
            <Moon className={"h-5 w-5"} /> // Moon icon when light
          )}
          <span className="sr-only">Toggle theme</span> {/* Screen reader text */}
        </Button>
      </div>
    </div>
  );
};