// Cultural Memory, Myth Mutation, and De-mythologizer engine

import { PRNG } from '../math/prng';
import { CulturalMyth, Culture, HistoricalEvent } from '../../types/simulation';

export function createMythFromHistoricalEvent(
  event: HistoricalEvent,
  culture: Culture,
  currentYear: number,
  prng: PRNG,
  mythCounter: { current: number }
): { myth: CulturalMyth; mythEvent: HistoricalEvent } {
  mythCounter.current++;
  const mythId = `myth_${mythCounter.current.toString().padStart(3, '0')}`;

  const elapsed = currentYear - event.year;
  const distortion = Math.min(1.0, 0.2 + (elapsed / 800) * 0.8);

  let title = 'The Sacred Chronicle of the Ancients';
  let narrativeText = '';
  let trueHistoricalOrigin = event.description;
  let symbolicMeaning = 'Foundational creation taboo and moral guidance.';

  switch (event.category) {
    case 'CATASTROPHE':
    case 'DIVINE_INTERVENTION':
      title = prng.choice([
        'The Tale of the Falling Sky-Eye',
        'The Deluge of Seven Boiling Seas',
        'The Great Wrath of the Ashen Heavens',
        'The Day the Sun Grew Cold'
      ]);
      narrativeText = `Our elders teach that in the primordial dawn, the heavens opened their fiery eye and cast down a divine spear of obsidian upon the earth, turning day to midnight and oceans to mist. We perform annual torch dances to keep the sky asleep.`;
      symbolicMeaning = 'Fear of celestial omens and seasonal purification rites.';
      break;

    case 'EXTINCTION':
      title = prng.choice([
        'The Slumber of the Horned World-Eater',
        'The Ghost-Lords of the Deep Woods',
        'The Beast That Swallowed the Moon'
      ]);
      narrativeText = `Long before our ancestors built hearthfires, titanic shadow-beasts ruled the riverlands with teeth of iron. The gods sealed them beneath the stone strata where their petrified skeletons remain as omens.`;
      symbolicMeaning = 'Taboo against wandering alone into deep primeval forests.';
      break;

    case 'POLITY_COLLAPSE':
      title = prng.choice([
        'The Sunken Citadel of the First Magicians',
        'The Curse of the Golden Spire',
        'The Precursor Realm Beneath the Ash'
      ]);
      narrativeText = `Legends tell of an ancient race of giant sorcerers who built towers that touched the clouds. In their hubris, they defied the wind spirits, and their shining city was swallowed into the dust overnight.`;
      symbolicMeaning = 'Warning against excessive pride and unbridled excavation of ancient ruins.';
      break;

    case 'PLAGUE_OUTBREAK':
      title = prng.choice([
        'The Breath of the Crimson Ghost',
        'The Scourge of the Weeping Mist',
        'The Ordeal of the Blackened Tongues'
      ]);
      narrativeText = `When our ancestors broke the sacred covenant with the river spirits, an invisible cloud of red fire swept through the houses, taking three of every five souls. Only those who bathed in cedar-ash water survived.`;
      symbolicMeaning = 'Rigid ritual quarantine and herbal incense purification.';
      break;

    default:
      title = 'The Song of the First Wanderers';
      narrativeText = `In the ancient days, the Great Ancestor carried the first fire in an ivory bowl across the endless mountains, planting the roots of our clan by the holy spring.`;
      symbolicMeaning = 'Lineage legitimacy and ancestral veneration.';
  }

  const myth: CulturalMyth = {
    id: mythId,
    title,
    cultureId: culture.id,
    narrativeText,
    distortedEventId: event.id,
    trueHistoricalOrigin,
    distortionLevel: Math.round(distortion * 100) / 100,
    symbolicMeaning,
    associatedLocation: event.tileCoordinates ? { ...event.tileCoordinates, name: 'The Sacred Ground' } : undefined,
    creationYear: currentYear,
    causalNodeId: `cause_myth_${mythId}`
  };

  const mythEvent: HistoricalEvent = {
    id: `evt_myth_born_${mythId}`,
    year: currentYear,
    title: `Crystallization of Legend: ${title}`,
    description: `The ${culture.name} has codified the oral myth '${title}', preserving a distorted memory of the events of Year ${event.year} (${event.title}). Distortion Index: ${Math.round(distortion * 100)}%.`,
    category: 'MYTH_BORN',
    importance: 2,
    relatedEntityIds: [mythId, culture.id, event.id],
    causalNodeId: myth.causalNodeId
  };

  return { myth, mythEvent };
}
