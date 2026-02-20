import { useEffect, useState } from 'react';
import axios from 'axios';
import { API_BASE } from '../App';
import { GetSwingsResponse } from 'shared/types/api';
import { PlayCircle, Target, Activity, Heart, Trash2, Zap } from 'lucide-react';

interface Props {
  onSelectSwing: (id: string) => void;
}

export function GalleryView({ onSelectSwing }: Props) {
  const [swings, setSwings] = useState<GetSwingsResponse>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSwings = async () => {
      try {
        const res = await axios.get(`${API_BASE}/swings`);
        setSwings(res.data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchSwings();
  }, []);

  const handleFavorite = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      const res = await axios.post(`${API_BASE}/swings/${id}/favorite`);
      setSwings(swings.map(s => s.id === id ? { ...s, isFavorite: res.data.isFavorite } : s));
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this swing?")) return;
    try {
      await axios.delete(`${API_BASE}/swings/${id}`);
      setSwings(swings.filter(s => s.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div className="text-center mt-20">Loading...</div>;

  if (swings.length === 0) {
    return (
      <div className="text-center p-16 glass-card rounded-3xl mt-10 animate-fade-in border-dashed border-2 border-white/20">
        <Target className="w-16 h-16 mx-auto text-primary mb-4 opacity-50" />
        <h3 className="text-2xl font-bold text-white mb-2">No Swings Analyzed Yet</h3>
        <p className="text-slate-400">Upload your first golf swing video to see the AI magic.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-center justify-between">
        <h2 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400">
          Swing Gallery
        </h2>
        <div className="text-sm font-medium text-primary bg-primary/10 px-4 py-1.5 rounded-full border border-primary/20">
          {swings.length} Analyzed Swings
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        {swings.map((swing, idx) => (
          <div
            key={swing.id}
            onClick={() => onSelectSwing(swing.id)}
            className="glass-card rounded-2xl overflow-hidden cursor-pointer group flex flex-col"
            style={{ animationDelay: `${idx * 100}ms` }}
          >
            <div className="aspect-video bg-black relative flex items-center justify-center">
              <video
                src={`${API_BASE.replace('/api', '')}${swing.videoUrl}`}
                className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <PlayCircle className="w-12 h-12 text-white/80 group-hover:scale-110 transition-transform drop-shadow-lg" />
              </div>
              <div className="absolute top-3 left-3 bg-primary text-white text-xs font-bold px-2 py-1 rounded shadow">
                {swing.club}
              </div>
              <div className="absolute top-3 right-3 flex space-x-2">
                <button
                  onClick={(e) => handleFavorite(e, swing.id)}
                  className="p-2 bg-black/60 hover:bg-black/80 backdrop-blur rounded-full transition-transform hover:scale-110 z-10"
                >
                  <Heart className={`w-4 h-4 ${swing.isFavorite ? 'fill-red-500 text-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]' : 'text-white'}`} />
                </button>
                <button
                  onClick={(e) => handleDelete(e, swing.id)}
                  className="p-2 bg-black/60 hover:bg-red-500/80 backdrop-blur rounded-full transition-transform hover:scale-110 opacity-0 group-hover:opacity-100 z-10"
                >
                  <Trash2 className="w-4 h-4 text-white" />
                </button>
              </div>
            </div>
            <div className="p-5 flex flex-col flex-grow">
              <div className="flex justify-between items-center mb-4">
                <span className="text-xs font-medium text-slate-400">
                  {new Date(swing.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
                {swing.analyzed ? (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-primary/20 text-primary border border-primary/30 shadow-[0_0_10px_rgba(16,185,129,0.1)]">
                    <Target className="w-3 h-3 mr-1" />
                    Analyzed
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                    <Activity className="w-3 h-3 mr-1 animate-spin" />
                    Processing
                  </span>
                )}
              </div>

              {swing.analyzed && (
                <div className="grid grid-cols-2 gap-3 mt-auto pt-4 border-t border-white/5">
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">Carry</span>
                    <div className="flex items-center text-white font-mono font-semibold">
                      <Target className="w-4 h-4 mr-1.5 text-primary" />
                      {Math.round(swing.estimatedDistance || 0)} <span className="text-xs text-slate-400 ml-1">yds</span>
                    </div>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">Speed</span>
                    <div className="flex items-center text-white font-mono font-semibold">
                      <Zap className="w-4 h-4 mr-1.5 text-yellow-500" />
                      {Math.round(swing.estimatedClubSpeed || 0)} <span className="text-xs text-slate-400 ml-1">mph</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
