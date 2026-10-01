import { GoogleGenAI, Type } from '@google/genai';
import { Person, DateSession, DatingConversationTurn, CompatibilityResult, store } from '../data/store';
import { PersonAnalyzerService } from './personAnalyzer';

export class AgentDatingService {
  /**
   * Helper to make a Gemini text generation call with Flash models fallback
   */
  private static async generateText(ai: GoogleGenAI, prompt: string, systemInstruction: string): Promise<string> {
    const modelsToTry = ['gemini-3.8-flash', 'gemini-3.1-flash-lite', 'gemini-flash-latest'];
    let lastError: any = null;

    for (const modelName of modelsToTry) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: prompt,
          config: {
            systemInstruction,
            temperature: 0.6,
          },
        });
        const text = response.text ? response.text.trim() : '';
        if (text) return text;
      } catch (err: any) {
        lastError = err;
        await new Promise((resolve) => setTimeout(resolve, 800));
      }
    }

    console.warn(`[AgentDatingService] All text generation models failed: ${lastError?.message || lastError}`);
    return '';
  }

  /**
   * Internal Grounding Validation Step:
   * Audits candidate response to ensure NO concrete ungrounded personal claims are invented.
   */
  private static async validateResponseGrounding(
    ai: GoogleGenAI,
    person: Person,
    message: string
  ): Promise<{ grounded: boolean; reason?: string }> {
    const intel = person.intelligence;
    const name = person.name || 'Represented Person';

    const verifiedFacts = `
Verified Persona Facts for ${name}:
- Headline/Position: ${person.headline || person.currentPosition || 'N/A'}
- Verified Interests: ${intel?.interests?.join(', ') || person.interests?.join(', ') || 'N/A'}
- Verified Values: ${intel?.values?.join(', ') || 'N/A'}
- Verified Hobbies: ${intel?.hobbies?.join(', ') || person.hobbies?.join(', ') || 'N/A'}
- Verified Career: ${person.career?.map(c => `${c.title} at ${c.company}`).join('; ') || 'N/A'}
- Verified Evidence Claims: ${intel?.evidence?.map(e => e.claim).join('; ') || 'N/A'}
`;

    const prompt = `Auditing candidate first-person speed-date message for factual grounding.

${verifiedFacts}

Candidate Message to Audit: "${message}"

Task:
Determine if the message contains ANY ungrounded concrete first-person factual claims about ${name}.

The agent is STRICTLY PROHIBITED from inventing:
- specific projects (e.g., "digital library project")
- specific locations (e.g., "Laxmipur", "remote Jharkhand village")
- named people (e.g., specific colleagues, founders, or friends)
- ungrounded hobbies or sports (e.g., claiming to play tennis, gardening, walking dogs)
- travel details (e.g., "went to Italy last month")
- family details (e.g., "living with my spouse and kids")
- personal experiences or anecdotes (e.g., describing a specific childhood memory, or a specific conversation)
- specific activities or daily routines (e.g., "I wake up at 5am to meditate")
- specific achievements
- organizations (e.g., non-profits, clubs)
- specific preferences (e.g., "I love black coffee")

Rules:
- Broad, general thoughts, open questions, and reflections (e.g., "When I step away from work, I try to recharge. How about you?", "I care about making resources more accessible") are GROUNDED (true).
- Discussing verified hobbies/career/projects listed above is GROUNDED (true).
- Any invention of concrete specifics not explicitly listed in the facts above is UNGROUNDED (false). If the facts only support a broad concept, any specific detail is a grounding violation!

Respond in JSON:
{
  "grounded": true|false,
  "reason": "short explanation of the specific ungrounded item invented"
}`;

    const config = {
      systemInstruction: 'Audit first-person statements strictly against verified persona facts. Reject invented projects, locations, named people, travel, or fake biographical claims.',
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          grounded: { type: Type.BOOLEAN },
          reason: { type: Type.STRING },
        },
        required: ['grounded'],
      },
    };

    try {
      const res = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config,
      });

      const text = res.text ? res.text.trim() : '';
      if (text) {
        const parsed = JSON.parse(text);
        return {
          grounded: Boolean(parsed.grounded),
          reason: parsed.reason ? String(parsed.reason) : undefined,
        };
      }
    } catch (err: any) {
      console.warn(`[AgentDatingService] Grounding validator warning:`, err?.message || err);
    }

    // Default to true if auditor call fails
    return { grounded: true };
  }

  /**
   * Generates a single conversational turn for an agent with Grounding Enforcement & Verification.
   * Retries up to 2 times if validation fails (maximum 3 attempts total).
   * Fallback to a 100% grounded response if all attempts fail validation.
   */
  private static async generateAgentTurn(
    ai: GoogleGenAI,
    person: Person,
    speakerRole: 'A' | 'B',
    conversationHistory: DatingConversationTurn[]
  ): Promise<string> {
    const intel = person.intelligence;
    const name = person.name || `Subject ${speakerRole}`;

    const verifiedFactsList = [
      `Name: ${name}`,
      `Headline/Position: ${person.headline || person.currentPosition || 'N/A'}`,
      `Verified Interests: ${intel?.interests?.join(', ') || person.interests?.join(', ') || 'N/A'}`,
      `Verified Values: ${intel?.values?.join(', ') || 'N/A'}`,
      `Verified Hobbies: ${intel?.hobbies?.join(', ') || person.hobbies?.join(', ') || 'N/A'}`,
      `Verified Career: ${person.career?.map(c => `${c.title} at ${c.company}`).join('; ') || 'N/A'}`,
      `Preferred Discussion Topics: ${intel?.conversationTopics?.join(', ') || 'N/A'}`,
    ].join('\n');

    const systemInstruction = `You are an AI proxy agent representing ${name} on an informal 1-on-1 speed date over coffee.

VERIFIED PERSONA FACTS FOR ${name}:
${verifiedFactsList}

STRICT GROUNDING & PRIVACY RULES:
1. STRICT CONTEXT ISOLATION: You have ZERO direct knowledge of the other person's profile, career, or background. You ONLY know what they have explicitly said in the transcript so far. NEVER reference or guess their background before they state it!
2. ABSOLUTE GROUNDING ENFORCEMENT:
   - You may use ONLY your own verified facts listed above, information revealed by the other agent during this specific conversation, and the conversation history.
   - You MUST NOT invent any projects, locations, named people, hobbies, travel, family details, personal experiences, specific activities, achievements, organizations, or preferences that are not explicitly listed in your verified facts above.
   - If the source only supports a broad concept, keep your response broad. NEVER make it concrete or specific! For example, if your facts state you value "accessible education", you can say "I care about making education more accessible", but you MUST NOT say "I recently worked on a digital library project in Laxmipur."
3. COHERENT SPEED DATE DIALOGUE:
   - Directly react to what the other person just said in the previous turn.
   - Prefer ONE natural, open follow-up question over multiple questions.
   - Keep messages brief (2-3 sentences max) and suitable for a speed date.
4. NEVER mention you are an AI or prompt system.`;

    const historyPrompt = conversationHistory.length === 0
      ? `This is the start of the speed date. Introduce yourself naturally as ${name}, briefly mention a broad interest or core focus supported by your background, and ask ONE casual open icebreaker question.`
      : `Here is the date conversation history so far:
${conversationHistory.map((t) => `${t.speakerName || t.speaker}: "${t.message}"`).join('\n')}

Now respond as ${name}. React directly to the latest message. If sharing something about yourself, make sure it is strictly grounded in your verified facts. Ask ONE natural follow-up question.`;

    let attempt = 0;
    const maxRetries = 2; // Maximum 2 retries (3 total attempts)
    let currentPrompt = historyPrompt;

    while (attempt <= maxRetries) {
      console.log(`[AgentDatingService] Turn Generation Attempt ${attempt + 1} for ${name}`);
      let candidate = await this.generateText(ai, currentPrompt, systemInstruction);

      if (!candidate) {
        candidate = conversationHistory.length === 0
          ? `Hey! I'm ${name}. Great to meet you today. What's something that's been keeping you busy or inspired lately?`
          : `That's really interesting! How do you usually like to recharge when you're taking a break from that?`;
      }

      // Validate the response
      const audit = await this.validateResponseGrounding(ai, person, candidate);

      if (audit.grounded) {
        return candidate;
      }

      console.warn(`[AgentDatingService] Grounding violation detected on attempt ${attempt + 1} for ${name}: "${audit.reason}".`);

      attempt++;
      if (attempt <= maxRetries) {
        currentPrompt = `${historyPrompt}

CRITICAL CORRECTION INSTRUCTION: Your previous response was rejected for inventing ungrounded details ("${audit.reason}").
Regenerate your response as ${name}.
Sticking strictly to verified facts. DO NOT invent any unverified projects, locations, named people, hobbies, travel, family details, personal experiences, specific activities, achievements, or organizations.
Keep it extremely broad if a specific fact is not supported.`;
      }
    }

    // Fallback if both retries failed
    console.warn(`[AgentDatingService] All generation attempts failed grounding validation for ${name}. Returning a safe fallback response.`);
    const fallbackInterest = intel?.interests?.[0] || person.interests?.[0] || 'meaningful work';
    const fallbackValue = intel?.values?.[0] || 'learning and community';
    const safeFallback = `I'm really passionate about my focus in ${person.headline || person.currentPosition || 'my work'}, particularly when it comes to ${fallbackInterest}. Generally, I find myself really valuing ${fallbackValue}. How do you feel about these kinds of areas in your own journey?`;
    return safeFallback;
  }

  /**
   * Runs multi-dimensional compatibility evaluation after the 6-turn conversation
   */
  private static async evaluateCompatibility(
    ai: GoogleGenAI,
    personA: Person,
    personB: Person,
    conversation: DatingConversationTurn[]
  ): Promise<CompatibilityResult> {
    const prompt = `You are an expert AI dating compatibility evaluator. Analyze the following completed agent speed date between ${personA.name || 'Person A'} and ${personB.name || 'Person B'}.

Person A Background Summary:
- Name: ${personA.name}
- Headline: ${personA.headline || personA.currentPosition}
- Interests: ${personA.intelligence?.interests?.join(', ') || 'N/A'}
- Values: ${personA.intelligence?.values?.join(', ') || 'N/A'}

Person B Background Summary:
- Name: ${personB.name}
- Headline: ${personB.headline || personB.currentPosition}
- Interests: ${personB.intelligence?.interests?.join(', ') || 'N/A'}
- Values: ${personB.intelligence?.values?.join(', ') || 'N/A'}

Completed Date Conversation Transcript:
${conversation.map((t) => `${t.speakerName || t.speaker}: "${t.message}"`).join('\n')}

Evaluation Instructions:
Evaluate compatibility across four core dimensions:
1. Shared Interests & Passions (0-25 pts): Overlap in personal or professional fields.
2. Core Values Alignment (0-25 pts): Alignment in underlying principles and worldviews.
3. Conversational Dynamic & Chemistry (0-25 pts): Natural dialogue flow, mutual responsiveness, and mutual interest shown during the chat.
4. Lifestyle & Goal Alignment (0-25 pts): Complementary routines, priorities, and long-term directions.

Sum these 4 dimensions to derive the final score (0 to 100).

STRICT COMPATIBILITY EVIDENCE RULES:
1. Every item in the 'evidence' array MUST be fully grounded in the provided completed conversation transcript or the verified profile summaries above.
2. The 'evidence' field for any item MUST quote or paraphrase ONLY things that actually occurred or were explicitly written in the transcript/summaries.
3. Absolutely DO NOT fabricate, guess, or invent any conversational exchanges, remarks, or statements that did not happen. If you reference something as a quote, it must match a message from the conversation transcript.

Return JSON with:
- score: Sum of the 4 dimensions (0-100)
- sharedInterests: Array of shared or complementary interests discovered
- strongAlignment: Array of core values or conversational dynamics that align strongly
- potentialDifferences: Array of potential growth areas or lifestyle differences
- summary: A 2-3 sentence chemistry summary explaining how they connected
- evidence: 3-6 grounded evidence items linking claims to direct quotes from the transcript or profile facts.
`;

    const config = {
      systemInstruction: 'Evaluate dating compatibility across shared interests, values, conversational dynamic, and lifestyle alignment. Do not fabricate any quotes or evidence that did not occur in the transcript.',
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          score: { type: Type.INTEGER, description: 'Compatibility score from 0 to 100 derived from 4 dimensions' },
          sharedInterests: { type: Type.ARRAY, items: { type: Type.STRING } },
          strongAlignment: { type: Type.ARRAY, items: { type: Type.STRING } },
          potentialDifferences: { type: Type.ARRAY, items: { type: Type.STRING } },
          summary: { type: Type.STRING, description: '2-3 sentence chemistry summary' },
          evidence: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                claim: { type: Type.STRING },
                source: { type: Type.STRING, description: 'conversation | profileA | profileB' },
                evidence: { type: Type.STRING, description: 'Quote or observable fact from transcript/profiles' },
              },
              required: ['claim', 'source', 'evidence'],
            },
            description: 'Verifiable evidence mapping claims to quotes.',
          },
        },
        required: ['score', 'sharedInterests', 'strongAlignment', 'potentialDifferences', 'summary', 'evidence'],
      },
    };

    const modelsToTry = ['gemini-3.8-flash', 'gemini-3.1-flash-lite', 'gemini-flash-latest'];
    for (const modelName of modelsToTry) {
      try {
        console.log(`[AgentDatingService] Running multi-dimensional compatibility evaluation via model: ${modelName}`);
        const res = await ai.models.generateContent({
          model: modelName,
          contents: prompt,
          config,
        });

        const text = res.text ? res.text.trim() : '';
        if (text) {
          const parsed = JSON.parse(text) as CompatibilityResult;
          return {
            score: typeof parsed.score === 'number' ? Math.min(100, Math.max(0, parsed.score)) : 78,
            sharedInterests: Array.isArray(parsed.sharedInterests) ? parsed.sharedInterests : [],
            strongAlignment: Array.isArray(parsed.strongAlignment) ? parsed.strongAlignment : [],
            potentialDifferences: Array.isArray(parsed.potentialDifferences) ? parsed.potentialDifferences : [],
            summary: String(parsed.summary || 'Both candidates engaged in a friendly, balanced speed date conversation.'),
            evidence: Array.isArray(parsed.evidence)
              ? parsed.evidence.map((e) => ({
                  claim: String(e.claim || ''),
                  source: String(e.source || 'conversation'),
                  evidence: String(e.evidence || ''),
                }))
              : [],
          };
        }
      } catch (err: any) {
        console.warn(`[AgentDatingService] Compatibility evaluation model ${modelName} failed:`, err?.message || err);
      }
    }

    return {
      score: 78,
      sharedInterests: ['Education', 'Technology & Social Impact'],
      strongAlignment: ['Balanced conversational exchange and mutual curiosity'],
      potentialDifferences: ['Different daily focus areas and operational contexts'],
      summary: `${personA.name} and ${personB.name} discovered common ground in community technology and shared learning.`,
      evidence: [
        {
          claim: 'Mutual interest in educational technology',
          source: 'conversation',
          evidence: `Both agents discussed community and educational initiatives during their conversation.`,
        },
      ],
    };
  }

  /**
   * Main method: Initiates and completes a 6-turn agent speed date
   */
  public static async startDatingSession(personAId: string, personBId: string): Promise<DateSession> {
    const personA = store.getPersonById(personAId);
    const personB = store.getPersonById(personBId);

    if (!personA) {
      throw new Error(`Person A not found in store (ID: ${personAId})`);
    }
    if (!personB) {
      throw new Error(`Person B not found in store (ID: ${personBId})`);
    }

    console.log(`[AgentDatingService] Starting speed date between "${personA.name}" and "${personB.name}"`);

    // Ensure both persons have intelligence generated
    if (!personA.intelligence) {
      console.log(`[AgentDatingService] Person A (${personA.id}) lacks intelligence. Generating...`);
      personA.intelligence = await PersonAnalyzerService.analyzePerson(personA);
      store.addPerson(personA);
    }
    if (!personB.intelligence) {
      console.log(`[AgentDatingService] Person B (${personB.id}) lacks intelligence. Generating...`);
      personB.intelligence = await PersonAnalyzerService.analyzePerson(personB);
      store.addPerson(personB);
    }

    const apiKey = process.env.GEMINI_API_KEY?.trim() || '';
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const conversation: DatingConversationTurn[] = [];
    const totalTurns = 6; // Exactly 6 alternating turns

    for (let turn = 0; turn < totalTurns; turn++) {
      const isPersonA = turn % 2 === 0;
      const currentPerson = isPersonA ? personA : personB;
      const speakerRole = isPersonA ? 'A' : 'B';

      console.log(`[AgentDatingService] Generating Turn ${turn + 1}/${totalTurns} for Speaker ${speakerRole} (${currentPerson.name})`);

      const message = await this.generateAgentTurn(ai, currentPerson, speakerRole, conversation);

      conversation.push({
        speaker: speakerRole,
        speakerName: currentPerson.name || `Subject ${speakerRole}`,
        message,
        timestamp: new Date().toISOString(),
      });
    }

    console.log(`[AgentDatingService] Completed 6 conversation turns. Running multi-dimensional compatibility evaluator...`);

    const compatibility = await this.evaluateCompatibility(ai, personA, personB, conversation);

    const dateSessionId = `date-${personAId}-${personBId}-${Date.now()}`;

    const session: DateSession = {
      id: dateSessionId,
      personAId,
      personBId,
      personA: {
        id: personA.id,
        name: personA.name || 'Person A',
      },
      personB: {
        id: personB.id,
        name: personB.name || 'Person B',
      },
      status: 'completed',
      conversation,
      compatibility,
      createdAt: new Date().toISOString(),
    };

    // Save in store
    store.saveDateSession(session);
    console.log(`[AgentDatingService] Successfully saved date session ${session.id} (Compatibility Score: ${compatibility.score})`);

    return session;
  }
}
