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
        staticResourcesUrl={process.env.PUBLIC_URL || ""}
        structServiceProvider={structServiceProvider}
        errorHandler={(err: any) => console.error("Ketcher Error:", err)}
        onInit={(ketcher) => {
          // 1. Bind to window as a fallback (matches your page.tsx logic)
          if (typeof window !== "undefined") {
            (window as any).ketcher = ketcher;
          }
          // 2. Crucial: Pass the instance back to page.tsx!
          if (onInit) {
            onInit(ketcher);
          }
        }}
      />
    </div>
  );
}
