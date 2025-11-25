// Document Classification Service

export class ClassificationService {
  constructor() {
    // Keywords and patterns for each document type
    this.patterns = {
      invoice: [
        /invoice/i,
        /bill\s+to/i,
        /invoice\s+number/i,
        /invoice\s+date/i,
        /amount\s+due/i,
        /subtotal/i,
        /tax\s+amount/i,
        /total\s+amount/i,
      ],
      receipt: [
        /receipt/i,
        /thank\s+you/i,
        /purchased/i,
        /cashier/i,
        /transaction/i,
        /payment\s+method/i,
        /card\s+number/i,
      ],
      cv: [
        /curriculum\s+vitae/i,
        /resume/i,
        /education/i,
        /experience/i,
        /skills/i,
        /references/i,
        /objective/i,
        /professional\s+summary/i,
      ],
      id_card: [
        /identity\s+card/i,
        /id\s+card/i,
        /driver['']s?\s+license/i,
        /passport/i,
        /date\s+of\s+birth/i,
        /nationality/i,
        /card\s+number/i,
      ],
    };
  }

  classify(text) {
    const scores = {
      invoice: 0,
      receipt: 0,
      cv: 0,
      id_card: 0,
      other: 0,
    };

    // Count pattern matches for each type
    for (const [type, patterns] of Object.entries(this.patterns)) {
      for (const pattern of patterns) {
        if (pattern.test(text)) {
          scores[type] += 1;
        }
      }
    }

    // Find highest score
    let maxScore = 0;
    let detectedType = 'other';

    for (const [type, score] of Object.entries(scores)) {
      if (score > maxScore) {
        maxScore = score;
        detectedType = type;
      }
    }

    // Calculate confidence
    const totalMatches = Object.values(scores).reduce((a, b) => a + b, 0);
    const confidence = totalMatches > 0 ? (maxScore / totalMatches) * 100 : 0;

    return {
      type: detectedType,
      confidence: Math.min(confidence, 100),
      model: 'pattern_matching_v1',
    };
  }
}

export const classificationService = new ClassificationService();
