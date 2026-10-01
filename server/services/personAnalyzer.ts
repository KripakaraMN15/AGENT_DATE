import { GoogleGenAI, Type } from '@google/genai';
import { Person, PersonIntelligence } from '../data/store';

export class PersonAnalyzerService {
  /**
   * Generates grounded Person Intelligence from a normalized Person and raw source data
   */
  public static async analyzePerson(person: Person): Promise<PersonIntelligence> {
    const apiKey = process.env.GEMINI_API_KEY?.trim();

    if (!apiKey) {
      const errorMsg = 'GEMINI_API_KEY environment variable is not configured.';
      console.warn(`[PersonAnalyzer] WARNING: ${errorMsg}`);
      return {
        needs: [],
        hobbies: [],
        interests: [],
        values: [],
        lifestyle: [],
        personality: [],
        conversationTopics: [],
        datingPreferences: [],
        evidence: [],
        error: errorMsg,
      };
    }

    // Extract clean text-only representations of raw source items
    const rawLi = person.sourceData?.linkedin;
    const cleanLinkedIn = rawLi
      ? {
          about: rawLi.about || rawLi.summary || rawLi.overview,
          headline: rawLi.headline,
          experience: Array.isArray(rawLi.experience)
            ? rawLi.experience.slice(0, 8).map((e: any) => ({
                title: e.title || e.position,
                company: e.companyName || e.company,
                description: e.description,
              }))
            : undefined,
          skills: Array.isArray(rawLi.skills) ? rawLi.skills.slice(0, 15) : undefined,
        }
      : null;

    const rawIg = person.sourceData?.instagram;
    const postsList = Array.isArray(rawIg?.latestPosts) ? rawIg.latestPosts : Array.isArray(rawIg?.posts) ? rawIg.posts : [];
    const cleanInstagram = rawIg
      ? {
          username: rawIg.username,
          fullName: rawIg.fullName || rawIg.name,
          biography: rawIg.biography || rawIg.bio,
          businessCategoryName: rawIg.businessCategoryName,
          followersCount: rawIg.followersCount,
          topPostsCaptions: postsList
            .slice(0, 10)
            .map((p: any) => p.caption)
            .filter(Boolean),
        }
      : null;

    // Prepare text profile payload
    const profilePayload = {
      id: person.id,
      name: person.name,
      headline: person.headline,
      bio: person.bio || person.about,
      location: person.location,
      currentPosition: person.currentPosition,
      career: person.career || [],
      education: person.education || [],
      extractedInterests: person.interests || [],
      extractedLifestyle: person.lifestyle || [],
      linkedInText: cleanLinkedIn,
      instagramText: cleanInstagram,
    };

    const payloadStr = JSON.stringify(profilePayload, null, 2);

    // Server-side inspection logging
    console.log(`\n================ [PersonAnalyzer Inspection Debug Start] ================`);
    console.log(`Person ID: ${person.id}`);
    console.log(`Name: ${person.name || 'N/A'}`);
    console.log(`Headline: ${person.headline || 'N/A'}`);
    console.log(`Bio/About Present: ${Boolean(person.bio || person.about)} (Length: ${(person.bio || person.about || '').length} chars)`);
    console.log(`Career/Experience Entries: ${person.career?.length || 0}`);
    console.log(`Education Entries: ${person.education?.length || 0}`);
    console.log(`LinkedIn Raw Source Data Present: ${Boolean(person.sourceData?.linkedin)}`);
    console.log(`Instagram Raw Source Data Present: ${Boolean(person.sourceData?.instagram)}`);
    console.log(`Input JSON String Length: ${payloadStr.length} chars (Approx Tokens: ~${Math.round(payloadStr.length / 4)})`);
    console.log(`================ [PersonAnalyzer Inspection Debug End] ================\n`);

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const prompt = `You are a Person Intelligence Analyst. Analyze the public profile data (LinkedIn and Instagram) for "${person.name || 'Subject'}".

Goal:
Extract a strictly grounded, conservative Person Intelligence profile. Analyze professional history, company descriptions, summary text, education, and social media presence.

CONSERVATIVE GROUNDING RULES:
1. Three-Tier Category Distinction:
   - DIRECT FACT: Concrete verified claims from profile text (e.g., "Founder and CEO of Physics Wallah", "Attended Harvard Business School").
   - SUPPORTED INTERPRETATION: Logical synthesis derived directly from demonstrated activities (e.g., "Strong professional focus on accessible education and scalable digital learning").
   - UNSUPPORTED SPECULATION: Subjective guesses, relationship assumptions, or invented preferences (e.g., "Loves quiet evenings with family", "Enjoys fine dining").
   RULE: ONLY DIRECT FACTS and SUPPORTED INTERPRETATIONS may be returned. UNSUPPORTED SPECULATION is strictly forbidden.

2. Evidence-Backed Claims Only:
   Every single claim in interests, values, lifestyle, personality, and conversation topics MUST have a direct, corresponding entry in the "evidence" array. Each evidence item MUST state the source ("linkedin" or "instagram") and cite the exact quote, role title, or post text from the scraper data.

3. No Speculative Personality or Relational Inferences:
   - Do NOT infer relationship status, romantic expectations, or personal needs unless explicitly stated in the source text. Return empty arrays [] for "needs" and "datingPreferences".
   - Do NOT infer subjective personality labels such as "humble", "ambitious", "friendly", "introverted", "extroverted", "altruistic", or "charismatic" without explicit behavioral evidence. Use objective descriptions (e.g., "frequently advocates for educational accessibility").
   - Do NOT invent hobbies or personal experiences. If hobbies are not directly mentioned, return [].
   - Do NOT convert professional roles into unsupported personal claims.

4. Grounded Interests & Values:
   - Interests: Professional, technical, or personal focus areas explicitly stated or clearly demonstrated in career/content.
   - Values: Core principles explicitly stated or directly embodied in company missions and public statements.

5. Conversation Topics:
   Generate 3-5 grounded conversation topics based strictly on concrete achievements, career milestones, and public activities.

6. Empty Array Requirement:
   If a category lacks direct supporting evidence in the profile, return an empty array [] rather than guessing.

Profile Data to Analyze:
${payloadStr}
`;

    const config = {
      systemInstruction: 'Analyze profile data with conservative, evidence-based precision. Only include observable facts and grounded observations with explicit evidence items. Do NOT make subjective personality claims.',
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          needs: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: 'Personal or relational needs ONLY if explicitly stated in text. Return [] if none.',
          },
          hobbies: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: 'Explicit hobbies directly mentioned in profile text. Return [] if none.',
          },
          interests: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: 'Observable professional or personal interests derived from career, bio, and content.',
          },
          values: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: 'Core principles directly stated or embodied in company missions.',
          },
          lifestyle: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: 'Observable lifestyle facts supported by evidence. Avoid frequency claims like "frequent travel" unless explicitly supported.',
          },
          personality: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: 'Objective behavioral observations supported by facts (e.g. "focuses professionally on education technology"). Avoid subjective labels.',
          },
          conversationTopics: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: '3-5 grounded conversation topics based on concrete achievements and expertise.',
          },
          datingPreferences: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: 'Explicit relationship preferences ONLY if stated in text. Return [] if none.',
          },
          evidence: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                claim: { type: Type.STRING },
                source: { type: Type.STRING, description: 'linkedin or instagram' },
                evidence: { type: Type.STRING, description: 'Exact quote, job title, or observable fact' },
              },
              required: ['claim', 'source', 'evidence'],
            },
            description: 'Verifiable evidence items for every claim, specifying source and supporting quote or fact.',
          },
        },
        required: [
          'needs',
          'hobbies',
          'interests',
          'values',
          'lifestyle',
          'personality',
          'conversationTopics',
          'datingPreferences',
          'evidence',
        ],
      },
    };

    // Standard models per skill instructions
    const modelsToTry = ['gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-3.8-flash', 'gemini-3.1-flash-lite'];
    let lastError: any = null;

    for (const modelName of modelsToTry) {
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          console.log(`[PersonAnalyzer] Calling Gemini API (Model: ${modelName}, Attempt: ${attempt}/2) for person ID: ${person.id}`);
          const response = await ai.models.generateContent({
            model: modelName,
            contents: prompt,
            config,
          });

          const text = response.text ? response.text.trim() : '';
          if (!text) {
            throw new Error(`Empty response returned by model ${modelName}`);
          }

          console.log(`[PersonAnalyzer] Received valid response from ${modelName} (${text.length} chars)`);
          const parsed = JSON.parse(text) as PersonIntelligence;

          // Validate & ensure clean arrays
          const result: PersonIntelligence = {
            needs: Array.isArray(parsed.needs) ? parsed.needs : [],
            hobbies: Array.isArray(parsed.hobbies) ? parsed.hobbies : [],
            interests: Array.isArray(parsed.interests) ? parsed.interests : [],
            values: Array.isArray(parsed.values) ? parsed.values : [],
            lifestyle: Array.isArray(parsed.lifestyle) ? parsed.lifestyle : [],
            personality: Array.isArray(parsed.personality) ? parsed.personality : [],
            conversationTopics: Array.isArray(parsed.conversationTopics) ? parsed.conversationTopics : [],
            datingPreferences: Array.isArray(parsed.datingPreferences) ? parsed.datingPreferences : [],
            evidence: Array.isArray(parsed.evidence)
              ? parsed.evidence.map((item) => ({
                  claim: String(item.claim || ''),
                  source: String(item.source || 'linkedin'),
                  evidence: String(item.evidence || ''),
                }))
              : [],
            analyzedAt: new Date().toISOString(),
          };

          // Server Log actual Gemini JSON output for debugging
          console.log(`\n================ [Conservative Gemini Person Intelligence Output Debug] ================`);
          console.log(JSON.stringify(result, null, 2));
          console.log(`================ [Conservative Gemini Person Intelligence Output Debug End] ================\n`);

          return result;
        } catch (err: any) {
          lastError = err;
          console.warn(`[PersonAnalyzer] Model ${modelName} attempt ${attempt} failed: ${err?.message || err}`);
          await new Promise((resolve) => setTimeout(resolve, 1500));
        }
      }
    }

    console.error(`[PersonAnalyzer] All model attempts failed for person ID ${person.id}:`, lastError?.message || lastError);
    return {
      needs: [],
      hobbies: [],
      interests: [],
      values: [],
      lifestyle: [],
      personality: [],
      conversationTopics: [],
      datingPreferences: [],
      evidence: [],
      error: `LLM analysis failed: ${lastError?.message || 'High demand or rate limit'}`,
    };
  }
}
