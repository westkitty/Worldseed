// Procedural Language Evolution, Syllabic Phonology, Sound Shifts, and Place-Name Archaeology

import { PRNG } from '../math/prng';
import { Language } from '../../types/simulation';

const CONSONANT_INVENTORIES = [
  ['k', 't', 'p', 'm', 'n', 's', 'l', 'r', 'w', 'j'], // Minimalist Polynesian-style
  ['k', 'g', 't', 'd', 'p', 'b', 's', 'z', 'm', 'n', 'r', 'l', 'th', 'kh'], // Proto-Indo-European style
  ['q', 'k', 't', 'p', 'ts', 'ch', 's', 'sh', 'x', 'm', 'n', 'l', 'tl'], // Mesoamerican / Nahuatl style
  ['k', 't', 'p', 'b', 'd', 'g', 'f', 'v', 's', 'z', 'm', 'n', 'ny', 'ng', 'r', 'w'] // Bantu-style
];

const VOWEL_INVENTORIES = [
  ['a', 'i', 'u'], // 3-vowel system
  ['a', 'e', 'i', 'o', 'u'], // 5-vowel system
  ['a', 'e', 'i', 'o', 'u', 'y', 'ae', 'oe'] // Germanic / complex
];

const BASE_ROOT_CONCEPTS = [
  'water', 'river', 'mountain', 'stone', 'sun', 'star', 'fire', 'forest', 'tree',
  'beast', 'clan', 'mother', 'father', 'blood', 'earth', 'wind', 'city', 'path',
  'great', 'deep', 'high', 'ancient', 'sacred', 'iron', 'gold', 'bone', 'life'
];

export function generateLanguage(
  id: string,
  familyId: string,
  parentLang: Language | null,
  year: number,
  prng: PRNG
): Language {
  let consonants = prng.choice(CONSONANT_INVENTORIES);
  let vowels = prng.choice(VOWEL_INVENTORIES);
  const syllablePatterns = ['CV', 'CVC', 'V', 'VC'];

  const vocabulary: Record<string, string> = {};

  if (!parentLang) {
    // Generate proto-language vocabulary from scratch
    for (const concept of BASE_ROOT_CONCEPTS) {
      const sylCount = prng.int(1, 2);
      let word = '';
      for (let s = 0; s < sylCount; s++) {
        const c = prng.choice(consonants);
        const v = prng.choice(vowels);
        const hasCoda = prng.next() < 0.4;
        word += hasCoda ? `${c}${v}${prng.choice(consonants)}` : `${c}${v}`;
      }
      vocabulary[concept] = word;
    }
  } else {
    // Daughter language inherits parent language with systematic Sound Shifts!
    consonants = [...parentLang.phonemes.consonants];
    vowels = [...parentLang.phonemes.vowels];

    // Sound shift rules (e.g. k -> ch, p -> f, t -> th, a -> e)
    const shiftC1 = prng.choice(consonants);
    const shiftC2 = prng.choice(['kh', 'sh', 'v', 'z', 'h', 'r']);

    for (const concept of BASE_ROOT_CONCEPTS) {
      let word = parentLang.vocabulary[concept] || 'or';
      // Apply consonant mutation
      if (prng.next() < 0.6) {
        word = word.replace(new RegExp(shiftC1, 'g'), shiftC2);
      }
      // Vowel mutation / elision
      if (prng.next() < 0.3 && word.length > 3) {
        word = word.slice(0, -1) + prng.choice(vowels);
      }
      vocabulary[concept] = word;
    }
  }

  // Generate language name
  const nameRoot = vocabulary['clan'] || vocabulary['great'] || 'Var';
  const nameSuffix = vocabulary['path'] || vocabulary['earth'] || 'on';
  const langName = (nameRoot + nameSuffix).charAt(0).toUpperCase() + (nameRoot + nameSuffix).slice(1) + 'ic';

  return {
    id,
    name: langName,
    familyId,
    parentLanguageId: parentLang ? parentLang.id : null,
    originYear: year,
    phonemes: { consonants, vowels, syllablePatterns },
    vocabulary,
    grammarType: prng.choice(['SOV', 'SVO', 'VSO']),
    causalNodeId: `cause_lang_${id}`
  };
}

export function generateToponym(
  feature: 'RIVER' | 'MOUNTAIN' | 'SETTLEMENT' | 'REGION',
  language: Language,
  prng: PRNG
): string {
  const v = language.vocabulary;
  let root1 = '';
  let root2 = '';

  switch (feature) {
    case 'RIVER':
      root1 = prng.choice([v['water'], v['deep'], v['great'], v['life']]);
      root2 = prng.choice([v['river'], v['path'], 'on', 'ar']);
      break;
    case 'MOUNTAIN':
      root1 = prng.choice([v['high'], v['stone'], v['ancient'], v['iron']]);
      root2 = prng.choice([v['mountain'], v['bone'], 'tor', 'peak']);
      break;
    case 'SETTLEMENT':
      root1 = prng.choice([v['clan'], v['sun'], v['great'], v['stone'], v['earth']]);
      root2 = prng.choice([v['city'], v['path'], v['mother'], 'ur', 'bal', 'grad']);
      break;
    case 'REGION':
      root1 = prng.choice([v['sacred'], v['forest'], v['star'], v['gold']]);
      root2 = prng.choice([v['earth'], v['wind'], 'ia', 'dor']);
      break;
  }

  const raw = `${root1 || 'Khor'}${root2 || 'on'}`;
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}
