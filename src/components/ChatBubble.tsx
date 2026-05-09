import { Message, LANGUAGES } from '../types';
import { Play, Volume2, Globe, FileText, File, ExternalLink, Languages as LangIcon } from 'lucide-react';
import { motion } from 'motion/react';
import { textToSpeech } from '../services/geminiService';
import { useState } from 'react';

interface ChatBubbleProps {
  message: Message;
  isMe: boolean;
  onTranslate?: (id: string) => void;
  isLoadingTranslation?: boolean;
}

export default function ChatBubble({ message, isMe, onTranslate, isLoadingTranslation }: ChatBubbleProps) {
  const [isPlaying, setIsPlaying] = useState(false);

  const handleSpeak = async () => {
    if (isPlaying) return;
    
    // Prioritize translated text if available, fallback to original or transcription
    const textToRead = message.translation?.text || message.text || message.transcription;
    if (!textToRead) return;

    setIsPlaying(true);
    
    try {
      // First try Gemini TTS
      const audioBase64 = await textToSpeech(textToRead);
      
      if (audioBase64) {
        const audio = new Audio(`data:audio/wav;base64,${audioBase64}`);
        audio.onended = () => setIsPlaying(false);
        audio.play();
      } else {
        // Fallback to Web Speech API
        const utterance = new SpeechSynthesisUtterance(textToRead);
        utterance.onend = () => setIsPlaying(false);
        window.speechSynthesis.speak(utterance);
      }
    } catch (err) {
      console.error("TTS failed", err);
      setIsPlaying(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className={`flex flex-col gap-1 mb-4 ${isMe ? 'items-end' : 'items-start'}`}
    >
      <div 
        className={`max-w-[85%] rounded-2xl p-4 relative overflow-hidden heavy-border ${
          isMe 
            ? 'bg-[#DCF8C6] text-brand-black rounded-br-none bold-shadow-reverse' 
            : 'bg-white text-brand-black rounded-bl-none bold-shadow'
        }`}
      >
        {message.type === 'file' && message.file && (
          <div className="mb-2">
            {message.file.mimeType.startsWith('image/') ? (
              <img 
                src={message.file.url} 
                alt={message.file.name} 
                className="rounded-lg max-w-full h-auto border-2 border-brand-black mb-2 cursor-pointer transition-transform active:scale-95"
                referrerPolicy="no-referrer"
                onClick={() => window.open(message.file?.url, '_blank')}
              />
            ) : (
              <div 
                className="flex items-center gap-3 p-3 bg-brand-black/5 rounded-xl border border-brand-black/10 cursor-pointer hover:bg-brand-black/10"
                onClick={() => window.open(message.file?.url, '_blank')}
              >
                <div className="w-10 h-10 bg-white border border-brand-black rounded-lg flex items-center justify-center">
                  <File className="w-6 h-6" />
                </div>
                <div className="flex-1 overflow-hidden">
                  <p className="text-xs font-black truncate">{message.file.name}</p>
                  <p className="text-[10px] opacity-60">{(message.file.size / 1024).toFixed(1)} KB</p>
                </div>
                <ExternalLink className="w-4 h-4 opacity-40 shrink-0" />
              </div>
            )}
          </div>
        )}

        {message.type === 'voice' && (
          <div className="flex items-center gap-3 mb-2">
            <button className={`w-10 h-10 rounded-full flex items-center justify-center border border-brand-black ${isMe ? 'bg-brand-green text-white' : 'bg-brand-green text-white'}`}>
              <Play className="w-4 h-4 fill-current" />
            </button>
            <div className={`h-1.5 flex-1 rounded-full overflow-hidden ${isMe ? 'bg-brand-black/10' : 'bg-gray-100'}`}>
              <div className={`h-full w-1/3 bg-brand-black`} />
            </div>
          </div>
        )}

        {message.text && (
          <p className="text-lg font-bold leading-tight">
            {message.text}
          </p>
        )}

        {message.transcription && !message.text && (
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest opacity-60">
              <FileText className="w-3 h-3" /> Transcrit
            </div>
            <p className="text-sm font-bold italic opacity-80 border-t border-brand-black/5 pt-1 mt-1">"{message.transcription}"</p>
          </div>
        )}

        {message.translation && (
          <div className={`mt-3 pt-3 border-t border-brand-black/10`}>
             <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest opacity-60 mb-1">
              <Globe className="w-3 h-3" /> Traduit en {LANGUAGES.find(l => l.code === message.translation?.language)?.name}
            </div>
            <p className="text-lg font-black tracking-tight">{message.translation.text}</p>
          </div>
        )}

        <div className={`flex items-center gap-2 mt-2 ${isMe ? 'justify-end' : 'justify-start'}`}>
          <span className={`text-[10px] font-black uppercase tracking-widest ${isMe ? 'text-brand-black/40' : 'text-gray-400'}`}>
            {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          
          <div className="flex gap-1">
            {!message.translation && onTranslate && (
              <button 
                onClick={() => onTranslate(message.id)}
                disabled={isLoadingTranslation}
                className={`p-1.5 rounded-full transition-colors flex items-center justify-center ${
                  isMe 
                    ? 'hover:bg-black/5 text-brand-black' 
                    : 'hover:bg-gray-50 text-brand-black'
                } ${isLoadingTranslation ? 'animate-spin' : ''}`}
              >
                <LangIcon className={`w-3.5 h-3.5`} />
              </button>
            )}

            <button 
              onClick={handleSpeak}
              disabled={isPlaying}
              className={`p-1.5 rounded-full transition-colors ${
                isMe 
                  ? 'hover:bg-black/5 text-brand-black' 
                  : 'hover:bg-gray-50 text-brand-black'
              } ${isPlaying ? 'animate-pulse' : ''}`}
            >
              <Volume2 className={`w-4 h-4 ${isPlaying ? 'fill-current' : ''}`} />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
