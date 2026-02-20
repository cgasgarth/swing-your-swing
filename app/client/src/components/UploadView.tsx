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
    <div className="max-w-2xl mx-auto mt-10">
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-100 p-8">
        <h2 className="text-3xl font-extrabold text-slate-900 mb-6 text-center">Analyze Your Swing</h2>

        {error && (
          <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleUpload} className="space-y-6">

          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">Club Selection</label>
            <select
              value={club}
              onChange={(e) => setClub(e.target.value)}
              className="w-full rounded-lg border-slate-300 shadow-sm focus:border-primary focus:ring-primary h-12 px-4 bg-slate-50 border"
            >
              {CLUBS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="flex items-center justify-center w-full">
            <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-slate-300 border-dashed rounded-xl cursor-pointer bg-slate-50 hover:bg-slate-100 transition-colors">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                {file ? (
                  <>
                    <Video className="w-12 h-12 text-primary mb-3" />
                    <p className="mb-2 text-sm text-slate-800 font-semibold">{file.name}</p>
                    <p className="text-xs text-slate-500">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                  </>
                ) : (
                  <>
                    <Upload className="w-10 h-10 mb-3 text-slate-400" />
                    <p className="mb-2 text-sm text-slate-500"><span className="font-semibold text-primary">Click to upload</span> or drag and drop</p>
                    <p className="text-xs text-slate-400">MP4 Slow Motion Video (Max 50MB)</p>
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
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-primary hover:bg-green-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
