
import { GoogleGenAI } from "@google/genai";
import { AppSettings, VocabResult } from "../types";

export class AIService {
  private settings: AppSettings;

  constructor(settings: AppSettings) {
    this.settings = settings;
  }

  async translateSegments(segments: string[]): Promise<string[]> {
    const prompt = `
      You are a professional translator. 
      Translate the following array of Chinese text segments into English (Novel Style).
      Maintain a strict 1-to-1 correspondence. The output must be a JSON array of strings.
      
      Input Array: ${JSON.stringify(segments)}
    `;

    if (this.settings.apiMode === 'gemini') {
      return this.callGemini(prompt, true);
    } else {
      return this.callOpenAI(prompt, true);
    }
  }

  async generateVocabNotes(payload: any[]): Promise<VocabResult[]> {
    const prompt = `
      Role: Data Processing Agent for English Learners.
      Task: Analyze 'focus_words' in the context of the 'en' sentence.
      
      Constraints:
      1. STRICTLY EXCLUDE Proper Nouns (Names, Places, Brands).
      2. 'cm' (Context Meaning): Provide ONLY the specific Chinese meaning of the word IN THIS SENTENCE. Keep it concise (2-4 chars).
      3. 'def' (Side Definition): 
         - Provide the IPA and full Traditional Chinese definitions.
         - CRITICAL: Identify if the word has multiple meanings or multiple parts of speech (Polysemy) relevant to the context or high-frequency usage.
         - Format: IPA [space] ① [pos] Def 1 ② [pos] Def 2 ...
         - Example: /rʌn/ ① [v.] 跑 ② [v.] 經營
      4. Difficulty Level (l):
          - Basic (Level 1-2): Return 1.
          - Target (Level 3-6): Return 3, 4, 5, or 6.
          - Extra / Out of syllabus: Return 99.
      
      Output JSON format:
      [
          {
              "id": "...",
              "vocab": [
                  {"w": "word", "l": 4, "cm": "在此句的意思", "def": "/ipa/ ① [v.] def1 ② [n.] def2"}
              ]
          }
      ]

      Input: ${JSON.stringify(payload)}
    `;

    if (this.settings.apiMode === 'gemini') {
      return this.callGemini(prompt, true);
    } else {
      return this.callOpenAI(prompt, true);
    }
  }

  private cleanJson(text: string): string {
    // 1. Remove Markdown code blocks
    let clean = text.replace(/```json/g, "").replace(/```/g, "").trim();
    
    // 2. Try to extract JSON array or object if there is extra text
    const jsonMatch = clean.match(/(\[[\s\S]*\]|\{[\s\S]*\})/);
    if (jsonMatch) {
      clean = jsonMatch[0];
    }

    return clean;
  }

  private async callGemini(prompt: string, expectJson: boolean): Promise<any> {
    try {
      // Use this.settings.apiKey instead of process.env.API_KEY which is not available in browser
      const ai = new GoogleGenAI({ apiKey: this.settings.apiKey });
      const response = await ai.models.generateContent({
        model: this.settings.model || 'gemini-2.5-flash',
        contents: prompt,
        config: expectJson ? { responseMimeType: 'application/json' } : undefined
      });

      const text = response.text;
      if (!text) throw new Error("Empty response from Gemini");

      if (expectJson) {
        const cleanText = this.cleanJson(text);
        try {
          return JSON.parse(cleanText);
        } catch (e) {
          console.error("JSON Parse Error. Raw text:", text, "Cleaned text:", cleanText);
          throw new Error("Failed to parse JSON response from AI");
        }
      }
      return text;
    } catch (error: any) {
      console.error("Gemini API Error:", error);
      throw new Error(error.message || "Gemini API failed");
    }
  }

  private async callOpenAI(prompt: string, expectJson: boolean): Promise<any> {
    // 1. Clean Base URL: Remove trailing slashes and avoid double "/v1"
    let baseUrl = this.settings.baseUrl.replace(/\/+$/, "");
    if (baseUrl.endsWith("/v1")) {
      baseUrl = baseUrl.slice(0, -3);
    }
    
    // Helper to perform the fetch
    const performRequest = async (useJsonFormat: boolean) => {
      const body: any = {
        model: this.settings.model,
        messages: [
          { role: "system", content: expectJson ? "You are a JSON generator. Output valid JSON only." : "You are a helpful assistant." },
          { role: "user", content: prompt }
        ]
      };

      // Handle o1 models which don't support system messages or json_object
      if (this.settings.model.startsWith('o1')) {
          body.messages = [{ role: "user", content: prompt }];
          // o1 usually doesn't support response_format: json_object yet
      } else if (expectJson && useJsonFormat) {
        body.response_format = { type: "json_object" };
      }

      return fetch(`${baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.settings.apiKey}`
        },
        body: JSON.stringify(body)
      });
    };

    try {
      // Attempt 1
      let res = await performRequest(expectJson);
      
      // Fallback A: 400 Bad Request with json_object
      if (!res.ok && res.status === 400 && expectJson) {
        console.warn("OpenAI API returned 400 with json_object. Retrying without response_format...");
        res = await performRequest(false);
      }

      let data;
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        data = await res.json();
      } else {
        const text = await res.text();
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}: ${text.slice(0, 100)}`);
        throw new Error(`Invalid content-type: ${contentType}`);
      }

      if (!res.ok) {
        const errorMsg = 
            data.error?.message || 
            data.detail || 
            data.message || 
            (typeof data.error === 'string' ? data.error : null) ||
            JSON.stringify(data);
        throw new Error(errorMsg);
      }

      let content = data.choices?.[0]?.message?.content;
      
      // Check for refusal
      if (data.choices?.[0]?.message?.refusal) {
        throw new Error(`Model Refusal: ${data.choices[0].message.refusal}`);
      }

      // Fallback B: Empty content with json_object
      if (!content && expectJson) {
         console.warn("Empty content received with json_object. Retrying without response_format...");
         res = await performRequest(false);
         if (res.ok) {
            const retryData = await res.json();
            content = retryData.choices?.[0]?.message?.content;
         }
      }

      if (!content) {
         const reason = data.choices?.[0]?.finish_reason;
         throw new Error(`Empty response content. Finish Reason: ${reason || 'unknown'}.`);
      }

      if (expectJson) {
        const cleanText = this.cleanJson(content);
        try {
          return JSON.parse(cleanText);
        } catch (e) {
           console.error("JSON Parse Error. Raw text:", content, "Cleaned text:", cleanText);
           throw new Error("Failed to parse JSON response from AI");
        }
      }
      return content;

    } catch (error: any) {
      console.error("OpenAI API Error:", error);
      throw new Error(error.message || "OpenAI API failed");
    }
  }
}
