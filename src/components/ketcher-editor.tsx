// src/components/ketcher-editor.tsx
"use client";
import "ketcher-react/dist/index.css";
import React from "react";
import { Editor } from "ketcher-react";
import { StandaloneStructServiceProvider } from "ketcher-standalone";

const structServiceProvider = new StandaloneStructServiceProvider();

interface KetcherEditorProps {
  onInit?: (ketcher: any) => void;
}

const KetcherEditor: React.FC<KetcherEditorProps> = ({ onInit }) => {
  return (
    <div className="w-full h-full min-h-[500px] border rounded-lg overflow-hidden bg-white">
      <Editor
        staticResourcesUrl={process.env.NEXT_PUBLIC_STATIC_RESOURCES_URL || ""}
        structServiceProvider={structServiceProvider}
        onInit={onInit}
        // Add this to pass Ketcher's strict TypeScript interface requirement:
        errorHandler={(message: string) => {
          console.error("Ketcher Canvas Error:", message);
        }}
      />
    </div>
  );
};

export default KetcherEditor;