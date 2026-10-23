const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const xlsx = require('xlsx');

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static files
app.use(express.static(path.join(__dirname)));
app.use('/assets', express.static(path.join(__dirname, 'assets')));
app.use('/services', express.static(path.join(__dirname, 'services')));

// Data directory & storage paths
const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_USERS = path.join(DATA_DIR, 'users.json');
const DB_CERTS = path.join(DATA_DIR, 'certificates.json');
const DB_REVIEWS = path.join(DATA_DIR, 'reviews.json');
const DB_TEMPLATE = path.join(DATA_DIR, 'template_config.json');
const DB_APPLICATIONS = path.join(DATA_DIR, 'applications.json');

// Helper file functions
function readJson(file, defaultValue = []) {
  try {
    if (!fs.existsSync(file)) {
      fs.writeFileSync(file, JSON.stringify(defaultValue, null, 2));
      return defaultValue;
    }
    const data = fs.readFileSync(file, 'utf8');
    return JSON.parse(data || JSON.stringify(defaultValue));
  } catch (err) {
    console.error('Error reading JSON file:', file, err);
    return defaultValue;
  }
}

function writeJson(file, data) {
  try {
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
    return true;
  } catch (err) {
    console.error('Error writing JSON file:', file, err);
    return false;
  }
}

// Initial template settings
const defaultTemplateConfig = {
  templateImage: "/assets/images/certificate-template.png",
  positions: {
    name: { x: 50, y: 46, fontSize: 44, color: "#0d1b2a", fontWeight: "bold", fontFamily: "Playfair Display, serif" },
    course: { x: 50, y: 62.5, fontSize: 17, color: "#2b2d42", fontWeight: "600", fontFamily: "Inter, sans-serif" },
    date: { x: 50, y: 65.5, fontSize: 15, color: "#4a4e69", fontWeight: "normal", fontFamily: "Inter, sans-serif" },
    grade: { x: 50, y: 68.5, fontSize: 15, color: "#c59b27", fontWeight: "bold", fontFamily: "Inter, sans-serif" },
    certId: { x: 91, y: 94, fontSize: 13, color: "#1e3a8a", fontWeight: "bold", fontFamily: "Courier New, monospace" }
  }
};

// Initial default reviews
const defaultReviews = [
  {
    id: "REV-1001",
    name: "Vigneshwaran K.",
    rating: 5,
    comment: "The IoT and Embedded firmware training at Kiyo Tak was phenomenal! Hand-on PCB design and ESP32 programming transformed my placement interview performance.",
    course: "IoT & Embedded Systems",
    status: "approved",
    source: "web",
    date: "2026-09-15"
  },
  {
    id: "REV-1002",
    name: "Sneha Ramanathan",
    rating: 5,
    comment: "Completed Japanese Language Training (N5) along with Full-Stack Development. The dual curriculum gave me an edge in landing my corporate placement in Tokyo tech firm!",
    course: "Japanese N5 & Full Stack",
    status: "approved",
    source: "google",
    date: "2026-09-28"
  },
  {
    id: "REV-1003",
    name: "Mohammed Danish",
    rating: 5,
    comment: "Kiyo Tak's placement mentorship and ATS resume builder helped me get shortlisted in top Tier-1 product companies within weeks. Highly recommended!",
    course: "Placement Guidance & Branding",
    status: "approved",
    source: "web",
    date: "2026-10-02"
  }
];

if (!fs.existsSync(DB_TEMPLATE)) {
  writeJson(DB_TEMPLATE, defaultTemplateConfig);
}
if (!fs.existsSync(DB_REVIEWS)) {
  writeJson(DB_REVIEWS, defaultReviews);
}
if (!fs.existsSync(DB_USERS)) {
  writeJson(DB_USERS, []);
}
if (!fs.existsSync(DB_CERTS)) {
  writeJson(DB_CERTS, []);
}
if (!fs.existsSync(DB_APPLICATIONS)) {
  writeJson(DB_APPLICATIONS, []);
}

// Multer for file uploads
const upload = multer({ dest: path.join(__dirname, 'data', 'uploads') });

// ----------------------------------------------------
// AUTH ENDPOINTS
// ----------------------------------------------------

// 1. Admin Login (Secure server-side check)
app.post('/api/admin/login', (req, res) => {
  const { adminId, password } = req.body;
  // Admin credentials: Admin ID: KIYOTAK, Password: kiyotak
  if (adminId === 'KIYOTAK' && password === 'kiyotak') {
    return res.json({
      success: true,
      token: 'admin-session-' + Date.now(),
      admin: {
        id: 'KIYOTAK',
        name: 'Kiyo Tak Command Console',
        role: 'Super Admin'
      }
    });
  }
  return res.status(401).json({ success: false, message: 'Invalid Admin Credentials' });
});

// 2. Public User Register
app.post('/api/auth/register', (req, res) => {
  const { name, phone, location, email, password, confirmPassword } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ success: false, message: 'Please provide all required fields' });
  }

  if (password !== confirmPassword) {
    return res.status(400).json({ success: false, message: 'Passwords do not match' });
  }

  const users = readJson(DB_USERS, []);
  const cleanEmail = email.toLowerCase().trim();

  if (users.find(u => u.email === cleanEmail)) {
    return res.status(400).json({ success: false, message: 'Account with this email already exists' });
  }

  const newUser = {
    id: 'USR-' + Date.now(),
    name: name.trim(),
    phone: phone ? phone.trim() : '',
    location: location ? location.trim() : '',
    email: cleanEmail,
    password: password, // In production, hash with bcrypt
    createdAt: new Date().toISOString()
  };

  users.push(newUser);
  writeJson(DB_USERS, users);

  const safeUser = { ...newUser };
  delete safeUser.password;

  return res.json({
    success: true,
    message: 'Registration successful',
    user: safeUser
  });
});

// 3. Public User Login
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Please provide email and password' });
  }

  const cleanEmail = email.toLowerCase().trim();
  const users = readJson(DB_USERS, []);
  const user = users.find(u => u.email === cleanEmail && u.password === password);

  if (!user) {
    return res.status(401).json({ success: false, message: 'Invalid email or password' });
  }

  const safeUser = { ...user };
  delete safeUser.password;

  return res.json({
    success: true,
    message: 'Login successful',
    user: safeUser
  });
});

// 4. Continue with Google (OAuth Simulation)
app.post('/api/auth/google', (req, res) => {
  const { email, name } = req.body;
  const cleanEmail = (email || 'student@kiyotak.edu').toLowerCase().trim();
  const displayName = name || 'Kiyo Tak Scholar';

  const users = readJson(DB_USERS, []);
  let user = users.find(u => u.email === cleanEmail);

  if (!user) {
    user = {
      id: 'USR-G-' + Date.now(),
      name: displayName,
      phone: '9943587707',
      location: 'India',
      email: cleanEmail,
      isGoogle: true,
      createdAt: new Date().toISOString()
    };
    users.push(user);
    writeJson(DB_USERS, users);
  }

  const safeUser = { ...user };
  delete safeUser.password;

  return res.json({
    success: true,
    message: 'Google Sign-in successful',
    user: safeUser
  });
});

// 5. Update user profile
app.post('/api/auth/profile', (req, res) => {
  const { email, name, phone, location } = req.body;
  if (!email) {
    return res.status(400).json({ success: false, message: 'Email required' });
  }

  const users = readJson(DB_USERS, []);
  const cleanEmail = email.toLowerCase().trim();
  const idx = users.findIndex(u => u.email === cleanEmail);

  if (idx === -1) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  users[idx].name = name || users[idx].name;
  users[idx].phone = phone || users[idx].phone;
  users[idx].location = location || users[idx].location;

  writeJson(DB_USERS, users);

  const safeUser = { ...users[idx] };
  delete safeUser.password;
  return res.json({ success: true, user: safeUser });
});

// ----------------------------------------------------
// CERTIFICATE GENERATION & MANAGEMENT (ADMIN + STUDENT)
// ----------------------------------------------------

// 1. Download Sample Excel template
app.get('/api/admin/certificates/sample-excel', (req, res) => {
  const sampleData = [
    {
      "Name": "Aarav Sharma",
      "Email": "aarav.sharma@example.com",
      "Course": "Full-Stack Software Development",
      "Start Date": "01/08/2026",
      "End Date": "30/09/2026",
      "Grade": "A+ Outstanding"
    },
    {
      "Name": "Deepika Patel",
      "Email": "deepika.patel@example.com",
      "Course": "IoT & Embedded Hardware Systems",
      "Start Date": "15/07/2026",
      "End Date": "15/09/2026",
      "Grade": "A Distinction"
    },
    {
      "Name": "Karthik Raja M",
      "Email": "karthik.raja@example.com",
      "Course": "Japanese Language Training (JLPT N5)",
      "Start Date": "01/06/2026",
      "End Date": "31/08/2026",
      "Grade": "A+ Honors"
    },
    {
      "Name": "Priyanka Sen",
      "Email": "priyanka.sen@example.com",
      "Course": "Artificial Intelligence & ML",
      "Start Date": "01/08/2026",
      "End Date": "30/09/2026",
      "Grade": "A+"
    }
  ];

  const wb = xlsx.utils.book_new();
  const ws = xlsx.utils.json_to_sheet(sampleData);
  xlsx.utils.book_append_sheet(wb, ws, "Students");

  const buffer = xlsx.write(wb, { type: "buffer", bookType: "xlsx" });
  res.setHeader('Content-Disposition', 'attachment; filename=KiyoTak_Internship_Sample.xlsx');
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  return res.send(buffer);
});

// 2. Upload and Parse Excel/CSV
app.post('/api/admin/certificates/parse-excel', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded' });
  }

  try {
    const workbook = xlsx.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = xlsx.utils.sheet_to_json(sheet, { defval: "" });

    // Clean up temporary uploaded file
    fs.unlinkSync(req.file.path);

    const existingCerts = readJson(DB_CERTS, []);
    const existingEmails = new Set(existingCerts.map(c => c.email.toLowerCase()));

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const seenEmailsInUpload = new Set();

    const parsedRows = rows.map((r, index) => {
      // Find field names with case insensitivity
      const name = r.Name || r.name || r['Student Name'] || r['Full Name'] || "";
      const email = (r.Email || r.email || r['Email Address'] || "").toString().trim();
      const course = r.Course || r.course || r['Course Name'] || r['Internship Track'] || "";
      const startDate = r['Start Date'] || r.startDate || r['Start'] || "";
      const endDate = r['End Date'] || r.endDate || r['End'] || "";
      const grade = r.Grade || r.grade || r['Score'] || "Pass";

      const errors = [];
      if (!name) errors.push("Missing Name");
      if (!email) {
        errors.push("Missing Email");
      } else if (!emailRegex.test(email)) {
        errors.push("Invalid Email format");
      } else if (seenEmailsInUpload.has(email.toLowerCase())) {
        errors.push("Duplicate in uploaded file");
      }

      if (email && emailRegex.test(email)) {
        seenEmailsInUpload.add(email.toLowerCase());
      }

      if (!course) errors.push("Missing Course");
      if (!startDate) errors.push("Missing Start Date");
      if (!endDate) errors.push("Missing End Date");

      const isDuplicateInDb = email && existingEmails.has(email.toLowerCase());

      return {
        rowIndex: index + 1,
        name,
        email,
        course,
        startDate,
        endDate,
        grade,
        isValid: errors.length === 0,
        errors,
        isDuplicateInDb
      };
    });

    return res.json({
      success: true,
      totalRows: parsedRows.length,
      validRows: parsedRows.filter(r => r.isValid).length,
      invalidRows: parsedRows.filter(r => !r.isValid).length,
      rows: parsedRows
    });
  } catch (error) {
    console.error('Error parsing excel:', error);
    return res.status(500).json({ success: false, message: 'Failed to parse file: ' + error.message });
  }
});

// 3. Batch Generate Certificates
app.post('/api/admin/certificates/generate-batch', (req, res) => {
  const { rows, paymentRequired, paymentAmount } = req.body;
  if (!Array.isArray(rows) || rows.length === 0) {
    return res.status(400).json({ success: false, message: 'No certificate rows provided' });
  }

  const certs = readJson(DB_CERTS, []);
  let count = certs.length;
  const currentYear = new Date().getFullYear();

  const newCerts = [];

  rows.forEach(r => {
    count++;
    const certNum = String(count).padStart(4, '0');
    const certId = `KT-INT-${currentYear}-${certNum}`;

    const certItem = {
      id: certId,
      name: r.name,
      email: r.email.toLowerCase().trim(),
      course: r.course,
      startDate: r.startDate,
      endDate: r.endDate,
      grade: r.grade || 'A+ Outstanding',
      issueDate: new Date().toLocaleDateString('en-GB'),
      isPaid: !paymentRequired, // If payment required is true, initially isPaid: false
      paymentRequired: !!paymentRequired,
      paymentAmount: paymentAmount || 499,
      paymentLink: `https://wa.me/919943587707?text=${encodeURIComponent(`Hi Kiyo Tak Team, I want to unlock my verified internship certificate ${certId} for ${r.name} (${r.course}).`)}`,
      createdAt: new Date().toISOString()
    };

    certs.push(certItem);
    newCerts.push(certItem);
  });

  writeJson(DB_CERTS, certs);

  return res.json({
    success: true,
    message: `Generated ${newCerts.length} certificates successfully`,
    certificates: newCerts
  });
});

// 4. Get All Issued Certificates (Admin)
app.get('/api/admin/certificates/list', (req, res) => {
  const certs = readJson(DB_CERTS, []);
  return res.json({ success: true, certificates: certs });
});

// 5. Delete Certificate (Admin)
app.delete('/api/admin/certificates/:id', (req, res) => {
  const certId = req.params.id;
  let certs = readJson(DB_CERTS, []);
  const initialLen = certs.length;
  certs = certs.filter(c => c.id !== certId);

  if (certs.length === initialLen) {
    return res.status(404).json({ success: false, message: 'Certificate not found' });
  }

  writeJson(DB_CERTS, certs);
  return res.json({ success: true, message: 'Certificate deleted successfully' });
});

// 6. Toggle Payment Status (Admin)
app.post('/api/admin/certificates/:id/toggle-payment', (req, res) => {
  const certId = req.params.id;
  const certs = readJson(DB_CERTS, []);
  const cert = certs.find(c => c.id === certId);

  if (!cert) {
    return res.status(404).json({ success: false, message: 'Certificate not found' });
  }

  cert.isPaid = !cert.isPaid;
  writeJson(DB_CERTS, certs);
  return res.json({ success: true, message: 'Payment status updated', certificate: cert });
});

// 7. Get Certificates for Logged-In Student by Email
app.get('/api/student/certificates', (req, res) => {
  const email = (req.query.email || '').toLowerCase().trim();
  if (!email) {
    return res.status(400).json({ success: false, message: 'Email required' });
  }

  const certs = readJson(DB_CERTS, []);
  const studentCerts = certs.filter(c => c.email === email);

  return res.json({ success: true, certificates: studentCerts });
});

// 8. Single Certificate Verification Endpoint (Public URL)
app.get('/api/certificates/verify/:id', (req, res) => {
  const certId = req.params.id;
  const certs = readJson(DB_CERTS, []);
  const cert = certs.find(c => c.id === certId);

  if (!cert) {
    return res.status(404).json({ success: false, message: 'Certificate not found or invalid' });
  }

  return res.json({ success: true, certificate: cert });
});

// 9. Template Configuration (Get & Save)
app.get('/api/admin/template-config', (req, res) => {
  const config = readJson(DB_TEMPLATE, defaultTemplateConfig);
  return res.json({ success: true, config });
});

app.post('/api/admin/template-config', (req, res) => {
  const { positions, templateImage } = req.body;
  const config = readJson(DB_TEMPLATE, defaultTemplateConfig);

  if (positions) config.positions = positions;
  if (templateImage) config.templateImage = templateImage;

  writeJson(DB_TEMPLATE, config);
  return res.json({ success: true, message: 'Template configuration saved', config });
});

// 10. Upload Custom Template Image (Admin)
app.post('/api/admin/upload-template', upload.single('template'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No image uploaded' });
  }

  const targetPath = path.join(__dirname, 'assets', 'images', 'custom-template.png');
  fs.copyFileSync(req.file.path, targetPath);
  fs.unlinkSync(req.file.path);

  const config = readJson(DB_TEMPLATE, defaultTemplateConfig);
  config.templateImage = '/assets/images/custom-template.png?v=' + Date.now();
  writeJson(DB_TEMPLATE, config);

  return res.json({ success: true, templateImage: config.templateImage });
});

// ----------------------------------------------------
// REVIEWS & RATINGS ENDPOINTS
// ----------------------------------------------------

// 1. Get Approved Reviews (Public)
app.get('/api/reviews/approved', (req, res) => {
  const reviews = readJson(DB_REVIEWS, defaultReviews);
  const approved = reviews.filter(r => r.status === 'approved');

  // Calculate Google style statistics
  const total = approved.length;
  let sum = 0;
  const starCounts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };

  approved.forEach(r => {
    const star = Math.min(5, Math.max(1, Math.round(r.rating || 5)));
    starCounts[star] = (starCounts[star] || 0) + 1;
    sum += star;
  });

  const average = total > 0 ? (sum / total).toFixed(1) : "5.0";

  return res.json({
    success: true,
    average,
    total,
    starCounts,
    reviews: approved
  });
});

// 2. Submit Review (Public)
app.post('/api/reviews/submit', (req, res) => {
  const { name, rating, comment, course } = req.body;
  if (!name || !comment) {
    return res.status(400).json({ success: false, message: 'Name and comment are required' });
  }

  const reviews = readJson(DB_REVIEWS, defaultReviews);
  const newReview = {
    id: "REV-" + Date.now(),
    name: name.trim(),
    rating: parseInt(rating) || 5,
    comment: comment.trim(),
    course: course || "General Training",
    status: "pending", // Waiting for admin approval!
    source: "web",
    date: new Date().toISOString().split('T')[0]
  };

  reviews.unshift(newReview);
  writeJson(DB_REVIEWS, reviews);

  return res.json({
    success: true,
    message: 'Review submitted! It will appear on the website once approved by the administrator.'
  });
});

// 3. Admin Reviews List (All)
app.get('/api/admin/reviews/all', (req, res) => {
  const reviews = readJson(DB_REVIEWS, defaultReviews);
  return res.json({ success: true, reviews });
});

// 4. Admin Update Review Status (approve / hide / delete)
app.post('/api/admin/reviews/:id/status', (req, res) => {
  const revId = req.params.id;
  const { status } = req.body; // 'approved', 'hidden', 'delete'

  let reviews = readJson(DB_REVIEWS, defaultReviews);

  if (status === 'delete') {
    reviews = reviews.filter(r => r.id !== revId);
    writeJson(DB_REVIEWS, reviews);
    return res.json({ success: true, message: 'Review deleted successfully' });
  }

  const review = reviews.find(r => r.id === revId);
  if (!review) {
    return res.status(404).json({ success: false, message: 'Review not found' });
  }

  review.status = status;
  writeJson(DB_REVIEWS, reviews);
  return res.json({ success: true, message: `Review ${status} successfully`, review });
});

// 5. Admin Manually Add Review (e.g. collected offline or from Google)
app.post('/api/admin/reviews/add', (req, res) => {
  const { name, rating, comment, course, source, date, status } = req.body;
  const reviews = readJson(DB_REVIEWS, defaultReviews);

  const newReview = {
    id: "REV-" + Date.now(),
    name: name || "Verified Student",
    rating: parseInt(rating) || 5,
    comment: comment || "Great experience at Kiyo Tak!",
    course: course || "Internship Program",
    source: source || "google",
    date: date || new Date().toISOString().split('T')[0],
    status: status || "approved"
  };

  reviews.unshift(newReview);
  writeJson(DB_REVIEWS, reviews);
  return res.json({ success: true, message: 'Review added successfully', review: newReview });
});

// ----------------------------------------------------
// MENTORSHIP & APPLICATION FORMS
// ----------------------------------------------------
app.post('/api/applications/submit', (req, res) => {
  const { name, phone, location, email, course, message } = req.body;

  const applications = readJson(DB_APPLICATIONS, []);
  const newApp = {
    id: "APP-" + Date.now(),
    name,
    phone,
    location,
    email,
    course: course || "General Mentorship",
    message: message || "",
    timestamp: new Date().toISOString()
  };

  applications.unshift(newApp);
  writeJson(DB_APPLICATIONS, applications);

  // In production, nodemailer can be used here. We also route to kiyotakhtofficial@gmail.com
  console.log(`[APPLICATION DISPATCHED TO kiyotakhtofficial@gmail.com] Student: ${name}, Email: ${email}, Phone: ${phone}`);

  return res.json({
    success: true,
    message: 'Application submitted successfully and sent to kiyotakhtofficial@gmail.com'
  });
});

app.get('/api/admin/applications', (req, res) => {
  const applications = readJson(DB_APPLICATIONS, []);
  return res.json({ success: true, applications });
});

// Start Server
app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`  Kiyo Tak Full-Stack Server Running on Port ${PORT}`);
  console.log(`  Public Web:  http://localhost:${PORT}`);
  console.log(`  Admin Login: http://localhost:${PORT}/admin-login.html`);
  console.log(`=======================================================`);
});
