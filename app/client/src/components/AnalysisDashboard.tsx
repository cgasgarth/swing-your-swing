import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { API_BASE } from '../App';
import { Swing, SwingMetrics, LessonRoadmap, LaunchMonitorData, Comment } from '../../../shared/types/index';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Activity, Target, Zap, Clock, Heart, Trash2, MessageSquare, Send, Play } from 'lucide-react';

interface Props {
  swingId: string;
  onDeleteSuccess?: () => void;
}

interface DashboardData {
  swing: Swing;
  metrics: SwingMetrics;
  lessons: LessonRoadmap[];
  launchData: LaunchMonitorData | null;
  comments?: Comment[];
}

export function AnalysisDashboard({ swingId, onDeleteSuccess }: Props) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const [activeCheckpoint, setActiveCheckpoint] = useState<string | null>(null);

  useEffect(() => {
    const fetchAnalysis = async () => {
      try {
        const res = await axios.get(`${API_BASE}/swings/${swingId}`);
        setData(res.data);
      } catch {
        console.error("Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    };

    fetchAnalysis();
  }, [swingId]);

  const handleFavorite = async () => {
    if (!data) return;
    try {
      const res = await axios.post(`${API_BASE}/swings/${swingId}/favorite`);
      setData({ ...data, swing: { ...data.swing, isFavorite: res.data.isFavorite } });
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this swing?")) return;
    try {
      await axios.delete(`${API_BASE}/swings/${swingId}`);
      if (onDeleteSuccess) onDeleteSuccess();
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || !data) return;
    setSubmittingComment(true);
    try {
      const res = await axios.post(`${API_BASE}/swings/${swingId}/comments`, { text: commentText });
      setData({ ...data, comments: [res.data, ...(data.comments || [])] });
      setCommentText('');
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingComment(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const handleReprocess = async () => {
    setLoading(true);
    try {
      await axios.post(`${API_BASE}/swings/${swingId}/reprocess`);
      const res = await axios.get(`${API_BASE}/swings/${swingId}`);
      setData(res.data);
    } catch {
      console.error("Reprocessing failed");
    } finally {
      setLoading(false);
    }
  };

  if (!data || !data.metrics) {
    return (
      <div className="space-y-6">
        {data?.swing && (
          <div className="bg-black rounded-2xl overflow-hidden">
            <video
              src={`${API_BASE.replace('/api', '')}${data.swing.videoUrl}`}
              controls
              className="w-full max-h-[400px] object-contain"
            />
          </div>
        )}
        <div className="text-center p-8 glass-panel rounded-xl space-y-4">
          <p className="text-slate-300 text-lg">Analysis failed or has not been processed yet.</p>
          <button
            onClick={handleReprocess}
            className="px-6 py-3 bg-primary hover:bg-primary/80 text-white font-semibold rounded-xl transition-colors"
          >
            ⟳ Reprocess with AI
          </button>
          {data?.swing && (
            <button
              onClick={handleDelete}
              className="ml-4 px-6 py-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 font-semibold rounded-xl transition-colors"
            >
              Delete Swing
            </button>
          )}
        </div>
      </div>
    );
  }

  const m = data.metrics;
  const l = data.launchData;

  const chartData = [
    { name: 'Address', ...m.addressAngles, proSpine: 45, proShoulder: 0, proHip: 0 },
    { name: 'Top', ...m.topAngles, proSpine: 45, proShoulder: 90, proHip: 45 },
    { name: 'Impact', ...m.impactAngles, proSpine: 50, proShoulder: 45, proHip: 45 },
    { name: 'Finish', ...m.finishAngles, proSpine: 10, proShoulder: 120, proHip: 90 },
  ];

  const checkpoints = [
    { id: 'address', label: 'Address', timeMs: m.addressTimeMs, angles: m.addressAngles },
    { id: 'top', label: 'Top View', timeMs: m.topTimeMs, angles: m.topAngles },
    { id: 'impact', label: 'Impact', timeMs: m.impactTimeMs, angles: m.impactAngles },
    { id: 'finish', label: 'Finish', timeMs: m.finishTimeMs, angles: m.finishAngles },
  ];

  const handleSeek = (timeMs: number, id: string) => {
    if (videoRef.current) {
      videoRef.current.currentTime = timeMs / 1000;
      videoRef.current.pause();
      setActiveCheckpoint(id);
    }
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current || videoRef.current.paused) return;
    // Auto clear checkpoint overlay if playing normally
    if (activeCheckpoint) setActiveCheckpoint(null);
  };

  return (
    <div className="space-y-6">

      <div className="flex justify-between items-center glass-panel p-4 rounded-2xl border-white/10 mt-2">
        <h2 className="text-2xl font-extrabold text-white flex items-center">
          <span className="bg-primary/20 text-primary border border-primary/30 px-3 py-1 rounded-lg text-sm mr-3 uppercase tracking-wide">
            {data.swing.club}
          </span>
          Analysis Overview
        </h2>
        <div className="flex space-x-3">
          <button
            onClick={handleFavorite}
            className="flex items-center px-4 py-2 hover:bg-white/10 text-slate-200 border border-white/10 rounded-lg font-medium transition-colors"
          >
            <Heart className={`w-4 h-4 mr-2 ${data.swing.isFavorite ? 'fill-red-500 text-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]' : ''}`} />
            {data.swing.isFavorite ? 'Favorited' : 'Favorite'}
          </button>
          <button
            onClick={handleDelete}
            className="flex items-center px-4 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 rounded-lg font-medium transition-colors"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard
          title="Estimated Distance"
          value={`${l?.carry || m.estimatedDistance || 'N/A'} yds`}
          icon={<Target className="text-blue-500" />}
        />
        <MetricCard
          title="Club Speed"
          value={`${l?.clubSpeed || m.estimatedClubSpeed || 'N/A'} mph`}
          icon={<Zap className="text-yellow-500" />}
        />
        <MetricCard
          title="Club Path"
          value={m.estimatedClubPath || 'N/A'}
          icon={<Activity className="text-green-500" />}
        />
        <MetricCard
          title="Time To Impact"
          value={`${m.impactTimeMs} ms`}
          icon={<Clock className="text-purple-500" />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        <div className="flex flex-col">
          <div className="bg-black rounded-2xl shadow-lg overflow-hidden relative group aspect-square lg:aspect-auto">
            <video
              ref={videoRef}
              src={`${API_BASE.replace('/api', '')}${data.swing.videoUrl}`}
              controls
              onTimeUpdate={handleTimeUpdate}
              className="w-full h-full object-contain max-h-[500px]"
            />
            <div className="absolute top-4 left-4 bg-primary text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide shadow-md z-10 transition-opacity group-hover:opacity-100">
              {data.swing.club}
            </div>

            {/* Video Annotation Overlay */}
            {activeCheckpoint && (
              <div className="absolute inset-0 pointer-events-none z-20 transition-all duration-300 bg-black/30">
                {(() => {
                  const cp = checkpoints.find(c => c.id === activeCheckpoint);
                  if (!cp) return null;
                  return (
                    <div className="absolute right-[10%] top-[20%] bg-slate-900/80 backdrop-blur-md p-5 rounded-xl border border-primary/30 text-white shadow-2xl min-w-[200px] animate-in slide-in-from-right-8 duration-300">
                      <h4 className="font-bold text-primary mb-3 border-b border-white/10 pb-2 flex items-center">
                        <Target className="w-4 h-4 mr-2" />
                        {cp.label} Angles
                      </h4>
                      <div className="space-y-3 text-sm">
                        <div className="flex justify-between items-center gap-6">
                          <span className="text-slate-300">Spine:</span>
                          <span className="font-mono text-secondary font-bold text-lg">{Math.round(cp.angles.spineAngle)}°</span>
                        </div>
                        <div className="flex justify-between items-center gap-6">
                          <span className="text-slate-300">Shoulders:</span>
                          <span className="font-mono text-secondary font-bold text-lg">{Math.round(cp.angles.shoulderTurn)}°</span>
                        </div>
                        <div className="flex justify-between items-center gap-6">
                          <span className="text-slate-300">Hips:</span>
                          <span className="font-mono text-secondary font-bold text-lg">{Math.round(cp.angles.hipTurn)}°</span>
                        </div>
                      </div>

                      {/* Graphical Line indicating annotation focus point on video */}
                      <svg className="absolute -left-[140px] top-1/2 w-[140px] h-[2px] overflow-visible drop-shadow-[0_0_8px_rgba(16,185,129,0.8)]">
                        <line x1="0" y1="0" x2="140" y2="0" stroke="var(--color-primary)" strokeWidth="2" strokeDasharray="4 4" className="animate-pulse" />
                        <circle cx="0" cy="0" r="5" fill="var(--color-primary)" />
                        <circle cx="0" cy="0" r="10" fill="none" stroke="var(--color-primary)" strokeWidth="1" className="animate-ping" />
                      </svg>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>

          {/* Checkpoints Controls */}
          <div className="mt-4 glass-card p-4 rounded-xl">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Swing Checkpoints</h4>
            <div className="grid grid-cols-4 gap-2">
              {checkpoints.map(cp => (
                <button
                  key={cp.id}
                  onClick={() => handleSeek(cp.timeMs, cp.id)}
                  className={`flex flex-col items-center justify-center py-2 px-1 text-xs sm:text-sm font-semibold rounded-lg border transition-all ${activeCheckpoint === cp.id ? 'bg-primary/20 text-primary border-primary/40 shadow-[0_0_15px_rgba(16,185,129,0.2)] scale-[1.02]' : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10 hover:text-white'}`}
                >
                  <Play className={`w-4 h-4 mb-1 ${activeCheckpoint === cp.id ? 'text-primary' : 'text-slate-400'}`} />
                  {cp.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="glass-panel p-6 rounded-2xl flex flex-col">
          <h3 className="text-xl font-bold mb-4 text-white">Body Angles Throughout Swing</h3>
          <div className="flex-grow min-h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <XAxis dataKey="name" axisLine={false} tickLine={false} stroke="#94a3b8" />
                <YAxis axisLine={false} tickLine={false} stroke="#94a3b8" />
                <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', borderRadius: '12px', borderColor: 'rgba(255,255,255,0.1)', color: '#fff', backdropFilter: 'blur(8px)' }} itemStyle={{ color: '#e2e8f0' }} />
                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                <Bar dataKey="spineAngle" fill="#10b981" radius={[4, 4, 0, 0]} name="Spine Angle" maxBarSize={40} />
                <Bar dataKey="proSpine" fill="rgba(16,185,129,0.3)" radius={[4, 4, 0, 0]} name="Pro Spine (Toro)" maxBarSize={40} />
                <Bar dataKey="shoulderTurn" fill="#facc15" radius={[4, 4, 0, 0]} name="Shoulder Turn" maxBarSize={40} />
                <Bar dataKey="hipTurn" fill="#0ea5e9" radius={[4, 4, 0, 0]} name="Hip Turn" maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {data.lessons && data.lessons.length > 0 && (
        <div className="glass-panel p-6 rounded-2xl mt-6">
          <h3 className="text-xl font-bold mb-6 text-white border-b border-white/10 pb-4">AI Lesson Roadmap</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {data.lessons.map((lesson, idx) => (
              <div key={idx} className={`p-6 rounded-xl border-l-4 ${lesson.goalType === 'Ideal' ? 'bg-primary/10 border-primary' : 'bg-secondary/10 border-secondary'}`}>
                <h4 className="text-lg font-bold mb-3 flex items-center text-white">
                  {lesson.goalType === 'Ideal' ? '🏆 The Ideal Swing' : '🏌️ The Playable Swing'}
                </h4>
                <p className="text-slate-300 mb-4 whitespace-pre-wrap">{lesson.AIReview || "No review provided."}</p>

                <h5 className="font-semibold text-white mb-2 uppercase text-xs tracking-wider">Recommended Drills</h5>
                <ul className="space-y-2 mb-6">
                  {(typeof lesson.drills === 'string' ? JSON.parse(lesson.drills) : (lesson.drills || [])).map((drill: string, i: number) => (
                    <li key={i} className="flex items-start text-sm text-slate-300">
                      <span className="text-primary mr-2">•</span>
                      <span>{drill}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-auto pt-4 border-t border-white/10">
                  <button className="w-full py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-lg font-medium text-sm transition-colors">
                    Set as Primary Goal
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Comments Section */}
      <div className="glass-panel rounded-2xl p-6 mt-6">
        <h3 className="text-xl font-bold mb-6 text-white flex items-center border-b border-white/10 pb-4">
          <MessageSquare className="w-5 h-5 mr-2 text-primary" />
          Notes & Comments
        </h3>

        <form onSubmit={handleAddComment} className="mb-6 relative">
          <textarea
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="Add a note about this swing..."
            className="w-full bg-black/20 border border-white/10 text-white placeholder:text-slate-500 rounded-xl p-4 pr-16 focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all resize-none h-24"
          />
          <button
            type="submit"
            disabled={submittingComment || !commentText.trim()}
            className="absolute bottom-4 right-4 p-2 bg-primary hover:bg-primary/80 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>

        <div className="space-y-4 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
          {data.comments && data.comments.length > 0 ? (
            data.comments.map(comment => (
              <div key={comment.id} className="bg-black/20 rounded-xl p-4 border border-white/5">
                <p className="text-slate-200 whitespace-pre-wrap text-sm">{comment.text}</p>
                <p className="text-slate-500 text-xs mt-2">
                  {new Date(comment.createdAt).toLocaleString()}
                </p>
              </div>
            ))
          ) : (
            <p className="text-slate-500 text-center py-6 text-sm bg-black/10 rounded-xl border border-dashed border-white/10">
              No notes yet. Add one above to keep track of your thoughts.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function MetricCard({ title, value, icon }: { title: string, value: string | number, icon: React.ReactNode }) {
  return (
    <div className="glass-card p-5 rounded-2xl flex items-center space-x-4">
      <div className="p-3 bg-white/5 rounded-xl border border-white/10">
        {icon}
      </div>
      <div>
        <p className="text-sm font-medium text-slate-400">{title}</p>
        <h4 className="text-2xl font-bold text-white">{value}</h4>
      </div>
    </div>
  );
}
