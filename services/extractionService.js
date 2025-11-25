// Field Extraction Service

export class ExtractionService {
  extractFields(text, documentType) {
    switch (documentType) {
      case 'invoice':
        return this.extractInvoiceFields(text);
      case 'receipt':
        return this.extractReceiptFields(text);
      case 'cv':
        return this.extractCVFields(text);
      case 'id_card':
        return this.extractIDFields(text);
      default:
        return [];
    }
  }

  extractInvoiceFields(text) {
    const fields = [];

    // Invoice number
    const invoiceNumberMatch = text.match(/invoice\s+(?:number|#|no\.?)[\s:]*([A-Z0-9-]+)/i);
    if (invoiceNumberMatch) {
      fields.push({
        name: 'invoice_number',
        value: invoiceNumberMatch[1],
        confidence: 85,
      });
    }

    // Date
    const dateMatch = text.match(/(?:invoice\s+)?date[\s:]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i);
    if (dateMatch) {
      fields.push({
        name: 'date',
        value: dateMatch[1],
        confidence: 80,
      });
    }

    // Company name
    const companyMatch = text.match(/^([A-Z][A-Za-z\s&,.']+?)(?:\n|invoice)/im);
    if (companyMatch) {
      fields.push({
        name: 'company',
        value: companyMatch[1].trim(),
        confidence: 70,
      });
    }

    // Total amount
    const totalMatch = text.match(/(?:total|amount\s+due|grand\s+total)[\s:]*\$?\s*([\d,]+\.?\d{0,2})/i);
    if (totalMatch) {
      const amount = parseFloat(totalMatch[1].replace(/,/g, ''));
      fields.push({
        name: 'invoice_total',
        value: totalMatch[1],
        confidence: 90,
        normalized: { type: 'money', value: amount, currency: 'USD' },
      });
    }

    // Tax
    const taxMatch = text.match(/(?:tax|vat)[\s:]*\$?\s*([\d,]+\.?\d{0,2})/i);
    if (taxMatch) {
      const amount = parseFloat(taxMatch[1].replace(/,/g, ''));
      fields.push({
        name: 'tax',
        value: taxMatch[1],
        confidence: 85,
        normalized: { type: 'money', value: amount, currency: 'USD' },
      });
    }

    return fields;
  }

  extractReceiptFields(text) {
    const fields = [];

    // Store name
    const storeMatch = text.match(/^([A-Z][A-Za-z\s&,.']+?)(?:\n|receipt)/im);
    if (storeMatch) {
      fields.push({
        name: 'store',
        value: storeMatch[1].trim(),
        confidence: 75,
      });
    }

    // Date
    const dateMatch = text.match(/(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/);
    if (dateMatch) {
      fields.push({
        name: 'date',
        value: dateMatch[1],
        confidence: 80,
      });
    }

    // Total
    const totalMatch = text.match(/(?:total|amount)[\s:]*\$?\s*([\d,]+\.?\d{0,2})/i);
    if (totalMatch) {
      fields.push({
        name: 'total',
        value: totalMatch[1],
        confidence: 90,
      });
    }

    // Payment method
    const paymentMatch = text.match(/(?:card|visa|mastercard|amex|cash)/i);
    if (paymentMatch) {
      fields.push({
        name: 'payment_method',
        value: paymentMatch[0],
        confidence: 70,
      });
    }

    return fields;
  }

  extractCVFields(text) {
    const fields = [];

    // Name - Try multiple patterns
    let nameMatch = text.match(/^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/m);
    if (!nameMatch) {
      nameMatch = text.match(/name[\s:]*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/i);
    }
    if (nameMatch) {
      fields.push({
        name: 'name',
        value: nameMatch[1].trim(),
        confidence: 80,
      });
    }

    // Email
    const emailMatch = text.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
    if (emailMatch) {
      fields.push({
        name: 'email',
        value: emailMatch[1],
        confidence: 95,
      });
    }

    // Phone
    const phoneMatch = text.match(/(\+?\d{1,3}[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})/);
    if (phoneMatch) {
      fields.push({
        name: 'phone',
        value: phoneMatch[1],
        confidence: 85,
      });
    }

    // Skills - Multiple approaches
    let skills = [];
    const skillsSection = text.match(/(?:skills|technical\s+skills|core\s+competencies)[\s:]*\n([^\n]+(?:\n[^\n]+)*?)(?=\n\n|\n[A-Z][A-Z]|$)/i);
    if (skillsSection) {
      skills.push(skillsSection[1].trim());
    }
    
    // Also extract bullet points with skills
    const skillBullets = text.match(/[•●\-\*]\s*([A-Za-z][^\n]+(?:programming|development|design|management|analysis))/gi);
    if (skillBullets && skillBullets.length > 0) {
      skills.push(...skillBullets.map(s => s.replace(/[•●\-\*]\s*/, '').trim()));
    }

    if (skills.length > 0) {
      fields.push({
        name: 'skills',
        value: [...new Set(skills)].join(', '),
        confidence: 75,
      });
    }

    // Technologies - Enhanced list
    const techPattern = /(JavaScript|TypeScript|Python|Java|C\+\+|C#|PHP|Ruby|Go|Rust|Swift|Kotlin|React|Angular|Vue|Node\.js|Express|Django|Flask|Spring|\.NET|SQL|MySQL|PostgreSQL|MongoDB|Redis|Docker|Kubernetes|AWS|Azure|GCP|Git|Jenkins|CI\/CD|HTML|CSS|REST|GraphQL|Microservices|Agile|Scrum|Machine Learning|AI|TensorFlow|PyTorch)/gi;
    const technologies = text.match(techPattern);
    if (technologies) {
      fields.push({
        name: 'technologies',
        value: [...new Set(technologies.map(t => t.toLowerCase()))].join(', '),
        confidence: 85,
      });
    }

    // Experience - Extract work experience section
    const experienceSection = text.match(/(?:experience|work\s+history|employment)[\s:]*\n((?:.*\n)*?)(?=\n(?:education|skills|certifications)|$)/i);
    if (experienceSection) {
      // Try to extract years of experience
      const yearsMatch = text.match(/(\d+)\+?\s*years?\s+(?:of\s+)?experience/i);
      if (yearsMatch) {
        fields.push({
          name: 'years_of_experience',
          value: yearsMatch[1],
          confidence: 80,
        });
      }
      
      // Extract job titles
      const jobTitles = experienceSection[1].match(/(?:^|\n)([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,4})(?:\s+(?:at|@|-)|$)/gm);
      if (jobTitles && jobTitles.length > 0) {
        fields.push({
          name: 'job_titles',
          value: jobTitles.map(t => t.trim()).slice(0, 3).join(', '),
          confidence: 70,
        });
      }
    }

    // Education
    const educationMatch = text.match(/(?:bachelor|master|phd|b\.?s\.?|m\.?s\.?|degree)[\s:]*(.*?)(?:\n|$)/i);
    if (educationMatch) {
      fields.push({
        name: 'education',
        value: educationMatch[0].trim(),
        confidence: 75,
      });
    }

    return fields;
  }

  extractIDFields(text) {
    const fields = [];

    // Name
    const nameMatch = text.match(/name[\s:]*([A-Z][a-z]+\s+[A-Z][a-z]+)/i);
    if (nameMatch) {
      fields.push({
        name: 'name',
        value: nameMatch[1],
        confidence: 85,
      });
    }

    // Date of birth
    const dobMatch = text.match(/(?:date\s+of\s+birth|DOB|born)[\s:]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i);
    if (dobMatch) {
      fields.push({
        name: 'date_of_birth',
        value: dobMatch[1],
        confidence: 90,
      });
    }

    // ID number
    const idMatch = text.match(/(?:id|card|license)\s+(?:number|#|no\.?)[\s:]*([A-Z0-9-]+)/i);
    if (idMatch) {
      fields.push({
        name: 'id_number',
        value: idMatch[1],
        confidence: 85,
      });
    }

    // Address
    const addressMatch = text.match(/address[\s:]*([A-Z0-9][^\n]+)/i);
    if (addressMatch) {
      fields.push({
        name: 'address',
        value: addressMatch[1].trim(),
        confidence: 75,
      });
    }

    return fields;
  }
}

export const extractionService = new ExtractionService();
