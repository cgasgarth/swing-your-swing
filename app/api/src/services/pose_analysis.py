#!/usr/bin/env python3
"""
Golf Swing Pose Analysis using MediaPipe.
Usage: python3 pose_analysis.py <video_path>
Outputs JSON to stdout with measured body angles at 4 swing keyframes.
"""

import sys
import json
import math
import cv2
import mediapipe as mp
import numpy as np

mp_pose = mp.solutions.pose
PoseLandmark = mp_pose.PoseLandmark


def angle_2d(a, b, c):
    """Compute the angle at point B formed by vectors BA and BC."""
    ba = (a[0] - b[0], a[1] - b[1])
    bc = (c[0] - b[0], c[1] - b[1])
    dot = ba[0] * bc[0] + ba[1] * bc[1]
    mag_ba = math.sqrt(ba[0]**2 + ba[1]**2)
    mag_bc = math.sqrt(bc[0]**2 + bc[1]**2)
    if mag_ba == 0 or mag_bc == 0:
        return 0.0
    cos_angle = max(-1.0, min(1.0, dot / (mag_ba * mag_bc)))
    return math.degrees(math.acos(cos_angle))


def landmark_to_xy(landmark, width, height):
    return (landmark.x * width, landmark.y * height)


def compute_angles(landmarks, width, height):
    """Extract biomechanical angles from MediaPipe landmarks."""

    def pt(lm_enum):
        lm = landmarks[lm_enum.value]
        return landmark_to_xy(lm, width, height)

    left_shoulder = pt(PoseLandmark.LEFT_SHOULDER)
    right_shoulder = pt(PoseLandmark.RIGHT_SHOULDER)
    left_hip = pt(PoseLandmark.LEFT_HIP)
    right_hip = pt(PoseLandmark.RIGHT_HIP)
    left_elbow = pt(PoseLandmark.LEFT_ELBOW)
    right_elbow = pt(PoseLandmark.RIGHT_ELBOW)
    left_wrist = pt(PoseLandmark.LEFT_WRIST)
    right_wrist = pt(PoseLandmark.RIGHT_WRIST)

    # Mid-points
    mid_shoulder = ((left_shoulder[0] + right_shoulder[0]) / 2,
                    (left_shoulder[1] + right_shoulder[1]) / 2)
    mid_hip = ((left_hip[0] + right_hip[0]) / 2,
               (left_hip[1] + right_hip[1]) / 2)

    # Spine angle: angle of the spine line (mid_hip to mid_shoulder) from vertical
    dx = mid_shoulder[0] - mid_hip[0]
    dy = mid_shoulder[1] - mid_hip[1]  # y increases downward in image coords
    # Angle from vertical (downward direction = 0 degrees)
    spine_angle = abs(math.degrees(math.atan2(dx, -dy)))  # negate dy to flip y-axis

    # Shoulder turn: angle of shoulder line relative to horizontal (proxy for rotation)
    shoulder_dx = right_shoulder[0] - left_shoulder[0]
    shoulder_dy = right_shoulder[1] - left_shoulder[1]
    shoulder_turn = abs(math.degrees(math.atan2(shoulder_dy, shoulder_dx)))

    # Hip turn: angle of hip line relative to horizontal
    hip_dx = right_hip[0] - left_hip[0]
    hip_dy = right_hip[1] - left_hip[1]
    hip_turn = abs(math.degrees(math.atan2(hip_dy, hip_dx)))

    # Lead arm angle (left arm for right-handed golfer)
    lead_arm_angle = angle_2d(left_shoulder, left_elbow, left_wrist)

    return {
        "spineAngle": round(spine_angle, 1),
        "shoulderTurn": round(shoulder_turn, 1),
        "hipTurn": round(hip_turn, 1),
        "leadArmAngle": round(lead_arm_angle, 1)
    }


def detect_key_frames(video_path):
    """
    Analyze video and detect 4 key swing frames:
    Address, Top, Impact, Finish.

    Strategy:
    - Sample frames throughout the video
    - Track wrist Y-position to find swing motion arc
    - Address: first stable position before wrist starts moving up
    - Top: wrist is at highest point (lowest Y value)
    - Impact: wrist is at lowest arc point, then reverses upward
    - Finish: wrist is at high position on follow-through side
    """
    cap = cv2.VideoCapture(video_path)
    fps = cap.get(cv2.CAP_PROP_FPS)
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

    # Sample every Nth frame for efficiency (target ~60 samples)
    sample_interval = max(1, total_frames // 60)

    frames_data = []  # list of (frame_idx, timestamp_ms, landmarks, angles)

    with mp_pose.Pose(
        static_image_mode=False,
        model_complexity=2,
        enable_segmentation=False,
        min_detection_confidence=0.5,
        min_tracking_confidence=0.5
    ) as pose:
        frame_idx = 0
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break

            if frame_idx % sample_interval == 0:
                rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                results = pose.process(rgb_frame)

                if results.pose_landmarks:
                    landmarks = results.pose_landmarks.landmark
                    angles = compute_angles(landmarks, width, height)
                    timestamp_ms = int((frame_idx / fps) * 1000)

                    # Track wrist positions for phase detection
                    left_wrist = landmarks[PoseLandmark.LEFT_WRIST.value]
                    right_wrist = landmarks[PoseLandmark.RIGHT_WRIST.value]
                    avg_wrist_y = (left_wrist.y + right_wrist.y) / 2

                    frames_data.append({
                        "frame_idx": frame_idx,
                        "timestamp_ms": timestamp_ms,
                        "angles": angles,
                        "wrist_y": avg_wrist_y,
                        "shoulder_turn": angles["shoulderTurn"]
                    })

            frame_idx += 1

    cap.release()

    if len(frames_data) < 4:
        raise ValueError(f"Insufficient pose data: only {len(frames_data)} frames detected")

    # Find key positions using wrist trajectory
    wrist_ys = [f["wrist_y"] for f in frames_data]
    shoulder_turns = [f["shoulder_turn"] for f in frames_data]

    # Address: first ~10% of swing frames where wrist is near starting position
    addr_range = frames_data[:max(1, len(frames_data) // 8)]
    address_frame = min(addr_range, key=lambda f: f["shoulder_turn"])

    # Top: highest wrist position (minimum Y in image coords) — peak backswing
    active_range = frames_data[len(frames_data)//10 : len(frames_data)//2]
    top_frame = min(active_range, key=lambda f: f["wrist_y"]) if active_range else frames_data[len(frames_data)//4]

    # Impact: the lowest wrist Y in the downswing (after top, before finish)
    top_idx = frames_data.index(top_frame)
    downswing_range = frames_data[top_idx : int(len(frames_data) * 0.75)]
    impact_frame = max(downswing_range, key=lambda f: f["wrist_y"]) if downswing_range else frames_data[int(len(frames_data) * 0.6)]

    # Finish: last stable high-wrist position (follow-through)
    finish_range = frames_data[int(len(frames_data) * 0.75):]
    finish_frame = min(finish_range, key=lambda f: f["wrist_y"]) if finish_range else frames_data[-1]

    return {
        "address": address_frame,
        "top": top_frame,
        "impact": impact_frame,
        "finish": finish_frame,
        "fps": fps,
        "total_frames": total_frames,
        "total_duration_ms": int((total_frames / fps) * 1000)
    }


def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Usage: python3 pose_analysis.py <video_path>"}))
        sys.exit(1)

    video_path = sys.argv[1]

    try:
        key_frames = detect_key_frames(video_path)

        result = {
            "timestampsMs": {
                "address": key_frames["address"]["timestamp_ms"],
                "top": key_frames["top"]["timestamp_ms"],
                "impact": key_frames["impact"]["timestamp_ms"],
                "finish": key_frames["finish"]["timestamp_ms"]
            },
            "addressAngles": key_frames["address"]["angles"],
            "topAngles": key_frames["top"]["angles"],
            "impactAngles": key_frames["impact"]["angles"],
            "finishAngles": key_frames["finish"]["angles"],
            "metadata": {
                "fps": key_frames["fps"],
                "totalFrames": key_frames["total_frames"],
                "totalDurationMs": key_frames["total_duration_ms"]
            }
        }

        print(json.dumps(result))

    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)


if __name__ == "__main__":
    main()
