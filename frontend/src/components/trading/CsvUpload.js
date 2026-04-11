import { useState, useRef } from "react";
import { Upload, FileText, X } from "lucide-react";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function CsvUpload({ onDataLoaded }) {
  const [uploading, setUploading] = useState(false);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const fileRef = useRef(null);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setError("");
    setUploading(true);

    try {
      const text = await file.text();
      const { data } = await axios.post(`${API}/forex/upload-csv`, { csv_text: text, filename: file.name }, { withCredentials: true });
      onDataLoaded(data.data, data.pair_name || file.name.replace(/\.csv$/, ""));
    } catch (e) {
      const detail = e.response?.data?.detail;
      setError(typeof detail === "string" ? detail : "Failed to parse CSV");
    } finally {
      setUploading(false);
    }
  };

  const clearFile = () => {
    setFileName("");
    setError("");
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div className="p-4 border-b border-black" data-testid="csv-upload">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-black/60 mb-2">Import CSV</p>
      {fileName ? (
        <div className="flex items-center gap-2">
          <FileText size={14} className="text-black/50 shrink-0" />
          <span className="font-mono text-xs text-black truncate flex-1">{fileName}</span>
          <button onClick={clearFile} className="text-black/40 hover:text-red-600" data-testid="csv-clear">
            <X size={14} />
          </button>
        </div>
      ) : (
        <label
          className="flex items-center justify-center gap-2 h-9 border border-dashed border-black/30 cursor-pointer hover:border-black hover:bg-neutral-50 transition-colors duration-150"
          data-testid="csv-upload-label"
        >
          <Upload size={12} />
          <span className="font-mono text-[10px] uppercase">
            {uploading ? "Parsing..." : "Upload OHLC CSV"}
          </span>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.txt"
            className="hidden"
            onChange={handleFile}
            disabled={uploading}
            data-testid="csv-file-input"
          />
        </label>
      )}
      {error && <p className="font-mono text-[10px] text-red-600 mt-1" data-testid="csv-error">{error}</p>}
      <p className="font-mono text-[9px] text-black/30 mt-1">Format: date,open,high,low,close,volume</p>
    </div>
  );
}
