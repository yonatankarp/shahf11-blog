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
  { id: 'haya', label: 'חיה קרפ-צור', kind: 'person', aliases: ['אמא', 'שחף (חשבון הבלוג)'] },
  { id: 'chaim-tzur', label: 'חיים צור', kind: 'person', aliases: ['ח.', "ח'", 'בעלי', 'בן הזוג', 'אהובי', 'מר צימר', 'פולטי'] },
  { id: 'yonatan', label: 'יונתן קרפ', kind: 'person', aliases: ['יון', 'הגדול', 'בני הבכור', 'הבכור', 'החייל', 'הילד הראשון'] },
  { id: 'shahaf', label: 'שחף קרפ', kind: 'person', aliases: ['האמצעי', 'המתבגר', 'שמיל', 'דינו', 'הגור'] },
  { id: 'naama', label: 'נעמה צור', kind: 'person', aliases: ['הקטנה', 'נעמונת', 'בת הזקונים', 'הילדה', 'ילדתי'] },

  // --- חיה's parents & brothers (your grandparents & uncles) ---
  { id: 'ida', label: 'אידה זינגר', kind: 'person', aliases: ['אמא שלי', 'אימי', 'הטריפוליטאית', 'סבתא'] },
  { id: 'yitzhak', label: 'יצחק זינגר', kind: 'person', aliases: ['אבא שלי', 'אבי'] },
  { id: 'chaim-zinger', label: 'חיים זינגר', kind: 'person', aliases: ['אחי'] },
  { id: 'ronen', label: 'רונן זינגר', kind: 'person', aliases: ['אחי הקטן'] },
  { id: 'hadas', label: 'הדס זינגר', kind: 'person', aliases: ['אשת אחי', 'גיסתי'] },
  { id: 'einat', label: 'עינת זינגר', kind: 'person', aliases: ['אשת אחי', 'גיסתי'] },

  // --- חיים צור's side (your stepsisters, his grandmother) ---
  { id: 'shani', label: 'שני צור', kind: 'person', aliases: ['הבנות של חיים', 'הבנות שלו'] },
  { id: 'ofir', label: 'אופיר צור', kind: 'person', aliases: ['הבנות של חיים', 'הבנות שלו'] },
  { id: 'roza', label: 'סבתא רוזה', kind: 'person', aliases: ['רוזה'] },

  // --- Extended ---
  { id: 'reuven', label: 'ראובן קרפ', kind: 'person', aliases: ['אביו הביולוגי', 'אבא שלהם'] },
  { id: 'rachel', label: 'סבתא רחל', kind: 'person', aliases: ['רחל'] },
  { id: 'yuli', label: 'הדודה יולי', kind: 'person', aliases: ['יולי', 'דודתי'] },
  { id: 'idan', label: 'עידו זינגר', kind: 'person', aliases: ['בני הדודים'] },
  { id: 'zohar', label: 'זהר זינגר', kind: 'person', aliases: ['בני הדודים'] },
  { id: 'shira', label: 'שירה זינגר', kind: 'person', aliases: ['בני הדודים'] },
  { id: 'eden', label: 'עדן זינגר', kind: 'person', aliases: ['בני הדודים'] },
  { id: 'romi', label: 'רומן זינגר', kind: 'person', aliases: ['בני הדודים'] },

  // --- Topics ---
  // An editorial layer added after the fact (the source blog only ever used the single
  // category "כללי"). Aliases feed the tag-search filter, same as for people.
  { id: 'treatment', label: 'טיפולים ומחלה', kind: 'topic', aliases: ['כימותרפיה', 'ניתוח', 'אבחון', 'טיפולים', 'מחלה', 'הקרנות', 'סרטן'] },
  { id: 'body-image', label: 'גוף ותדמית', kind: 'topic', aliases: ['שיער', 'פאה', 'נשירת שיער', 'תדמית', 'גוף', 'מראה'] },
  { id: 'healthcare', label: 'מערכת הבריאות', kind: 'topic', aliases: ['רופאים', 'בית חולים', 'ביורוקרטיה', 'ניירת', 'קופת חולים', 'רופא'] },
  { id: 'emotion', label: 'רגש ונפש', kind: 'topic', aliases: ['פחד', 'תקווה', 'כעס', 'אמונה', 'נפש', 'רגשות', 'מחשבות'] },
  { id: 'family-life', label: 'משפחה ובית', kind: 'topic', aliases: ['משפחה', 'בית', 'ילדים', 'יומיום', 'שגרה'] },
  { id: 'food', label: 'אוכל ומטבח', kind: 'topic', aliases: ['אוכל', 'מתכונים', 'מטבח', 'בישול', 'מתכון'] },
  { id: 'travel', label: 'טיולים ומקומות', kind: 'topic', aliases: ['טיולים', 'פריז', 'אילת', 'נסיעות', 'חופשה', 'טיול'] },
  { id: 'culture', label: 'תרבות והמלצות', kind: 'topic', aliases: ['ספרים', 'סרטים', 'המלצות', 'תרבות', 'מוזיקה', 'ספר'] },
  { id: 'humor', label: 'הומור', kind: 'topic', aliases: ['הומור', 'סאטירה', 'צחוק', 'בדיחה'] },
  { id: 'photos', label: 'תמונות', kind: 'topic', aliases: ['תמונה', 'צילומים'] },
];
