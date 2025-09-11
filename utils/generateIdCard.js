const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs');

// Helper function for formatting dates
function formatDate(dateString) {
  if (!dateString) return 'N/A';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'N/A';
    return [
      String(date.getDate()).padStart(2, '0'),
      String(date.getMonth() + 1).padStart(2, '0'),
      date.getFullYear()
    ].join('-');
  } catch (err) {
    return 'N/A';
  }
}

// The main generateIdCard function
async function generateIdCard(application, type) {
  return new Promise(async (resolve, reject) => {
    try {
      let idNumber = type === 'gazetted' ? application?.ruid : application?.empNo;
      // Create PDF document with standard ID card size
      const doc = new PDFDocument({
        layout: 'portrait',
        size: [303.307, 191.811], // 85.6mm x 53.98mm in points
        margins: 0
      });

      // Set up font paths
      const fontDir = path.join(__dirname, '../public/fonts');
      const hindiFontPath = path.join(fontDir, 'NotoSansDevanagari-Regular.ttf');
      const hindiBoldFontPath = path.join(fontDir, 'NotoSansDevanagari-Bold.ttf');

      // Register Hindi fonts if they exist
      let hasHindiFont = false;
      if (fs.existsSync(hindiFontPath)) {
        doc.registerFont('Hindi', hindiFontPath);
        hasHindiFont = true;
      }
      if (fs.existsSync(hindiBoldFontPath)) {
        doc.registerFont('HindiBold', hindiBoldFontPath);
      }

      // Helper function to render Hindi text with fallback
      const renderHindiText = (text, x, y, options = {}) => {
        if (hasHindiFont && text) {
          doc.font('Hindi')
             .fontSize(options.fontSize || 8)
             .text(text, x, y, options);
        } else {
          doc.font('Helvetica')
             .fontSize(options.fontSize || 8)
             .text('', x, y, options);
        }
      };

      // Helper function to format dates
      const formatDateForDisplay = (dateString) => {
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
      };

      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      // ===== FRONT SIDE =====
      doc.rect(0, 0, doc.page.width, doc.page.height)
         .fill('#ffffff');

      // Main border
      doc.rect(1, 1, doc.page.width - 2, doc.page.height - 2)
         .strokeColor('#000000')
         .lineWidth(1.5)
         .stroke();

      // Header section with logo and text (move text block right for visual centering)
      const headerTopY = 6;
      const logoX = 10;
      const logoY = headerTopY;
      const logoSize = 30;
      // Insert actual logo image (RAL.jpg) in the logo section (front side only)
      try {
        const logoPath = path.join(__dirname, '../public/images/RAL.jpg');
        if (fs.existsSync(logoPath)) {
          doc.image(logoPath, logoX, logoY, { width: logoSize, height: logoSize });
        }
      } catch (err) {}
      // Header text positions (move right for centering)
      const textStartX = logoX + logoSize + 32; // increased gap for centering
      const textBlockWidth = 160;
      const hindiFontSize = 14;
      const engFontSize = 11;
      const textBlockHeight = hindiFontSize + engFontSize + 6;
      const logoCenterY = logoY + logoSize / 2;
      const textBlockStartY = logoCenterY - textBlockHeight / 2;
      // Draw horizontal line above Hindi text
      doc.moveTo(textStartX, textBlockStartY - 5)
         .lineTo(textStartX + textBlockWidth, textBlockStartY - 5)
         .lineWidth(1)
         .strokeColor('#000000')
         .stroke();
      // Hindi text (with fallback)
      if (hasHindiFont) {
        doc.font('Hindi').fontSize(hindiFontSize).fillColor('#000000').text('पूर्व तट रेलवे', textStartX, textBlockStartY, { width: textBlockWidth, align: 'center' });
      } else {
        doc.font('Helvetica-Bold').fontSize(hindiFontSize).fillColor('#000000').text('पूर्व तट रेलवे', textStartX, textBlockStartY, { width: textBlockWidth, align: 'center' });
      }
      // English text (larger, bold, below Hindi)
      doc.font('Helvetica-Bold')
         .fontSize(engFontSize)
         .fillColor('#000000')
         .text('East Coast Railway', textStartX, textBlockStartY + hindiFontSize + 3, { width: textBlockWidth, align: 'center' });
      // Move department and identity card stripes back up
      const stripesTopY = headerTopY + logoSize + 2; // minimal gap after header
      // Department section - Light blue background stripe (full width)
      doc.rect(0, stripesTopY, doc.page.width, 20)
         .fill('#87CEEB');
      // Department labels in black text
      doc.fillColor('#000000');
      renderHindiText('विभाग', 10, stripesTopY + 3, { fontSize: 8 });
      doc.font('Helvetica-Bold')
         .fontSize(8)
         .text('DEPARTMENT', 10, stripesTopY + 12);
      renderHindiText('व्यावसायिक', 110, stripesTopY + 3, { fontSize: 9 });
      doc.font('Helvetica-Bold')
         .fontSize(9)
         .fillColor('#0000ff')
         .text('COMMERCIAL', 110, stripesTopY + 12);
      // Identity Card section - Deep blue background stripe
      doc.rect(0, stripesTopY + 20, doc.page.width, 20)
         .fill('#191970');
      // Identity Card labels in white text (since background is dark)
      doc.fillColor('#ffffff');
      renderHindiText('पहचान पत्र', 10, stripesTopY + 23, { fontSize: 8 });
      doc.font('Helvetica-Bold')
         .fontSize(8)
         .text('IDENTITY CARD', 10, stripesTopY + 32);
      renderHindiText('प्र.का', 180, stripesTopY + 23, { fontSize: 8 });
      doc.font('Helvetica-Bold')
         .fontSize(8)
         .fillColor('#ffffff')
         .text('H.Q. SI.No. COMMERCIAL-', 180, stripesTopY + 32);
      // Photo section (positioned on the left side of employee details)
      const photoX = 8;
      const photoY = stripesTopY + 40 + 5; // add gap after stripes
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
      let currentY = photoY;
      const detailsStartX = 65;
      const dataStartX = 125;
      // Responsive font size for long names
      const getFontSize = (text, maxWidth, baseSize = 8, minSize = 6) => {
        let size = baseSize;
        doc.font('Helvetica-Bold').fontSize(size);
        while (doc.widthOfString(text) > maxWidth && size > minSize) {
          size -= 0.5;
          doc.fontSize(size);
        }
        return size;
      };
      // Name row
      renderHindiText('नाम', detailsStartX + 2, currentY + 2, { fontSize: 7 });
      doc.fillColor('#000000')
         .font('Helvetica')
         .fontSize(7)
         .text('Name', detailsStartX + 25, currentY + 2);
      let nameFontSize = getFontSize(application.name?.toUpperCase() || 'N/A', 110, 8, 6);
      doc.fillColor('#000000')
         .font('Helvetica-Bold')
         .fontSize(nameFontSize)
         .text(`: ${application.name?.toUpperCase() || 'N/A'}`, dataStartX, currentY + 4, { width: 110, ellipsis: true });
      currentY += 12;
      // Designation row
      renderHindiText('पद नाम', detailsStartX + 2, currentY + 2, { fontSize: 7 });
      doc.fillColor('#000000')
         .font('Helvetica')
         .fontSize(7)
         .text('Desig', detailsStartX + 25, currentY + 2);
      let desigFontSize = getFontSize(application.designation || 'N/A', 110, 8, 6);
      doc.fillColor('#000000')
         .font('Helvetica-Bold')
         .fontSize(desigFontSize)
         .text(`: ${application.designation || 'N/A'}`, dataStartX, currentY + 4, { width: 110, ellipsis: true });
      currentY += 12;
      // ID Number row
      const idLabel = type === 'gazetted' ? 'P.F.No.' : 'Emp No.';
      renderHindiText('पी.एफ.नं', detailsStartX + 2, currentY + 2, { fontSize: 7 });
      doc.fillColor('#000000')
         .font('Helvetica')
         .fontSize(7)
         .text(idLabel, detailsStartX + 25, currentY + 2);
      let idFontSize = getFontSize(idNumber || 'N/A', 110, 8, 6);
      doc.fillColor('#000000')
         .font('Helvetica-Bold')
         .fontSize(idFontSize)
         .text(`: ${idNumber || 'N/A'}`, dataStartX, currentY + 4, { width: 110, ellipsis: true });
      currentY += 12;
      // Station row
      renderHindiText('स्टेशन', detailsStartX + 2, currentY + 2, { fontSize: 7 });
      doc.fillColor('#000000')
         .font('Helvetica')
         .fontSize(7)
         .text('Station', detailsStartX + 25, currentY + 2);
      let stationFontSize = getFontSize(application.station?.toUpperCase() || 'N/A', 110, 8, 6);
      doc.fillColor('#000000')
         .font('Helvetica-Bold')
         .fontSize(stationFontSize)
         .text(`: ${application.station?.toUpperCase() || 'N/A'}`, dataStartX, currentY + 4, { width: 110, ellipsis: true });
      currentY += 12;
      // Date of Birth row
      renderHindiText('जन्म तारीख', detailsStartX + 2, currentY + 2, { fontSize: 6 });
      doc.fillColor('#000000')
         .font('Helvetica')
         .fontSize(7)
         .text('D.O.B', detailsStartX + 25, currentY + 2);
      doc.fillColor('#000000')
         .font('Helvetica-Bold')
         .fontSize(8)
         .text(`: ${formatDateForDisplay(application.dob)}`, dataStartX, currentY + 4, { width: 110, ellipsis: true });
      // Bottom signature section
      const bottomY = doc.page.height - 25;
      // Left signature section
      renderHindiText('कार्डधारक का हस्ताक्षर', 8, bottomY, { fontSize: 6 });
      doc.fillColor('#000000')
         .font('Helvetica')
         .fontSize(6)
         .text('Signature of the Card Holder', 8, bottomY + 8);
      // Right signature section  
      renderHindiText('जारीकर्ता प्राधिकारी का हस्ताक्षर', doc.page.width - 95, bottomY, { fontSize: 6 });
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
      doc.addPage({ layout: 'portrait', size: [303.307, 191.811], margins: 0 });
      doc.rect(0, 0, doc.page.width, doc.page.height).fill('#ffffff');
      doc.rect(1, 1, doc.page.width - 2, doc.page.height - 2).strokeColor('#000000').lineWidth(1.5).stroke();
      // Family details header (minimal gap)
      let familyHeaderY = 10;
      doc.fillColor('#000000').font('Helvetica-Bold').fontSize(8);
      renderHindiText('परिवार का विवरण', 0, familyHeaderY, { align: 'center', width: doc.page.width, fontSize: 8 });
      doc.fillColor('#000000').font('Helvetica-Bold').fontSize(8).text('Details of the family', 0, familyHeaderY + 10, { align: 'center', width: doc.page.width });
      // Helper for wrapping text into lines that fit a given width
      function wrapTextLines(doc, text, maxWidth, font, fontSize) {
        doc.font(font).fontSize(fontSize);
        const words = text.split(' ');
        let lines = [];
        let line = '';
        for (let i = 0; i < words.length; i++) {
          const testLine = line + words[i] + ' ';
          const testWidth = doc.widthOfString(testLine);
          if (testWidth > maxWidth && line.length > 0) {
            lines.push(line.trim());
            line = words[i] + ' ';
          } else {
            line = testLine;
          }
        }
        if (line.length > 0) lines.push(line.trim());
        return lines;
      }
      // Prepare family details data
      const familyDetails = [];
      familyDetails.push({ relation: 'Self', name: application.name, dob: application.dob, bloodGroup: application.bloodGroup || 'N/A', remarks: 'Employee' });
      if (application.family && Array.isArray(application.family)) {
        familyDetails.push(...application.family.map(member => ({ relation: member.relation || 'Family', name: member.name || 'N/A', dob: member.dob || null, bloodGroup: member.bloodGroup || 'N/A', remarks: member.remarks || '' })));
      }
      // Family table column positions (fit full width)
      const tableLeft = 10, tableRight = doc.page.width - 10;
      const colWidths = [0.13, 0.32, 0.17, 0.13, 0.25]; // % of width: Relation, Name, DOB, Blood, Remarks
      const col1X = tableLeft;
      const col2X = col1X + (tableRight - tableLeft) * colWidths[0];
      const col3X = col2X + (tableRight - tableLeft) * colWidths[1];
      const col4X = col3X + (tableRight - tableLeft) * colWidths[2];
      const col5X = col4X + (tableRight - tableLeft) * colWidths[3];
      const col1W = (tableRight - tableLeft) * colWidths[0] - 2;
      const col2W = (tableRight - tableLeft) * colWidths[1] - 2;
      const col3W = (tableRight - tableLeft) * colWidths[2] - 2;
      const col4W = (tableRight - tableLeft) * colWidths[3] - 2;
      const col5W = (tableRight - tableLeft) * colWidths[4] - 2;
      // Slightly reduced font size and row height for 2nd page
      let familyFontSize = 7, rowHeight = 7;
      if (familyDetails.length > 2) {
        familyFontSize = 6;
        rowHeight = 6;
      }
      const maxFamilyDetailsHeight = doc.page.height - 55;
      const maxFamilyRows = Math.floor(maxFamilyDetailsHeight / rowHeight);
      let familyY = familyHeaderY + 22;
      doc.fillColor('#000000').font('Helvetica-Bold').fontSize(familyFontSize)
        .text('Relation', col1X, familyY, { width: col1W })
        .text('Name', col2X, familyY, { width: col2W })
        .text('DOB', col3X, familyY, { width: col3W })
        .text('Blood', col4X, familyY, { width: col4W })
        .text('Remarks', col5X, familyY, { width: col5W });
      familyY += rowHeight;
      let maxUsedY = familyY;
      for (let i = 0; i < Math.min(familyDetails.length, maxFamilyRows); i++) {
        const member = familyDetails[i];
        let nameSize = familyFontSize;
        let nameLines = wrapTextLines(doc, member.name, col2W, 'Helvetica-Bold', nameSize);
        let relationLines = wrapTextLines(doc, member.relation, col1W, 'Helvetica', familyFontSize);
        let dobLines = wrapTextLines(doc, formatDateForDisplay(member.dob), col3W, 'Helvetica', familyFontSize);
        let bloodLines = wrapTextLines(doc, member.bloodGroup, col4W, 'Helvetica', familyFontSize);
        let remarksLines = wrapTextLines(doc, member.remarks, col5W, 'Helvetica', familyFontSize);
        let rowLines = Math.max(nameLines.length, relationLines.length, dobLines.length, bloodLines.length, remarksLines.length);
        for (let l = 0; l < rowLines; l++) {
          doc.font('Helvetica').fontSize(familyFontSize).text(relationLines[l] || '', col1X, familyY + l * rowHeight, { width: col1W });
          doc.font('Helvetica-Bold').fontSize(nameSize).text(nameLines[l] || '', col2X, familyY + l * rowHeight, { width: col2W });
          doc.font('Helvetica').fontSize(familyFontSize).text(dobLines[l] || '', col3X, familyY + l * rowHeight, { width: col3W });
          doc.font('Helvetica').fontSize(familyFontSize).text(bloodLines[l] || '', col4X, familyY + l * rowHeight, { width: col4W });
          doc.font('Helvetica').fontSize(familyFontSize).text(remarksLines[l] || '', col5X, familyY + l * rowHeight, { width: col5W });
        }
        // Add extra vertical gap between family members
        familyY += rowHeight * rowLines + 2;
        maxUsedY = familyY;
      }
      // Emergency contact (increased vertical gap)
      doc.fillColor('#000000').font('Helvetica-Bold').fontSize(familyFontSize - 1.5).text(`Emergency Contact: ${application.emergencyContactNumber || 'N/A'}`, tableLeft, familyY + 8, { width: col1W + col2W });
      maxUsedY = familyY + 16;
      // Address and QR code on the same row
      const addressY = Math.max(maxUsedY + 4, 90);
      const addressText = application.address || 'Address not provided';
      const addressFontSize = familyFontSize;
      const addressBoxWidth = doc.page.width - 80; // leave space for larger QR code
      renderHindiText('घर का पता', tableLeft, addressY, { fontSize: addressFontSize });
      doc.fillColor('#000000').font('Helvetica').fontSize(addressFontSize).text('/Res.Address: ', tableLeft + 28, addressY);
      const wrapText = (text, x, y, maxWidth, lineHeight, fontSize = addressFontSize) => {
        doc.font('Helvetica').fontSize(fontSize);
        const words = text.split(' ');
        let line = '';
        let currentY = y;
        for (let i = 0; i < words.length; i++) {
          const testLine = line + words[i] + ' ';
          const testWidth = doc.widthOfString(testLine);
          if (testWidth > maxWidth && i > 0) {
            doc.text(line, x, currentY, { width: maxWidth });
            currentY += lineHeight;
            line = words[i] + ' ';
          } else {
            line = testLine;
          }
        }
        doc.text(line, x, currentY, { width: maxWidth });
        return currentY + lineHeight;
      };
      // Draw address
      const addressEndY = wrapText(addressText, tableLeft, addressY + addressFontSize + 1, addressBoxWidth, addressFontSize + 1, addressFontSize);
      // Draw QR code to the right of the address block, aligned to addressY
      try {
        const qrData = JSON.stringify({ name: application.name, designation: application.designation, idNumber: idNumber, department: application.department || 'COMMERCIAL', bloodGroup: application.bloodGroup || 'N/A', emergencyContact: application.emergencyContactNumber || 'N/A' });
        const qrCodeDataURL = await QRCode.toDataURL(qrData, { width: 120, margin: 1, color: { dark: '#000000', light: '#ffffff' } });
        doc.image(qrCodeDataURL, doc.page.width - 70, addressY, { width: 54, height: 54 });
      } catch (err) {}
      // "If found" text (immediately below address/QR row, minimal gap, small font)
      const foundY = addressEndY + 2;
      renderHindiText('यदि यह कार्ड मिले तो कृपया निकटतम पोस्ट बॉक्स में डाल दें।', tableLeft, foundY, { fontSize: familyFontSize - 2.2 });
      doc.fillColor('#000000').font('Helvetica').fontSize(familyFontSize - 2.2).text('If found please drop it in the nearest Post Box', tableLeft, foundY + 5);
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

module.exports = { generateIdCard }; 