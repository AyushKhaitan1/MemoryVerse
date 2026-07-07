import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, index: true },
  password: { type: String, required: true },
  journeySynthesis: { type: String, default: '' },
  synthesisDirty: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

const documentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, required: true },
  filename: { type: String },
  filepath: { type: String },
  mimeType: { type: String },
  category: {
    type: String,
    enum: ['Projects', 'Skills', 'Certifications', 'Internships', 'Achievements', 'Academics', 'Other'],
    default: 'Other'
  },
  skills: [{ type: String }],
  organization: { type: String },
  date: { type: Date, default: Date.now },
  description: { type: String },
  summary: { type: String },
  rawText: { type: String },
  sourceUrl: { type: String },
  createdAt: { type: Date, default: Date.now }
});

const skillSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name: { type: String, required: true },
  category: { type: String }, // e.g. "Languages", "Frameworks", "Libraries", "Tools"
  description: { type: String },
  documents: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Document' }],
  createdAt: { type: Date, default: Date.now }
});

// Ensure a user cannot have duplicate skills, but different users can have the same skill name
skillSchema.index({ name: 1, userId: 1 }, { unique: true });

const relationshipSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  sourceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document', required: true },
  targetId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document', required: true },
  type: {
    type: String,
    enum: ['completed_during', 'prerequisite_for', 'applied_in', 'associated_with'],
    default: 'associated_with'
  },
  description: { type: String },
  createdAt: { type: Date, default: Date.now }
});

export const User = mongoose.model('User', userSchema);
export const Document = mongoose.model('Document', documentSchema);
export const Skill = mongoose.model('Skill', skillSchema);
export const Relationship = mongoose.model('Relationship', relationshipSchema);
