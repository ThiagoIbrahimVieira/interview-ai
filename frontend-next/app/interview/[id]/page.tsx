"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { api } from "@/lib/api";
import { useStore } from "@/lib/store";
import { useToast } from "@/components/Toast";
import { escapeHtml } from "@/lib/utils";

interface ChatMessage {
  role: string;
  content: string;
}

export default function InterviewPage() {
  const router = useRouter();
  const params = useParams();
  const sessionId = parseInt(params.id as string);
  const { currentSession } = useStore();
  const toast = useToast();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [aiSpeaking, setAiSpeaking] = useState(false);
  const [timer, setTimer] = useState(0);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef<ChatMessage[]>([]);

  messagesRef.current = messages;

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    });
  }, []);

  const buildSystemPrompt = useCallback(() => {
    const session = currentSession as Record<string, unknown> | null;
    const config = (session?.config as Record<string, unknown>) || {};
    return `You are a professional AI interviewer conducting a ${config.interview_type || "Mixed"} interview for a ${config.experience_level || "Mid-Level"} ${config.job_title || "Software Developer"} position.

Company style: ${config.company_style || "Big Tech"}
Difficulty: ${config.difficulty || "Medium"}
Language: ${config.language || "English"}
${config.country ? `Country: ${config.country}` : ""}
${config.custom_instructions ? `Special instructions: ${config.custom_instructions}` : ""}

Rules:
- Ask one question at a time
- Be professional but friendly
- Ask follow-up questions based on answers
- Evaluate technical knowledge, communication skills, and problem-solving ability
- Do not repeat questions
- Keep questions relevant to the role and experience level
- After 10-15 questions, transition to wrapping up
- Be natural and conversational, like a real interview`;
  }, [currentSession]);

  const getFallbackResponse = useCallback(
    (userMessage: string): string => {
      const lower = userMessage.toLowerCase();
      const questionCount = messagesRef.current.filter((m) => m.role === "assistant").length;

      if (questionCount >= 12) {
        return "Thank you for your time today. You've given thoughtful responses. I'll now compile your evaluation report. Is there anything else you'd like to add before we conclude?";
      }
      if (lower.includes("experience") || lower.includes("background")) {
        return "Thank you for sharing that. Can you describe a challenging project you worked on recently and how you handled it?";
      }
      if (lower.includes("project") || lower.includes("challenge")) {
        return "Interesting approach. How did you collaborate with your team during that project? What was your specific role?";
      }
      if (lower.includes("team") || lower.includes("collaborate")) {
        return "Team collaboration is important. How do you handle disagreements with team members about technical decisions?";
      }
      if (lower.includes("disagree") || lower.includes("conflict")) {
        return "Good answer. Let's switch to technical questions. Can you explain the difference between REST and GraphQL APIs?";
      }
      if (lower.includes("rest") || lower.includes("graphql") || lower.includes("api")) {
        return "Solid explanation. How would you design a system that needs to handle millions of requests per day?";
      }
      if (lower.includes("system") || lower.includes("design") || lower.includes("scale")) {
        return "Good thinking about scalability. What databases would you choose for different use cases, and why?";
      }
      if (lower.includes("database") || lower.includes("sql") || lower.includes("nosql")) {
        return "Well explained. Now tell me about a time you had to debug a difficult production issue. What was your approach?";
      }
      if (lower.includes("debug") || lower.includes("bug") || lower.includes("production")) {
        return "Debugging skills are crucial. How do you ensure the quality of your code before deploying to production?";
      }
      if (lower.includes("test") || lower.includes("quality") || lower.includes("deploy")) {
        return "Great practices. Finally, where do you see yourself in five years, and what are you doing to reach those goals?";
      }
      if (lower.includes("goal") || lower.includes("future") || lower.includes("year")) {
        return "Thank you for sharing your vision. That concludes our interview. I've evaluated your responses and will prepare a detailed report. Great job today!";
      }
      return "That's a great point. Can you elaborate more on your approach? What specific tools or methodologies did you use?";
    },
    []
  );

  const generateAIResponse = useCallback(
    async (userMessage: string): Promise<string> => {
      try {
        if (typeof window !== "undefined" && window.puter?.ai) {
          const history = messagesRef.current.map((m) => ({
            role: m.role === "user" ? "user" : "assistant",
            content: m.content,
          }));
          const systemPrompt = buildSystemPrompt();
          const response = await window.puter.ai.chat([
            { role: "system", content: systemPrompt },
            ...history,
            { role: "user", content: userMessage },
          ]);
          const text = typeof response === "string" ? response : (response as { message?: { content?: string } })?.message?.content || String(response || "");
          return text;
        }
      } catch (err) {
        console.warn("Puter.js failed, using fallback:", err);
      }
      return getFallbackResponse(userMessage);
    },
    [buildSystemPrompt, getFallbackResponse]
  );

  const sendMessage = useCallback(async () => {
    const content = inputValue.trim();
    if (!content) return;
    setInputValue("");

    setMessages((prev) => [...prev, { role: "user", content }]);
    setAiSpeaking(true);
    scrollToBottom();

    try {
      await api.sendMessage(sessionId, content);
      const aiResponse = await generateAIResponse(content);
      setMessages((prev) => [...prev, { role: "assistant", content: aiResponse }]);
      scrollToBottom();
      await api.sendMessage(sessionId, aiResponse);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "I apologize, there was an issue. Could you please repeat your answer?" },
      ]);
    } finally {
      setAiSpeaking(false);
    }
  }, [inputValue, sessionId, generateAIResponse, scrollToBottom]);

  const toggleVoice = useCallback(() => {
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) return;

    if (isRecording) {
      setIsRecording(false);
      recognitionRef.current?.stop();
    } else {
      if (!recognitionRef.current) {
        const recognition = new SpeechRecognitionAPI();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = "en-US";
        recognition.onresult = (event: SpeechRecognitionEvent) => {
          let finalTranscript = "";
          let interimTranscript = "";
          for (let i = event.resultIndex; i < event.results.length; i++) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript;
            } else {
              interimTranscript += event.results[i][0].transcript;
            }
          }
          if (finalTranscript) {
            setInputValue((prev) => (prev + " " + finalTranscript).trim());
          }
        };
        recognition.onerror = (event) => {
          if (event.error !== "no-speech") console.warn("Speech recognition error:", event.error);
        };
        recognition.onend = () => {
          if (recognitionRef.current && isRecording) {
            try {
              recognitionRef.current.start();
            } catch {}
          }
        };
        recognitionRef.current = recognition;
      }
      setIsRecording(true);
      try {
        recognitionRef.current.start();
      } catch {}
    }
  }, [isRecording]);

  const exitInterview = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
    setIsRecording(false);
    router.push("/dashboard");
  }, [router]);

  const endInterviewSession = useCallback(async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
    try {
      await api.endInterview(sessionId);
      toast.success("Interview completed!");
      router.push(`/report/${sessionId}`);
    } catch {
      toast.error("Failed to end interview");
      router.push("/dashboard");
    }
  }, [sessionId, router, toast]);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setTimer((prev) => prev + 1);
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
    };
  }, []);

  useEffect(() => {
    api.getMessages(sessionId).then((data) => {
      if (data && Array.isArray(data) && data.length > 0) {
        setMessages(data.map((m: { role: string; content: string }) => ({ role: m.role, content: m.content })));
      }
    }).catch(() => {});
  }, [sessionId]);

  useEffect(scrollToBottom, [messages, scrollToBottom]);

  const formatTimer = (s: number) => {
    const m = Math.floor(s / 60)
      .toString()
      .padStart(2, "0");
    const sec = (s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  };

  return (
    <div className="interview-page">
      <header className="header" style={{ borderBottom: "1px solid var(--color-border-primary)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
          <button className="btn btn-ghost btn-icon" onClick={exitInterview} title="Exit interview">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
            </svg>
          </button>
          <span className="header-title">Interview Session</span>
          <span className="badge badge-success">Active</span>
        </div>
        <div className="header-actions">
          <span style={{ fontSize: "var(--text-sm)", color: "var(--color-text-secondary)" }}>{formatTimer(timer)}</span>
          <button className="btn btn-danger btn-sm" onClick={endInterviewSession}>End Interview</button>
        </div>
      </header>
      <div className="interview-container">
        <div className="interview-messages">
          <div className="message fade-in-up">
            <div className="message-avatar ai" style={{ width: 36, height: 36, borderRadius: "var(--radius-full)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: "var(--text-sm)", fontWeight: 600, flexShrink: 0 }}>AI</div>
            <div className="message-body">
              <div className="message-role" style={{ color: "var(--color-accent-primary)" }}>AI Interviewer</div>
              <div className="message-content">Welcome to your interview session! I&apos;ll be your interviewer today. Let&apos;s begin. Could you start by telling me about yourself and your experience?</div>
            </div>
          </div>
          {messages.map((msg, i) => (
            <div key={i} className="message fade-in-up">
              <div
                className={`message-avatar ${msg.role === "user" ? "user" : "ai"}`}
                style={{
                  width: 36, height: 36, borderRadius: "var(--radius-full)", display: "flex", alignItems: "center", justifyContent: "center",
                  color: msg.role === "user" ? "var(--color-text-secondary)" : "white",
                  fontSize: "var(--text-sm)", fontWeight: 600, flexShrink: 0,
                  background: msg.role === "user" ? "var(--color-bg-tertiary)" : "linear-gradient(135deg, var(--color-accent-primary), #a855f7)",
                }}
              >
                {msg.role === "user" ? "U" : "AI"}
              </div>
              <div className="message-body">
                <div className="message-role" style={{ color: msg.role === "user" ? "var(--color-text-secondary)" : "var(--color-accent-primary)" }}>
                  {msg.role === "user" ? "You" : "AI Interviewer"}
                </div>
                <div className="message-content" dangerouslySetInnerHTML={{ __html: escapeHtml(msg.content) }} />
              </div>
            </div>
          ))}
          {aiSpeaking && (
            <div className="message fade-in">
              <div className="message-avatar ai" style={{ width: 36, height: 36, borderRadius: "var(--radius-full)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: "var(--text-sm)", fontWeight: 600, flexShrink: 0, background: "linear-gradient(135deg, var(--color-accent-primary), #a855f7)" }}>AI</div>
              <div className="message-body">
                <div className="message-role" style={{ color: "var(--color-accent-primary)" }}>AI Interviewer</div>
                <div className="typing-indicator"><span></span><span></span><span></span></div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        <div className="interview-input-area">
          <div className="interview-input-wrapper">
            <button className={`voice-btn ${isRecording ? "recording" : "idle"}`} onClick={toggleVoice} title="Toggle microphone">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
                <path d="M19 10v2a7 7 0 01-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="23" />
                <line x1="8" y1="23" x2="16" y2="23" />
              </svg>
            </button>
            <textarea
              className="interview-input"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder={isRecording ? "Listening..." : "Type your answer or press the mic to speak..."}
              rows={1}
            />
            <button className="btn btn-primary btn-icon" onClick={sendMessage} title="Send message">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
