import { Router, Request, Response } from 'express';
import { PeopleService } from '../services/people.service';
import { ApifyService } from '../services/apify';
import { PersonAnalyzerService } from '../services/personAnalyzer';
import { MatchingService } from '../services/matching.service';
import { store, Person } from '../data/store';
import { SEED_PEOPLE, SeedPerson } from '../data/peopleSeed';

const router = Router();

/**
 * GET /api/people
 * Returns list of people
 */
router.get('/', (_req: Request, res: Response) => {
  const people = PeopleService.getPeople();
  res.json({
    data: people,
    count: people.length,
  });
});

/**
 * GET /api/people/seed-list
 * Returns the verified 25-person challenge seed dataset definitions
 */
router.get('/seed-list', (_req: Request, res: Response) => {
  res.json({
    data: SEED_PEOPLE,
    count: SEED_PEOPLE.length,
  });
});

/**
 * GET /api/people/candidates
 * Returns all generated candidate matches
 */
router.get('/candidates/all', (_req: Request, res: Response) => {
  const allCandidates = store.getAllCandidates();
  res.json({
    data: allCandidates,
    count: allCandidates.length,
  });
});

// Mutex lock to prevent duplicate simultaneous batch executions
let isBatchAnalyzing = false;

/**
 * POST /api/people/analyze-batch
 * Analyzes intelligence for people in controlled concurrency of 3-4 requests.
 * Preserves existing valid intelligence unless forceReanalyze is requested.
 * Immediately persists each successful result.
 */
router.post('/analyze-batch', async (req: Request, res: Response) => {
  if (isBatchAnalyzing) {
    return res.status(409).json({
      error: 'A batch intelligence analysis is currently in progress. Please wait for it to finish.',
    });
  }

  isBatchAnalyzing = true;

  try {
    const forceReanalyze = Boolean(req.body?.forceReanalyze);
    const allPeople = store.getAllPeople();
    console.log(`[POST /api/people/analyze-batch] Starting batch for ${allPeople.length} people (forceReanalyze: ${forceReanalyze})...`);

    const results: Array<{
      personId: string;
      name: string;
      status: 'already_analyzed' | 'analyzed' | 'failed';
      error?: string;
    }> = [];

    const hasValidIntel = (person: Person): boolean => {
      if (!person.intelligence || person.intelligence.error) return false;
      const intel = person.intelligence;
      return (
        (Array.isArray(intel.interests) && intel.interests.length > 0) ||
        (Array.isArray(intel.values) && intel.values.length > 0) ||
        (Array.isArray(intel.evidence) && intel.evidence.length > 0)
      );
    };

    const toProcess: Person[] = [];

    for (const person of allPeople) {
      if (!forceReanalyze && hasValidIntel(person)) {
        results.push({
          personId: person.id,
          name: person.name || person.id,
          status: 'already_analyzed',
        });
      } else {
        toProcess.push(person);
      }
    }

    const alreadyAnalyzedCount = results.length;
    let successfulCount = 0;
    let failedCount = 0;

    console.log(`[POST /api/people/analyze-batch] Already analyzed: ${alreadyAnalyzedCount}. Need analysis: ${toProcess.length}.`);

    // Helper to process an individual profile
    const analyzeIndividual = async (person: Person) => {
      try {
        console.log(`[POST /api/people/analyze-batch] Analyzing "${person.name || person.id}"...`);
        const intelligence = await PersonAnalyzerService.analyzePerson(person);

        if (intelligence.error) {
          failedCount++;
          results.push({
            personId: person.id,
            name: person.name || person.id,
            status: 'failed',
            error: intelligence.error,
          });
          return;
        }

        // Assign and persist immediately
        person.intelligence = intelligence;
        store.addPerson(person); // invokes store.saveSnapshot()
        successfulCount++;

        results.push({
          personId: person.id,
          name: person.name || person.id,
          status: 'analyzed',
        });
      } catch (err: any) {
        failedCount++;
        const errMsg = err?.message || String(err);
        console.error(`[POST /api/people/analyze-batch] Error analyzing "${person.name}":`, errMsg);
        results.push({
          personId: person.id,
          name: person.name || person.id,
          status: 'failed',
          error: errMsg,
        });
      }
    };

    // Concurrency controlled at 3-4 simultaneous requests
    const CONCURRENCY = 3;
    for (let i = 0; i < toProcess.length; i += CONCURRENCY) {
      const chunk = toProcess.slice(i, i + CONCURRENCY);
      await Promise.all(chunk.map((person) => analyzeIndividual(person)));
    }

    // Automatically regenerate/update candidate matches across all valid profiles
    try {
      MatchingService.generateAllCandidateMatches();
    } catch (matchErr) {
      console.error('[POST /api/people/analyze-batch] Error regenerating candidate matches:', matchErr);
    }

    res.json({
      total: allPeople.length,
      alreadyAnalyzed: alreadyAnalyzedCount,
      processed: toProcess.length,
      successful: successfulCount,
      failed: failedCount,
      results,
    });
  } catch (error: any) {
    console.error('[POST /api/people/analyze-batch] Unexpected fatal error:', error);
    res.status(500).json({
      error: 'Failed to complete batch intelligence analysis.',
      details: error?.message || String(error),
    });
  } finally {
    isBatchAnalyzing = false;
  }
});

/**
 * GET /api/people/:id/candidates
 * Returns candidate matches for a person
 */
router.get('/:id/candidates', (req: Request, res: Response) => {
  const { id } = req.params;
  const candidates = MatchingService.getCandidatesForPerson(id);
  res.json({
    personId: id,
    candidates,
    count: candidates.length,
  });
});

/**
 * GET /api/people/:id
 * Returns a single person or 404
 */
router.get('/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const person = PeopleService.getPersonById(id);
  if (!person) {
    res.status(404).json({ error: 'Person not found', id });
    return;
  }
  res.json({ data: person });
});

/**
 * POST /api/people/seed
 * Ingests the 25-person challenge seed dataset with controlled concurrency (2 at a time)
 */
router.post('/seed', async (_req: Request, res: Response) => {
  try {
    const seedList: SeedPerson[] = SEED_PEOPLE;
    const existingPeople = store.getAllPeople();

    console.log(`[POST /api/people/seed] Ingesting challenge dataset of ${seedList.length} people...`);

    const results: Array<{
      name: string;
      personId?: string;
      success: boolean;
      error?: string;
      skipped?: boolean;
    }> = [];

    // Helper function to process a single seed person
    const processPerson = async (seed: SeedPerson) => {
      // Check for duplicate in store
      const alreadyExists = existingPeople.find((p) => {
        const nameMatch = p.name?.toLowerCase().trim() === seed.name.toLowerCase().trim();
        const linkedinMatch = seed.linkedinUrl && p.linkedinUrl?.toLowerCase().includes(seed.linkedinUrl.toLowerCase().replace('https://www.linkedin.com/in/', ''));
        const instagramMatch = seed.instagramUrl && p.instagramUrl?.toLowerCase().includes(seed.instagramUrl.toLowerCase().replace('https://www.instagram.com/', ''));
        return nameMatch || linkedinMatch || instagramMatch;
      });

      if (alreadyExists) {
        console.log(`[POST /api/people/seed] Skipping duplicate for "${seed.name}" (ID: ${alreadyExists.id})`);
        return {
          name: seed.name,
          personId: alreadyExists.id,
          success: true,
          skipped: true,
        };
      }

      try {
        console.log(`[POST /api/people/seed] Ingesting "${seed.name}" via Apify...`);
        const normalizedPerson = await ApifyService.analyzeProfiles(seed.linkedinUrl, seed.instagramUrl);
        
        // Ensure name is properly populated
        if (!normalizedPerson.name || normalizedPerson.name === 'Unknown Person') {
          normalizedPerson.name = seed.name;
        }

        // Save normalized person into in-memory store (Without auto-running Gemini intelligence for speed batch)
        store.addPerson(normalizedPerson);

        return {
          name: seed.name,
          personId: normalizedPerson.id,
          success: true,
        };
      } catch (err: any) {
        console.error(`[POST /api/people/seed] Failed to ingest "${seed.name}":`, err?.message || err);
        return {
          name: seed.name,
          success: false,
          error: err?.message || String(err),
        };
      }
    };

    // Process with controlled concurrency = 2
    const concurrencyLimit = 2;
    for (let i = 0; i < seedList.length; i += concurrencyLimit) {
      const chunk = seedList.slice(i, i + concurrencyLimit);
      console.log(`[POST /api/people/seed] Processing chunk ${i / concurrencyLimit + 1}/${Math.ceil(seedList.length / concurrencyLimit)}...`);
      const chunkResults = await Promise.all(chunk.map((seed) => processPerson(seed)));
      results.push(...chunkResults);
    }

    const successfulCount = results.filter((r) => r.success).length;
    const failedCount = results.filter((r) => !r.success).length;

    console.log(`[POST /api/people/seed] Seeding complete! Total: ${seedList.length}, Successful: ${successfulCount}, Failed: ${failedCount}`);

    res.json({
      total: seedList.length,
      processed: results.length,
      successful: successfulCount,
      failed: failedCount,
      results,
    });
  } catch (error: any) {
    console.error(`[POST /api/people/seed] Error executing seed batch:`, error);
    res.status(500).json({
      error: 'Failed to process seed dataset.',
      details: error?.message || String(error),
    });
  }
});

/**
 * POST /api/people/:id/analyze
 * Generates LLM intelligence for an existing person using PersonAnalyzerService
 */
router.post('/:id/analyze', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const person = store.getPersonById(id);

    if (!person) {
      res.status(404).json({ error: 'Person not found', id });
      return;
    }

    console.log(`[POST /api/people/${id}/analyze] Triggering LLM Person Intelligence analysis...`);

    // Run Person Intelligence analysis
    const intelligence = await PersonAnalyzerService.analyzePerson(person);

    // Save intelligence onto the person object
    person.intelligence = intelligence;
    store.addPerson(person);

    res.json({
      message: 'Person intelligence analysis completed',
      data: person,
    });
  } catch (error: any) {
    console.error(`[POST /api/people/:id/analyze] Error analyzing person intelligence:`, error);
    res.status(500).json({
      error: 'An unexpected error occurred during person intelligence analysis.',
      details: error?.message || String(error),
    });
  }
});

/**
 * POST /api/people/analyze
 * Ingests LinkedIn and/or Instagram profiles using Apify scrapers
 * Request body: { linkedinUrl: string, instagramUrl: string }
 */
router.post('/analyze', async (req: Request, res: Response) => {
  try {
    const { linkedinUrl = '', instagramUrl = '' } = req.body || {};

    const cleanLinkedin = typeof linkedinUrl === 'string' ? linkedinUrl.trim() : '';
    const cleanInstagram = typeof instagramUrl === 'string' ? instagramUrl.trim() : '';

    if (!cleanLinkedin && !cleanInstagram) {
      res.status(400).json({
        error: 'Validation failed: Please provide at least one valid profile URL (LinkedIn or Instagram).',
      });
      return;
    }

    const validateUrl = (urlStr: string, domain: string) => {
      if (!urlStr) return true;
      try {
        const parsed = new URL(urlStr.startsWith('http') ? urlStr : `https://${urlStr}`);
        return parsed.hostname.includes(domain);
      } catch {
        return false;
      }
    };

    if (cleanLinkedin && !validateUrl(cleanLinkedin, 'linkedin.com')) {
      res.status(400).json({
        error: 'Validation failed: Invalid LinkedIn URL format. Expected a valid linkedin.com URL.',
      });
      return;
    }

    if (cleanInstagram && !validateUrl(cleanInstagram, 'instagram.com')) {
      res.status(400).json({
        error: 'Validation failed: Invalid Instagram URL format. Expected a valid instagram.com URL.',
      });
      return;
    }

    console.log(`[POST /api/people/analyze] Received request for LinkedIn: "${cleanLinkedin}" | Instagram: "${cleanInstagram}"`);

    // 1. Analyze profiles via Apify
    const normalizedPerson = await ApifyService.analyzeProfiles(cleanLinkedin, cleanInstagram);

    // 2. Automatically generate Person Intelligence via Gemini if GEMINI_API_KEY is configured
    if (process.env.GEMINI_API_KEY?.trim()) {
      try {
        console.log(`[POST /api/people/analyze] Running automatic Person Intelligence analysis...`);
        const intelligence = await PersonAnalyzerService.analyzePerson(normalizedPerson);
        normalizedPerson.intelligence = intelligence;
      } catch (llmErr) {
        console.error(`[POST /api/people/analyze] Automatic LLM intelligence step failed (non-fatal):`, llmErr);
      }
    }

    // 3. Save normalized person into in-memory store
    store.addPerson(normalizedPerson);

    res.json({
      message: 'Profile analysis completed',
      data: normalizedPerson,
    });
  } catch (error: any) {
    console.error('[POST /api/people/analyze] Error during profile analysis:', error);
    res.status(500).json({
      error: 'An unexpected error occurred during profile analysis.',
      details: error?.message || String(error),
    });
  }
});

export default router;
