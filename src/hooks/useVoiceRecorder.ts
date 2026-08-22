"use client";

import { useCallback, useRef, useState } from "react";

/**
 * Thin wrapper around the browser's MediaRecorder API for voice-note
 * replies. `start()` requests mic access and begins recording; `stop()`
 * resolves with the recorded audio as a `File` ready for `mediaApi.upload`,
 * or `null` if nothing was captured; `cancel()` discards the recording.
 */
export function useVoiceRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const cleanupStream = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    recorderRef.current = null;
  };

  const start = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    streamRef.current = stream;

    const mimeType = MediaRecorder.isTypeSupported("audio/webm")
      ? "audio/webm"
      : MediaRecorder.isTypeSupported("audio/mp4")
        ? "audio/mp4"
        : "";

    const recorder = new MediaRecorder(
      stream,
      mimeType ? { mimeType } : undefined,
    );
    chunksRef.current = [];
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunksRef.current.push(event.data);
    };
    recorder.start();
    recorderRef.current = recorder;
    setIsRecording(true);
  }, []);

  const stop = useCallback((): Promise<File | null> => {
    return new Promise((resolve) => {
      const recorder = recorderRef.current;
      if (!recorder) {
        resolve(null);
        return;
      }
      recorder.onstop = () => {
        const mimeType = recorder.mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type: mimeType });
        cleanupStream();
        setIsRecording(false);
        if (blob.size === 0) {
          resolve(null);
          return;
        }
        const extension = mimeType.includes("mp4") ? "m4a" : "webm";
        resolve(
          new File([blob], `voice-note-${Date.now()}.${extension}`, {
            type: mimeType,
          }),
        );
      };
      recorder.stop();
    });
  }, []);

  const cancel = useCallback(() => {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.onstop = null;
      recorder.stop();
    }
    chunksRef.current = [];
    cleanupStream();
    setIsRecording(false);
  }, []);

  return { isRecording, start, stop, cancel };
}
