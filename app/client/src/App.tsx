import { useState } from "react";
import { UploadView } from "./components/UploadView";
import { AnalysisDashboard } from "./components/AnalysisDashboard";
import { GalleryView } from "./components/GalleryView";
import { LayoutDashboard, Upload, Image as ImageIcon } from "lucide-react";

export const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:3001/api";

type ViewState = "upload" | "dashboard" | "gallery";

function App() {
  const [currentView, setCurrentView] = useState<ViewState>("upload");
  const [activeSwingId, setActiveSwingId] = useState<string | null>(null);

  const navigateTo = (view: ViewState, swingId?: string) => {
    setActiveSwingId(swingId || null);
    setCurrentView(view);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <header className="bg-primary text-white shadow-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center space-x-2">
              <span className="text-2xl font-bold tracking-tight text-white flex items-center">
                <span className="text-secondary mr-2">🏌️‍♂️</span> Swing Your Swing
              </span>
            </div>
            <nav className="flex space-x-4">
              <button
                onClick={() => navigateTo("upload")}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${currentView === 'upload' ? 'bg-white/20' : 'hover:bg-white/10'}`}
              >
                <Upload className="inline-block w-4 h-4 mr-1" />
                Upload
              </button>
              <button
                onClick={() => navigateTo("gallery")}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${currentView === 'gallery' ? 'bg-white/20' : 'hover:bg-white/10'}`}
              >
                <ImageIcon className="inline-block w-4 h-4 mr-1" />
                Gallery
              </button>
              {activeSwingId && (
                <button
                  onClick={() => navigateTo("dashboard", activeSwingId)}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${currentView === 'dashboard' ? 'bg-white/20' : 'hover:bg-white/10'}`}
                >
                  <LayoutDashboard className="inline-block w-4 h-4 mr-1" />
                  Dashboard
                </button>
              )}
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in duration-500">
        {currentView === "upload" && <UploadView onUploadSuccess={(id) => navigateTo("dashboard", id)} />}
        {currentView === "dashboard" && activeSwingId && <AnalysisDashboard swingId={activeSwingId} />}
        {currentView === "gallery" && <GalleryView onSelectSwing={(id) => navigateTo("dashboard", id)} />}
      </main>
    </div>
  );
}

export default App;
