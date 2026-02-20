import { useEffect, useState } from 'react';
import axios from 'axios';
import { API_BASE } from '../App';
import { GetSwingsResponse } from 'shared/types/api';
import { PlayCircle, Target, Activity } from 'lucide-react';

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

  if (loading) return <div className="text-center mt-20">Loading...</div>;

  if (swings.length === 0) {
    return (
      <div className="text-center p-12 bg-white rounded-2xl shadow border border-slate-100 mt-10">
        <h3 className="text-xl font-bold text-slate-800 mb-2">No Swings Found</h3>
        <p className="text-slate-500">Upload your first swing to see it here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-extrabold text-slate-900">Swing Gallery</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {swings.map(swing => (
          <div
            key={swing.id}
            onClick={() => onSelectSwing(swing.id)}
            className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all border border-slate-100 cursor-pointer group"
          >
            <div className="aspect-video bg-black relative flex items-center justify-center">
              <video
                src={`http://localhost:4000${swing.videoUrl}`}
                className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <PlayCircle className="w-12 h-12 text-white/80 group-hover:scale-110 transition-transform drop-shadow-lg" />
              </div>
              <div className="absolute top-3 left-3 bg-primary text-white text-xs font-bold px-2 py-1 rounded shadow">
                {swing.club}
              </div>
            </div>
            <div className="p-5">
              <div className="flex justify-between items-center mb-4">
                <span className="text-sm text-slate-500">
                  {new Date(swing.createdAt).toLocaleDateString()}
                </span>
                {swing.analyzed ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                    Analyzed
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                    Pending
                  </span>
                )}
              </div>

              {swing.analyzed && (
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <div className="flex items-center text-slate-700 text-sm">
                    <Target className="w-4 h-4 mr-1.5 text-blue-500" />
                    {Math.round(swing.estimatedDistance || 0)} yds
                  </div>
                  <div className="flex items-center text-slate-700 text-sm">
                    <Activity className="w-4 h-4 mr-1.5 text-yellow-500" />
                    {Math.round(swing.estimatedClubSpeed || 0)} mph
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
