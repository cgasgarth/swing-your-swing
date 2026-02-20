#!/usr/bin/env python3
"""
Golf Swing Pose Analysis using MediaPipe PoseLandmarker Task API.
Usage: python3 pose_analysis.py <video_path>
Outputs JSON to stdout with measured body angles at 4 swing keyframes.
"""

from __future__ import annotations

import json
import math
import os
import sys
import urllib.request
from dataclasses import dataclass
from typing import Any

import cv2
import mediapipe as mp
import numpy as np

# --- MediaPipe Task API Imports ---
BaseOptions = mp.tasks.BaseOptions
PoseLandmarker = mp.tasks.vision.PoseLandmarker
PoseLandmarkerOptions = mp.tasks.vision.PoseLandmarkerOptions
VisionRunningMode = mp.tasks.vision.RunningMode

# Landmark indices (from MediaPipe Pose)
LEFT_SHOULDER: int = 11
RIGHT_SHOULDER: int = 12
LEFT_HIP: int = 23
RIGHT_HIP: int = 24
LEFT_ELBOW: int = 13
RIGHT_ELBOW: int = 14
LEFT_WRIST: int = 15
RIGHT_WRIST: int = 16

MODEL_URL: str = "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_heavy/float16/latest/pose_landmarker_heavy.task"
SCRIPT_DIR: str = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH: str = os.path.join(SCRIPT_DIR, "pose_landmarker_heavy.task")


@dataclass
class Point2D:
    x: float
    y: float


@dataclass
class BodyAngles:
    spineAngle: float
    shoulderTurn: float
    hipTurn: float
    leadArmAngle: float

    def to_dict(self) -> dict[str, float]:
        return {
            "spineAngle": round(self.spineAngle, 1),
            "shoulderTurn": round(self.shoulderTurn, 1),
            "hipTurn": round(self.hipTurn, 1),
            "leadArmAngle": round(self.leadArmAngle, 1),
        }


@dataclass
class FrameData:
    frame_idx: int
    timestamp_ms: int
    angles: BodyAngles
    wrist_y: float
    shoulder_turn: float


def ensure_model_downloaded() -> None:
    """Download the PoseLandmarker model if not already present."""
    if os.path.exists(MODEL_PATH):
        return
    print(f"Downloading PoseLandmarker model to {MODEL_PATH}...", file=sys.stderr)
    urllib.request.urlretrieve(MODEL_URL, MODEL_PATH)
    print("Model downloaded.", file=sys.stderr)


def angle_2d(a: Point2D, b: Point2D, c: Point2D) -> float:
    """Compute the angle at point B formed by vectors BA and BC, in degrees."""
    ba: tuple[float, float] = (a.x - b.x, a.y - b.y)
    bc: tuple[float, float] = (c.x - b.x, c.y - b.y)
    dot: float = ba[0] * bc[0] + ba[1] * bc[1]
    mag_ba: float = math.sqrt(ba[0] ** 2 + ba[1] ** 2)
    mag_bc: float = math.sqrt(bc[0] ** 2 + bc[1] ** 2)
    if mag_ba == 0 or mag_bc == 0:
        return 0.0
    cos_angle: float = max(-1.0, min(1.0, dot / (mag_ba * mag_bc)))
    return math.degrees(math.acos(cos_angle))


def landmark_to_point(landmark: Any, width: int, height: int) -> Point2D:
    """Convert a normalized MediaPipe landmark to image pixel coordinates."""
    return Point2D(x=landmark.x * width, y=landmark.y * height)


def compute_angles(landmarks: list[Any], width: int, height: int) -> BodyAngles:
    """Extract biomechanical angles from MediaPipe pose landmarks."""

    def pt(idx: int) -> Point2D:
        return landmark_to_point(landmarks[idx], width, height)

    left_shoulder: Point2D = pt(LEFT_SHOULDER)
    right_shoulder: Point2D = pt(RIGHT_SHOULDER)
    left_hip: Point2D = pt(LEFT_HIP)
    right_hip: Point2D = pt(RIGHT_HIP)
    left_elbow: Point2D = pt(LEFT_ELBOW)
    left_wrist: Point2D = pt(LEFT_WRIST)

    mid_shoulder: Point2D = Point2D(
        x=(left_shoulder.x + right_shoulder.x) / 2,
        y=(left_shoulder.y + right_shoulder.y) / 2,
    )
    mid_hip: Point2D = Point2D(
        x=(left_hip.x + right_hip.x) / 2,
        y=(left_hip.y + right_hip.y) / 2,
    )

    # Spine angle: forward tilt from vertical
    dx: float = mid_shoulder.x - mid_hip.x
    dy: float = mid_shoulder.y - mid_hip.y
    spine_angle: float = abs(math.degrees(math.atan2(dx, -dy)))

    # Shoulder turn: angle of shoulder line relative to horizontal
    shoulder_dx: float = right_shoulder.x - left_shoulder.x
    shoulder_dy: float = right_shoulder.y - left_shoulder.y
    shoulder_turn: float = abs(math.degrees(math.atan2(shoulder_dy, shoulder_dx)))

    # Hip turn: angle of hip line relative to horizontal
    hip_dx: float = right_hip.x - left_hip.x
    hip_dy: float = right_hip.y - left_hip.y
    hip_turn: float = abs(math.degrees(math.atan2(hip_dy, hip_dx)))

    # Lead arm angle at the elbow
    lead_arm_angle: float = angle_2d(left_shoulder, left_elbow, left_wrist)

    return BodyAngles(
        spineAngle=spine_angle,
        shoulderTurn=shoulder_turn,
        hipTurn=hip_turn,
        leadArmAngle=lead_arm_angle,
    )


def detect_key_frames(video_path: str) -> dict[str, Any]:
    """
    Analyze video and detect 4 key swing positions using wrist trajectory.
    Uses MediaPipe PoseLandmarker Task API in VIDEO mode.
    """
    ensure_model_downloaded()

    cap: cv2.VideoCapture = cv2.VideoCapture(video_path)
    fps: float = cap.get(cv2.CAP_PROP_FPS)
    total_frames: int = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    width: int = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height: int = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

    # Sample every Nth frame for efficiency (target ~60 samples)
    sample_interval: int = max(1, total_frames // 60)

    frames_data: list[FrameData] = []

    options = PoseLandmarkerOptions(
        base_options=BaseOptions(model_asset_path=MODEL_PATH),
        running_mode=VisionRunningMode.VIDEO,
        num_poses=1,
        min_pose_detection_confidence=0.5,
        min_tracking_confidence=0.5,
    )

    with PoseLandmarker.create_from_options(options) as landmarker:
        frame_idx: int = 0
        while cap.isOpened():
            ret: bool
            frame: np.ndarray
            ret, frame = cap.read()
            if not ret:
                break

            if frame_idx % sample_interval == 0:
                rgb_frame: np.ndarray = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                mp_image: mp.Image = mp.Image(
                    image_format=mp.ImageFormat.SRGB, data=rgb_frame
                )
                timestamp_ms: int = int((frame_idx / fps) * 1000)
                result = landmarker.detect_for_video(mp_image, timestamp_ms)

                if result.pose_landmarks and len(result.pose_landmarks) > 0:
                    landmarks = result.pose_landmarks[0]
                    angles: BodyAngles = compute_angles(landmarks, width, height)

                    avg_wrist_y: float = (
                        landmarks[LEFT_WRIST].y + landmarks[RIGHT_WRIST].y
                    ) / 2

                    frames_data.append(
                        FrameData(
                            frame_idx=frame_idx,
                            timestamp_ms=timestamp_ms,
                            angles=angles,
                            wrist_y=avg_wrist_y,
                            shoulder_turn=angles.shoulderTurn,
                        )
                    )

            frame_idx += 1

    cap.release()

    if len(frames_data) < 4:
        raise ValueError(
            f"Insufficient pose data: only {len(frames_data)} frames detected"
        )

    # Find key positions using wrist trajectory
    # Address: first ~12% of frames, lowest shoulder turn
    addr_range: list[FrameData] = frames_data[: max(1, len(frames_data) // 8)]
    address_frame: FrameData = min(addr_range, key=lambda f: f.shoulder_turn)

    # Top: highest wrist position (minimum Y in image coords) in first half
    active_range: list[FrameData] = frames_data[
        len(frames_data) // 10 : len(frames_data) // 2
    ]
    top_frame: FrameData = (
        min(active_range, key=lambda f: f.wrist_y)
        if active_range
        else frames_data[len(frames_data) // 4]
    )

    # Impact: lowest wrist Y in the downswing (after top, in 50-75% range)
    top_idx: int = frames_data.index(top_frame)
    downswing_range: list[FrameData] = frames_data[
        top_idx : int(len(frames_data) * 0.75)
    ]
    impact_frame: FrameData = (
        max(downswing_range, key=lambda f: f.wrist_y)
        if downswing_range
        else frames_data[int(len(frames_data) * 0.6)]
    )

    # Finish: last stable high-wrist position (follow-through)
    finish_range: list[FrameData] = frames_data[int(len(frames_data) * 0.75) :]
    finish_frame: FrameData = (
        min(finish_range, key=lambda f: f.wrist_y)
        if finish_range
        else frames_data[-1]
    )

    return {
        "address": address_frame,
        "top": top_frame,
        "impact": impact_frame,
        "finish": finish_frame,
        "fps": fps,
        "total_frames": total_frames,
        "total_duration_ms": int((total_frames / fps) * 1000),
    }


def main() -> None:
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Usage: python3 pose_analysis.py <video_path>"}))
        sys.exit(1)

    video_path: str = sys.argv[1]

    try:
        key_frames: dict[str, Any] = detect_key_frames(video_path)

        result: dict[str, Any] = {
            "timestampsMs": {
                "address": key_frames["address"].timestamp_ms,
                "top": key_frames["top"].timestamp_ms,
                "impact": key_frames["impact"].timestamp_ms,
                "finish": key_frames["finish"].timestamp_ms,
            },
            "addressAngles": key_frames["address"].angles.to_dict(),
            "topAngles": key_frames["top"].angles.to_dict(),
            "impactAngles": key_frames["impact"].angles.to_dict(),
            "finishAngles": key_frames["finish"].angles.to_dict(),
            "metadata": {
                "fps": key_frames["fps"],
                "totalFrames": key_frames["total_frames"],
                "totalDurationMs": key_frames["total_duration_ms"],
            },
        }

        print(json.dumps(result))

    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)


if __name__ == "__main__":
    main()
