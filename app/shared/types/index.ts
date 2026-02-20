export interface Player {
    id: string;
    name: string;
    handicap?: number;
    createdAt: string;
}

export type ClubType =
    | "Driver"
    | "Wood"
    | "Hybrid"
    | "LongIron"
    | "MidIron"
    | "ShortIron"
    | "Wedge"
    | "Putter";

export interface Swing {
    id: string;
    playerId: string;
    club: ClubType;
    videoUrl: string;
    launchMonitorDataId?: string;
    analyzed: boolean;
    isFavorite?: boolean;
    createdAt: string;
}

export interface Comment {
    id: string;
    swingId: string;
    text: string;
    createdAt: string;
}

export interface LaunchMonitorData {
    id: string;
    swingId: string;
    imageUrl: string;
    ballSpeed?: number;
    clubSpeed?: number;
    smashFactor?: number;
    carry?: number;
    spinRate?: number;
    extractedRawText?: string;
    createdAt: string;
}

export interface BodyAngles {
    spineAngle: number;
    shoulderTurn: number;
    hipTurn: number;
    leadArmAngle: number;
}

export interface SwingMetrics {
    id: string;
    swingId: string;
    addressTimeMs: number;
    topTimeMs: number;
    impactTimeMs: number;
    finishTimeMs: number;
    addressAngles: BodyAngles;
    topAngles: BodyAngles;
    impactAngles: BodyAngles;
    finishAngles: BodyAngles;
    estimatedClubSpeed?: number;
    estimatedClubPath?: string;
    estimatedDistance?: number;
    createdAt: string;
}

export interface LessonRoadmap {
    id: string;
    swingId: string;
    goalType: "Ideal" | "Playable";
    drills: string[];
    AIReview: string;
    createdAt: string;
}

export interface ToroBaseline {
    id: string;
    club: ClubType;
    addressAngles: BodyAngles;
    topAngles: BodyAngles;
    impactAngles: BodyAngles;
    finishAngles: BodyAngles;
}
