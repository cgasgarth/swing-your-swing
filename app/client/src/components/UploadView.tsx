import React, { useState } from 'react';
import axios from 'axios';
import { API_BASE } from '../App';
import { Upload, Loader2, Video } from 'lucide-react';

const CLUBS = [
  "Driver", "Wood", "Hybrid", "LongIron", "MidIron", "ShortIron", "Wedge", "Putter"
];

interface Props {
  onUploadSuccess: (swingId: string) => void;
}

export function UploadView({ onUploadSuccess }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [club, setClub] = useState<string>("Driver");
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError("Please select a video file.");
      return;
    }

    setIsUploading(true);
    setError("");

    const formData = new FormData();
    formData.append("video", file);
    formData.append("club", club);

    try {
      const response = await axios.post(`${API_BASE}/swings/upload`, formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      console.log(response.data);
      onUploadSuccess(response.data.swingId);
    } catch (err: unknown) {
      console.error(err);
      setError("Failed to upload and analyze video. Check server logs.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto mt-10 animate-fade-in">
      <div className="glass-panel rounded-3xl overflow-hidden p-8 border border-white/10">
        <h2 className="text-3xl font-extrabold text-white mb-6 text-center tracking-tight">
          Analyze Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">Swing</span>
        </h2>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl text-sm font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleUpload} className="space-y-8">

          <div className="space-y-3">
            <label className="block text-sm font-semibold text-slate-300">Club Selection</label>
            <select
              value={club}
              onChange={(e) => setClub(e.target.value)}
              className="w-full rounded-xl border-white/10 shadow-sm focus:border-primary focus:ring-1 focus:ring-primary h-14 px-4 bg-black/40 text-white border transition-colors outline-none"
            >
              {CLUBS.map(c => <option key={c} value={c} className="bg-slate-900 text-white">{c}</option>)}
            </select>
          </div>

          <div className="flex items-center justify-center w-full">
            <label className="flex flex-col items-center justify-center w-full h-72 border-2 border-white/20 border-dashed rounded-2xl cursor-pointer bg-black/20 hover:bg-black/40 transition-all hover:border-primary/50 group">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                {file ? (
                  <>
                    <Video className="w-16 h-16 text-primary mb-4 animate-pulse-slow drop-shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                    <p className="mb-2 text-md text-white font-bold">{file.name}</p>
                    <p className="text-sm text-slate-400">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                  </>
                ) : (
                  <>
                    <Upload className="w-12 h-12 mb-4 text-slate-400 group-hover:text-primary transition-colors duration-300" />
                    <p className="mb-2 text-sm text-slate-300"><span className="font-bold text-primary">Click to upload</span> or drag and drop</p>
                    <p className="text-xs text-slate-500 font-medium tracking-wide">MP4 SLOW MOTION (MAX 50MB)</p>
                  </>
                )}
              </div>
              <input
                type="file"
                className="hidden"
                accept="video/mp4,video/quicktime"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
            </label>
          </div>

          <button
            type="submit"
            disabled={!file || isUploading}
            className="w-full flex justify-center items-center py-4 px-4 border border-transparent rounded-xl shadow-[0_4px_14px_0_rgba(16,185,129,0.39)] text-base font-bold text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:-translate-y-0.5"
          >
            {isUploading ? (
              <span className="flex items-center">
                <Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5" />
                Processing via Gemini AI...
              </span>
            ) : (
              "Analyze Swing"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
