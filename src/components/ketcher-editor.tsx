"use client";

import { Editor } from "ketcher-react";
import { StandaloneStructServiceProvider } from "ketcher-standalone";
import "ketcher-react/dist/index.css";

const structServiceProvider = new StandaloneStructServiceProvider();

interface KetcherEditorProps {
  onInit?: (ketcher: any) => void;
}

export default function KetcherEditor({ onInit }: KetcherEditorProps) {
  return (
    <div className="h-full w-full">
      <Editor
        staticResourcesUrl="/ketcher/" // Points to the new folder we just created
        structServiceProvider={provider}
        errorHandler={(err: any) => console.error("Ketcher Error:", err)}
        onInit={(ketcher) => {
          if (typeof window !== "undefined") {
            (window as any).ketcher = ketcher;
          }
          if (onInit) {
            onInit(ketcher);
          }
        }}
      />
    </div>
  );
}
