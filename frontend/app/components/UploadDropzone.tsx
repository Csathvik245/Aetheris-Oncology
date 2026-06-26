"use client";
import { useRef, useState } from "react";

/**
 * shadcn-style file dropzone (#1 of the four shadcn pieces), hand-written in
 * the Stitch terminal style. Rendered inside the VCF INTAKE panel.
 * LOAD DEMO fetches the bundled /demo_patient.vcf and POSTs it as a real File.
 */
export function UploadDropzone({
  onFile,
  busy,
  fileName,
}: {
  onFile: (f: File) => void;
  busy: boolean;
  fileName: string | null;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [loadingDemo, setLoadingDemo] = useState(false);

  const pick = (files: FileList | null) => {
    if (!files || !files.length) return;
    onFile(files[0]);
  };

  const loadDemo = async () => {
    try {
      setLoadingDemo(true);
      const res = await fetch("/demo_patient.vcf");
      const text = await res.text();
      const file = new File([text], "demo_patient.vcf", { type: "text/plain" });
      onFile(file);
    } catch {
      /* swallow — handled upstream via INTAKE error log */
    } finally {
      setLoadingDemo(false);
    }
  };

  return (
    <div className="flex h-full flex-col gap-2 p-2">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          pick(e.dataTransfer.files);
        }}
        onClick={() => !busy && inputRef.current?.click()}
        className={`flex flex-1 cursor-pointer items-center justify-center border border-dashed text-cyan transition-none ${
          drag ? "border-cyan bg-cyan/10" : "border-cyan bg-cyan/5 hover:bg-cyan/10"
        } ${busy ? "pointer-events-none opacity-50" : ""}`}
      >
        <div className="flex flex-col items-center gap-1">
          <span className="material-symbols-outlined">upload_file</span>
          <span className="text-[12px]">
            {fileName ? fileName.toUpperCase() : "DROP .VCF"}
          </span>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".vcf,text/plain"
        className="hidden"
        onChange={(e) => pick(e.target.files)}
      />

      <button
        onClick={loadDemo}
        disabled={busy || loadingDemo}
        className="term-border button-hover w-full border-cyan py-1 text-[18px] font-600 tracking-[0.05em] text-cyan transition-none disabled:opacity-40"
      >
        {loadingDemo ? "LOADING…" : "LOAD DEMO"}
      </button>
    </div>
  );
}
