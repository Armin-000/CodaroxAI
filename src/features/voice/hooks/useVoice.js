import { useEffect, useRef, useState } from "react";

function supportsSpeechRecognition() {
  return Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
}

function getSpeechRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  return SpeechRecognition ? new SpeechRecognition() : null;
}

export function useVoice({ settings, input, setInput, streaming }) {
  const [voiceMode, setVoiceMode] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [speechSupported, setSpeechSupported] = useState(true);
  const recognitionRef = useRef(null);
  const voiceModeRef = useRef(false);

  useEffect(() => {
    setSpeechSupported(supportsSpeechRecognition());
  }, []);

  useEffect(() => {
    voiceModeRef.current = voiceMode;
  }, [voiceMode]);

  useEffect(() => () => {
    recognitionRef.current?.abort?.();
    window.speechSynthesis?.cancel?.();
  }, []);

  function preferredLanguage() {
    if (settings.voiceLanguage !== "auto") return settings.voiceLanguage;
    if (settings.language === "hr") return "hr-HR";
    if (settings.language === "en") return "en-US";
    return navigator.language || "en-US";
  }

  function speak(text) {
    if (!("speechSynthesis" in window) || !voiceEnabled) return;
    window.speechSynthesis.cancel();
    const clean = String(text)
      .replace(/```[\s\S]*?```/g, " code block ")
      .replace(/[#*_`>\[\]()~-]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.lang = preferredLanguage();
    utterance.rate = Number(settings.voiceRate || 1);
    utterance.pitch = 1;
    window.speechSynthesis.speak(utterance);
  }

  function toggleVoiceListening(onFinalText) {
    if (!speechSupported || streaming) return;
    if (listening) {
      recognitionRef.current?.stop?.();
      return;
    }
    const recognition = getSpeechRecognition();
    if (!recognition) return;
    recognition.lang = preferredLanguage();
    recognition.interimResults = true;
    recognition.continuous = false;
    let finalText = "";
    recognition.onstart = () => {
      finalText = "";
      setListening(true);
    };
    recognition.onresult = (event) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalText += transcript;
        else interim += transcript;
      }
      setInput(`${finalText}${interim}`);
    };
    recognition.onerror = () => setListening(false);
    recognition.onend = () => {
      setListening(false);
      const text = finalText.trim();
      if (voiceModeRef.current && text) onFinalText?.(text);
    };
    recognitionRef.current = recognition;
    recognition.start();
  }

  function openVoiceMode(onFinalText) {
    setVoiceMode(true);
    window.setTimeout(() => {
      if (speechSupported && !listening && !streaming) toggleVoiceListening(onFinalText);
    }, 180);
  }

  function closeVoiceMode() {
    recognitionRef.current?.abort?.();
    window.speechSynthesis?.cancel?.();
    setListening(false);
    setVoiceMode(false);
  }

  function toggleVoiceOutput() {
    setVoiceEnabled((value) => !value);
    window.speechSynthesis?.cancel?.();
  }

  return {
    voiceMode,
    setVoiceMode,
    listening,
    voiceEnabled,
    speechSupported,
    recognitionRef,
    voiceModeRef,
    speak,
    toggleVoiceListening,
    openVoiceMode,
    closeVoiceMode,
    toggleVoiceOutput,
    input,
  };
}
