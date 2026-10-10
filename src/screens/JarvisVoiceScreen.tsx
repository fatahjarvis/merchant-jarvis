import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../context/StoreContext';
import { useJarvisVoice } from '../hooks/useJarvisVoice';
import { askJarvisEngine } from '../services/jarvisBrain';
import { ChatMessage } from '../types';
import { MJARVIS_SEMVER } from '../utils/version';
import { VoiceStockConfirmSheet, VoiceStockIntentPayload } from '../components/VoiceStockConfirmSheet';
import { 
  Mic, 
  MicOff, 
  Send, 
  Volume2, 
  VolumeX, 
  Sparkles, 
  Bot, 
  User as UserIcon, 
  RotateCcw,
  AudioWaveform,
  CheckCircle2
} from 'lucide-react';

const SUGGESTIONS = [
  "Today's summary",
  "Check low stock",
  "Stock add 5 rice",
  "Set beer stock to 8",
  "Stock min milk 10",
  "Pending deliveries",
  "What is my ledger balance?"
];

export const JarvisVoiceScreen: React.FC = () => {
  const { 
    orders, 
    ledgerEntries, 
    stockItems, 
    profile, 
    isOnline, 
    dataSaver,
    adjustStock,
    updateStockItemDetails 
  } = useStore();

  const {
    isListening,
    isSpeaking,
    transcript,
    setTranscript,
    recognitionSupported,
    startListening,
    stopListening,
    speakText,
    stopSpeaking
  } = useJarvisVoice(dataSaver);

  const [inputVal, setInputVal] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg_welcome',
      sender: 'jarvis',
      text: `Bonzour ${profile.ownerName}. I am Jarvis, your shop companion. Tap the orb or speak to check orders, day pulse, or adjust stock (try: "Stock add 5 rice", "Set beer stock to 10").`,
      timestamp: 'Just now'
    }
  ]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [pendingStockIntent, setPendingStockIntent] = useState<VoiceStockIntentPayload | null>(null);
  const [isConfirmSheetOpen, setIsConfirmSheetOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isProcessing]);

  // Handle voice speech completion
  useEffect(() => {
    if (!isListening && transcript.trim()) {
      handleUserQuery(transcript);
      setTranscript('');
    }
  }, [isListening, transcript]);

  const handleUserQuery = async (queryText: string) => {
    const trimmed = queryText.trim();
    if (!trimmed) return;

    // Add user message
    const userMsg: ChatMessage = {
      id: `user_${Date.now()}`,
      sender: 'user',
      text: trimmed,
      timestamp: 'Now'
    };
    setMessages(prev => [...prev, userMsg]);
    setIsProcessing(true);

    try {
      const jarvisRes = await askJarvisEngine(trimmed, {
        orders,
        ledgerEntries,
        stockItems,
        profile,
        isOnline
      });

      const botMsg: ChatMessage = {
        id: `jarvis_${Date.now()}`,
        sender: 'jarvis',
        text: jarvisRes.displayText,
        timestamp: 'Now'
      };
      setMessages(prev => [...prev, botMsg]);

      // DOOR 3: If intent is detected, open read-back confirm sheet before write!
      if (jarvisRes.stockIntent) {
        setPendingStockIntent(jarvisRes.stockIntent);
        setIsConfirmSheetOpen(true);
      }

      // Speak via speechSynthesis (preferring Microsoft Ryan) unless dataSaver is ON
      speakText(jarvisRes.speechText);
    } catch (err) {
      console.warn("Jarvis response issue:", err);
      const fallbackMsg: ChatMessage = {
        id: `jarvis_${Date.now()}`,
        sender: 'jarvis',
        text: "I am ready. Ask me about today's orders, cash register, or stock levels.",
        timestamp: 'Now'
      };
      setMessages(prev => [...prev, fallbackMsg]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmVoiceIntent = () => {
    if (!pendingStockIntent) return;

    const { type, item, targetValue, delta } = pendingStockIntent;
    if (type === 'stock-min') {
      updateStockItemDetails(item.id, { minThreshold: targetValue });
    } else {
      adjustStock(
        item.id, 
        targetValue, 
        'Count', 
        'door3_voice', 
        `Voice ${type} intent (${item.name})`
      );
    }

    const confirmMsg: ChatMessage = {
      id: `jarvis_conf_${Date.now()}`,
      sender: 'jarvis',
      text: `✅ Confirmed & Applied: ${item.name} updated to ${targetValue} ${pendingStockIntent.unit}. Movement recorded in audit log.`,
      timestamp: 'Now'
    };
    setMessages(prev => [...prev, confirmMsg]);
    speakText(`Confirmed. ${item.name} updated to ${targetValue} ${pendingStockIntent.unit}.`);

    setIsConfirmSheetOpen(false);
    setPendingStockIntent(null);
  };

  const handleCancelVoiceIntent = () => {
    setIsConfirmSheetOpen(false);
    setPendingStockIntent(null);
    speakText("Stock adjustment cancelled.");
  };

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputVal.trim()) return;
    const q = inputVal;
    setInputVal('');
    handleUserQuery(q);
  };

  const togglePushToTalk = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] pb-18 select-none">
      {/* Top Assistant Status Strip */}
      <div className="bg-[#050b16] border border-cyan-950/80 rounded-xl p-2.5 px-3 flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="relative w-7 h-7 rounded-lg bg-cyan-950 border border-cyan-700/60 flex items-center justify-center text-cyan-400">
            <Bot className="w-4 h-4" />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
              <span>Jarvis Shop Companion</span>
              <span className="text-[10px] text-teal-400 font-mono">{MJARVIS_SEMVER}</span>
            </div>
            <div className="text-[10px] text-slate-400">
              {isListening ? (
                <span className="text-cyan-400 font-semibold animate-pulse">● Listening to shopkeeper...</span>
              ) : isSpeaking ? (
                <span className="text-teal-400 font-semibold">● Ryan voice speaking...</span>
              ) : (
                <span>Voice-first · Door 3 inventory orb ready</span>
              )}
            </div>
          </div>
        </div>

        {/* Audio control button */}
        {isSpeaking ? (
          <button
            onClick={stopSpeaking}
            className="px-2 py-1 rounded-lg bg-rose-950/60 border border-rose-800 text-rose-300 text-xs font-mono flex items-center gap-1"
          >
            <VolumeX className="w-3.5 h-3.5" /> Stop
          </button>
        ) : (
          <span className="text-[11px] font-mono text-slate-500">
            {dataSaver ? 'Audio: Muted' : 'Audio: Ryan'}
          </span>
        )}
      </div>

      {/* Suggestion Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-2 no-scrollbar">
        {SUGGESTIONS.map(s => (
          <button
            key={s}
            onClick={() => handleUserQuery(s)}
            className="shrink-0 px-3 py-1.5 rounded-full bg-slate-900/90 hover:bg-slate-800 border border-slate-800 text-xs text-slate-300 active:scale-95 transition"
            style={{ minHeight: '36px' }}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {messages.map(msg => (
          <div
            key={msg.id}
            className={`flex items-start gap-2.5 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.sender === 'jarvis' && (
              <div className="w-7 h-7 rounded-lg bg-cyan-950 border border-cyan-800/80 flex items-center justify-center text-cyan-400 shrink-0 mt-0.5">
                <Bot className="w-4 h-4" />
              </div>
            )}

            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-line ${
                msg.sender === 'user'
                  ? 'bg-cyan-600 text-slate-950 font-medium rounded-tr-none shadow-[0_0_12px_rgba(6,182,212,0.3)]'
                  : 'bg-[#0a1120] text-slate-200 border border-slate-800 rounded-tl-none font-normal'
              }`}
            >
              <div className="font-sans">{msg.text}</div>
              <span className={`block text-[10px] mt-1.5 font-mono ${msg.sender === 'user' ? 'text-slate-950/70 text-right' : 'text-slate-500'}`}>
                {msg.timestamp}
              </span>
            </div>

            {msg.sender === 'user' && (
              <div className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 shrink-0 mt-0.5">
                <UserIcon className="w-4 h-4" />
              </div>
            )}
          </div>
        ))}

        {/* Live Transcript / Processing Indicator */}
        {isListening && (
          <div className="p-3 bg-cyan-950/40 border border-cyan-700/60 rounded-xl text-xs text-cyan-300 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            <span className="italic">{transcript || "Listening... speak now"}</span>
          </div>
        )}

        {isProcessing && (
          <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl text-xs text-slate-400 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-400 animate-spin" />
            <span>Jarvis is calculating store pulse...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Controls Bar & Bottom-Right Push-To-Talk Orb */}
      <div className="pt-2 relative">
        <form onSubmit={handleTextSubmit} className="flex items-center gap-2">
          <input
            type="text"
            value={inputVal}
            onChange={e => setInputVal(e.target.value)}
            placeholder="Ask Jarvis or try: 'Add 5 rice', 'Set beer to 10'..."
            className="flex-1 bg-slate-900/90 border border-slate-800 focus:border-cyan-500 rounded-xl px-4 py-3 text-base text-slate-100 placeholder:text-slate-600 outline-none pr-12"
            style={{ minHeight: '48px' }}
          />

          <button
            type="submit"
            disabled={!inputVal.trim() || isProcessing}
            className="w-12 h-12 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-cyan-400 flex items-center justify-center disabled:opacity-40 transition active:scale-95"
            style={{ minHeight: '48px', minWidth: '48px' }}
          >
            <Send className="w-4 h-4" />
          </button>
        </form>

        {/* Push-To-Talk Orb Bottom-Right */}
        <div className="fixed bottom-20 right-4 z-40">
          <button
            type="button"
            onClick={togglePushToTalk}
            title={isListening ? "Tap to finish speaking" : "Push to talk with Jarvis"}
            className={`relative w-16 h-16 rounded-full flex items-center justify-center border transition-all duration-300 active:scale-90 ${
              isListening
                ? 'bg-gradient-to-tr from-cyan-400 to-teal-300 text-slate-950 border-white shadow-[0_0_28px_rgba(6,182,212,0.9)] animate-orb-listening scale-110'
                : isSpeaking
                ? 'bg-teal-500 text-slate-950 border-teal-300 shadow-[0_0_20px_rgba(20,184,166,0.6)]'
                : 'bg-gradient-to-tr from-cyan-500 to-teal-400 text-slate-950 border-cyan-200 shadow-[0_0_22px_rgba(6,182,212,0.6)] hover:brightness-110'
            }`}
            style={{ minHeight: '64px', minWidth: '64px' }}
          >
            {isListening ? (
              <MicOff className="w-7 h-7 stroke-[2.8]" />
            ) : (
              <Mic className="w-7 h-7 stroke-[2.5]" />
            )}

            {/* Glowing radar rings */}
            <span className="absolute -inset-1.5 rounded-full border border-cyan-400/40 pointer-events-none animate-ping opacity-60" />
            <span className="absolute -inset-3 rounded-full border border-teal-400/20 pointer-events-none" />
          </button>
        </div>
      </div>

      {/* DOOR 3 Read-Back Confirm Bottom Sheet */}
      <VoiceStockConfirmSheet
        isOpen={isConfirmSheetOpen}
        intent={pendingStockIntent}
        onClose={handleCancelVoiceIntent}
        onConfirm={handleConfirmVoiceIntent}
      />
    </div>
  );
};
