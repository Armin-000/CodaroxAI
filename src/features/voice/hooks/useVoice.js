import { useEffect, useRef, useState } from "react";

function supportsSpeechRecognition() {
  return Boolean(
    window.SpeechRecognition ||
    window.webkitSpeechRecognition
  );
}

function getSpeechRecognition() {
  const SpeechRecognition =
    window.SpeechRecognition ||
    window.webkitSpeechRecognition;

  return SpeechRecognition
    ? new SpeechRecognition()
    : null;
}

function uniqueVoices(voices) {
  const seen = new Set();

  return voices.filter((voice) => {
    const key =
      voice.voiceURI ||
      (voice.name + "|" + voice.lang);

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

export function useVoice({
  settings,
  input,
  setInput,
  streaming,
  onFinalText,
}) {
  const [voiceMode, setVoiceMode] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);

  const [speechSupported, setSpeechSupported] =
    useState(true);

  const [
    speechSynthesisSupported,
    setSpeechSynthesisSupported,
  ] = useState(true);

  const [speechVoices, setSpeechVoices] =
    useState([]);

  const [micTesting, setMicTesting] =
    useState(false);

  const [micLevel, setMicLevel] =
    useState(0);

  const [micTestError, setMicTestError] =
    useState("");

  const recognitionRef = useRef(null);
  const voiceModeRef = useRef(false);
  const listeningRef = useRef(false);
  const streamingRef = useRef(streaming);
  const speechSupportedRef = useRef(true);
  const onFinalTextRef = useRef(onFinalText);

  const micStreamRef = useRef(null);
  const micAudioContextRef = useRef(null);
  const micAnimationFrameRef = useRef(0);

  /*
   * Browser capabilities + system voices
   */
  useEffect(() => {
    const recognitionSupported =
      supportsSpeechRecognition();

    const synthesisSupported =
      "speechSynthesis" in window &&
      "SpeechSynthesisUtterance" in window;

    setSpeechSupported(recognitionSupported);
    setSpeechSynthesisSupported(
      synthesisSupported
    );

    speechSupportedRef.current =
      recognitionSupported;

    if (!synthesisSupported) {
      return undefined;
    }

    const loadVoices = () => {
      const voices = uniqueVoices(
        window.speechSynthesis.getVoices?.() || []
      );

      voices.sort((a, b) => {
        if (a.default !== b.default) {
          return a.default ? -1 : 1;
        }

        return (
          a.lang + a.name
        ).localeCompare(
          b.lang + b.name
        );
      });

      setSpeechVoices(voices);
    };

    loadVoices();

    window.speechSynthesis
      .addEventListener?.(
        "voiceschanged",
        loadVoices
      );

    const previousHandler =
      window.speechSynthesis.onvoiceschanged;

    if (
      !window.speechSynthesis.addEventListener
    ) {
      window.speechSynthesis.onvoiceschanged =
        loadVoices;
    }

    return () => {
      window.speechSynthesis
        .removeEventListener?.(
          "voiceschanged",
          loadVoices
        );

      if (
        !window.speechSynthesis
          .removeEventListener
      ) {
        window.speechSynthesis
          .onvoiceschanged =
            previousHandler || null;
      }
    };
  }, []);

  useEffect(() => {
    voiceModeRef.current = voiceMode;
  }, [voiceMode]);

  useEffect(() => {
    listeningRef.current = listening;
  }, [listening]);

  useEffect(() => {
    streamingRef.current = streaming;
  }, [streaming]);

  useEffect(() => {
    onFinalTextRef.current =
      onFinalText;
  }, [onFinalText]);

  /*
   * Cleanup
   */
  useEffect(
    () => () => {
      recognitionRef.current?.abort?.();

      window.speechSynthesis
        ?.cancel?.();

      stopMicrophoneTest();
    },
    []
  );

  function preferredLanguage() {
    if (
      settings.voiceLanguage !== "auto"
    ) {
      return settings.voiceLanguage;
    }

    if (settings.language === "hr") {
      return "hr-HR";
    }

    if (settings.language === "en") {
      return "en-US";
    }

    return (
      navigator.language ||
      "en-US"
    );
  }

  /*
   * Pick TTS voice
   */
  function selectSpeechVoice() {
    if (
      !("speechSynthesis" in window)
    ) {
      return null;
    }

    const voices =
      window.speechSynthesis
        .getVoices?.() || [];

    if (
      settings.voiceName &&
      settings.voiceName !== "auto"
    ) {
      const selected = voices.find(
        (voice) =>
          voice.voiceURI ===
            settings.voiceName ||
          voice.name ===
            settings.voiceName
      );

      if (selected) {
        return selected;
      }
    }

    const language =
      preferredLanguage().toLowerCase();

    const base =
      language.split("-")[0];

    return (
      voices.find(
        (voice) =>
          voice.default &&
          voice.lang
            ?.toLowerCase()
            .startsWith(base)
      ) ||
      voices.find(
        (voice) =>
          voice.lang?.toLowerCase() ===
          language
      ) ||
      voices.find(
        (voice) =>
          voice.lang
            ?.toLowerCase()
            .startsWith(base)
      ) ||
      voices.find(
        (voice) => voice.default
      ) ||
      voices[0] ||
      null
    );
  }

  /*
   * Prepare AI answer for speech
   */
  function prepareSpeechText(text) {
    let clean =
      String(text || "");

    if (settings.voiceReadCode) {
      clean = clean.replace(
        /\x60{3}(?:[a-z0-9_+.-]+)?\n?([\s\S]*?)\x60{3}/gi,
        " $1 "
      );
    } else {
      clean = clean.replace(
        /\x60{3}[\s\S]*?\x60{3}/g,
        " Code block omitted. "
      );
    }

    if (
      settings.voiceSkipUrls !== false
    ) {
      clean = clean
        .replace(
          /!\[([^\]]*)\]\([^)]*\)/g,
          " $1 "
        )
        .replace(
          /\[([^\]]+)\]\((?:https?:\/\/|www\.)[^)]*\)/gi,
          " $1 "
        )
        .replace(
          /(?:https?:\/\/|www\.)[^\s)]+/gi,
          " link "
        );
    } else {
      clean = clean.replace(
        /!\[([^\]]*)\]\(([^)]*)\)/g,
        " $1 "
      );

      clean = clean.replace(
        /\[([^\]]+)\]\(([^)]*)\)/g,
        " $1 $2 "
      );
    }

    return clean
      .replace(
        /[#*_>~|]/g,
        " "
      )
      .replace(
        /\s+/g,
        " "
      )
      .trim();
  }

  /*
   * Start speech recognition
   */
  function startVoiceListening(
    callback
  ) {
    if (
      !speechSupportedRef.current ||
      streamingRef.current ||
      listeningRef.current
    ) {
      return;
    }

    if (
      typeof callback === "function"
    ) {
      onFinalTextRef.current =
        callback;
    }

    if (
      settings
        .voiceStopPlaybackOnListen !==
      false
    ) {
      window.speechSynthesis
        ?.cancel?.();
    }

    const recognition =
      getSpeechRecognition();

    if (!recognition) {
      return;
    }

    recognition.lang =
      preferredLanguage();

    recognition.interimResults =
      true;

    recognition.continuous =
      false;

    let finalText = "";

    recognition.onstart = () => {
      finalText = "";

      listeningRef.current =
        true;

      setListening(true);
    };

    recognition.onresult =
      (event) => {
        let interim = "";

        for (
          let i = event.resultIndex;
          i < event.results.length;
          i += 1
        ) {
          const transcript =
            event.results[i][0]
              .transcript;

          if (
            event.results[i].isFinal
          ) {
            finalText += transcript;
          } else {
            interim += transcript;
          }
        }

        setInput(
          finalText + interim
        );
      };

    recognition.onerror = () => {
      listeningRef.current =
        false;

      setListening(false);
    };

    recognition.onend = () => {
      listeningRef.current =
        false;

      setListening(false);

      const text =
        finalText.trim();

      if (
        voiceModeRef.current &&
        text &&
        settings.voiceAutoSend !==
          false
      ) {
        onFinalTextRef.current?.(
          text
        );
      }
    };

    recognitionRef.current =
      recognition;

    try {
      recognition.start();
    } catch {
      listeningRef.current =
        false;

      setListening(false);
    }
  }

  /*
   * TTS
   */
  function speak(text) {
    if (
      !("speechSynthesis" in window) ||
      !voiceEnabled
    ) {
      return;
    }

    window.speechSynthesis.cancel();

    const clean =
      prepareSpeechText(text);

    if (!clean) {
      return;
    }

    const utterance =
      new SpeechSynthesisUtterance(
        clean
      );

    utterance.lang =
      preferredLanguage();

    utterance.rate =
      Number(
        settings.voiceRate || 1
      );

    utterance.pitch = 1;

    const selectedVoice =
      selectSpeechVoice();

    if (selectedVoice) {
      utterance.voice =
        selectedVoice;

      utterance.lang =
        selectedVoice.lang ||
        utterance.lang;
    }

    /*
     * Hands-free:
     * AI finishes speaking ->
     * microphone starts again.
     */
    utterance.onend = () => {
      if (
        settings.voiceHandsFree &&
        settings.autoSpeak &&
        settings.voiceAutoSend !==
          false &&
        voiceModeRef.current
      ) {
        window.setTimeout(
          () => {
            if (
              !streamingRef.current &&
              !listeningRef.current &&
              voiceModeRef.current
            ) {
              startVoiceListening();
            }
          },
          180
        );
      }
    };

    window.speechSynthesis.speak(
      utterance
    );
  }

  /*
   * Preview current voice
   */
  function previewVoice() {
    const language =
      preferredLanguage()
        .toLowerCase();

    const sample =
      language.startsWith("hr")
        ? "Pozdrav, ovo je Codarox AI."
        : "Hello, this is Codarox AI.";

    speak(sample);
  }

  function toggleVoiceListening(
    callback
  ) {
    if (listeningRef.current) {
      recognitionRef.current
        ?.stop?.();

      return;
    }

    startVoiceListening(callback);
  }

  function openVoiceMode(callback) {
    if (
      typeof callback === "function"
    ) {
      onFinalTextRef.current =
        callback;
    }

    setVoiceMode(true);

    voiceModeRef.current =
      true;

    window.setTimeout(() => {
      if (
        speechSupportedRef.current &&
        !listeningRef.current &&
        !streamingRef.current
      ) {
        startVoiceListening();
      }
    }, 180);
  }

  function closeVoiceMode() {
    recognitionRef.current
      ?.abort?.();

    window.speechSynthesis
      ?.cancel?.();

    listeningRef.current =
      false;

    voiceModeRef.current =
      false;

    setListening(false);
    setVoiceMode(false);
  }

  function toggleVoiceOutput() {
    setVoiceEnabled(
      (value) => !value
    );

    window.speechSynthesis
      ?.cancel?.();
  }

  /*
   * =======================================================
   * REAL MICROPHONE INPUT TEST
   * =======================================================
   */

  function stopMicrophoneTest() {
    if (
      micAnimationFrameRef.current
    ) {
      window.cancelAnimationFrame(
        micAnimationFrameRef.current
      );

      micAnimationFrameRef.current =
        0;
    }

    micStreamRef.current
      ?.getTracks?.()
      .forEach(
        (track) => track.stop()
      );

    micStreamRef.current = null;

    const context =
      micAudioContextRef.current;

    micAudioContextRef.current =
      null;

    if (
      context &&
      context.state !== "closed"
    ) {
      context
        .close?.()
        .catch?.(() => {});
    }

    setMicTesting(false);
    setMicLevel(0);
  }

  async function toggleMicrophoneTest() {
    if (micTesting) {
      stopMicrophoneTest();
      return;
    }

    setMicTestError("");

    if (
      !navigator.mediaDevices
        ?.getUserMedia
    ) {
      setMicTestError(
        "Microphone testing is not supported by this browser."
      );

      return;
    }

    try {
      const stream =
        await navigator.mediaDevices
          .getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            },
          });

      const AudioContext =
        window.AudioContext ||
        window.webkitAudioContext;

      if (!AudioContext) {
        stream
          .getTracks()
          .forEach(
            (track) =>
              track.stop()
          );

        setMicTestError(
          "Audio input analysis is not supported by this browser."
        );

        return;
      }

      const context =
        new AudioContext();

      await context.resume?.();

      const source =
        context
          .createMediaStreamSource(
            stream
          );

      const analyser =
        context.createAnalyser();

      analyser.fftSize = 256;

      analyser.smoothingTimeConstant =
        0.72;

      source.connect(analyser);

      const data =
        new Uint8Array(
          analyser.fftSize
        );

      micStreamRef.current =
        stream;

      micAudioContextRef.current =
        context;

      setMicTesting(true);

      const updateLevel = () => {
        analyser
          .getByteTimeDomainData(
            data
          );

        let sum = 0;

        for (
          let i = 0;
          i < data.length;
          i += 1
        ) {
          const value =
            (data[i] - 128) / 128;

          sum +=
            value * value;
        }

        const rms =
          Math.sqrt(
            sum / data.length
          );

        setMicLevel(
          Math.min(
            1,
            rms * 5.5
          )
        );

        micAnimationFrameRef.current =
          window.requestAnimationFrame(
            updateLevel
          );
      };

      updateLevel();
    } catch (error) {
      stopMicrophoneTest();

      if (
        error?.name ===
        "NotAllowedError"
      ) {
        setMicTestError(
          "Microphone permission was denied."
        );
      } else if (
        error?.name ===
        "NotFoundError"
      ) {
        setMicTestError(
          "No microphone was found."
        );
      } else {
        setMicTestError(
          "Microphone test could not be started."
        );
      }
    }
  }

  return {
    voiceMode,
    setVoiceMode,

    listening,

    voiceEnabled,

    speechSupported,
    speechSynthesisSupported,
    speechVoices,

    micTesting,
    micLevel,
    micTestError,

    recognitionRef,
    voiceModeRef,

    speak,
    previewVoice,

    toggleVoiceListening,
    openVoiceMode,
    closeVoiceMode,
    toggleVoiceOutput,

    toggleMicrophoneTest,
    stopMicrophoneTest,

    input,
  };
}
