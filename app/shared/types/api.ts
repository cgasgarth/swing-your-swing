import { Swing, SwingMetrics, LessonRoadmap, LaunchMonitorData } from "./index";

export interface UploadSwingResponse {
    message: string;
    swingId: string;
}

export interface GetSwingResponse {
    swing: Swing;
    metrics: SwingMetrics;
    lessons: LessonRoadmap[];
    launchData: LaunchMonitorData | null;
}

export interface GetSwingsResponse extends Array<Swing & { estimatedDistance?: number; estimatedClubSpeed?: number }> { }

export interface AttachLaunchMonitorResponse {
    message: string;
}
