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
        errorHandler={(err: any) => console.error(err)} // Add this line
        onInit={(ketcher) => {
          // ... your existing code
        }}
      />
    </div>
  );
}