import express from 'express';
import cors from 'cors';
import multer from 'multer';
import mongoose from 'mongoose';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

import { User, Document, Skill, Relationship } from './models.js';
import { parseFile } from './parser.js';
import { analyzeDocument, extractSearchFilters, journeyChat, generateSynthesis, extractExplicitRelationships } from './aiService.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'memoryverse_cybernetic_key_2026';

// Middleware
app.use(cors());
app.use(express.json());

// Set up upload directory
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Serve uploaded files statically
app.use('/uploads', express.static(uploadDir));

// Connect to MongoDB
const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/memoryverse';
mongoose.connect(mongoUri)
  .then(() => console.log('MongoDB connected successfully.'))
  .catch(err => console.error('MongoDB connection error:', err));

// Configure Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});
const upload = multer({ storage });

// Helper to extract custom API Key from headers
const getApiKey = (req) => req.headers['x-gemini-key'] || null;

// --- AUTHENTICATION MIDDLEWARE ---
const requireAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Access denied. Token missing or invalid.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Session expired. Please log in again.' });
  }
};

// --- AUTHENTICATION ROUTES ---

/**
 * Register User
 */
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required.' });
    }

    const existingUser = await User.findOne({ username: username.trim() });
    if (existingUser) {
      return res.status(400).json({ error: 'Username is already taken.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({
      username: username.trim(),
      password: hashedPassword
    });

    await newUser.save();
    res.status(201).json({ message: 'User registered successfully!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Login User
 */
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required.' });
    }

    const user = await User.findOne({ username: username.trim() });
    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, username: user.username });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Check backend status and if API Key is configured
 */
app.get('/api/status', (req, res) => {
  res.json({
    serverOnline: true,
    hasServerApiKey: !!process.env.GEMINI_API_KEY
  });
});

// --- SECURED API ENDPOINTS (requireAuth) ---

/**
 * Ingest a file document
 */
app.post('/api/upload', requireAuth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded.' });
    }

    const { originalname, path: filePath, mimetype } = req.file;
    const apiKey = getApiKey(req);

    // Read file buffer
    const fileBuffer = fs.readFileSync(filePath);

    // Parse file contents based on MIME type
    let parsedText = '';
    try {
      parsedText = await parseFile(fileBuffer, mimetype);
    } catch (parseErr) {
      fs.unlinkSync(filePath);
      return res.status(500).json({ error: 'Parsing failed: ' + parseErr.message });
    }

    // Call Gemini to analyze, categorize and extract metadata
    let aiMetadata;
    try {
      aiMetadata = await analyzeDocument(parsedText, originalname, mimetype, fileBuffer, apiKey);
    } catch (aiErr) {
      fs.unlinkSync(filePath);
      return res.status(500).json({ error: 'AI analysis failed: ' + aiErr.message });
    }

    // Create Document entry associated with current user
    const relativePath = `uploads/${path.basename(filePath)}`;
    const newDoc = new Document({
      userId: req.userId,
      title: aiMetadata.title || originalname,
      filename: originalname,
      filepath: relativePath,
      mimeType: mimetype,
      category: aiMetadata.category || 'Other',
      skills: aiMetadata.skills || [],
      organization: aiMetadata.organization || '',
      date: aiMetadata.date ? new Date(aiMetadata.date) : new Date(),
      description: aiMetadata.description || '',
      summary: aiMetadata.summary || '',
      rawText: parsedText === '[IMAGE_CONTENT_PENDING_MULTIMODAL_OCR]' ? (aiMetadata.description || '') : parsedText
    });

    await newDoc.save();

    // Link skills to this user/document in the Skill collection
    if (aiMetadata.skills && aiMetadata.skills.length > 0) {
      for (const skillName of aiMetadata.skills) {
        await Skill.findOneAndUpdate(
          { name: skillName.trim(), userId: req.userId },
          { 
            $addToSet: { documents: newDoc._id },
            $setOnInsert: { category: 'Extracted' }
          },
          { upsert: true, new: true }
        );
      }
    }

    // Auto-extract relationships comparing with user's existing documents
    const existingDocs = await Document.find({ userId: req.userId, _id: { $ne: newDoc._id } });
    if (existingDocs.length > 0) {
      try {
        const relations = await extractExplicitRelationships(newDoc, existingDocs, apiKey);
        if (relations && relations.length > 0) {
          for (const rel of relations) {
            // Verify target exists for safety
            const targetExists = await Document.findOne({ _id: rel.targetId, userId: req.userId });
            if (targetExists) {
              await new Relationship({
                userId: req.userId,
                sourceId: newDoc._id,
                targetId: rel.targetId,
                type: rel.type,
                description: rel.description
              }).save();
            }
          }
        }
      } catch (relErr) {
        console.error('Relationship extraction warning:', relErr);
      }
    }

    // Invalidate user synthesis cache
    await User.findByIdAndUpdate(req.userId, { synthesisDirty: true });

    res.status(201).json(newDoc);
  } catch (err) {
    console.error('Upload endpoint error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * Ingest an external link
 */
app.post('/api/link', requireAuth, async (req, res) => {
  try {
    const { title, url, description } = req.body;
    if (!url) {
      return res.status(400).json({ error: 'URL is required.' });
    }

    const apiKey = getApiKey(req);
    // Use Gemini to analyze the provided URL details
    const aiMetadata = await analyzeDocument(
      `Portfolio/External Link. URL: ${url}. Description: ${description || ''}`,
      title || url,
      'text/html',
      null,
      apiKey
    );

    const newDoc = new Document({
      userId: req.userId,
      title: aiMetadata.title || title || url,
      category: aiMetadata.category || 'Projects',
      skills: aiMetadata.skills || [],
      organization: aiMetadata.organization || '',
      date: aiMetadata.date ? new Date(aiMetadata.date) : new Date(),
      description: aiMetadata.description || description || '',
      summary: aiMetadata.summary || '',
      rawText: description || '',
      sourceUrl: url
    });

    await newDoc.save();

    if (aiMetadata.skills && aiMetadata.skills.length > 0) {
      for (const skillName of aiMetadata.skills) {
        await Skill.findOneAndUpdate(
          { name: skillName.trim(), userId: req.userId },
          { 
            $addToSet: { documents: newDoc._id },
            $setOnInsert: { category: 'Extracted' }
          },
          { upsert: true, new: true }
        );
      }
    }

    // Auto-extract relationships
    const existingDocs = await Document.find({ userId: req.userId, _id: { $ne: newDoc._id } });
    if (existingDocs.length > 0) {
      try {
        const relations = await extractExplicitRelationships(newDoc, existingDocs, apiKey);
        if (relations && relations.length > 0) {
          for (const rel of relations) {
            const targetExists = await Document.findOne({ _id: rel.targetId, userId: req.userId });
            if (targetExists) {
              await new Relationship({
                userId: req.userId,
                sourceId: newDoc._id,
                targetId: rel.targetId,
                type: rel.type,
                description: rel.description
              }).save();
            }
          }
        }
      } catch (relErr) {
        console.error('Relationship extraction warning:', relErr);
      }
    }

    // Invalidate user synthesis cache
    await User.findByIdAndUpdate(req.userId, { synthesisDirty: true });

    res.status(201).json(newDoc);
  } catch (err) {
    console.error('Link ingestion error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * Get all documents for the user
 */
app.get('/api/documents', requireAuth, async (req, res) => {
  try {
    const filters = { userId: req.userId };
    if (req.query.category) {
      filters.category = req.query.category;
    }
    if (req.query.skill) {
      filters.skills = req.query.skill;
    }
    const docs = await Document.find(filters).sort({ date: -1 });
    res.json(docs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Get document by ID
 */
app.get('/api/documents/:id', requireAuth, async (req, res) => {
  try {
    const doc = await Document.findOne({ _id: req.params.id, userId: req.userId });
    if (!doc) return res.status(404).json({ error: 'Document not found.' });
    res.json(doc);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Delete a document
 */
app.delete('/api/documents/:id', requireAuth, async (req, res) => {
  try {
    const doc = await Document.findOne({ _id: req.params.id, userId: req.userId });
    if (!doc) return res.status(404).json({ error: 'Document not found.' });

    // Clean up file if local
    if (doc.filepath) {
      const fullPath = path.join(__dirname, doc.filepath);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
    }

    // Remove document reference from Skills
    await Skill.updateMany(
      { documents: doc._id, userId: req.userId },
      { $pull: { documents: doc._id } }
    );
    
    // Delete skill entries if no documents reference them anymore
    await Skill.deleteMany({ documents: { $size: 0 }, userId: req.userId });

    // Clean up relationships
    await Relationship.deleteMany({
      userId: req.userId,
      $or: [{ sourceId: doc._id }, { targetId: doc._id }]
    });

    await Document.findOneAndDelete({ _id: req.params.id, userId: req.userId });

    // Invalidate user synthesis cache
    await User.findByIdAndUpdate(req.userId, { synthesisDirty: true });

    res.json({ message: 'Document deleted successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Natural language search route
 */
app.post('/api/search', requireAuth, async (req, res) => {
  try {
    const { query } = req.body;
    if (!query) {
      return res.status(400).json({ error: 'Search query is required.' });
    }

    const apiKey = getApiKey(req);
    const parsedFilters = await extractSearchFilters(query, apiKey);
    
    // Construct DB Query scoped by user
    const dbQuery = { userId: req.userId };

    if (parsedFilters.category) {
      dbQuery.category = parsedFilters.category;
    }

    if (parsedFilters.skills && parsedFilters.skills.length > 0) {
      dbQuery.skills = { $in: parsedFilters.skills.map(s => new RegExp(s.trim(), 'i')) };
    }

    if (parsedFilters.organization) {
      dbQuery.organization = new RegExp(parsedFilters.organization.trim(), 'i');
    }

    if (parsedFilters.year) {
      const startYear = new Date(parsedFilters.year, 0, 1);
      const endYear = new Date(parsedFilters.year, 11, 31, 23, 59, 59);
      dbQuery.date = { $gte: startYear, $lte: endYear };
    }

    if (parsedFilters.searchTerm) {
      dbQuery.$or = [
        { title: new RegExp(parsedFilters.searchTerm, 'i') },
        { organization: new RegExp(parsedFilters.searchTerm, 'i') },
        { description: new RegExp(parsedFilters.searchTerm, 'i') },
        { rawText: new RegExp(parsedFilters.searchTerm, 'i') }
      ];
    }

    const docs = await Document.find(dbQuery).sort({ date: -1 });
    res.json({ filters: parsedFilters, results: docs });
  } catch (err) {
    console.error('Search endpoint error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * AI Chat Assistant endpoint
 */
app.post('/api/chat', requireAuth, async (req, res) => {
  try {
    const { query, chatHistory } = req.body;
    if (!query) {
      return res.status(400).json({ error: 'Query is required.' });
    }

    const apiKey = getApiKey(req);
    // Fetch user documents for grounding
    const docs = await Document.find({ userId: req.userId }).sort({ date: -1 });

    const reply = await journeyChat(query, docs, chatHistory || [], apiKey);
    res.json({ reply });
  } catch (err) {
    console.error('Chat endpoint error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * Get timeline grouping
 */
app.get('/api/timeline', requireAuth, async (req, res) => {
  try {
    const docs = await Document.find({ userId: req.userId }).sort({ date: 1 });
    
    const timeline = {};
    docs.forEach(doc => {
      const year = doc.date ? new Date(doc.date).getFullYear() : 'Ongoing';
      if (!timeline[year]) {
        timeline[year] = [];
      }
      timeline[year].push(doc);
    });

    res.json(timeline);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Get Knowledge Graph data
 */
app.get('/api/graph', requireAuth, async (req, res) => {
  try {
    const docs = await Document.find({ userId: req.userId });
    const skills = await Skill.find({ userId: req.userId });

    const nodes = [];
    const edges = [];
    const skillSet = new Set();

    // 1. Add Document nodes
    docs.forEach(doc => {
      nodes.push({
        id: doc._id.toString(),
        label: doc.title,
        category: doc.category,
        group: 'document',
        date: doc.date
      });

      doc.skills.forEach(skillName => {
        const cleanedSkillName = skillName.trim();
        if (cleanedSkillName) {
          skillSet.add(cleanedSkillName);
          edges.push({
            id: `edge-${doc._id.toString()}-${cleanedSkillName}`,
            source: doc._id.toString(),
            target: cleanedSkillName,
            type: 'implicit'
          });
        }
      });
    });

    // 2. Add Skill nodes
    skillSet.forEach(skillName => {
      nodes.push({
        id: skillName,
        label: skillName,
        group: 'skill',
        category: 'Skill'
      });
    });

    // 3. Add explicit Relationships
    const explicitRels = await Relationship.find({ userId: req.userId });
    explicitRels.forEach(rel => {
      edges.push({
        id: rel._id.toString(),
        source: rel.sourceId.toString(),
        target: rel.targetId.toString(),
        type: 'explicit',
        label: rel.type
      });
    });

    res.json({ nodes, edges });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Get cached profile AI synthesis
 */
app.get('/api/synthesis', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    // Return cached synthesis if not dirty and exists
    if (!user.synthesisDirty && user.journeySynthesis) {
      return res.json({ synthesis: user.journeySynthesis, cached: true });
    }

    const docs = await Document.find({ userId: req.userId }).sort({ date: -1 });
    if (docs.length === 0) {
      return res.json({ 
        synthesis: "No documents uploaded yet. Start uploading your certificates, projects, and resumes to compile your AI Journey Synthesis!" 
      });
    }

    const apiKey = getApiKey(req);
    // Generate new synthesis using Gemini
    const synthesis = await generateSynthesis(docs, apiKey);

    // Cache the synthesis
    user.journeySynthesis = synthesis;
    user.synthesisDirty = false;
    await user.save();

    res.json({ synthesis, cached: false });
  } catch (err) {
    console.error('Synthesis endpoint error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
