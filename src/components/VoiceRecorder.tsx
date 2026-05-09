import { useState, useRef, useEffect } from 'react';
import { Mic, Square, Trash2, Send, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface VoiceRecorderProps {
  onSend: (audioData: string) => void;
  disabled?: boolean;
}

export default function VoiceRecorder({ onSend, disabled }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [base64Audio, setBase64Audio] = useState<string | null>(null);
  
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder.current = new MediaRecorder(stream);
      chunks.current = [];

      mediaRecorder.current.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.current.push(e.data);
      };

      mediaRecorder.current.onstop = async () => {
        const blob = new Blob(chunks.current, { type: 'audio/wav' });
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);

        // Convert to base64 for Gemini
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = () => {
          const base64data = reader.result as string;
          setBase64Audio(base64data.split(',')[1]);
        };
      };

      mediaRecorder.current.start();
      setIsRecording(true);
      setDuration(0);
      timerRef.current = window.setInterval(() => {
        setDuration((d) => d + 1);
      }, 1000);
    } catch (err) {
      console.error('Failed to start recording', err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder.current && isRecording) {
      mediaRecorder.current.stop();
      mediaRecorder.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const handleDiscard = () => {
    setAudioUrl(null);
    setBase64Audio(null);
    setDuration(0);
  };

  const handleSend = () => {
    if (base64Audio) {
      onSend(base64Audio);
      handleDiscard();
    }
  };

  const formatDuration = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center gap-3 bg-white p-4 rounded-full heavy-border">
      <AnimatePresence mode="wait">
        {!audioUrl ? (
          <motion.div 
            key="recording"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="flex items-center gap-4 w-full"
          >
            {isRecording ? (
              <>
                <motion.div 
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                  className="w-4 h-4 bg-red-500 rounded-full border border-black"
                />
                <span className="font-black text-lg text-brand-black">{formatDuration(duration)}</span>
                <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden border border-black">
                  <motion.div 
                    className="h-full bg-brand-green"
                    animate={{ width: ['0%', '100%'] }}
                    transition={{ duration: 60, ease: 'linear' }}
                  />
                </div>
                <button 
                  onClick={stopRecording}
                  className="p-4 bg-brand-black text-white rounded-full hover:bg-gray-800 transition-colors"
                >
                  <Square className="w-6 h-6 fill-current" />
                </button>
              </>
            ) : (
              <>
                <div className="flex-1 text-gray-400 font-black uppercase tracking-tighter text-xl px-2">Appuyez pour parler...</div>
                <button 
                  onClick={startRecording}
                  disabled={disabled}
                  className="w-16 h-16 bg-brand-green text-white rounded-full hover:bg-opacity-90 transition-all bold-shadow border-4 border-black active:scale-95 disabled:opacity-50 flex items-center justify-center"
                  id="start-voice-record"
                >
                  <Mic className="w-8 h-8" />
                </button>
              </>
            )}
          </motion.div>
        ) : (
          <motion.div 
            key="preview"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="flex items-center gap-4 w-full"
          >
            <button 
              onClick={handleDiscard}
              className="p-4 bg-red-100 text-red-500 hover:bg-red-200 transition-colors rounded-full border-2 border-black"
            >
              <Trash2 className="w-6 h-6" />
            </button>
            <div className="flex-1 h-14 bg-gray-100 rounded-full flex items-center px-4 overflow-hidden border-2 border-black">
               <audio src={audioUrl} controls className="h-10 w-full" />
            </div>
            <button 
              onClick={handleSend}
              className="w-16 h-16 bg-brand-green text-white rounded-full hover:bg-opacity-90 transition-all bold-shadow border-4 border-black active:scale-95 flex items-center justify-center"
            >
              <Send className="w-8 h-8" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
