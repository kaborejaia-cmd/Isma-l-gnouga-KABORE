import { LANGUAGES, Language } from '../types';
import { motion } from 'motion/react';
import { Volume2 } from 'lucide-react';

interface LanguageSelectorProps {
  current: Language;
  onSelect: (lang: Language) => void;
}

export default function LanguageSelector({ current, onSelect }: LanguageSelectorProps) {
  const handleSpeakLang = (lang: typeof LANGUAGES[0]) => {
    const utterance = new SpeechSynthesisUtterance(lang.nativeName);
    utterance.lang = lang.code === 'fr' ? 'fr-FR' : lang.code === 'en' ? 'en-US' : 'fr-FR'; // Fallback
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="grid grid-cols-2 gap-3 p-2">
      {LANGUAGES.map((lang) => (
        <motion.button
          key={lang.code}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onSelect(lang.code)}
          className={`flex flex-col items-center justify-center p-4 rounded-3xl border-2 transition-all relative ${
            current === lang.code 
              ? 'border-brand-black bg-brand-yellow text-brand-black bold-shadow' 
              : 'border-brand-black bg-white text-brand-black hover:bg-gray-50'
          }`}
        >
          <span className="text-3xl mb-2">{lang.flag}</span>
          <span className="text-sm font-black uppercase tracking-widest">{lang.nativeName}</span>
          <span className={`text-[10px] uppercase font-bold opacity-70 ${current === lang.code ? 'text-brand-black' : 'text-gray-400'}`}>
            {lang.name}
          </span>
          
          <button 
            onClick={(e) => {
              e.stopPropagation();
              handleSpeakLang(lang);
            }}
            className={`absolute top-2 right-2 p-1.5 rounded-full ${
              current === lang.code ? 'text-brand-black/40 hover:text-brand-black' : 'text-gray-300 hover:text-brand-green'
            }`}
          >
            <Volume2 className="w-4 h-4" />
          </button>
        </motion.button>
      ))}
    </div>
  );
}
