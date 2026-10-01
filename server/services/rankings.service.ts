import { store, RankingEntry } from '../data/store';

export class RankingsService {
  static getRankings(): RankingEntry[] {
    return store.getRankings();
  }
}
