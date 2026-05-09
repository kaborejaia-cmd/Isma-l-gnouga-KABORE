export type Language = 'fr' | 'en' | 'mooré' | 'dioula' | 'fulfuldé' | 'gulmancéma' | 'bissa' | 'dagara' | 'lobiri';

export interface Contact {
  id: string;
  name: string;
  avatar: string;
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount: number;
  preferredLanguage: Language;
}

export interface Message {
  id: string;
  senderId: string;
  text?: string;
  audioUrl?: string; // base64 or blob url
  timestamp: string;
  type: 'text' | 'voice' | 'file';
  file?: {
    url: string;
    name: string;
    mimeType: string;
    size: number;
  };
  translation?: {
    text: string;
    language: Language;
  };
  transcription?: string;
}

export const LANGUAGES: { code: Language; name: string; nativeName: string; flag: string }[] = [
  { code: 'fr', name: 'Français', nativeName: 'Français', flag: '🇫🇷' },
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧' },
  { code: 'mooré', name: 'Mooré', nativeName: 'Mooré', flag: '🇧🇫' },
  { code: 'dioula', name: 'Dioula', nativeName: 'Julakan', flag: '🇨🇮' },
  { code: 'fulfuldé', name: 'Fulfuldé', nativeName: 'Pulaar', flag: '🇸🇳' },
  { code: 'gulmancéma', name: 'Gulmancéma', nativeName: 'Gulmancéma', flag: '🇧🇫' },
  { code: 'bissa', name: 'Bissa', nativeName: 'Bissa', flag: '🇧🇫' },
  { code: 'dagara', name: 'Dagara', nativeName: 'Dagara', flag: '🇧🇫' },
  { code: 'lobiri', name: 'Lobiri', nativeName: 'Lobiri', flag: '🇧🇫' },
];
