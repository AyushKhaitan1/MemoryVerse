import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * Helper to initialize the Gemini API client.
 * Uses the client-provided key in headers if present, otherwise checks environment.
 * @param {string} customApiKey - API Key passed from the client-side settings.
 * @returns {GoogleGenerativeAI} The initialized client.
 */
function getGenAI(customApiKey) {
  const apiKey = customApiKey || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is missing. Please set it in Settings or the server environment.');
  }
  return new GoogleGenerativeAI(apiKey);
}

/**
 * Analyzes document text or image using Gemini to categorize and extract metadata.
 * @param {string} text - The extracted text content (if any).
 * @param {string} filename - Original filename.
 * @param {string} mimeType - The file MIME type.
 * @param {Buffer} fileBuffer - Optional file buffer (for images/multimodal).
 * @param {string} customApiKey - Optional custom API key.
 * @returns {Promise<object>} Parsed JSON metadata.
 */
export async function analyzeDocument(text, filename, mimeType, fileBuffer, customApiKey) {
  const genAI = getGenAI(customApiKey);
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: { responseMimeType: 'application/json' }
  });

  let prompt = `
You are an expert AI data ingestion system. Analyze the following document details and extract structured metadata.
Identify:
1. Title: The document's title (e.g. "React Web Development Certificate", "Data Science Club Lead Resume").
2. Category: Must be exactly one of: "Projects", "Skills", "Certifications", "Internships", "Achievements", "Academics", "Other".
   CLASSIFICATION RULES:
   - "Internships": Include internship offers, job offer letters, experience letters, internship certificates, work records, and any official job contracts. (IMPORTANT: Any offer letter or job appointment letter belongs here, NOT in "Other").
   - "Certifications": Include course completion certificates, professional licenses, bootcamps, and cloud certs (e.g. AWS, GCP, Coursera certificates).
   - "Academics": Include transcripts, degrees, diplomas, school marks lists, university grades sheets, and coursework details.
   - "Achievements": Include hackathon prizes, competition wins, club lead roles, scholarships, awards, and honors.
   - "Projects": Include project reports, project portfolios, github repository readmes, or code project descriptions.
   - "Skills": Only choose this if the document is a list of skills.
   - "Other": Choose only if it fits none of the above.
3. Organization: The organization associated (company name for internships, issuer for certificates, university for academics).
4. Date: The date of completion or start. Provide YYYY-MM-DD. If only year is available, default to "YYYY-01-01". If not found, use current date.
5. Skills: An array of key skills mentioned or learned in the document (e.g. ["Python", "React", "Docker"]).
6. Description: A paragraph summarizing the achievements, responsibilities, or topics covered.
7. Summary: A brief 1-2 sentence overview of this milestone.

Document Filename: ${filename}
Mime Type: ${mimeType}
`;

  let contentParts = [];

  if (mimeType.startsWith('image/') && fileBuffer) {
    prompt += `\nSince this is an image of the document, perform OCR to extract text first, then analyze and structure.`;
    contentParts.push({
      inlineData: {
        data: fileBuffer.toString('base64'),
        mimeType: mimeType
      }
    });
  } else {
    prompt += `\nDocument Content:\n${text}`;
  }

  contentParts.push(prompt);

  try {
    const result = await model.generateContent(contentParts);
    const responseText = result.response.text();
    return JSON.parse(responseText);
  } catch (error) {
    console.error('Gemini Analysis Error:', error);
    throw new Error('Failed to analyze document with Gemini: ' + error.message);
  }
}

/**
 * Parses a natural language search query into structured filters for MongoDB.
 * @param {string} query - The search query.
 * @param {string} customApiKey - Optional custom API key.
 * @returns {Promise<object>} Filter object.
 */
export async function extractSearchFilters(query, customApiKey) {
  const genAI = getGenAI(customApiKey);
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: { responseMimeType: 'application/json' }
  });

  const prompt = `
You are an AI search query parser. Translate the following user search query into structured search filters.
The supported categories are: "Projects", "Skills", "Certifications", "Internships", "Achievements", "Academics", "Other".

Translate the query to a JSON object with:
- category: String matching one of the categories above, or null.
- skills: Array of strings representing skills queried (e.g. ["Python", "React"]), or empty array.
- organization: String representing organization queried (e.g. "Google"), or null.
- year: Number representing specific year queried, or null.
- searchTerm: A simple string representing general keywords to text-search for, or null.

Query: "${query}"
`;

  try {
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    return JSON.parse(responseText);
  } catch (error) {
    console.error('Gemini Filter Parsing Error:', error);
    return { searchTerm: query }; // Fallback to raw text search
  }
}

/**
 * Handles conversational queries about the user's digital journey.
 * @param {string} query - User's question.
 * @param {Array<object>} documents - Array of document summaries and details.
 * @param {Array<object>} chatHistory - Array of past chat messages.
 * @param {string} customApiKey - Optional custom API key.
 * @returns {Promise<string>} Gemini response.
 */
export async function journeyChat(query, documents, chatHistory, customApiKey) {
  const genAI = getGenAI(customApiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  const context = documents.map(doc => {
    return `- [${doc.category}] "${doc.title}" at ${doc.organization || 'N/A'} on ${new Date(doc.date).toLocaleDateString()}. Summary: ${doc.summary}. Skills: ${doc.skills.join(', ')}. DocID: ${doc._id}`;
  }).join('\n');

  const chatSession = model.startChat({
    history: chatHistory.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }]
    })),
    systemInstruction: `
You are MemoryVerse AI, an intelligent personal digital identity companion. Your purpose is to help the user navigate, synthesize, and showcase their digital journey (projects, skills, internships, certificates).

You have access to the user's structured documents database:
${context}

When the user asks questions:
1. Provide highly encouraging, professional, and career-oriented advice.
2. Link back to their actual documents when describing achievements. Format links as markdown links using the DocID, for example: "[Python Certificate](#doc-${docId})" or "[Web Development Project](#doc-${docId})".
3. Connect related experiences: e.g. "You earned your Python certification in 2023, which you then applied to your Data Science project in 2024."
4. If they ask to synthesize a resume summary or list skills, prepare a professional response using only their verified documents.
`
  });

  try {
    const result = await chatSession.sendMessage(query);
    return result.response.text();
  } catch (error) {
    console.error('Gemini Chat Error:', error);
    throw new Error('Failed to generate response: ' + error.message);
  }
}

/**
 * Generates an executive career synthesis summarizing the user's milestones.
 * @param {Array<object>} documents - Array of document summaries.
 * @param {string} customApiKey - Optional custom API key.
 * @returns {Promise<string>} The AI generated synthesis markdown text.
 */
export async function generateSynthesis(documents, customApiKey) {
  const genAI = getGenAI(customApiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  const docContext = documents.map(d => `Title: ${d.title}, Category: ${d.category}, Org: ${d.organization || 'N/A'}, Date: ${d.date}, Skills: ${d.skills.join(', ')}, Summary: ${d.summary}`).join('\n');

  const prompt = `
You are an elite career development assistant. Analyze the user's career and academic documents summarized below.
Create a highly professional, inspiring "Digital Journey Synthesis" structured in clear, scannable bullet points under three headers:

**1. Core Expertise & Tech Stack**
- [Bullet points describing tech stack, core competencies, and areas of expertise based on documents]

**2. Key Milestones & Growth Highlights**
- [Bullet points highlighting key achievements, internships, certificates, and growth milestones]

**3. Recommended Career Paths & Next Steps**
- [Bullet points outlining recommended roles, career growth tracks, and suggested next learning items]

Ensure each section has 2-4 solid bullet points. Make it look extremely clean and organized. Avoid long paragraphs.

Documents Context:
${docContext}
`;

  try {
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (error) {
    console.error('Gemini Synthesis Error:', error);
    throw new Error('Failed to generate career synthesis: ' + error.message);
  }
}

/**
 * Compares a newly uploaded document against existing documents to extract explicit relationships.
 * @param {object} newDoc - The new document details.
 * @param {Array<object>} existingDocs - List of existing document details.
 * @param {string} customApiKey - Optional custom API key.
 * @returns {Promise<Array>} List of extracted relationships.
 */
export async function extractExplicitRelationships(newDoc, existingDocs, customApiKey) {
  if (!existingDocs || existingDocs.length === 0) return [];

  const genAI = getGenAI(customApiKey);
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: { responseMimeType: 'application/json' }
  });

  const existingContext = existingDocs.map(d => `- [${d.category}] ID: "${d._id}", Title: "${d.title}", Summary: "${d.summary}", Skills: [${d.skills.join(', ')}]`).join('\n');

  const prompt = `
You are a career relationship map generator. Analyze the connection between a newly uploaded document (New Milestone) and a list of existing documents (Existing Milestones).
Determine if there are logical connections between the New Milestone and any of the Existing Milestones.

Connections types can be:
- "completed_during": e.g. a Project was done DURING an Internship, or a Certificate was earned during an Internship.
- "prerequisite_for": e.g. a Certification taught skills that were a prerequisite for a Project or Internship.
- "applied_in": e.g. skills from a Certification/Academic course were applied in a Project.
- "associated_with": a general connection.

Return a JSON array of relationships:
[
  {
    "targetId": "The ID of the existing document",
    "type": "completed_during | prerequisite_for | applied_in | associated_with",
    "description": "A 1-sentence explanation of the connection (e.g. \"Learned React in the certification which was then applied to build the portfolio project.\")"
  }
]
If there are no connections, return an empty array [].

New Milestone:
- Title: "${newDoc.title}"
- Category: "${newDoc.category}"
- Summary: "${newDoc.summary}"
- Skills: [${newDoc.skills.join(', ')}]

Existing Milestones:
${existingContext}
`;

  try {
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    return JSON.parse(responseText);
  } catch (error) {
    console.error('Relationship Extraction Error:', error);
    return [];
  }
}
