import React from "react";
import {
  APP_MOTTO,
  AUTHOR_NAME,
  AUTHOR_GITHUB,
  AUTHOR_LINKEDIN,
} from "@corner-click/types";

export default function Footer() {
  return (
    <footer className="w-full py-8 bg-gray-900 border-t border-gray-800 mt-auto">
      <div className="max-w-[95vw] 2xl:max-w-[1700px] mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
        <p className="text-gray-400 font-medium tracking-wide text-sm italic">
          "{APP_MOTTO}"
        </p>
        <div className="flex items-center space-x-6 text-sm">
          <span className="text-gray-500">Designed & Developed by</span>
          <a
            href={AUTHOR_GITHUB}
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-400 hover:text-white font-bold transition-colors"
          >
            {AUTHOR_NAME}
          </a>
          <a
            href={AUTHOR_LINKEDIN}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:text-blue-400 font-bold transition-colors"
          >
            LinkedIn
          </a>
        </div>
      </div>
    </footer>
  );
}
