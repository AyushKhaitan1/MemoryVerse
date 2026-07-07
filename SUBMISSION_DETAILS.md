# Wooble Portfolio Submission Details
## MemoryVerse AI '26

Here are the pre-formatted texts and details to copy and paste directly into your **Wooble Portfolio** submission form.

---

### 1. Title / Project Name
```text
MemoryVerse AI
```

### 2. Tagline / Short Description
```text
An AI-powered Digital Identity System that transforms scattered files, resumes, and certificates into an interactive knowledge graph and conversational timeline.
```

### 3. Cover Image (Thumbnail)
* Upload the generated image located in your project folder:
  **`memoryverse_cover.png`** (located at `c:\Users\DELL\OneDrive\Hackathons\MemoryVerse AI '26\memoryverse_cover.png`). It is formatted in a 16:9 aspect ratio and designed with high-quality cybernetic dark-mode aesthetics.

---

### 4. Reviewer Notes
Copy and paste this directly into the **Reviewer Notes** field:

```markdown
### 🌌 MemoryVerse AI - Overview
MemoryVerse is a personal digital identity companion that ingests scattered professional documents (PDFs, Word files, text, images, and web links) and converts them into a structured, searchable, and connected personal timeline and network graph.

---

### 🔑 Test Credentials (Pre-seeded Demo)
To explore the application with complete pre-seeded timeline and relationship graph data immediately, log in with:
* **Demo URL**: https://memoryverse-1-9zap.onrender.com/
* **Username**: `alex_chen`
* **Password**: `password`

*Note: You can also use the "Sign Up" option to register a fresh profile and upload your own certificates, resumes, or project links to test the real-time AI ingestion.*

---

### 🛠️ Core Features & Verification
1. **AI Data Ingestion (Module 1)**: Supports drag-and-drop file uploader (PDF, DOCX, TXT, and Images via Multimodal OCR) and online links (GitHub, portfolios).
2. **Intelligent Categorization (Module 2)**: Classifies documents into Projects, Skills, Certifications, Internships, Achievements, and Academics.
3. **Relationship Engine (Module 3)**: Identifies implicit skill matching and explicit AI-extracted career connections. Renders them in an interactive network graph built with custom HTML5 Canvas physics (drag, zoom, pan, inspect).
4. **Digital Journey Timeline (Module 4)**: Organizes and groups milestones chronologically by year with interactive filtering.
5. **Smart Retrieval System (Module 5)**: 
   - Translates natural queries ("Show my Python projects") into database filters.
   - Grounded RAG Chatbot answers career questions with links back to original uploaded documents.

---

### ⚙️ How to Run Locally
1. Clone the repository and install dependencies:
   ```bash
   npm run setup
   ```
2. Configure local environment (`server/.env`):
   ```env
   PORT=5000
   MONGO_URI=mongodb://localhost:27017/memoryverse
   GEMINI_API_KEY=your_gemini_api_key
   ```
3. Run the database seed script:
   ```bash
   node server/seed.js
   ```
4. Start both the client and server concurrently:
   ```bash
   npm run dev
   ```
5. Open your browser at `http://localhost:5173`.
```

---

### 5. Technologies & Tools Tags
Add these tags to your submission:
* `React.js`
* `Vite`
* `Node.js`
* `Express.js`
* `MongoDB`
* `Mongoose`
* `Gemini API`
* `HTML5 Canvas`
* `Vanilla CSS`
* `REST APIs`
* `JSON Web Tokens (JWT)`
* `PDF-Parse`
* `Mammoth (DOCX)`
