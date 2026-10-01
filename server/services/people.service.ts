import { store, Person } from '../data/store';

export class PeopleService {
  static getPeople(): Person[] {
    return store.getAllPeople();
  }

  static getPersonById(id: string): Person | null {
    return store.getPersonById(id) || null;
  }

  static createPerson(data: Partial<Person>): Person {
    const newPerson: Person = {
      id: data.id || `person-${Date.now()}`,
      name: data.name,
      avatarUrl: data.avatarUrl,
      about: data.about,
      needs: data.needs || [],
      hobbies: data.hobbies || [],
      interests: data.interests || [],
      lifestyle: data.lifestyle || [],
      agent: data.agent,
      sourceLinks: data.sourceLinks || {},
      createdAt: new Date().toISOString(),
    };
    return store.addPerson(newPerson);
  }
}
