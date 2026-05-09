/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef, useEffect } from 'react';
import { 
  Search, 
  MessageCircle, 
  Users, 
  Settings, 
  MoreVertical, 
  ArrowLeft,
  Info,
  Languages as LangIcon,
  ChevronRight,
  Phone,
  Video,
  Mic,
  Smile,
  Paperclip,
  Send
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Contact, Message, Language, LANGUAGES } from './types';
import VoiceRecorder from './components/VoiceRecorder';
import ChatBubble from './components/ChatBubble';
import LanguageSelector from './components/LanguageSelector';
import { processVoiceNote, translateText } from './services/geminiService';

const MOCK_CONTACTS: Contact[] = [
  { 
    id: '1', 
    name: 'Maman Fatou', 
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Fatou', 
    unreadCount: 2, 
    preferredLanguage: 'mooré',
    lastMessage: 'Message vocal de 0:12',
    lastMessageTime: '10:30'
  },
  { 
    id: '2', 
    name: 'Papa Moussa', 
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Moussa', 
    unreadCount: 0, 
    preferredLanguage: 'dioula',
    lastMessage: 'À ce soir inshallah',
    lastMessageTime: 'Hier'
  },
  { 
    id: '3', 
    name: 'Ibrahim (Tonton)', 
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Ibrahim', 
    unreadCount: 0, 
    preferredLanguage: 'fulfuldé',
    lastMessage: 'Photo envoyée',
    lastMessageTime: '08:15'
  }
];

export default function App() {
  const [contacts, setContacts] = useState<Contact[]>(MOCK_CONTACTS);
  const [userName, setUserName] = useState('');
  const [password, setPassword] = useState('');
  const [activeContact, setActiveContact] = useState<Contact | null>(null);
  const [messages, setMessages] = useState<Record<string, Message[]>>({});
  const [userLanguage, setUserLanguage] = useState<Language>('fr');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCalling, setIsCalling] = useState(false);
  const [showLangSettings, setShowLangSettings] = useState(false);
  const [showAddContact, setShowAddContact] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [isLoginError, setIsLoginError] = useState(false);

  // New Contact Form State
  const [newContactName, setNewContactName] = useState('');
  const [newContactLang, setNewContactLang] = useState<Language>('fr');

  const [loadingTranslationId, setLoadingTranslationId] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');

  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, activeContact]);

  const handleAddContact = () => {
    if (!newContactName.trim()) return;

    const newDoc: Contact = {
      id: Math.random().toString(36).substr(2, 9),
      name: newContactName,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${newContactName}`,
      unreadCount: 0,
      preferredLanguage: newContactLang,
      lastMessage: 'Nouveau contact',
      lastMessageTime: 'Maintenant'
    };

    setContacts(prev => [...prev, newDoc]);
    setNewContactName('');
    setShowAddContact(false);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeContact) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      const newMessage: Message = {
        id: Math.random().toString(36).substr(2, 9),
        senderId: 'me',
        timestamp: new Date().toISOString(),
        type: 'file',
        file: {
          url: base64,
          name: file.name,
          mimeType: file.type,
          size: file.size
        }
      };

      setMessages(prev => ({
        ...prev,
        [activeContact.id]: [...(prev[activeContact.id] || []), newMessage]
      }));
    };
    reader.readAsDataURL(file);
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleTranslateMessage = async (messageId: string) => {
    if (!activeContact) return;
    const msg = messages[activeContact.id]?.find(m => m.id === messageId);
    if (!msg || msg.translation) return;

    const textToTranslate = msg.text || msg.transcription;
    if (!textToTranslate) return;

    setLoadingTranslationId(messageId);
    try {
      const result = await translateText(textToTranslate, 'auto', activeContact.preferredLanguage);
      setMessages(prev => {
        const chatMsgs = [...(prev[activeContact.id] || [])];
        const idx = chatMsgs.findIndex(m => m.id === messageId);
        if (idx !== -1) {
          chatMsgs[idx] = { 
            ...chatMsgs[idx], 
            translation: { text: result.translatedText, language: activeContact.preferredLanguage } 
          };
        }
        return { ...prev, [activeContact.id]: chatMsgs };
      });
    } catch (err) {
      console.error("Translation failed", err);
    } finally {
      setLoadingTranslationId(null);
    }
  };

  const handleSendMessage = async (text?: string, base64Audio?: string) => {
    if (!activeContact) return;

    const newMessage: Message = {
      id: Math.random().toString(36).substr(2, 9),
      senderId: 'me',
      text,
      timestamp: new Date().toISOString(),
      type: base64Audio ? 'voice' : 'text',
      audioUrl: base64Audio
    };

    setMessages(prev => ({
      ...prev,
      [activeContact.id]: [...(prev[activeContact.id] || []), newMessage]
    }));

    if (text && activeContact.preferredLanguage !== userLanguage) {
      setIsProcessing(true);
      try {
        const translation = await translateText(text, userLanguage, activeContact.preferredLanguage);
        setMessages(prev => {
          const chatMsgs = [...(prev[activeContact.id] || [])];
          const idx = chatMsgs.findIndex(m => m.id === newMessage.id);
          if (idx !== -1) {
            chatMsgs[idx] = { 
              ...chatMsgs[idx], 
              translation: { text: translation.translatedText, language: activeContact.preferredLanguage } 
            };
          }
          return { ...prev, [activeContact.id]: chatMsgs };
        });
      } catch (err) {
        console.error('Translation failed', err);
      } finally {
        setIsProcessing(false);
      }
    }

    if (base64Audio) {
      setIsProcessing(true);
      try {
        // Transcribe and summarize using Gemini
        const result = await processVoiceNote(base64Audio, userLanguage);
        
        // Update message with transcription
        setMessages(prev => {
          const chatMsgs = [...(prev[activeContact.id] || [])];
          const idx = chatMsgs.findIndex(m => m.id === newMessage.id);
          if (idx !== -1) {
            chatMsgs[idx] = { ...chatMsgs[idx], transcription: result.transcript };
          }
          return { ...prev, [activeContact.id]: chatMsgs };
        });

        // Auto-translate if contact has different language
        if (activeContact.preferredLanguage !== userLanguage) {
          const translation = await translateText(result.transcript, userLanguage, activeContact.preferredLanguage);
           setMessages(prev => {
            const chatMsgs = [...(prev[activeContact.id] || [])];
            const idx = chatMsgs.findIndex(m => m.id === newMessage.id);
            if (idx !== -1) {
              chatMsgs[idx] = { 
                ...chatMsgs[idx], 
                translation: { text: translation.translatedText, language: activeContact.preferredLanguage } 
              };
            }
            return { ...prev, [activeContact.id]: chatMsgs };
          });
        }
      } catch (err) {
        console.error('Processing failed', err);
      } finally {
        setIsProcessing(false);
      }
    }
  };

  if (!initialized) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-brand-gray-bg overflow-hidden relative">
        {/* Abstract Background Ornaments */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand-green/20 rounded-full blur-3xl" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-brand-yellow/20 rounded-full blur-3xl" />
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="max-w-md w-full bg-white rounded-[3rem] p-10 border-4 border-brand-black bold-shadow flex flex-col items-center text-center z-10"
        >
          <motion.div 
            animate={{ 
              rotate: [0, -5, 5, 0],
              scale: [1, 1.05, 0.95, 1] 
            }}
            transition={{ repeat: Infinity, duration: 5 }}
            className="w-24 h-24 bg-brand-green rounded-[2rem] border-4 border-brand-black flex items-center justify-center mb-8 bold-shadow rotate-3"
          >
            <MessageCircle className="w-12 h-12 text-white" />
          </motion.div>
          
          <h1 className="text-6xl font-black mb-2 leading-none tracking-tighter uppercase italic transform -skew-x-6">FOBCHAT</h1>
          <p className="text-brand-black font-black uppercase tracking-[0.2em] text-[10px] mb-8 bg-brand-black text-white px-4 py-1.5 rounded-full inline-block">Native Intelligence</p>
          
          <div className="w-full space-y-6 text-left mb-8">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest mb-3 ml-2">Votre Nom</label>
              <input 
                type="text" 
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="Ex: Paul Kaboré"
                className="w-full p-5 bg-gray-50 border-2 border-brand-black rounded-2xl font-bold outline-none focus:bg-white transition-all focus:ring-4 ring-brand-green/20"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest mb-3 ml-2">Mot de Passe</label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full p-5 bg-gray-50 border-2 border-brand-black rounded-2xl font-bold outline-none focus:bg-white transition-all focus:ring-4 ring-brand-green/20"
              />
            </div>
            
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest mb-3 ml-2">Langue Principale</label>
              <div className="max-h-52 overflow-y-auto pr-2 custom-scrollbar">
                <LanguageSelector 
                  current={userLanguage}
                  onSelect={setUserLanguage}
                />
              </div>
            </div>
          </div>
          
          <button 
            onClick={() => {
              if (userName && password.length >= 4) {
                setInitialized(true);
              } else {
                setIsLoginError(true);
                setTimeout(() => setIsLoginError(false), 2000);
              }
            }}
            className={`w-full py-6 bg-brand-green text-white rounded-2xl font-black text-2xl uppercase tracking-widest bold-shadow active:scale-95 transition-all flex items-center justify-center gap-3 border-4 border-brand-black ${isLoginError ? 'bg-red-500 animate-shake' : ''}`}
          >
            {isLoginError ? 'Infos Requises' : "S'inscrire"} <ChevronRight className="w-8 h-8" />
          </button>
          
          <p className="mt-6 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Brisez les barrières de l'analphabétisme</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex flex-col bg-brand-gray-bg h-[100vh] overflow-hidden relative">
      {/* Call Overlay */}
      <AnimatePresence>
        {isCalling && activeContact && (
          <motion.div 
            initial={{ opacity: 0, y: '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '100%' }}
            className="fixed inset-0 z-[100] bg-brand-black flex flex-col items-center justify-between p-12 text-white"
          >
            <div className="text-center mt-20">
              <motion.div 
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="w-40 h-40 rounded-full border-4 border-brand-green mb-8 mx-auto overflow-hidden bold-shadow"
              >
                <img src={activeContact.avatar} alt="" className="w-full h-full object-cover" />
              </motion.div>
              <h2 className="text-5xl font-black uppercase tracking-tighter mb-2">{activeContact.name}</h2>
              <p className="text-brand-green font-black uppercase tracking-widest text-sm animate-pulse">Appel en cours...</p>
            </div>

            <div className="flex gap-8 mb-20">
              <button 
                onClick={() => setIsCalling(false)}
                className="w-20 h-20 bg-red-500 rounded-full border-4 border-brand-black flex items-center justify-center text-3xl bold-shadow active:scale-90 transition-all"
              >
                📞
              </button>
              <button 
                className="w-20 h-20 bg-gray-700 rounded-full border-4 border-brand-black flex items-center justify-center text-3xl bold-shadow active:scale-90 transition-all text-white"
              >
                <Mic className="w-8 h-8" />
              </button>
              <button 
                className="w-20 h-20 bg-gray-700 rounded-full border-4 border-brand-black flex items-center justify-center text-3xl bold-shadow active:scale-90 transition-all text-white"
              >
                <Video className="w-8 h-8" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Header */}
      <header className="h-24 bg-white border-b-2 border-brand-border flex items-center justify-between px-8 z-30 shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-brand-yellow rounded-full border-2 border-brand-black flex items-center justify-center bold-shadow">
              <span className="text-brand-black font-black text-xl">{userName ? userName.charAt(0).toUpperCase() : 'F'}</span>
            </div>
            <div className="hidden sm:block">
              <p className="text-xs font-black uppercase tracking-widest leading-none mb-1">Bienvenue,</p>
              <h1 className="text-2xl font-black tracking-tighter uppercase leading-none">{userName || 'Utilisateur'}</h1>
            </div>
          </div>
          
          <div className="hidden md:flex gap-3">
            <button 
              onClick={() => {
                if (navigator.share) {
                  navigator.share({
                    title: 'FobChat',
                    text: 'Rejoignez-moi sur FobChat pour briser les barrières linguistiques !',
                    url: window.location.href
                  });
                } else {
                  navigator.clipboard.writeText(window.location.href);
                  alert('Lien copié !');
                }
              }}
              className="px-6 py-2 bg-brand-green text-white rounded-full font-black text-[10px] tracking-widest flex items-center gap-2 border-2 border-brand-black bold-shadow uppercase"
            >
              <span>🔗</span> Partager
            </button>
          <button className="px-6 py-2 bg-brand-black text-white rounded-full font-black text-[10px] tracking-widest flex items-center gap-2 border-2 border-brand-black uppercase">
            <span>🌍</span> Internationale
          </button>
          <button className="px-6 py-2 bg-white text-brand-black rounded-full font-black text-[10px] tracking-widest flex items-center gap-2 border-2 border-brand-black uppercase">
            <span>🇧🇫</span> Nationale
          </button>
          <button 
            onClick={() => setShowLangSettings(true)}
            className="px-6 py-2 bg-brand-yellow text-brand-black rounded-full font-black text-[10px] tracking-widest flex items-center gap-2 border-2 border-brand-black bold-shadow uppercase"
          >
            <span>🗣️</span> Locales ({LANGUAGES.find(l => l.code === userLanguage)?.name})
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - Contacts */}
        <AnimatePresence>
          {(!activeContact || window.innerWidth > 768) && (
            <motion.div 
              initial={{ x: -100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -100, opacity: 0 }}
              className="w-full md:w-[320px] bg-white border-r-2 border-brand-border flex flex-col h-full shrink-0"
            >
              <div className="p-6 border-b border-brand-border">
                <h2 className="text-xs font-black uppercase tracking-[0.2em] text-gray-400">Discussions</h2>
              </div>

              <div className="flex-1 overflow-y-auto">
                {contacts.map((contact) => (
                  <button
                    key={contact.id}
                    onClick={() => setActiveContact(contact)}
                    className="w-full flex items-center gap-4 p-6 border-b border-gray-100 hover:bg-gray-50 transition-colors active:scale-[0.98] group"
                  >
                    <div className="relative flex-shrink-0">
                      <img src={contact.avatar} className="w-16 h-16 rounded-full bg-gray-100 border-2 border-brand-black" alt="" />
                      <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-white rounded-full flex items-center justify-center text-sm shadow-sm border-2 border-brand-black">
                        {LANGUAGES.find(l => l.code === contact.preferredLanguage)?.flag}
                      </div>
                    </div>
                    <div className="flex-1 text-left overflow-hidden">
                      <div className="flex justify-between items-center mb-0.5">
                        <span className="text-xl font-black leading-none">{contact.name}</span>
                        <span className="text-[10px] font-black text-gray-400 uppercase">{contact.lastMessageTime}</span>
                      </div>
                      <p className="text-sm font-bold text-gray-400 truncate">{contact.lastMessage}</p>
                    </div>
                  </button>
                ))}
              </div>

              <div className="p-8 bg-brand-green border-t-2 border-brand-black flex justify-center">
                <button 
                  onClick={() => setShowAddContact(true)}
                  className="flex flex-col items-center gap-1 group"
                >
                  <div className="w-12 h-12 rounded-full bg-white border-2 border-brand-black flex items-center justify-center group-active:scale-95 transition-all text-xl">➕</div>
                  <span className="font-black text-[10px] uppercase tracking-widest text-white">Nouveau</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Chat Area */}
        <div className={`flex-1 flex flex-col h-full relative transition-all ${activeContact ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}`}>
          {activeContact ? (
            <>
              {/* Chat Header */}
              <div className="p-6 bg-white border-b-2 border-brand-border flex items-center justify-between sticky top-0 z-20">
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => setActiveContact(null)}
                    className="md:hidden p-2 -ml-2 text-brand-black hover:bg-gray-50 rounded-full transition-colors"
                  >
                    <ArrowLeft className="w-6 h-6 stroke-[3px]" />
                  </button>
                  <p className="text-3xl font-black uppercase tracking-tighter">{activeContact.name}</p>
                  <span className="hidden sm:block bg-blue-100 text-blue-800 px-3 py-1 rounded text-[10px] font-black uppercase tracking-widest border border-blue-200">
                    Traduction Active
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => setIsCalling(true)}
                    className="w-12 h-12 rounded-full border-2 border-brand-black flex items-center justify-center text-xl hover:bg-gray-50 transition-colors"
                  >
                    📞
                  </button>
                  <button 
                    onClick={() => setIsCalling(true)}
                    className="w-12 h-12 rounded-full border-2 border-brand-black flex items-center justify-center text-xl hover:bg-gray-50 transition-colors"
                  >
                    📹
                  </button>
                </div>
              </div>

              {/* Messages */}
              <div 
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-8 space-y-8 bg-[#EFEAE2]"
              >
                {(messages[activeContact.id] || []).map((msg) => (
                  <ChatBubble 
                    key={msg.id} 
                    message={msg} 
                    isMe={msg.senderId === 'me'}
                    onTranslate={handleTranslateMessage}
                    isLoadingTranslation={loadingTranslationId === msg.id}
                  />
                ))}

                {isProcessing && (
                  <div className="flex items-center gap-3 text-brand-black text-[10px] font-black uppercase tracking-widest">
                    <div className="flex gap-1.5">
                      <motion.div animate={{ scale: [1, 1.5, 1] }} transition={{ repeat: Infinity, duration: 1 }} className="w-2 h-2 bg-brand-green rounded-full border border-black" />
                      <motion.div animate={{ scale: [1, 1.5, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-2 h-2 bg-brand-green rounded-full border border-black" />
                      <motion.div animate={{ scale: [1, 1.5, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-2 h-2 bg-brand-green rounded-full border border-black" />
                    </div>
                    Traitement vocal...
                  </div>
                )}
              </div>

              {/* Input Area */}
              <div className="h-40 md:h-32 bg-white border-t-4 border-brand-green flex items-center px-4 md:px-8 gap-4 md:gap-6 shrink-0">
                <input 
                  type="file" 
                  ref={fileInputRef}
                  className="hidden"
                  onChange={handleFileSelect}
                  accept="image/*,application/pdf,video/*"
                />
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-gray-100 flex items-center justify-center text-2xl md:text-3xl border-2 border-brand-black hover:bg-gray-200 transition-colors shrink-0"
                >
                  📸
                </button>
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-gray-100 flex items-center justify-center text-2xl md:text-3xl border-2 border-brand-black hover:bg-gray-200 transition-colors shrink-0"
                >
                  📁
                </button>

                <div className="flex-1 flex gap-2 items-center">
                  <div className="flex-1 flex items-center bg-white border-2 border-brand-black rounded-full px-4 overflow-hidden focus-within:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-shadow">
                    <input 
                      type="text"
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleSendMessage(inputText);
                          setInputText('');
                        }
                      }}
                      placeholder="Tapez ici..."
                      className="flex-1 py-4 font-bold outline-none"
                    />
                    <Smile className="w-6 h-6 text-gray-400 cursor-pointer" />
                  </div>

                  {inputText.trim() ? (
                    <button 
                      onClick={() => {
                        handleSendMessage(inputText);
                        setInputText('');
                      }}
                      className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-brand-green text-white flex items-center justify-center border-2 border-brand-black bold-shadow hover:scale-105 active:scale-95 transition-all shrink-0"
                    >
                      <Send className="w-8 h-8" />
                    </button>
                  ) : (
                    <div className="shrink-0">
                      <VoiceRecorder 
                        onSend={(audio) => handleSendMessage(undefined, audio)}
                      />
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
              <div className="w-24 h-24 bg-white rounded-[2.5rem] border-4 border-brand-black flex items-center justify-center mb-8 bold-shadow">
                <MessageCircle className="w-12 h-12 text-brand-green" />
              </div>
              <h2 className="text-4xl font-black mb-4 uppercase tracking-tighter">Votre messagerie vocale native</h2>
              <p className="text-brand-black font-bold uppercase tracking-widest text-xs bg-brand-yellow px-4 py-2 border-2 border-brand-black">
                Traductions automatiques en langues locales
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Nav */}
      <nav className="h-20 bg-brand-black flex justify-around items-center shrink-0 border-t-2 border-brand-yellow">
        <div className="flex flex-col items-center text-white cursor-pointer px-4">
          <span className="text-2xl">💬</span>
          <span className="text-[10px] font-black uppercase tracking-widest mt-1">Chats</span>
        </div>
        <div className="flex flex-col items-center text-white opacity-40 cursor-pointer px-4 hover:opacity-100 transition-opacity">
          <span className="text-2xl">🔄</span>
          <span className="text-[10px] font-black uppercase tracking-widest mt-1">Status</span>
        </div>
        <div className="flex flex-col items-center text-white opacity-40 cursor-pointer px-4 hover:opacity-100 transition-opacity">
          <span className="text-2xl">👥</span>
          <span className="text-[10px] font-black uppercase tracking-widest mt-1">Groupes</span>
        </div>
        <div className="flex flex-col items-center text-white opacity-40 cursor-pointer px-4 hover:opacity-100 transition-opacity" onClick={() => setShowLangSettings(true)}>
          <span className="text-2xl">⚙️</span>
          <span className="text-[10px] font-black uppercase tracking-widest mt-1">Options</span>
        </div>
      </nav>

      {/* Settings Modal */}
      <AnimatePresence>
        {showLangSettings && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-brand-black/40 backdrop-blur-sm">
            <motion.div 
               initial={{ opacity: 0, scale: 0.9, y: 20 }}
               animate={{ opacity: 1, scale: 1, y: 0 }}
               exit={{ opacity: 0, scale: 0.9, y: 20 }}
               className="bg-white rounded-[2.5rem] p-8 w-full max-w-md border-4 border-brand-black bold-shadow"
            >
              <h2 className="text-4xl font-black mb-1 uppercase tracking-tighter">MA LANGUE</h2>
              <p className="text-gray-500 mb-6 font-bold uppercase tracking-widest text-[10px]">Parlez dans votre langue native :</p>
              
              <LanguageSelector 
                 current={userLanguage}
                 onSelect={(lang) => {
                   setUserLanguage(lang);
                   setShowLangSettings(false);
                 }}
              />
              
              <button 
                onClick={() => setShowLangSettings(false)}
                className="mt-6 w-full py-4 border-2 border-brand-black rounded-full hover:bg-gray-50 transition-all font-black uppercase tracking-widest text-xs"
              >
                Annuler
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Contact Modal */}
      <AnimatePresence>
        {showAddContact && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-brand-black/40 backdrop-blur-sm">
            <motion.div 
               initial={{ opacity: 0, scale: 0.9, y: 20 }}
               animate={{ opacity: 1, scale: 1, y: 0 }}
               exit={{ opacity: 0, scale: 0.9, y: 20 }}
               className="bg-white rounded-[2.5rem] p-8 w-full max-w-md border-4 border-brand-black bold-shadow max-h-[90vh] overflow-y-auto"
            >
              <h2 className="text-4xl font-black mb-1 uppercase tracking-tighter">NOUVEAU CONTACT</h2>
              <p className="text-gray-500 mb-6 font-bold uppercase tracking-widest text-[10px]">Ajouter un proche à vos discussions</p>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest mb-2">Nom complet</label>
                  <input 
                    type="text"
                    value={newContactName}
                    onChange={(e) => setNewContactName(e.target.value)}
                    placeholder="Ex: Tante Aminata"
                    className="w-full p-4 border-2 border-brand-black rounded-2xl font-bold focus:bg-gray-50 outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest mb-2">Langue préférée</label>
                  <LanguageSelector 
                    current={newContactLang}
                    onSelect={setNewContactLang}
                  />
                </div>

                <div className="flex gap-3">
                  <button 
                    onClick={() => setShowAddContact(false)}
                    className="flex-1 py-4 border-2 border-brand-black rounded-xl hover:bg-gray-50 transition-all font-black uppercase tracking-widest text-xs"
                  >
                    Annuler
                  </button>
                  <button 
                    onClick={handleAddContact}
                    disabled={!newContactName.trim()}
                    className="flex-[2] py-4 bg-brand-green text-white border-2 border-brand-black rounded-xl hover:bg-brand-green/90 transition-all font-black uppercase tracking-widest text-xs bold-shadow disabled:opacity-50 disabled:grayscale"
                  >
                    Ajouter le contact
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
