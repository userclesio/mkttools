"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

interface PlatformViewerProps {
  platformId: string;
  platformName: string;
  token: string;
}

export default function PlatformViewer({ platformId, platformName, token }: PlatformViewerProps) {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const imgRef = useRef(new Image());
  const escTimerRef = useRef<number>(0);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const [status, setStatus] = useState<"connecting" | "ready" | "error">("connecting");
  const [statusMsg, setStatusMsg] = useState("Conectando...");
  const [errorMsg, setErrorMsg] = useState("");
  const [showHint, setShowHint] = useState(false);

  // Dimensões reais da janela (sem barra do browser)
  const getSize = () => ({ w: window.innerWidth, h: window.innerHeight });

  const getCanvasCoords = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: Math.round((e.clientX - rect.left) * scaleX),
      y: Math.round((e.clientY - rect.top) * scaleY),
    };
  }, []);

  function send(msg: object) {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  }

  // Duplo ESC para sair
  function handleEsc() {
    const now = Date.now();
    if (now - escTimerRef.current < 600) {
      wsRef.current?.close();
      router.push("/dashboard");
    } else {
      escTimerRef.current = now;
      setShowHint(true);
      setTimeout(() => setShowHint(false), 1200);
    }
  }

  useEffect(() => {
    const { w, h } = getSize();
    const canvas = canvasRef.current!;
    canvas.width = w;
    canvas.height = h;

    const wsProto = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${wsProto}//${window.location.host}/ws?token=${token}&platformId=${platformId}&w=${w}&h=${h}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);

      if (msg.type === "frame") {
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        imgRef.current.onload = () => ctx.drawImage(imgRef.current, 0, 0, canvas.width, canvas.height);
        imgRef.current.src = "data:image/jpeg;base64," + msg.data;
      } else if (msg.type === "ready") {
        setStatus("ready");
        setStatusMsg("");
      } else if (msg.type === "status") {
        setStatusMsg(msg.message);
      } else if (msg.type === "error") {
        setStatus("error");
        setErrorMsg(msg.message);
      }
    };

    ws.onerror = () => {
      setStatus("error");
      setErrorMsg("Não foi possível conectar ao servidor de streaming. Verifique se o servidor está rodando.");
    };

    // Resize: informa o servidor e ajusta canvas
    function onResize() {
      const { w: nw, h: nh } = getSize();
      canvas.width = nw;
      canvas.height = nh;
      send({ type: "resize", w: nw, h: nh });
    }

    window.addEventListener("resize", onResize);

    // Foca o canvas automaticamente para capturar teclado
    canvas.focus();

    return () => {
      ws.close();
      window.removeEventListener("resize", onResize);
    };
  }, [platformId, token]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLCanvasElement>) {
    if (e.key === "Escape") {
      handleEsc();
      return;
    }
    e.preventDefault();
    send({ type: "keydown", key: e.key, code: e.code });
  }

  function handleMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    send({ type: "mousemove", ...getCanvasCoords(e) });
  }

  function handleClick(e: React.MouseEvent<HTMLCanvasElement>) {
    canvasRef.current?.focus();
    send({ type: "click", ...getCanvasCoords(e), button: e.button });
  }

  function handleDblClick(e: React.MouseEvent<HTMLCanvasElement>) {
    send({ type: "dblclick", ...getCanvasCoords(e) });
  }

  function handleWheel(e: React.WheelEvent<HTMLCanvasElement>) {
    e.preventDefault();
    send({ type: "scroll", deltaX: e.deltaX, deltaY: e.deltaY });
  }

  function handleContextMenu(e: React.MouseEvent) {
    e.preventDefault();
  }

  return (
    <div
      ref={wrapperRef}
      className="fixed inset-0 bg-black overflow-hidden"
      style={{ zIndex: 9999 }}
    >
      {/* Loading overlay */}
      {status === "connecting" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-20 bg-black/80">
          <div className="text-center max-w-sm px-6">
            <div className="w-12 h-12 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-5" />
            <p className="text-white font-semibold text-lg">{platformName}</p>
            <p className="text-indigo-300 text-sm mt-2 min-h-[20px]">{statusMsg}</p>
            <p className="text-gray-600 text-xs mt-6">Pressione ESC duas vezes para sair</p>
          </div>
        </div>
      )}

      {/* Erro */}
      {status === "error" && (
        <div className="absolute inset-0 flex items-center justify-center z-20 bg-black/90">
          <div className="text-center max-w-md px-6">
            <div className="text-5xl mb-4">⚠️</div>
            <p className="text-white font-semibold text-lg mb-2">Erro ao carregar</p>
            <p className="text-gray-400 text-sm mb-6">{errorMsg}</p>
            <button
              onClick={() => { wsRef.current?.close(); router.push("/dashboard"); }}
              className="px-5 py-2.5 rounded-lg text-sm font-medium text-white"
              style={{ background: "var(--primary)" }}
            >
              Voltar ao Dashboard
            </button>
          </div>
        </div>
      )}

      {/* Hint duplo ESC */}
      {showHint && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 px-4 py-2 rounded-full bg-white/10 backdrop-blur text-white text-sm border border-white/20">
          Pressione <kbd className="font-mono font-bold">ESC</kbd> novamente para sair
        </div>
      )}

      {/* Nome da plataforma (aparece só no hover) */}
      <div
        className="absolute top-0 left-0 right-0 z-10 flex items-center px-4 h-8 transition-opacity duration-300"
        style={{
          background: "linear-gradient(to bottom, rgba(0,0,0,0.6), transparent)",
          opacity: status === "ready" ? undefined : 0,
        }}
      >
        <span className="text-white/60 text-xs">{platformName}</span>
        <span className="text-white/30 text-xs ml-auto">ESC × 2 para sair</span>
      </div>

      {/* Canvas fullscreen */}
      <canvas
        ref={canvasRef}
        className="w-full h-full outline-none"
        tabIndex={0}
        onMouseMove={handleMouseMove}
        onClick={handleClick}
        onDoubleClick={handleDblClick}
        onWheel={handleWheel}
        onKeyDown={handleKeyDown}
        onContextMenu={handleContextMenu}
        style={{ cursor: "default", display: "block" }}
      />
    </div>
  );
}
