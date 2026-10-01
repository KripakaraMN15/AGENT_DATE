import { ApifyClient } from 'apify-client';
import { PersonIntelligence } from '../data/store';

export interface NormalizedPerson {
  id: string;
  name: string;
  headline?: string;
  bio?: string;
  location?: string;
  currentPosition?: string;
  avatarUrl?: string;
  career?: Array<{
    title?: string;
    company?: string;
    duration?: string;
    description?: string;
    location?: string;
  }>;
  education?: Array<{
    school?: string;
    degree?: string;
    fieldOfStudy?: string;
    dates?: string;
  }>;
  interests?: string[];
  hobbies?: string[];
  lifestyle?: string[];
  linkedinUrl?: string;
  instagramUrl?: string;
  intelligence?: PersonIntelligence;
  sourceData: {
    linkedin?: any;
    instagram?: any;
    errors?: string[];
  };
}

export class ApifyService {
  /**
   * Safely convert any value (string, number, nested object) into a clean string or undefined
   */
  private static toString(val: any): string | undefined {
    if (val === null || val === undefined) return undefined;
    if (typeof val === 'string') {
      const trimmed = val.trim();
      return trimmed.length > 0 ? trimmed : undefined;
    }
    if (typeof val === 'number' || typeof val === 'boolean') {
      return String(val);
    }
    if (typeof val === 'object') {
      if (val.name) return this.toString(val.name);
      if (val.title) return this.toString(val.title);
      if (val.position) return this.toString(val.position);
      if (val.companyName) return this.toString(val.companyName);
      if (val.schoolName) return this.toString(val.schoolName);
      if (val.label) return this.toString(val.label);
      if (val.text) return this.toString(val.text);
      if (val.formatted) return this.toString(val.formatted);
      if (val.city || val.country) {
        return [val.city, val.state, val.country].filter(Boolean).map(v => this.toString(v)).filter(Boolean).join(', ');
      }
    }
    return undefined;
  }

  /**
   * Format start/end dates or duration into a string
   */
  private static formatDuration(dur: any, start: any, end: any): string | undefined {
    const dStr = this.toString(dur);
    if (dStr) return dStr;

    const parseDateObj = (d: any): string | undefined => {
      if (!d) return undefined;
      const s = this.toString(d);
      if (s) return s;
      if (typeof d === 'object') {
        const month = d.month || d.startMonth;
        const year = d.year || d.startYear;
        if (month && year) return `${month}/${year}`;
        if (year) return `${year}`;
      }
      return undefined;
    };

    const sStr = parseDateObj(start);
    const eStr = parseDateObj(end);

    if (sStr) {
      return `${sStr} - ${eStr || 'Present'}`;
    }
    return undefined;
  }

  /**
   * Helper to extract Instagram username from URL or raw string
   */
  private static extractInstagramUsername(urlOrUsername: string): string {
    if (!urlOrUsername) return '';
    const clean = urlOrUsername.trim().replace(/\/$/, '');
    if (clean.includes('instagram.com/')) {
      const parts = clean.split('instagram.com/')[1].split('/')[0].split('?')[0];
      return parts.replace('@', '');
    }
    return clean.replace('@', '');
  }

  /**
   * Helper to extract LinkedIn handle/slug from URL
   */
  private static extractLinkedInUsername(url: string): string {
    if (!url) return '';
    const clean = url.trim().replace(/\/$/, '');
    if (clean.includes('linkedin.com/in/')) {
      return clean.split('linkedin.com/in/')[1].split('/')[0].split('?')[0];
    }
    return clean;
  }

  /**
   * Scrape LinkedIn profile via Apify Actor: harvestapi/linkedin-profile-scraper
   */
  private static async scrapeLinkedIn(client: ApifyClient, linkedinUrl: string): Promise<any> {
    const actorId = 'harvestapi/linkedin-profile-scraper';
    console.log(`[Apify Service] Starting LinkedIn profile scraper (${actorId}) for URL: "${linkedinUrl}"`);

    const input = {
      urls: [linkedinUrl],
      queries: [linkedinUrl],
    };

    try {
      const run = await client.actor(actorId).call(input);
      console.log(`[Apify Service] HarvestAPI LinkedIn scraper run finished with status: ${run.status} (Dataset ID: ${run.defaultDatasetId})`);

      const { items } = await client.dataset(run.defaultDatasetId).listItems();
      console.log(`[Apify Service] HarvestAPI LinkedIn scraper retrieved ${items?.length || 0} items`);
      
      if (Array.isArray(items) && items.length > 0) {
        return items[0];
      }
      return { warning: 'HarvestAPI scraper completed but returned no items' };
    } catch (err: any) {
      console.error(`[Apify Service] HarvestAPI LinkedIn scraper failed for "${linkedinUrl}":`, err?.message || err);
      return { error: err?.message || 'LinkedIn scraping failed' };
    }
  }

  /**
   * Scrape Instagram profile via Apify Actor
   */
  private static async scrapeInstagram(client: ApifyClient, instagramUrl: string): Promise<any> {
    const actorId = 'apify/instagram-profile-scraper';
    const username = this.extractInstagramUsername(instagramUrl);
    console.log(`[Apify Service] Starting Instagram profile scraper (${actorId}) for handle: "${username}" (URL: "${instagramUrl}")`);

    const input = {
      usernames: [username],
      directUrls: [instagramUrl],
      resultsLimit: 1,
    };

    try {
      const run = await client.actor(actorId).call(input);
      console.log(`[Apify Service] Instagram scraper run finished with status: ${run.status} (Dataset ID: ${run.defaultDatasetId})`);

      const { items } = await client.dataset(run.defaultDatasetId).listItems();
      console.log(`[Apify Service] Instagram scraper retrieved ${items?.length || 0} items`);
      
      if (Array.isArray(items) && items.length > 0) {
        return items[0];
      }
      return { warning: 'Instagram scraper completed but returned no items' };
    } catch (err: any) {
      console.error(`[Apify Service] Instagram scraper failed for "${instagramUrl}":`, err?.message || err);
      return { error: err?.message || 'Instagram scraping failed' };
    }
  }

  /**
   * Main analyze function: calls both scrapers in parallel, retrieves items, and normalizes
   */
  public static async analyzeProfiles(linkedinUrl: string, instagramUrl: string): Promise<NormalizedPerson> {
    const token = process.env.APIFY_API_TOKEN?.trim();
    const errors: string[] = [];

    console.log(`[Apify Service] Initiating profile analysis for LinkedIn: "${linkedinUrl || 'N/A'}" | Instagram: "${instagramUrl || 'N/A'}"`);

    let rawLinkedinData: any = null;
    let rawInstagramData: any = null;

    if (!token) {
      const msg = 'APIFY_API_TOKEN is not configured in process.env. Set APIFY_API_TOKEN in Secrets or .env file.';
      console.warn(`[Apify Service] WARNING: ${msg}`);
      errors.push(msg);
      rawLinkedinData = { error: msg };
      rawInstagramData = { error: msg };
    } else {
      const client = new ApifyClient({ token });

      const promises: Promise<void>[] = [];

      if (linkedinUrl && linkedinUrl.trim()) {
        promises.push(
          this.scrapeLinkedIn(client, linkedinUrl)
            .then((res) => { rawLinkedinData = res; })
            .catch((err) => { rawLinkedinData = { error: err.message }; })
        );
      }

      if (instagramUrl && instagramUrl.trim()) {
        promises.push(
          this.scrapeInstagram(client, instagramUrl)
            .then((res) => { rawInstagramData = res; })
            .catch((err) => { rawInstagramData = { error: err.message }; })
        );
      }

      await Promise.all(promises);
    }

    return this.normalizeData(linkedinUrl, instagramUrl, rawLinkedinData, rawInstagramData, errors);
  }

  /**
   * Normalize raw scraper data handling HarvestAPI & Instagram schemas safely
   */
  private static normalizeData(
    linkedinUrl: string,
    instagramUrl: string,
    linkedinData: any,
    instagramData: any,
    errors: string[]
  ): NormalizedPerson {
    const idSlug = this.extractLinkedInUsername(linkedinUrl) || this.extractInstagramUsername(instagramUrl) || `subject-${Date.now()}`;
    const id = `person-${idSlug.replace(/[^a-zA-Z0-9_-]/g, '')}`;

    // Extract name
    let name = '';
    if (linkedinData && !linkedinData.error) {
      name = this.toString(linkedinData.name) ||
             this.toString(linkedinData.fullName) ||
             `${this.toString(linkedinData.firstName) || ''} ${this.toString(linkedinData.lastName) || ''}`.trim() ||
             this.toString(linkedinData.profileName) || '';
    }
    if (!name && instagramData && !instagramData.error) {
      name = this.toString(instagramData.fullName) ||
             this.toString(instagramData.name) ||
             this.toString(instagramData.username) || '';
    }
    if (!name) {
      name = idSlug ? idSlug.replace(/[-_]/g, ' ').toUpperCase() : 'Analyzed Profile';
    }

    // Extract headline
    const headline = this.toString(linkedinData?.headline) ||
                     this.toString(linkedinData?.subTitle) ||
                     this.toString(linkedinData?.occupation) ||
                     this.toString(linkedinData?.title);

    // Extract location
    const location = this.toString(linkedinData?.location) ||
                     this.toString(linkedinData?.locationName) ||
                     this.toString(linkedinData?.address) ||
                     this.toString(instagramData?.location);

    // Extract avatarUrl
    const avatarUrl = this.toString(linkedinData?.profilePicUrl) ||
                      this.toString(linkedinData?.displayPictureUrl) ||
                      this.toString(linkedinData?.pictureUrl) ||
                      this.toString(instagramData?.profilePicUrlHD) ||
                      this.toString(instagramData?.profilePicUrl);

    // Extract about / summary / bio
    const bio = this.toString(linkedinData?.about) ||
                this.toString(linkedinData?.summary) ||
                this.toString(linkedinData?.description) ||
                this.toString(linkedinData?.overview) ||
                this.toString(instagramData?.biography) ||
                this.toString(instagramData?.bio);

    // Extract Work Experience / Career
    const career: Array<{ title?: string; company?: string; duration?: string; description?: string; location?: string }> = [];
    const expList = linkedinData?.experience || linkedinData?.experiences || linkedinData?.positions || linkedinData?.history || [];
    
    if (Array.isArray(expList)) {
      expList.forEach((exp: any) => {
        if (exp && typeof exp === 'object') {
          const title = this.toString(exp.position) || this.toString(exp.title) || this.toString(exp.role);
          const company = this.toString(exp.companyName) || this.toString(exp.company) || this.toString(exp.organisation) || this.toString(exp.organizationName);
          const duration = this.formatDuration(exp.duration, exp.startDate, exp.endDate) || this.toString(exp.dateRange) || this.toString(exp.timePeriod);
          const description = this.toString(exp.description) || this.toString(exp.summary);
          const loc = this.toString(exp.location) || this.toString(exp.locationName);

          if (title || company || description) {
            career.push({
              title,
              company,
              duration,
              description,
              location: loc,
            });
          }
        }
      });
    }

    // Extract current position
    let currentPosition: string | undefined = this.toString(linkedinData?.currentPosition) || this.toString(linkedinData?.occupation);
    if (!currentPosition && career.length > 0) {
      const latest = career[0];
      if (latest.title && latest.company) {
        currentPosition = `${latest.title} at ${latest.company}`;
      } else if (latest.title) {
        currentPosition = latest.title;
      }
    }

    // Extract Education
    const education: Array<{ school?: string; degree?: string; fieldOfStudy?: string; dates?: string }> = [];
    const eduList = linkedinData?.education || linkedinData?.educations || linkedinData?.schools || [];
    
    if (Array.isArray(eduList)) {
      eduList.forEach((edu: any) => {
        if (edu && typeof edu === 'object') {
          const school = this.toString(edu.schoolName) || this.toString(edu.school) || this.toString(edu.institution) || this.toString(edu.title);
          const degree = this.toString(edu.degreeName) || this.toString(edu.degree);
          const fieldOfStudy = this.toString(edu.fieldOfStudy) || this.toString(edu.field);
          const dates = this.formatDuration(edu.dates, edu.startDate, edu.endDate) || this.toString(edu.dateRange) || this.toString(edu.timePeriod);

          if (school || degree || fieldOfStudy) {
            education.push({
              school,
              degree,
              fieldOfStudy,
              dates,
            });
          }
        }
      });
    }

    // Extract Skills / Interests
    const interestsSet = new Set<string>();
    const skillsList = linkedinData?.skills || linkedinData?.skillsList || linkedinData?.interests || [];
    
    if (Array.isArray(skillsList)) {
      skillsList.forEach((s: any) => {
        const sStr = this.toString(s);
        if (sStr) interestsSet.add(sStr);
      });
    }

    // Extract Profile URL
    const finalLinkedinUrl = this.toString(linkedinData?.profileUrl) ||
                             this.toString(linkedinData?.url) ||
                             this.toString(linkedinData?.linkedinUrl) ||
                             linkedinUrl || undefined;

    // Extract Instagram lifestyle pointers
    const lifestyleSet = new Set<string>();
    if (instagramData?.businessCategoryName) {
      const cat = this.toString(instagramData.businessCategoryName);
      if (cat) lifestyleSet.add(`Category: ${cat}`);
    }
    if (instagramData?.externalUrl) {
      const link = this.toString(instagramData.externalUrl);
      if (link) lifestyleSet.add(`Link: ${link}`);
    }
    if (instagramData?.followersCount !== undefined) {
      lifestyleSet.add(`Instagram Reach: ${instagramData.followersCount} followers`);
    }

    const result: NormalizedPerson = {
      id,
      name,
      headline,
      bio,
      location,
      currentPosition,
      avatarUrl,
      career: career.length > 0 ? career : undefined,
      education: education.length > 0 ? education : undefined,
      interests: interestsSet.size > 0 ? Array.from(interestsSet) : undefined,
      hobbies: undefined, // Not fabricated
      lifestyle: lifestyleSet.size > 0 ? Array.from(lifestyleSet) : undefined,
      linkedinUrl: finalLinkedinUrl,
      instagramUrl: instagramUrl || undefined,
      sourceData: {
        linkedin: linkedinData || undefined,
        instagram: instagramData || undefined,
        errors: errors.length > 0 ? errors : undefined,
      },
    };

    console.log(`[Apify Service] Successfully normalized person "${result.name}" (ID: ${result.id})`);
    return result;
  }
}
