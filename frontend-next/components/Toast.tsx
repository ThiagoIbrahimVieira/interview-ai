"use client";

import { createContext, useContext, useState, useCallback, useRef, type ReactNode } from "react";
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

interface ToastItem {
  id: number;
  message: string;
  type: string;
}

interface ToastContextValue {
  success: (msg: string) => void;
  error: (msg: string) => void;
  warning: (msg: string) => void;
  info: (msg: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let toastId = 0;

const icons: Record<string, ReactNode> = {
  success: <CheckCircle2 size={16} />,
  error: <XCircle size={16} />,
  warning: <AlertTriangle size={16} />,
  info: <Info size={16} />,
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const timersRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  const removeToast = useCallback((id: number) => {
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((message: string, type: string) => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, message, type }]);
    const timer = setTimeout(() => {
      removeToast(id);
      timersRef.current.delete(id);
    }, 4000);
    timersRef.current.set(id, timer);
  }, [removeToast]);

  const ctxValue: ToastContextValue = {
    success: useCallback((msg: string) => addToast(msg, "success"), [addToast]),
    error: useCallback((msg: string) => addToast(msg, "error"), [addToast]),
    warning: useCallback((msg: string) => addToast(msg, "warning"), [addToast]),
    info: useCallback((msg: string) => addToast(msg, "info"), [addToast]),
  };

  return (
    <ToastContext.Provider value={ctxValue}>
      {children}
      <div className="toast-container">
        <AnimatePresence mode="popLayout">
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              layout
              initial={{ opacity: 0, x: 40, scale: 0.96 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 40, scale: 0.96 }}
              transition={{ type: "spring", stiffness: 400, damping: 28 }}
              className={`toast toast-${toast.type}`}
            >
              <span style={{ color: `var(--color-${toast.type})`, display: "flex", alignItems: "center", flexShrink: 0 }}>
                {icons[toast.type] || icons.info}
              </span>
              <span style={{ flex: 1, fontSize: "var(--text-sm)", color: "var(--color-text-primary)" }}>{toast.message}</span>
              <button
                onClick={() => removeToast(toast.id)}
                style={{ color: "var(--color-text-tertiary)", cursor: "pointer", display: "flex", alignItems: "center", flexShrink: 0, padding: "2px" }}
                aria-label="Dismiss"
              >
                <X size={14} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
