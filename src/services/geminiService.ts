import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY as string });

export interface TranslationResult {
  translatedText: string;
  originalLanguage: string;
  targetLanguage: string;
}

export async function translateText(text: string, from: string, to: string): Promise<TranslationResult> {
  const prompt = `Traduisez le texte suivant de ${from} en ${to}. 
  Si le texte est en langue locale (comme le Mooré, Dioula, Fulfuldé), assurez une traduction naturelle.
  Texte: "${text}"`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          translatedText: { type: Type.STRING },
          originalLanguage: { type: Type.STRING },
          targetLanguage: { type: Type.STRING },
        },
        required: ["translatedText", "originalLanguage", "targetLanguage"],
      },
    },
  });

  return JSON.parse(response.text || "{}");
}

export async function processVoiceNote(base64Audio: string, languageHint: string): Promise<{ transcript: string; summary: string }> {
  const prompt = `Voici un message vocal en ${languageHint}. 
  1. Transcrivez-le fidèlement.
  2. Résumez-le brièvement.
  Si la langue est une langue locale africaine, faites de votre mieux pour transcrire les phonèmes ou le sens.`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [
      { text: prompt },
      {
        inlineData: {
          mimeType: "audio/wav",
          data: base64Audio,
        },
      },
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          transcript: { type: Type.STRING },
          summary: { type: Type.STRING },
        },
        required: ["transcript", "summary"],
      },
    },
  });

  return JSON.parse(response.text || "{}");
}

export async function textToSpeech(text: string): Promise<string> {
  // We'll use the native TTS if available or simulate via Gemini TTS
  // But for this demo, we'll try to use the Gemini TTS model if possible
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-tts-preview",
      contents: [{ parts: [{ text: `Dites ceci clairement: ${text}` }] }],
      config: {
        responseModalities: ["AUDIO" as any],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: "Kore" },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    return base64Audio || "";
  } catch (error) {
    console.error("Gemini TTS failed, fallback to native window.speechSynthesis", error);
    return "";
  }
}
