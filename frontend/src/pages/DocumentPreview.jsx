import { useState } from "react";
import { FileText, Download, ArrowLeft, AlertCircle } from "lucide-react";

export default function DocumentPreview({ document, setPage }) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState("");

  if (!document) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] text-slate-500">
        <FileText size={48} className="mb-4 opacity-50" />
        <h2 className="text-xl font-semibold mb-2">No Document Available</h2>
        <button onClick={() => setPage("Dashboard")} className="text-blue-500 hover:underline">
          Return to Dashboard
        </button>
      </div>
    );
  }

  const handleDownload = async () => {
    try {
      setIsDownloading(true);
      setDownloadError("");
      
      // If it's a remote URL (like Cloudinary), CORS might block fetch(). Use native browser download.
      if (document.documentUrl.includes("http")) {
        const link = window.document.createElement('a');
        link.href = document.documentUrl;
        link.download = document.fileName || "translated_document";
        link.target = "_blank";
        window.document.body.appendChild(link);
        link.click();
        link.remove();
        return;
      }
      
      const response = await fetch(document.documentUrl);
      if (!response.ok) throw new Error("Failed to fetch document");
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = window.document.createElement('a');
      link.href = url;
      link.download = document.fileName;
      window.document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setDownloadError("Could not download the file.");
      console.error(err);
    } finally {
      setIsDownloading(false);
    }
  };

  // Use Microsoft Office Web Viewer to preview the document if it's publicly accessible.
  const previewUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(document.documentUrl)}`;
  const isLocalhost = document.documentUrl.includes("localhost") || document.documentUrl.includes("127.0.0.1");
  const ext = document.fileName?.toLowerCase().endsWith(".docx") ? ".docx" : ".pptx";

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 h-[calc(100vh-60px)] flex flex-col">


      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button onClick={() => setPage("Dashboard")} className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold font-display text-slate-900 leading-tight">Translated Document Preview</h1>
            <p className="text-slate-500 text-sm">{document.fileName}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          {downloadError && (
            <span className="text-sm text-red-500 flex items-center gap-1">
              <AlertCircle size={16} />
              {downloadError}
            </span>
          )}
          <button 
            onClick={handleDownload}
            disabled={isDownloading}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-5 py-2.5 rounded-lg font-semibold shadow-sm shadow-blue-200 transition-colors flex items-center gap-2"
          >
            {isDownloading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Download size={18} />
            )}
            {isDownloading ? "Downloading..." : `Download ${ext}`}
          </button>
        </div>
      </div>

      <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col relative">
        <div className="bg-slate-50 border-b border-slate-200 p-3 flex justify-between items-center text-xs font-semibold text-slate-500 uppercase tracking-wider">
          <span>Web Preview Viewer</span>
          <span className="text-amber-500 flex items-center gap-1">Powered by MS Office</span>
        </div>
        
        <div className="flex-1 w-full relative bg-slate-100/50 flex flex-col items-center justify-center">
          {isLocalhost ? (
            <div className="text-center p-8 text-slate-500 max-w-md">
              <FileText size={48} className="mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-semibold text-slate-700 mb-2">Local Preview Unavailable</h3>
              <p className="text-sm">The Microsoft Office Web Viewer requires a publicly accessible URL to render the document. Since you are running on localhost, please download the file to view it.</p>
            </div>
          ) : (
            <iframe 
              src={previewUrl}
              width="100%" 
              height="100%" 
              frameBorder="0"
              title="Document Preview"
              className="absolute inset-0 w-full h-full"
            >
              This is an embedded <a target="_blank" href="https://office.com">Microsoft Office</a> document, powered by <a target="_blank" href="https://office.com/webapps">Office</a>.
            </iframe>
          )}
        </div>
      </div>
    </div>
  );
}
