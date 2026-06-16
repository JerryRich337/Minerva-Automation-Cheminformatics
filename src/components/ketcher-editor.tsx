"use client";

import { StandaloneStructServiceProvider } from "ketcher-standalone";
import { Editor } from "ketcher-react";
import "ketcher-react/dist/index.css"; // Ketcher's required styles

const structServiceProvider = new StandaloneStructServiceProvider();

interface KetcherEditorProps {
  onInit?: (ketcher: any) => void;
}

export default function KetcherEditor({ onInit }: KetcherEditorProps) {
  return (
    <div className="h-full w-full">
      <Editor
        staticResourcesUrl={""}
        structServiceProvider={structServiceProvider}
        onInit={(ketcher) => {
          console.log("Ketcher Initialized!");
          window.ketcher = ketcher; // Keep as fallback
          if (onInit) {
            onInit(ketcher); // Pass instance to parent
          }
        }}
      />
    </div>
  );
}