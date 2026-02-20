import { useState } from "react";
import { UploadView } from "./components/UploadView";
import { AnalysisDashboard } from "./components/AnalysisDashboard";
import { GalleryView } from "./components/GalleryView";
import { LayoutDashboard, Upload, Image as ImageIcon } from "lucide-react";

export const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:3001/api";

type ViewState = "upload" | "dashboard" | "gallery";

function App() {
  const [currentView, setCurrentView] = useState<ViewState>("gallery");
  const [activeSwingId, setActiveSwingId] = useState<string | null>(null);

  const navigateTo = (view: ViewState, swingId?: string) => {
    setActiveSwingId(swingId || null);
    setCurrentView(view);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans selection:bg-primary/30">
      <header className="glass-panel sticky top-0 z-50 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center space-x-2">
              <span className="text-2xl font-extrabold tracking-tight text-white flex items-center">
                <span className="text-primary mr-2 drop-shadow-[0_0_8px_rgba(16,185,129,0.8)]">⛳</span>
                Swing<span className="text-primary font-light">Your</span>Swing
              </span>
            </div>
            <nav className="flex space-x-2">
              <button
                onClick={() => navigateTo("gallery")}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${currentView === 'gallery' ? 'bg-primary/20 text-primary border border-primary/30 shadow-[0_0_15px_rgba(16,185,129,0.2)]' : 'text-slate-300 hover:bg-white/5 hover:text-white border border-transparent'}`}
              >
                <ImageIcon className="inline-block w-4 h-4 mr-1.5" />
                Gallery
              </button>
              <button
                onClick={() => navigateTo("upload")}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${currentView === 'upload' ? 'bg-primary/20 text-primary border border-primary/30 shadow-[0_0_15px_rgba(16,185,129,0.2)]' : 'text-slate-300 hover:bg-white/5 hover:text-white border border-transparent'}`}
              >
                <Upload className="inline-block w-4 h-4 mr-1.5" />
                Upload
              </button>
              {activeSwingId && (
                <button
                  onClick={() => navigateTo("dashboard", activeSwingId)}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${currentView === 'dashboard' ? 'bg-primary/20 text-primary border border-primary/30 shadow-[0_0_15px_rgba(16,185,129,0.2)]' : 'text-slate-300 hover:bg-white/5 hover:text-white border border-transparent'}`}
                >
                  <LayoutDashboard className="inline-block w-4 h-4 mr-1.5" />
                  Dashboard
                </button>
              )}
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
        {currentView === "upload" && <UploadView onUploadSuccess={(id) => navigateTo("dashboard", id)} />}
        {currentView === "dashboard" && activeSwingId && <AnalysisDashboard swingId={activeSwingId} onDeleteSuccess={() => navigateTo("gallery")} />}
        {currentView === "gallery" && <GalleryView onSelectSwing={(id) => navigateTo("dashboard", id)} />}
      </main>
    </div >
  );
}

export default App;
