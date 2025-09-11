const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Gazetted = require('../models/EmployeeGaz');
const NonGazetted = require('../models/EmployeeNonGaz');
const path = require('path');
const fs = require('fs');
const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const { generateIdCard } = require('../utils/generateIdCard');

// Helper function for handling errors
const handleError = (res, error, message) => {
  console.error(message, error);
  res.status(500).json({ 
    success: false, 
    error: error.message || 'Internal server error' 
  });
};
// Check Gazetted application status
router.post('/gazetted', async (req, res) => {
  try {
    const { applicationId, dob } = req.body;
    
    if (!applicationId || !dob) {
      return res.status(400).json({
        success: false,
        error: 'Application ID and Date of Birth are required'
      });
    }

    // Build query conditions
    const conditions = {
      dob: new Date(dob),
      $or: []
    };

    // Check if applicationId is a valid ObjectId
    if (mongoose.Types.ObjectId.isValid(applicationId)) {
      conditions.$or.push({ _id: applicationId });
    }
    
    // Always search by applicationNo and ruid
    conditions.$or.push(
      { applicationNo: applicationId },
      { ruid: applicationId }
    );

    const record = await Gazetted.findOne(conditions);
    
    if (!record) {
      return res.status(404).json({ 
        success: false, 
        error: 'No application found with the provided details' 
      });
    }
    
    res.json({ 
      success: true, 
      data: record 
    });
  } catch (error) {
    console.error('Status check error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Check Non-Gazetted application status
router.post('/non-gazetted', async (req, res) => {
  try {
    const { applicationId, dob } = req.body;
    
    if (!applicationId || !dob) {
      return res.status(400).json({
        success: false,
        error: 'Application ID and Date of Birth are required'
      });
    }

    // Build query conditions
    const conditions = {
      dob: new Date(dob),
      $or: []
    };

    // Check if applicationId is a valid ObjectId
    if (mongoose.Types.ObjectId.isValid(applicationId)) {
      conditions.$or.push({ _id: applicationId });
    }
    
    // Always search by applicationNo and empNo
    conditions.$or.push(
      { applicationNo: applicationId },
      { empNo: applicationId }
    );

    const record = await NonGazetted.findOne(conditions);
    
    if (!record) {
      return res.status(404).json({ 
        success: false, 
        error: 'No application found with the provided details' 
      });
    }
    
    res.json({ 
      success: true, 
      data: record 
    });
  } catch (error) {
    console.error('Status check error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// --- Helper functions (shared by both single and bulk ID card generation) ---
function renderHindiText(doc, hasHindiFont, text, x, y, options = {}) {
  if (hasHindiFont && text) {
    doc.font('Hindi')
       .fontSize(options.fontSize || 8)
       .text(text, x, y, options);
  } else {
    doc.font('Helvetica')
       .fontSize(options.fontSize || 8)
       .text('', x, y, options);
  }
}

function formatDateForDisplay(dateString) {
  if (!dateString) return 'N/A';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'N/A';
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  } catch (error) {
    return 'N/A';
  }
}

function wrapText(doc, text, x, y, maxWidth, lineHeight) {
  const words = text.split(' ');
  let line = '';
  let currentY = y;
  for (let i = 0; i < words.length; i++) {
    const testLine = line + words[i] + ' ';
    const testWidth = doc.widthOfString(testLine);
    if (testWidth > maxWidth && i > 0) {
      doc.text(line, x, currentY);
      currentY += lineHeight;
      line = words[i] + ' ';
    } else {
      line = testLine;
    }
  }
  doc.text(line, x, currentY);
  return currentY + lineHeight;
}

// --- The full ID card drawing function (copied from single card route) ---
function drawFullIdCard(doc, application, type, hasHindiFont) {
  // ===== FRONT SIDE =====
  doc.rect(0, 0, doc.page.width, doc.page.height)
     .fill('#ffffff');

  // Main border
  doc.rect(1, 1, doc.page.width - 2, doc.page.height - 2)
     .strokeColor('#000000')
     .lineWidth(1.5)
     .stroke();

  // Header section with logo and text
  const logoX = 8;
  const logoY = 8;
  // Indian Railway logo (circular with spokes)
  doc.circle(logoX + 15, logoY + 15, 12)
     .strokeColor('#cc0000')
     .fillColor('#cc0000')
     .fillAndStroke();
  // Inner white circle
  doc.circle(logoX + 15, logoY + 15, 10)
     .strokeColor('#ffffff')
     .fillColor('#ffffff')
     .fillAndStroke();
  // Railway wheel spokes
  doc.strokeColor('#cc0000').lineWidth(1);
  for (let i = 0; i < 12; i++) {
    const angle = (i * Math.PI) / 6;
    const x1 = logoX + 15 + Math.cos(angle) * 4;
    const y1 = logoY + 15 + Math.sin(angle) * 4;
    const x2 = logoX + 15 + Math.cos(angle) * 9;
    const y2 = logoY + 15 + Math.sin(angle) * 9;
    doc.moveTo(x1, y1).lineTo(x2, y2).stroke();
  }
  // Header text - Hindi and English
  renderHindiText(doc, hasHindiFont, 'पूर्व तट रेलवे', logoX + 35, logoY + 5, { fontSize: 10 });
  doc.fillColor('#000000')
     .font('Helvetica-Bold')
     .fontSize(11)
     .text('East Coast Railway', logoX + 35, logoY + 18, { width: 140 });
  // Department section - Light blue background stripe (full width)
  doc.rect(0, 40, doc.page.width, 20)
     .fill('#87CEEB');
  // Department labels in black text
  doc.fillColor('#000000');
  renderHindiText(doc, hasHindiFont, 'विभाग', 10, 43, { fontSize: 8 });
  doc.font('Helvetica-Bold')
     .fontSize(8)
     .text('DEPARTMENT', 10, 52);
  renderHindiText(doc, hasHindiFont, 'व्यावसायिक', 110, 43, { fontSize: 9 });
  doc.font('Helvetica-Bold')
     .fontSize(9)
     .fillColor('#0000ff')
     .text('COMMERCIAL', 110, 52);
  // Identity Card section - Deep blue background stripe
  doc.rect(0, 60, doc.page.width, 20)
     .fill('#191970');
  // Identity Card labels in white text (since background is dark)
  doc.fillColor('#ffffff');
  renderHindiText(doc, hasHindiFont, 'पहचान पत्र', 10, 63, { fontSize: 8 });
  doc.font('Helvetica-Bold')
     .fontSize(8)
     .text('IDENTITY CARD', 10, 72);
  renderHindiText(doc, hasHindiFont, 'प्र.का', 180, 63, { fontSize: 8 });
  doc.font('Helvetica-Bold')
     .fontSize(8)
     .fillColor('#ffffff')
     .text('H.Q. SI.No. COMMERCIAL-', 180, 72);
  // Photo section (positioned on the left side of employee details)
  const photoX = 8;
  const photoY = 85;
  const photoWidth = 50;
  const photoHeight = 60;
  doc.rect(photoX, photoY, photoWidth, photoHeight)
     .strokeColor('#000000')
     .lineWidth(1)
     .stroke();
  if (application.photo) {
    const photoPath = path.join(__dirname, '../public/uploads', application.photo);
    if (fs.existsSync(photoPath)) {
      doc.image(photoPath, photoX + 1, photoY + 1, {
        width: photoWidth - 2,
        height: photoHeight - 2,
        align: 'center',
        valign: 'center'
      });
    } else {
      doc.fillColor('#e0e0e0')
         .rect(photoX + 1, photoY + 1, photoWidth - 2, photoHeight - 2)
         .fill()
         .fillColor('#666666')
         .fontSize(8)
         .text('Photo', photoX + 1, photoY + 28, {
           width: photoWidth - 2,
           align: 'center'
         });
    }
  }
  // Employee details section (to the right of photo)
  let currentY = 85;
  const detailsStartX = 65;
  const dataStartX = 125;
  // Name row
  renderHindiText(doc, hasHindiFont, 'नाम', detailsStartX + 2, currentY + 2, { fontSize: 7 });
  doc.fillColor('#000000')
     .font('Helvetica')
     .fontSize(7)
     .text('Name', detailsStartX + 25, currentY + 2);
  doc.fillColor('#000000')
     .font('Helvetica-Bold')
     .fontSize(8)
     .text(`: ${application.name?.toUpperCase() || 'N/A'}`, dataStartX, currentY + 4);
  currentY += 12;
  // Designation row
  renderHindiText(doc, hasHindiFont, 'पद नाम', detailsStartX + 2, currentY + 2, { fontSize: 7 });
  doc.fillColor('#000000')
     .font('Helvetica')
     .fontSize(7)
     .text('Desig', detailsStartX + 25, currentY + 2);
  doc.fillColor('#000000')
     .font('Helvetica-Bold')
     .fontSize(8)
     .text(`: ${application.designation || 'N/A'}`, dataStartX, currentY + 4);
  currentY += 12;
  // ID Number row
  const idLabel = type === 'gazetted' ? 'P.F.No.' : 'Emp No.';
  renderHindiText(doc, hasHindiFont, 'पी.एफ.नं', detailsStartX + 2, currentY + 2, { fontSize: 7 });
  doc.fillColor('#000000')
     .font('Helvetica')
     .fontSize(7)
     .text(idLabel, detailsStartX + 25, currentY + 2);
  doc.fillColor('#000000')
     .font('Helvetica-Bold')
     .fontSize(8)
     .text(`: ${type === 'gazetted' ? application.ruid : application.empNo || 'N/A'}`, dataStartX, currentY + 4);
  currentY += 12;
  // Station row
  renderHindiText(doc, hasHindiFont, 'स्टेशन', detailsStartX + 2, currentY + 2, { fontSize: 7 });
  doc.fillColor('#000000')
     .font('Helvetica')
     .fontSize(7)
     .text('Station', detailsStartX + 25, currentY + 2);
  doc.fillColor('#000000')
     .font('Helvetica-Bold')
     .fontSize(8)
     .text(`: ${application.station?.toUpperCase() || 'N/A'}`, dataStartX, currentY + 4);
  currentY += 12;
  // Date of Birth row
  renderHindiText(doc, hasHindiFont, 'जन्म तारीख', detailsStartX + 2, currentY + 2, { fontSize: 6 });
  doc.fillColor('#000000')
     .font('Helvetica')
     .fontSize(7)
     .text('D.O.B', detailsStartX + 25, currentY + 2);
  doc.fillColor('#000000')
     .font('Helvetica-Bold')
     .fontSize(8)
     .text(`: ${formatDateForDisplay(application.dob)}`, dataStartX, currentY + 4);
  // Bottom signature section
  const bottomY = doc.page.height - 25;
  // Left signature section
  renderHindiText(doc, hasHindiFont, 'कार्डधारक का हस्ताक्षर', 8, bottomY, { fontSize: 6 });
  doc.fillColor('#000000')
     .font('Helvetica')
     .fontSize(6)
     .text('Signature of the Card Holder', 8, bottomY + 8);
  // Right signature section  
  renderHindiText(doc, hasHindiFont, 'जारीकर्ता प्राधिकारी का हस्ताक्षर', doc.page.width - 95, bottomY, { fontSize: 6 });
  doc.fillColor('#000000')
     .font('Helvetica')
     .fontSize(6)
     .text('Signature of Issuing Authority', doc.page.width - 95, bottomY + 8);
  // Add signature if available
  if (application.sign) {
    const signPath = path.join(__dirname, '../public/uploads', application.sign);
    if (fs.existsSync(signPath)) {
      doc.image(signPath, 8, bottomY - 15, {
        width: 45,
        height: 12
      });
    }
  }
  // ===== BACK SIDE =====
  doc.addPage({
    layout: 'portrait',
    size: [303.307, 191.811],
    margins: 0
  });
  doc.rect(0, 0, doc.page.width, doc.page.height)
     .fill('#ffffff');
  // Main border
  doc.rect(1, 1, doc.page.width - 2, doc.page.height - 2)
     .strokeColor('#000000')
     .lineWidth(1.5)
     .stroke();
  // Family details header
  doc.fillColor('#000000')
     .font('Helvetica-Bold')
     .fontSize(9);
  renderHindiText(doc, hasHindiFont, 'परिवार का विवरण', 0, 15, { 
    align: 'center',
    width: doc.page.width,
    fontSize: 9
  });
  doc.fillColor('#000000')
     .font('Helvetica-Bold')
     .fontSize(9)
     .text('Details of the family', 0, 25, {
       align: 'center',
       width: doc.page.width
     });
  // Prepare family details data including identification mark
  const familyDetails = [];
  // Always include self as first entry
  familyDetails.push({
    relation: 'Self',
    name: application.name,
    dob: application.dob,
    bloodGroup: application.bloodGroup || 'N/A',
    identificationMark: application.identificationMark || 'N/A',
    remarks: 'Employee'
  });
  // Add family members from application if they exist
  if (application.family && Array.isArray(application.family)) {
    familyDetails.push(...application.family.map(member => ({
      relation: member.relationship || 'Family',
      name: member.name || 'N/A',
      dob: member.dob || null,
      bloodGroup: member.bloodGroup || 'N/A',
      identificationMark: member.identificationMark || 'N/A',
      remarks: member.remarks || ''
    })));
  }
  // Calculate available space
  const maxFamilyDetailsHeight = doc.page.height - 100;
  const rowHeight = 10;
  const maxFamilyRows = Math.floor(maxFamilyDetailsHeight / rowHeight);
  // Table headers
  let familyY = 55;
  const col1X = 12;  // Relation
  const col2X = 60;  // Name
  const col3X = 110; // DOB
  const col4X = 160; // Blood Group
  const col5X = 210; // Identification Mark
  doc.fillColor('#000000')
     .font('Helvetica-Bold')
     .fontSize(7)
     .text('Relation', col1X, familyY)
     .text('Name', col2X, familyY)
     .text('DOB', col3X, familyY)
     .text('Blood', col4X, familyY)
     .text('ID Mark', col5X, familyY);
  familyY += 8;
  // Display family members (limited to available space)
  doc.font('Helvetica').fontSize(7);
  for (let i = 0; i < Math.min(familyDetails.length, maxFamilyRows); i++) {
    const member = familyDetails[i];
    doc.text(member.relation, col1X, familyY)
       .text(member.name, col2X, familyY)
       .text(formatDateForDisplay(member.dob), col3X, familyY)
       .text(member.bloodGroup, col4X, familyY)
       .text(member.identificationMark, col5X, familyY);
    familyY += rowHeight;
  }
  // Emergency contact
  doc.fillColor('#000000')
     .font('Helvetica-Bold')
     .fontSize(8)
     .text(`Emergency Contact: ${application.emergencyContactNumber || 'N/A'}`, 12, familyY + 5);
  // QR Code
  if (application._qrCodeDataURL) {
    const qrY = Math.max(familyY + 15, 70);
    doc.image(application._qrCodeDataURL, doc.page.width - 75, qrY, {
      width: 60,
      height: 60
    });
  }
  // Address section
  const addressY = Math.max(familyY + 25, 130);
  renderHindiText(doc, hasHindiFont, 'घर का पता', 12, addressY, { fontSize: 7 });
  doc.fillColor('#000000')
     .font('Helvetica')
     .fontSize(7)
     .text('/Res.Address: ', 45, addressY);
  const addressText = application.address || 'Address not provided';
  const finalY = wrapText(doc, addressText, 12, addressY + 10, doc.page.width - 24, 10);
  // "If found" text
  const foundY = Math.max(finalY, doc.page.height - 15);
  renderHindiText(doc, hasHindiFont, 'यदि यह कार्ड मिले तो कृपया निकटतम पोस्ट बॉक्स में डाल दें।', 12, foundY, { fontSize: 6 });
  doc.fillColor('#000000')
     .font('Helvetica')
     .fontSize(6)
     .text('If found please drop it in the nearest Post Box', 12, foundY + 8);
}

// Enhanced PDF generation endpoint
router.post('/generate-bulk-id-cards', async (req, res) => {
  try {
    const { filters } = req.body;
    if (!filters || !filters.type) {
      return res.status(400).json({ success: false, error: 'Missing required filters' });
    }

    // Fetch all applications of the requested type
    let applications = [];
    let type = filters.type;
    if (type === 'gazetted') {
      applications = await Gazetted.find({});
    } else if (type === 'non-gazetted') {
      applications = await NonGazetted.find({});
    } else {
      return res.status(400).json({ success: false, error: 'Invalid type' });
    }

    if (!applications.length) {
      return res.status(404).json({ success: false, error: 'No applications found' });
    }

    // Register Hindi fonts
    const doc = new PDFDocument({ autoFirstPage: false });
    const fontDir = path.join(__dirname, '../public/fonts');
    const hindiFontPath = path.join(fontDir, 'NotoSansDevanagari-Regular.ttf');
    const hindiBoldFontPath = path.join(fontDir, 'NotoSansDevanagari-Bold.ttf');
    let hasHindiFont = false;
    if (fs.existsSync(hindiFontPath)) {
      doc.registerFont('Hindi', hindiFontPath);
      hasHindiFont = true;
    }
    if (fs.existsSync(hindiBoldFontPath)) {
      doc.registerFont('HindiBold', hindiBoldFontPath);
    }

    // Pre-generate QR codes for all applications
    for (const app of applications) {
      const qrData = JSON.stringify({
        name: app.name,
        designation: app.designation,
        idNumber: app.applicationNo || app.empNo || app.ruid,
        department: app.department || 'COMMERCIAL',
        bloodGroup: app.bloodGroup || 'N/A',
        emergencyContact: app.emergencyContactNumber || 'N/A'
      });
      app._qrCodeDataURL = await QRCode.toDataURL(qrData, {
        width: 120,
        margin: 1,
        color: { dark: '#000000', light: '#ffffff' }
      });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="ECoR_${type}_IDs.pdf"`);
    doc.pipe(res);

    for (const app of applications) {
      doc.addPage({
        layout: 'portrait',
        size: [303.307, 191.811],
        margins: 0
      });
      drawFullIdCard(doc, app, type, hasHindiFont);
    }
    doc.end();
  } catch (error) {
    console.error('PDF generation error:', error);
    res.status(500).json({ success: false, error: 'Failed to generate PDF' });
  }
});

// Helper function to parse date input
const parseDateInput = (dateInput) => {
  if (!dateInput) return null;
  
  if (dateInput instanceof Date || !isNaN(new Date(dateInput).getTime())) {
    return new Date(dateInput);
  }
  
  if (/^\d{2}-\d{2}-\d{4}$/.test(dateInput)) {
    const [day, month, year] = dateInput.split('-');
    return new Date(`${year}-${month}-${day}`);
  }
  
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
    return new Date(dateInput);
  }
  
  return new Date(dateInput);
};

// Helper function to format dates for display
const formatDate = (date) => {
  if (!date) return 'N/A';
  const d = new Date(date);
  return `${d.getDate().toString().padStart(2, '0')}-${(d.getMonth()+1).toString().padStart(2, '0')}-${d.getFullYear()}`;
};

// Admin login
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({
      success: false,
      error: 'Username and password are required'
    });
  }

  if (username === process.env.ADMIN_USER && password === process.env.ADMIN_PASS) {
    res.json({ 
      success: true,
      message: 'Login successful',
      token: 'admin-auth-token'
    });
  } else {
    res.status(401).json({ 
      success: false, 
      error: 'Invalid credentials' 
    });
  }
});

// Submit Gazetted Application
router.post('/submit-gazetted', async (req, res) => {
  try {
    let { dob, family, ...rest } = req.body;
    
    const parsedDob = parseDateInput(dob);
    if (!parsedDob || isNaN(parsedDob.getTime())) {
      return res.status(400).json({
        success: false,
        error: 'Invalid date of birth format. Please use DD-MM-YYYY or any standard date format'
      });
    }

    // Parse family data including identification mark
    const parsedFamily = family ? JSON.parse(family).map(member => ({
      name: member.name,
      relationship: member.relationship,
      dob: member.dob,
      bloodGroup: member.bloodGroup,
      identificationMark: member.identificationMark || ''
    })) : [];

    const newApplication = new Gazetted({
      ...rest,
      dob: parsedDob,
      family: parsedFamily,
      status: 'Pending'
    });

    await newApplication.validate();
    const savedApplication = await newApplication.save();

    res.status(201).json({
      success: true,
      message: 'Gazetted application submitted successfully',
      data: savedApplication
    });

  } catch (error) {
    if (error.name === 'ValidationError') {
      const errors = {};
      Object.keys(error.errors).forEach(field => {
        errors[field] = error.errors[field].message;
      });
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors
      });
    }
    
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        success: false,
        error: 'Duplicate value',
        message: `${field === 'ruid' ? 'RUID' : 'Application number'} already exists`
      });
    }

    handleError(res, error, 'Error submitting gazetted application:');
  }
});

// Submit Non-Gazetted Application
router.post('/submit-non-gazetted', async (req, res) => {
  try {
    let { dob, family, ...rest } = req.body;
    
    const parsedDob = parseDateInput(dob);
    if (!parsedDob || isNaN(parsedDob.getTime())) {
      return res.status(400).json({
        success: false,
        error: 'Invalid date of birth format. Please use DD-MM-YYYY or any standard date format'
      });
    }

    // Parse family data including identification mark
    const parsedFamily = family ? JSON.parse(family).map(member => ({
      name: member.name,
      relationship: member.relationship,
      dob: member.dob,
      bloodGroup: member.bloodGroup,
      identificationMark: member.identificationMark || ''
    })) : [];

    const newApplication = new NonGazetted({
      ...rest,
      dob: parsedDob,
      family: parsedFamily,
      status: 'Pending'
    });

    await newApplication.validate();
    const savedApplication = await newApplication.save();

    res.status(201).json({
      success: true,
      message: 'Non-Gazetted application submitted successfully',
      data: savedApplication
    });

  } catch (error) {
    if (error.name === 'ValidationError') {
      const errors = {};
      Object.keys(error.errors).forEach(field => {
        errors[field] = error.errors[field].message;
      });
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors
      });
    }
    
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        success: false,
        error: 'Duplicate value',
        message: `${field === 'empNo' ? 'Employee number' : 'Application number'} already exists`
      });
    }

    handleError(res, error, 'Error submitting non-gazetted application:');
  }
});

// Get all applications with filters
router.get('/applications', async (req, res) => {
  try {
    const { sortBy = 'createdAt', sortOrder = 'desc', status, type, search } = req.query;
    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };
    const filters = {};

    if (status) filters.status = status;
    if (search) {
      const searchRegex = new RegExp(search, 'i');
      filters.$or = [
        { name: searchRegex },
        { applicationNo: searchRegex },
        { ruid: searchRegex },
        { empNo: searchRegex }
      ];
    }

    const [gazetted, nonGazetted] = await Promise.all([
      type !== 'non-gazetted' ? Gazetted.find(filters).sort(sort) : Promise.resolve([]),
      type !== 'gazetted' ? NonGazetted.find(filters).sort(sort) : Promise.resolve([])
    ]);

    const data = [
      ...gazetted.map(app => ({ 
        ...app.toObject(), 
        formattedDob: formatDate(app.dob),
        type: 'gazetted' 
      })),
      ...nonGazetted.map(app => ({ 
        ...app.toObject(), 
        formattedDob: formatDate(app.dob),
        type: 'non-gazetted' 
      }))
    ];

    res.json({ success: true, data });
  } catch (error) {
    handleError(res, error, 'Error fetching applications:');
  }
});

// Get single application by ID
router.get('/applications/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    let application = await Gazetted.findById(id);
    let type = 'gazetted';
    
    if (!application) {
      application = await NonGazetted.findById(id);
      type = 'non-gazetted';
    }
    
    if (!application) {
      return res.status(404).json({ 
        success: false, 
        error: 'Application not found' 
      });
    }
    
    res.json({ 
      success: true, 
      data: { 
        ...application.toObject(), 
        formattedDob: formatDate(application.dob),
        type 
      } 
    });
  } catch (error) {
    handleError(res, error, 'Error fetching application:');
  }
});

// Get pending Gazetted applications
router.get('/gazetted', async (req, res) => {
  try {
    const data = await Gazetted.find({ status: 'Pending' }).sort({ createdAt: -1 });
    res.json({ 
      success: true, 
      data: data.map(app => ({
        ...app.toObject(),
        formattedDob: formatDate(app.dob)
      }))
    });
  } catch (error) {
    handleError(res, error, 'Error fetching gazetted applications:');
  }
});

// Get pending Non-Gazetted applications
router.get('/non-gazetted', async (req, res) => {
  try {
    const data = await NonGazetted.find({ status: 'Pending' }).sort({ createdAt: -1 });
    res.json({ 
      success: true, 
      data: data.map(app => ({
        ...app.toObject(),
        formattedDob: formatDate(app.dob)
      }))
    });
  } catch (error) {
    handleError(res, error, 'Error fetching non-gazetted applications:');
  }
});

// Get approved applications
router.get('/approved', async (req, res) => {
  try {
    const [gazetted, nonGazetted] = await Promise.all([
      Gazetted.find({ status: 'Approved' }).sort({ approvedAt: -1 }),
      NonGazetted.find({ status: 'Approved' }).sort({ approvedAt: -1 })
    ]);

    const data = [
      ...gazetted.map(app => ({ 
        ...app.toObject(), 
        formattedDob: formatDate(app.dob),
        type: 'gazetted' 
      })),
      ...nonGazetted.map(app => ({ 
        ...app.toObject(), 
        formattedDob: formatDate(app.dob),
        type: 'non-gazetted' 
      }))
    ];

    res.json({ success: true, data });
  } catch (error) {
    handleError(res, error, 'Error fetching approved applications:');
  }
});

// Get rejected applications
router.get('/rejected', async (req, res) => {
  try {
    const [gazetted, nonGazetted] = await Promise.all([
      Gazetted.find({ status: 'Rejected' }).sort({ rejectedAt: -1 }),
      NonGazetted.find({ status: 'Rejected' }).sort({ rejectedAt: -1 })
    ]);

    const data = [
      ...gazetted.map(app => ({ 
        ...app.toObject(), 
        formattedDob: formatDate(app.dob),
        type: 'gazetted' 
      })),
      ...nonGazetted.map(app => ({ 
        ...app.toObject(), 
        formattedDob: formatDate(app.dob),
        type: 'non-gazetted' 
      }))
    ];

    res.json({ success: true, data });
  } catch (error) {
    handleError(res, error, 'Error fetching rejected applications:');
  }
});

// Get dashboard counts
router.get('/counts', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalGazetted, 
      totalNonGazetted, 
      pendingGazetted, 
      pendingNonGazetted,
      approvedTodayGazetted,
      approvedTodayNonGazetted
    ] = await Promise.all([
      Gazetted.countDocuments(),
      NonGazetted.countDocuments(),
      Gazetted.countDocuments({ status: 'Pending' }),
      NonGazetted.countDocuments({ status: 'Pending' }),
      Gazetted.countDocuments({ 
        status: 'Approved',
        approvedAt: { $gte: today }
      }),
      NonGazetted.countDocuments({ 
        status: 'Approved',
        approvedAt: { $gte: today }
      })
    ]);

    res.json({
      success: true,
      data: {
        totalGazetted,
        totalNonGazetted,
        pending: pendingGazetted + pendingNonGazetted,
        approvedToday: approvedTodayGazetted + approvedTodayNonGazetted
      }
    });
  } catch (error) {
    handleError(res, error, 'Error fetching counts:');
  }
});

// Application status change handlers
const createStatusHandler = (Model, type) => {
  return {
    approve: async (req, res) => {
      try {
        const updated = await Model.findByIdAndUpdate(
          req.params.id,
          { 
            status: 'Approved',
            approvedAt: new Date(),
            rejectionReason: undefined
          },
          { new: true }
        );
        
        if (!updated) {
          return res.status(404).json({ 
            success: false, 
            error: 'Application not found' 
          });
        }
        
        res.json({ 
          success: true, 
          message: `${type} application approved`,
          data: updated 
        });
      } catch (error) {
        handleError(res, error, `Error approving ${type} application:`);
      }
    },

    reject: async (req, res) => {
      try {
        const { reason } = req.body;
        
        if (!reason) {
          return res.status(400).json({
            success: false,
            error: 'Rejection reason is required'
          });
        }

        const updated = await Model.findByIdAndUpdate(
          req.params.id,
          { 
            status: 'Rejected',
            rejectedAt: new Date(),
            rejectionReason: reason
          },
          { new: true }
        );
        
        if (!updated) {
          return res.status(404).json({ 
            success: false, 
            error: 'Application not found' 
          });
        }
        
        res.json({ 
          success: true, 
          message: `${type} application rejected`,
          data: updated 
        });
      } catch (error) {
        handleError(res, error, `Error rejecting ${type} application:`);
      }
    },

    pending: async (req, res) => {
      try {
        const updated = await Model.findByIdAndUpdate(
          req.params.id,
          { 
            status: 'Pending',
            approvedAt: undefined,
            rejectedAt: undefined,
            rejectionReason: undefined
          },
          { new: true }
        );
        
        if (!updated) {
          return res.status(404).json({ 
            success: false, 
            error: 'Application not found' 
          });
        }
        
        res.json({ 
          success: true, 
          message: `${type} application set to pending`,
          data: updated 
        });
      } catch (error) {
        handleError(res, error, `Error setting ${type} application to pending:`);
      }
    }
  };
};

const gazettedHandlers = createStatusHandler(Gazetted, 'Gazetted');
const nonGazettedHandlers = createStatusHandler(NonGazetted, 'Non-Gazetted');

// Gazetted application status routes
router.post('/gazetted/:id/approve', gazettedHandlers.approve);
router.post('/gazetted/:id/reject', gazettedHandlers.reject);
router.post('/gazetted/:id/pending', gazettedHandlers.pending);

// Non-Gazetted application status routes
router.post('/non-gazetted/:id/approve', nonGazettedHandlers.approve);
router.post('/non-gazetted/:id/reject', nonGazettedHandlers.reject);
router.post('/non-gazetted/:id/pending', nonGazettedHandlers.pending);

// Get application by application number
router.get('/application-by-no/:appNo', async (req, res) => {
  try {
    const { appNo } = req.params;
    
    let application = await Gazetted.findOne({ applicationNo: appNo });
    let type = 'gazetted';
    
    if (!application) {
      application = await NonGazetted.findOne({ applicationNo: appNo });
      type = 'non-gazetted';
    }
    
    if (!application) {
      return res.status(404).json({ 
        success: false, 
        error: 'Application not found' 
      });
    }
    
    res.json({ 
      success: true, 
      data: { 
        ...application.toObject(), 
        formattedDob: formatDate(application.dob),
        type 
      } 
    });
  } catch (error) {
    handleError(res, error, 'Error fetching application:');
  }
});

// Change password
router.post('/change-password', async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (currentPassword !== process.env.ADMIN_PASS) {
      return res.status(401).json({
        success: false,
        error: 'Current password is incorrect'
      });
    }
    
    // In a real application, you would update the password here
    res.json({ 
      success: true, 
      message: 'Password changed successfully' 
    });
  } catch (error) {
    handleError(res, error, 'Error changing password:');
  }
});

// Generate ID Card PDF for a single application by ID
router.get('/generate-id-card/:id', async (req, res) => {
  try {
    const { id } = req.params;
    let application = await Gazetted.findById(id);
    let type = 'gazetted';
    if (!application) {
      application = await NonGazetted.findById(id);
      type = 'non-gazetted';
    }
    if (!application) {
      return res.status(404).json({ success: false, error: 'Application not found' });
    }
    // Use the same PDF generation logic as in server.js
    const pdfBuffer = await generateIdCard(application, type);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename=ECoR_ID_${id}.pdf`,
      'Content-Length': pdfBuffer.length
    });
    res.send(pdfBuffer);
  } catch (error) {
    console.error('ID Card PDF generation failed:', error);
    res.status(500).json({ error: 'Failed to generate ID card PDF', details: error.message });
  }
});

module.exports = router;

