# Thought Process Sheet & System Architecture
## MemoryVerse AI '26

MemoryVerse AI '26 is an intelligent personal digital identity companion that ingests, understands, connects, and showcases a student or professional's entire academic and career journey. Below is the detailed thought process, design decisions, tech choices, AI/ML pipeline details, and system architecture for this challenge.

---

## 1. Problem Conception & Design Philosophy
Traditional cloud storage platforms (Google Drive, Dropbox) act as passive folders. They store files but do not understand the *semantic meaning* of what is stored, nor can they tell a story about how your experiences connect.

Our design philosophy for **MemoryVerse AI** is centered around:
- **Zero Manual Effort**: Users should upload files without worry of categorization or tagging.
- **Narrative Building**: Connecting achievements to show growth (e.g., how learning Python led to an AI project, which led to a Google internship).
- **Instant Searchability**: Replacing folder structures with conversational search ("Show my AI projects") and career counseling.
- **Aesthetic Excellence**: A cybernetic dark space UI with glowing visual indicators and physics-based network canvas.

---

## 2. System Architecture & Information Flow

Below is the conceptual map of how data moves from user ingestion to retrieval and visualization.

```
       [User Ingestion]
      /               \
[Files: PDF/Docx/Img]  [Links: Portfolio/GitHub]
      \               /
     [Parser & Text Extraction]
              |
     [Gemini AI Analysis & OCR]
      /       |        \
[Metadata] [Skills] [Relationships]
     \        |        /
      [MongoDB Database]
      /       |        \
[Timeline] [Graph Node] [Search & chat]
```

### Ingestion & Processing Pipeline
1. **Parser Layer (`server/parser.js`)**:
   - Parses **PDFs** using `pdf-parse`.
   - Parses **Word Documents (DOCX/DOC)** using `mammoth`.
   - Parses **PlainText/Markdown** files.
   - For **Images (PNG, JPG, WebP)**, it returns a multimodal OCR flag.
2. **AI Metadata Extraction Layer (`server/aiService.js` -> `analyzeDocument`)**:
   - Sends the extracted text (or image base64 buffer for multimodal support) to **Gemini 2.5 Flash**.
   - Prompts the model with strict JSON formatting rules to extract:
     - **Title**: Descriptive summary name.
     - **Category**: Projects, Certifications, Internships, Achievements, Academics, Skills, or Other.
     - **Organization**: Company, issuer, or university.
     - **Date**: Standard YYYY-MM-DD format.
     - **Skills**: Competency tags.
     - **Summary**: Concise overview of the milestone.
     - **Description**: Detailed responsibilities or learnings.
3. **Persistence Layer (`server/models.js` & MongoDB)**:
   - Saves documents with their extracted schemas.
   - Dynamically checks the `Skill` model to update unique skills associated with the user, mapping them to the source documents.

---

## 3. The Relationship Engine (Module 3)
A key highlight of MemoryVerse is identifying how milestones connect to form a cohesive digital identity.

### Implicit Connections (Skills to Documents)
- Extracted skills act as the bridge between documents. If a certification teaches `Python` and a project uses `Python`, an implicit edge is drawn between them in the knowledge graph.

### Explicit Career Connections (AI-Powered Graph)
- When a document is ingested, the system queries the database for the user's existing documents and passes them to Gemini (`extractExplicitRelationships`).
- The AI analyzes connections and returns structured relationship pairs:
  - `completed_during`: E.g., a project was built during an internship.
  - `prerequisite_for`: E.g., a cloud certification was a prerequisite for a cloud-native project.
  - `applied_in`: E.g., learning React in a course was applied to build a portfolio website.
  - `associated_with`: General connections.

---

## 4. Smart Retrieval & Conversational Agent (Module 5)
MemoryVerse provides two modes of interacting with data:

### Natural Search
- Translates natural search queries ("Show my Python projects from 2024") into structured MongoDB queries.
- Gemini (`extractSearchFilters`) parses the query into a JSON filter schema:
  ```json
  {
    "category": "Projects",
    "skills": ["Python"],
    "organization": null,
    "year": 2024,
    "searchTerm": null
  }
  ```
- This allows MongoDB to query precisely, bypass text indexes, and fetch exactly what the user wants.

### AI Career Companion
- A chat interface powered by Gemini, grounded with the user's entire milestone catalog as context.
- It is instructed to reply to career development queries (e.g. "Draft a summary for my resume", "What jobs do you recommend?") using verified milestones, formatting clickable links directly back to the original documents (e.g. `[GCP Certificate](#doc-123)`).

---

## 5. UI/UX Design System
The frontend is built with **React** and **Vite** using a custom **Vanilla CSS** cybernetic design system:
- **Visual Network Canvas**: Built from scratch using native HTML5 Canvas physics. Nodes are force-directed (repelled from one another and attracted to common edges/center). Users can drag nodes, zoom, pan, and click nodes to view details in the Inspector.
- **Vertical Timeline**: Groups milestones by year using a glowing vertical axis, making chronological progression instantly clear.
- **Category Badges**: Color-coded categorization tags for easy scanning.

---

## 6. Verification Checklist & Success Matrix

| Module | Requirement | Status | Verification Detail |
| :--- | :--- | :---: | :--- |
| **Module 1** | Ingestion of Certificates, Resumes, Project Reports, Internship Letters, Portfolio Links, etc. | **DONE** | Files (`.pdf`, `.docx`, `.doc`, `.txt`, `.png`, `.jpg`, `.jpeg`, `.webp`) and web URLs can be uploaded via the Ingestion panel. |
| **Module 2** | Automatic Classification into Projects, Skills, Certifications, Internships, Achievements, Academics | **DONE** | Gemini automatically inspects text/images and classifies them into these precise categories. Saved in MongoDB. |
| **Module 3** | Connect relationships across user data (Certification → Skill, Skill → Project, etc.) | **DONE** | Double relationship engine: implicit skill matching + explicit AI-analyzed connections. Graph is rendered with Canvas physics. |
| **Module 4** | Generate a visual timeline representing user's growth and achievements by year | **DONE** | Vertical timeline groups achievements by year (e.g. 2023, 2024...) with filter tabs for categories. |
| **Module 5** | Smart Retrieval System (Natural search filter parsing + original file links + Career Companion Chat) | **DONE** | Natural query parsing to DB filters, static file hosting, and RAG-grounded AI companion chat. |

---

## 7. Setup & Run Instructions
1. Install dependencies:
   ```bash
   npm run setup
   ```
2. Set up local MongoDB (running on `mongodb://localhost:27017/memoryverse`).
3. Seed mock data:
   ```bash
   node server/seed.js
   ```
4. Start both servers:
   ```bash
   npm run dev
   ```
5. Navigate to `http://localhost:5173`.
