export type TagKind = 'person' | 'topic';

export interface TagDef {
  id: string;        // stable ASCII slug — used in post frontmatter `tags:` and in /tags/<id> URLs
  label: string;     // Hebrew display name
  kind: TagKind;     // 'person' = a family member, 'topic' = a subject
  aliases?: string[]; // Hebrew alternate terms (nicknames / roles / blog-names) the search filter also matches
}

// Single source of truth for the tag vocabulary. People are one canonical tag each; the ways a post
// referred to them (role word, nickname, blog-name) live in `aliases` so searching any of them
// resolves to the same person. Names confirmed with the family; see tags-draft.md for provenance.
export const TAGS: TagDef[] = [
  // --- Immediate family ---
  { id: 'haya', label: 'חיה', kind: 'person', aliases: ['אמא', 'שחף (חשבון הבלוג)'] },
  { id: 'chaim-tzur', label: 'חיים צור', kind: 'person', aliases: ['ח.', "ח'", 'בעלי', 'בן הזוג', 'אהובי', 'מר צימר', 'פולטי'] },
  { id: 'yonatan', label: 'יונתן', kind: 'person', aliases: ['יון', 'הגדול', 'בני הבכור', 'הבכור', 'החייל', 'הילד הראשון'] },
  { id: 'shahaf', label: 'שחף', kind: 'person', aliases: ['האמצעי', 'המתבגר', 'שמיל', 'דינו', 'הגור'] },
  { id: 'naama', label: 'נעמה', kind: 'person', aliases: ['הקטנה', 'נעמונת', 'בת הזקונים', 'הילדה', 'ילדתי'] },

  // --- חיה's parents & brothers (your grandparents & uncles) ---
  { id: 'ida', label: 'אידה', kind: 'person', aliases: ['אמא שלי', 'אימי', 'הטריפוליטאית', 'סבתא'] },
  { id: 'yitzhak', label: 'יצחק', kind: 'person', aliases: ['אבא שלי', 'אבי'] },
  { id: 'chaim-zinger', label: 'חיים זינגר', kind: 'person', aliases: ['אחי'] },
  { id: 'ronen', label: 'רונן', kind: 'person', aliases: ['אחי הקטן'] },
  { id: 'hadas', label: 'הדס', kind: 'person', aliases: ['אשת אחי', 'גיסתי'] },
  { id: 'einat', label: 'עינת', kind: 'person', aliases: ['אשת אחי', 'גיסתי'] },

  // --- חיים צור's side (your stepsisters, his grandmother) ---
  { id: 'shani', label: 'שני', kind: 'person', aliases: ['הבנות של חיים', 'הבנות שלו'] },
  { id: 'ofir', label: 'אופיר', kind: 'person', aliases: ['הבנות של חיים', 'הבנות שלו'] },
  { id: 'roza', label: 'סבתא רוזה', kind: 'person', aliases: ['רוזה'] },

  // --- Extended ---
  { id: 'reuven', label: 'ראובן', kind: 'person', aliases: ['אביו הביולוגי', 'אבא שלהם'] },
  { id: 'rachel', label: 'סבתא רחל', kind: 'person', aliases: ['רחל'] },
  { id: 'yuli', label: 'הדודה יולי', kind: 'person', aliases: ['יולי', 'דודתי'] },
  { id: 'idan', label: 'עידן', kind: 'person', aliases: ['בני הדודים'] },
  { id: 'zohar', label: 'זהר', kind: 'person', aliases: ['בני הדודים'] },
  { id: 'shira', label: 'שירה', kind: 'person', aliases: ['בני הדודים'] },
  { id: 'eden', label: 'עדן', kind: 'person', aliases: ['בני הדודים'] },
  { id: 'romi', label: 'רומי', kind: 'person', aliases: ['בני הדודים'] },

  // --- Topics ---
  // (topic vocabulary pending your approval — see chat; will be inserted here)
  { id: 'photos', label: 'תמונות', kind: 'topic' },
];
