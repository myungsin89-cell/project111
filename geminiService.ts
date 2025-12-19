
import { GoogleGenAI, Type } from "@google/genai";
import { Section, AISuggestion, VocabularyRecommendation } from "./types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "" });

export const geminiService = {
  // 목차 추천 (한국어)
  async suggestTOC(title: string, description: string): Promise<string[]> {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `제목: "${title}", 설명: "${description}". 이 책을 위한 상세한 목차를 추천해줘. 5~10개의 챕터 제목을 배열 형태로 제공해줘.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      }
    });
    try {
      return JSON.parse(response.text.trim());
    } catch (e) {
      console.error("TOC 파싱 실패", e);
      return ["프롤로그", "서론", "첫 번째 이야기", "결말"];
    }
  },

  // 실시간 글쓰기 추천 (한국어 페르소나 적용)
  async getWritingSuggestions(
    currentText: string,
    sectionTitle: string,
    persona: string,
    bookContext: string
  ): Promise<AISuggestion[]> {
    if (!currentText && !sectionTitle) return [];
    
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `책 배경: ${bookContext}\n현재 챕터: ${sectionTitle}\n현재 작성된 글: ${currentText}`,
      config: {
        systemInstruction: `당신은 전문 작가 어시스턴트입니다. 역할: ${persona}. 현재 글의 흐름을 이어가거나 개선할 수 있는 창의적인 문구 3개를 제안하세요. 한국어로 답변하세요.`,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              text: { type: Type.STRING, description: "추천 문구" },
              type: { type: Type.STRING, enum: ["continuation", "phrase", "idea"] }
            },
            required: ["text", "type"]
          }
        }
      }
    });

    try {
      return JSON.parse(response.text.trim());
    } catch (e) {
      return [];
    }
  },

  // 생각/느낌에 따른 단어 추천
  async recommendVocabulary(thought: string): Promise<VocabularyRecommendation[]> {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `사용자가 표현하려는 생각/느낌: "${thought}". 이 감정을 가장 잘 나타내는 세련되거나 감각적인 단어 5개를 추천해줘.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              word: { type: Type.STRING, description: "단어" },
              meaning: { type: Type.STRING, description: "의미" },
              nuance: { type: Type.STRING, description: "어감/활용법" }
            },
            required: ["word", "meaning", "nuance"]
          }
        }
      }
    });

    try {
      return JSON.parse(response.text.trim());
    } catch (e) {
      return [];
    }
  }
};
