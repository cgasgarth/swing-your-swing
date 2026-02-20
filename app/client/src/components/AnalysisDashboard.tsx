import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { API_BASE } from '../App';
import { Swing, SwingMetrics, LessonRoadmap, LaunchMonitorData } from '../../../shared/types/index';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Activity, Target, Zap, Clock } from 'lucide-react';

interface Props {
  swingId: string;
}

interface DashboardData {
  swing: Swing;
  metrics: SwingMetrics;
  lessons: LessonRoadmap[];
  launchData: LaunchMonitorData | null;
}

export function AnalysisDashboard({ swingId }: Props) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

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

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!data || !data.metrics) {
    return <div className="text-center p-8 bg-white rounded-xl shadow">Analysis still processing or failed to load.</div>;
  }

  const m = data.metrics;
  const l = data.launchData;

  const chartData = [
    { name: 'Address', ...m.addressAngles, proSpine: 45, proShoulder: 0, proHip: 0 },
    { name: 'Top', ...m.topAngles, proSpine: 45, proShoulder: 90, proHip: 45 },
    { name: 'Impact', ...m.impactAngles, proSpine: 50, proShoulder: 45, proHip: 45 },
    { name: 'Finish', ...m.finishAngles, proSpine: 10, proShoulder: 120, proHip: 90 },
  ];

  return (
    <div className="space-y-6">

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

        <div className="bg-black rounded-2xl shadow-lg overflow-hidden relative">
          <video
            src={`http://localhost:4000${data.swing.videoUrl}`}
            controls
            className="w-full h-full object-contain max-h-[500px]"
          />
          <div className="absolute top-4 left-4 bg-primary text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide shadow-md">
            {data.swing.club}
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-lg border border-slate-100 flex flex-col">
          <h3 className="text-xl font-bold mb-4 text-slate-800">Body Angles Throughout Swing</h3>
          <div className="flex-grow min-h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                <Bar dataKey="spineAngle" fill="#15803d" radius={[4, 4, 0, 0]} name="Spine Angle" maxBarSize={40} />
                <Bar dataKey="proSpine" fill="#86efac" radius={[4, 4, 0, 0]} name="Pro Spine (Toro)" maxBarSize={40} />
                <Bar dataKey="shoulderTurn" fill="#facc15" radius={[4, 4, 0, 0]} name="Shoulder Turn" maxBarSize={40} />
                <Bar dataKey="hipTurn" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Hip Turn" maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {data.lessons && data.lessons.length > 0 && (
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-100">
          <h3 className="text-2xl font-bold mb-6 text-slate-900 border-b pb-4">AI Lesson Roadmap</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {data.lessons.map((lesson, idx) => (
              <div key={idx} className={`p-6 rounded-xl border-l-4 ${lesson.goalType === 'Ideal' ? 'bg-green-50/50 border-primary' : 'bg-blue-50/50 border-blue-500'}`}>
                <h4 className="text-xl font-bold mb-3 flex items-center">
                  {lesson.goalType === 'Ideal' ? '🏆 The Ideal Swing' : '🏌️ The Playable Swing'}
                </h4>
                <p className="text-slate-700 mb-4 whitespace-pre-wrap">{lesson.AIReview || "No review provided."}</p>

                <h5 className="font-semibold text-slate-900 mb-2 uppercase text-sm tracking-wider">Recommended Drills</h5>
                <ul className="space-y-2">
                  {(lesson.drills || []).map((drill: string, i: number) => (
                    <li key={i} className="flex items-start text-sm">
                      <span className="text-primary mr-2">•</span>
                      <span className="text-slate-700">{drill}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-4 pt-4 border-t border-slate-200">
                  <h5 className="font-semibold text-slate-900 mb-2 uppercase text-sm tracking-wider">Set Goal Tracking</h5>
                  <button className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded font-medium text-sm transition-colors">
                    Set as My Primary Goal
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MetricCard({ title, value, icon }: { title: string, value: string | number, icon: React.ReactNode }) {
  return (
    <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center space-x-4">
      <div className="p-3 bg-slate-50 rounded-xl">
        {icon}
      </div>
      <div>
        <p className="text-sm font-medium text-slate-500">{title}</p>
        <h4 className="text-2xl font-bold text-slate-900">{value}</h4>
      </div>
    </div>
  );
}
