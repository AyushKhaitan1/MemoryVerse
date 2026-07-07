import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { User, Document, Skill, Relationship } from './models.js';

const mongoUri = 'mongodb://localhost:27017/memoryverse';

const mockDocs = [
  {
    title: "Python for Data Science Certificate",
    category: "Certifications",
    organization: "Coursera",
    date: new Date('2023-05-15'),
    skills: ["Python", "Pandas", "NumPy", "Data Analysis"],
    summary: "Earned Python for Data Science certification covering data analysis pipelines, data cleaning, and statistical modeling.",
    description: "Successfully completed the Python for Data Science course, mastering basic syntax, libraries (Pandas, NumPy, Matplotlib), and Jupyter Notebook environments.",
    rawText: "Python for Data Science Professional Certificate issued by Coursera in partnership with IBM. Completed on May 15, 2023. Gained hands-on experience in NumPy, Pandas, and Matplotlib."
  },
  {
    title: "AI-Powered Smart Agriculturist",
    category: "Projects",
    organization: "Stanford AI Club",
    date: new Date('2024-03-10'),
    skills: ["Python", "TensorFlow", "Machine Learning", "IoT"],
    summary: "Built an IoT and ML system predicting crop yields and optimizing watering schedules using TensorFlow models.",
    description: "Designed a neural network to analyze soil moisture, humidity, and temperature logs to forecast crop watering needs. Integrated with Raspberry Pi controllers.",
    rawText: "Project Report: AI-Powered Smart Agriculturist. Built in March 2024 using Python, TensorFlow, and Raspberry Pi sensors. Achieved 94% accuracy in crop health prediction."
  },
  {
    title: "Google Cloud Associate Cloud Engineer",
    category: "Certifications",
    organization: "Google Cloud",
    date: new Date('2024-11-20'),
    skills: ["GCP", "Kubernetes", "Cloud Computing", "Docker"],
    summary: "Validated expertise in deploying applications, monitoring operations, and managing enterprise cloud solutions on Google Cloud Platform.",
    description: "Certified Google Cloud Associate Cloud Engineer. Knowledge includes IAM controls, GKE cluster deployments, VPC networking, and App Engine configurations.",
    rawText: "Google Cloud Certified Associate Cloud Engineer. Issued November 20, 2024. Valid for 3 years. Certificate ID: GCP-99281-A. Topics: Kubernetes Engine, Cloud Storage, Stackdriver."
  },
  {
    title: "Software Engineer Intern",
    category: "Internships",
    organization: "Google",
    date: new Date('2025-06-01'),
    skills: ["Go", "Kubernetes", "Docker", "GCP", "Systems Programming"],
    summary: "Completed a 3-month internship within the Google Kubernetes Engine (GKE) team, optimizing system scaling times.",
    description: "Contributed to backend control plane optimization in Go. Wrote unit and integration tests, reduced API response latency by 12%, and presented findings to senior engineers.",
    rawText: "Internship Certificate of Completion. Alex Chen served as a Software Engineer Intern at Google, Mountain View from June to August 2025. Supervised by the GKE Orchestration Team."
  },
  {
    title: "1st Place Winner - Wooble Hackathon '26",
    category: "Achievements",
    organization: "Wooble",
    date: new Date('2026-02-18'),
    skills: ["React", "Node", "Express", "MongoDB", "Vanilla CSS"],
    summary: "Won first place out of 80+ teams at the Wooble Hackathon by building a connected personal digital identity engine.",
    description: "Led development of a personal digital identity graph using React, Express, and canvas physics simulations, powered by LLM parsing pipelines.",
    rawText: "Certificate of Achievement. Presented to Alex Chen for securing 1st Place at Wooble Hackathon 2026 for the project MemoryVerse AI. Awarded on February 18, 2026."
  },
  {
    title: "B.S. in Computer Science (Ongoing)",
    category: "Academics",
    organization: "Stanford University",
    date: new Date('2023-09-01'),
    skills: ["Algorithms", "Operating Systems", "Database Systems"],
    summary: "Pursuing Bachelor of Science in Computer Science with a focus on artificial intelligence and distributed systems.",
    description: "Relevant coursework: Design and Analysis of Algorithms, Operating Systems, Database Management Systems, Deep Learning, and Distributed Networks.",
    rawText: "Stanford University Unofficial Transcript - Alex Chen. Major: Computer Science. GPA: 3.92/4.00. Completed core curriculum including CS161 (Algorithms) and CS110 (Systems)."
  }
];

async function seed() {
  try {
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB for seeding.');

    // Clear existing data
    await User.deleteMany({});
    await Document.deleteMany({});
    await Skill.deleteMany({});
    await Relationship.deleteMany({});
    console.log('Cleared existing collections.');

    // Create default user alex_chen
    const hashedPassword = await bcrypt.hash('password', 10);
    const user = new User({
      username: 'alex_chen',
      password: hashedPassword,
      journeySynthesis: '',
      synthesisDirty: true
    });
    await user.save();
    console.log('Created default user: alex_chen (password: password)');

    // Insert Documents with userId
    const mockDocsWithUser = mockDocs.map(doc => ({
      ...doc,
      userId: user._id
    }));
    const insertedDocs = await Document.insertMany(mockDocsWithUser);
    console.log(`Inserted ${insertedDocs.length} mock documents.`);

    // Populate Skill Collection with userId
    for (const doc of insertedDocs) {
      if (doc.skills && doc.skills.length > 0) {
        for (const skillName of doc.skills) {
          await Skill.findOneAndUpdate(
            { name: skillName.trim(), userId: user._id },
            { 
              $addToSet: { documents: doc._id },
              $setOnInsert: { category: 'Extracted' }
            },
            { upsert: true, new: true }
          );
        }
      }
    }
    console.log('Populated Skill collections based on document tags.');

    // Add some explicit relationships
    const pythonCert = insertedDocs.find(d => d.title.includes('Python for Data Science'));
    const smartAgri = insertedDocs.find(d => d.title.includes('AI-Powered Smart Agriculturist'));
    const gcpCert = insertedDocs.find(d => d.title.includes('Google Cloud Associate Cloud Engineer'));
    const googleIntern = insertedDocs.find(d => d.title.includes('Software Engineer Intern'));

    if (pythonCert && smartAgri) {
      await new Relationship({
        userId: user._id,
        sourceId: pythonCert._id,
        targetId: smartAgri._id,
        type: 'applied_in',
        description: 'Applied python skills gained from certification into the agriculturist forecasting project.'
      }).save();
    }

    if (gcpCert && googleIntern) {
      await new Relationship({
        userId: user._id,
        sourceId: gcpCert._id,
        targetId: googleIntern._id,
        type: 'associated_with',
        description: 'Certified cloud engineering skills used during Kubernetes infrastructure tasks at Google.'
      }).save();
    }

    console.log('Inserted relationships.');
    console.log('Database seeding successfully finished.');
    process.exit(0);
  } catch (err) {
    console.error('Seeding error:', err);
    process.exit(1);
  }
}

seed();
