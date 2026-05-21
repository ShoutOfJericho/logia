import { useCallback, useEffect, useRef, useState } from "react";

interface SpeechRecognitionResult {
  finalTranscript: string;
  interimTranscript: string;
  isListening: boolean;
  error: string | null;
  start: () => void;
  stop: () => void;
  reset: () => void;
  consumeFinal: () => string;
  consumeTranscript: () => string;
  boundary: () => void;
}

interface SpeechRecognitionLike {
  start(): void;
  stop(): void;
  abort(): void;
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

type AnyWindow = Window & {
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
  SpeechRecognition?: SpeechRecognitionConstructor;
};

interface SpeechRecognitionEventLike extends Event {
  resultIndex: number;
  results: ArrayLike<{
    isFinal: boolean;
    [index: number]: { transcript: string; confidence: number };
  }>;
}

interface SpeechRecognitionErrorEventLike extends Event {
  error: string;
}

export function useSpeechRecognition(): SpeechRecognitionResult {
  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState("");
  const [finalTranscript, setFinalTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const desiredListeningRef = useRef(false);
  const finalBufferRef = useRef("");
  const interimBufferRef = useRef("");

  useEffect(() => {
    const w = window as AnyWindow;
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition;

    if (!SR) {
      setError(
        "Speech recognition isn't available in this browser. Try Chrome, Edge, or Safari.",
      );
      return;
    }

    const recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event: SpeechRecognitionEventLike) => {
      console.log("SPEECH RESULT EVENT", event);
      let interim = "";
      let nextFinal = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i] as {
          isFinal: boolean;
          [index: number]: { transcript: string };
        };

        const text = result[0]?.transcript?.trim() ?? "";

        if (!text) continue;

        if (result.isFinal) {
          nextFinal += (nextFinal ? " " : "") + text;
        } else {
          interim += (interim ? " " : "") + text;
        }
      }

      if (nextFinal) {
        finalBufferRef.current +=
          (finalBufferRef.current ? " " : "") + nextFinal;
        setFinalTranscript(finalBufferRef.current);
      }

      interimBufferRef.current = interim;
      setInterimTranscript(interim);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEventLike) => {
      const code = event.error;

      console.log("SPEECH ERROR", code);

      if (code === "aborted") return;

      if (code === "no-speech") {
        setError("Speech started, but Chrome did not detect spoken words.");
        return;
      }

      if (code === "not-allowed" || code === "service-not-allowed") {
        setError(
          "Microphone access was blocked. Allow it in your browser to continue.",
        );
        desiredListeningRef.current = false;
      } else {
        setError(`Recognition error: ${code}`);
      }
    };

    recognition.onend = () => {
      if (desiredListeningRef.current) {
        try {
          recognition.start();
        } catch {
          // already started
        }
      } else {
        setIsListening(false);
      }
    };

    recognition.onstart = () => {
      console.log("SPEECH STARTED");
      setIsListening(true);
      setError(null);
    };

    recognitionRef.current = recognition;

    return () => {
      desiredListeningRef.current = false;
      try {
        recognition.abort();
      } catch {
        // noop
      }
    };
  }, []);

  const start = useCallback(() => {
    if (!recognitionRef.current) return;

    desiredListeningRef.current = true;

    try {
      recognitionRef.current.start();
    } catch {
      // already running
    }
  }, []);

  const stop = useCallback(() => {
    desiredListeningRef.current = false;

    if (!recognitionRef.current) return;

    try {
      recognitionRef.current.stop();
    } catch {
      // noop
    }
  }, []);

  const reset = useCallback(() => {
    finalBufferRef.current = "";
    interimBufferRef.current = "";
    setFinalTranscript("");
    setInterimTranscript("");
  }, []);

  const consumeFinal = useCallback(() => {
    const value = finalBufferRef.current;

    finalBufferRef.current = "";
    setFinalTranscript("");

    return value;
  }, []);

  const boundary = useCallback(() => {
    const recognition = recognitionRef.current as
      | { stop: () => void }
      | null;

    if (!recognition) return;

    desiredListeningRef.current = true;

    try {
      recognition.stop();
    } catch {
      // noop
    }
  }, []);

  const consumeTranscript = useCallback(() => {
    const value = [finalBufferRef.current, interimBufferRef.current]
      .filter(Boolean)
      .join(" ")
      .trim();

    finalBufferRef.current = "";
    interimBufferRef.current = "";
    setFinalTranscript("");
    setInterimTranscript("");

    return value;
  }, []);

  return {
    finalTranscript,
    interimTranscript,
    isListening,
    error,
    start,
    stop,
    reset,
    consumeFinal,
    consumeTranscript,
    boundary,
  };
}