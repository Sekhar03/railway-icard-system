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
      const doc = new PDFDocument({
        layout: 'portrait',
        size: [303.307, 191.811],
        margins: 0
      });

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

      // Helper to render bilingual labels (Hindi / English)
      const renderBilingualLabel = (hindi, english, x, y, options = {}) => {
        const fontSize = options.fontSize || 7;
        const color = options.color || '#000000';
        
        doc.fillColor(color);
        if (hasHindiFont && hindi) {
          doc.font('Hindi').fontSize(fontSize).text(hindi, x, y, { continued: true });
          doc.font('Helvetica').fontSize(fontSize).text(`  ${english}`, { continued: false });
        } else {
          doc.font('Helvetica').fontSize(fontSize).text(english, x, y);
        }
      };

      // Helper for centered bilingual text (Header style)
      const renderCenteredBilingual = (hindi, english, y, hFontSize, eFontSize) => {
        doc.fillColor('#000000');
        if (hasHindiFont && hindi) {
          doc.font('Hindi').fontSize(hFontSize).text(hindi, 0, y, { width: doc.page.width, align: 'center' });
          doc.font('Helvetica-Bold').fontSize(eFontSize).text(english, 0, y + hFontSize + 2, { width: doc.page.width, align: 'center' });
        } else {
          doc.font('Helvetica-Bold').fontSize(eFontSize).text(english, 0, y, { width: doc.page.width, align: 'center' });
        }
      };

      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      // ===== FRONT SIDE =====
      doc.rect(0, 0, doc.page.width, doc.page.height).fill('#ffffff');

      // 1. Header: Logo and Railway Name
      try {
        const logoPath = path.join(__dirname, '../public/images/RAL.jpg');
        if (fs.existsSync(logoPath)) {
          doc.image(logoPath, 5, 4, { width: 42, height: 42 });
        }
      } catch (err) {}

      renderCenteredBilingual('पूर्व तट रेलवे', 'East Coast Railway', 6, 15, 15);

      // 2. Department Stripe (Cyan/Light Blue)
      doc.rect(0, 48, doc.page.width, 14).fill('#E0F7FA');
      renderBilingualLabel('विभाग', 'DEPARTMENT', 10, 52, { fontSize: 7 });
      renderBilingualLabel('व्यावसायिक', 'COMMERCIAL', 150, 52, { fontSize: 7 });

      // 3. Identity Card Stripe (Dark Blue)
      doc.rect(0, 62, doc.page.width, 14).fill('#003366');
      renderBilingualLabel('पहचान पत्र', 'IDENTITY CARD', 10, 66, { fontSize: 7, color: '#ffffff' });
      renderBilingualLabel('प्र.का', 'H.Q. SI.No. COMMERCIAL-', 150, 66, { fontSize: 7, color: '#ffffff' });

      // 4. Photo Section
      const photoX = 5, photoY = 80, photoW = 50, photoH = 65;
      doc.rect(photoX, photoY, photoW, photoH).stroke('#000000');
      if (application.photoBase64) {
        try {
          const photoBuffer = Buffer.from(application.photoBase64, 'base64');
          doc.image(photoBuffer, photoX + 1, photoY + 1, { width: photoW - 2, height: photoH - 2 });
        } catch (err) {
          console.error('Error rendering photo from Base64:', err);
        }
      }

      // 5. Employee Details (Adjusted padding to prevent overlapping)
      let detailsY = 80;
      const labelX = 60, valX = 125;
      doc.fillColor('#000000');

      // Helper for detail rows
      const renderDetailRow = (hindi, english, value, y) => {
        renderBilingualLabel(hindi, english, labelX, y, { fontSize: 7 });
        doc.font('Helvetica-Bold').fontSize(8).text(`: ${value}`, valX, y);
      };

      renderDetailRow('नाम', 'Name', application.name?.toUpperCase() || 'N/A', detailsY);
      detailsY += 12;
      renderDetailRow('पद नाम', 'Desig', application.designation || 'N/A', detailsY);
      detailsY += 12;
      renderDetailRow('पी.एफ.नं', 'P.F.No.', idNumber || 'N/A', detailsY);
      detailsY += 12;
      renderDetailRow('स्टेशन', 'Station', application.station?.toUpperCase() || 'N/A', detailsY);
      detailsY += 12;
      renderDetailRow('जन्म तारीख', 'D.O.B', formatDate(application.dob), detailsY);

      // 6. Signatures (Positioned at the very bottom)
      const sigY = 165;
      renderBilingualLabel('कार्डधारक का हस्ताक्षर', 'Signature of the Card Holder', 5, sigY, { fontSize: 6 });
      renderBilingualLabel('जारीकर्ता प्राधिकारी का हस्ताक्षर', 'Signature of Issuing Authority', 170, sigY, { fontSize: 6 });

      // Holder Sign Image
      if (application.signBase64) {
        try {
          const signBuffer = Buffer.from(application.signBase64, 'base64');
          doc.image(signBuffer, 5, sigY - 12, { width: 50, height: 12 });
        } catch (err) {
          console.error('Error rendering signature from Base64:', err);
        }
      }

      // ===== BACK SIDE =====
      doc.addPage({ layout: 'portrait', size: [303.307, 191.811], margins: 0 });
      doc.rect(0, 0, doc.page.width, doc.page.height).fill('#ffffff');

      // 1. Family Details Header
      renderCenteredBilingual('परिवार का विवरण', 'Details of the family', 10, 10, 10);

      // 2. Family Members Table
      let famY = 32;
      const tableX = 10;
      const tableW = doc.page.width - 20;
      const colWidths = [80, 45, 45, 30, tableW - (80 + 45 + 45 + 30)];
      const colX = [
        tableX, 
        tableX + colWidths[0], 
        tableX + colWidths[0] + colWidths[1], 
        tableX + colWidths[0] + colWidths[1] + colWidths[2], 
        tableX + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3]
      ];
      const rowH = 12;

      // Draw Header Background & Lines
      doc.rect(tableX, famY, tableW, rowH).fillAndStroke('#E0E0E0', '#000000');
      doc.fillColor('#000000').font('Helvetica-Bold').fontSize(6);
      doc.text('Name', colX[0], famY + 3, { width: colWidths[0], align: 'center' });
      doc.text('Relation', colX[1], famY + 3, { width: colWidths[1], align: 'center' });
      doc.text('D.O.B', colX[2], famY + 3, { width: colWidths[2], align: 'center' });
      doc.text('Blood Gr.', colX[3], famY + 3, { width: colWidths[3], align: 'center' });
      doc.text('Identification Mark', colX[4], famY + 3, { width: colWidths[4], align: 'center' });

      // Draw column lines for header
      colX.forEach(x => {
        doc.moveTo(x, famY).lineTo(x, famY + rowH).stroke();
      });
      doc.moveTo(tableX + tableW, famY).lineTo(tableX + tableW, famY + rowH).stroke();

      famY += rowH;

      if (application.family && application.family.length > 0) {
        doc.font('Helvetica').fontSize(6).fillColor('#000000');
        application.family.forEach(member => {
          doc.rect(tableX, famY, tableW, rowH).stroke();
          
          doc.text(`${member.name || 'N/A'}`, colX[0] + 2, famY + 3, { width: colWidths[0] - 4, height: rowH, lineBreak: false });
          doc.text(`${member.relationship || 'N/A'}`, colX[1], famY + 3, { width: colWidths[1], height: rowH, align: 'center', lineBreak: false });
          doc.text(`${formatDate(member.dob)}`, colX[2], famY + 3, { width: colWidths[2], height: rowH, align: 'center', lineBreak: false });
          doc.text(`${member.bloodGroup || 'N/A'}`, colX[3], famY + 3, { width: colWidths[3], height: rowH, align: 'center', lineBreak: false });
          doc.text(`${member.identificationMark || ''}`, colX[4] + 2, famY + 3, { width: colWidths[4] - 4, height: rowH, lineBreak: false });

          // Vertical lines
          colX.forEach(x => {
            doc.moveTo(x, famY).lineTo(x, famY + rowH).stroke();
          });
          doc.moveTo(tableX + tableW, famY).lineTo(tableX + tableW, famY + rowH).stroke();

          famY += rowH;
        });
      } else {
        doc.rect(tableX, famY, tableW, rowH).stroke();
        doc.font('Helvetica').fontSize(6).fillColor('#000000');
        doc.text('No family members listed', tableX, famY + 3, { width: tableW, align: 'center', height: rowH });
        // Vertical borders for empty row
        doc.moveTo(tableX, famY).lineTo(tableX, famY + rowH).stroke();
        doc.moveTo(tableX + tableW, famY).lineTo(tableX + tableW, famY + rowH).stroke();
        famY += rowH;
      }


      // 3. Additional Info
      famY = Math.max(famY + 12, 110);
      doc.font('Helvetica-Bold').fontSize(8).text(`Emergency Contact No. : ${application.emergencyContactNumber || 'N/A'}`, 10, famY);
      famY += 14;

      renderBilingualLabel('घर का पता', 'Res.Address:', 10, famY, { fontSize: 8 });
      doc.font('Helvetica').fontSize(8).text(`${application.address || 'N/A'}`, 10, famY + 10, { width: 200 });

      // 4. Instructions
      const instY = 168;
      renderBilingualLabel('यदि यह कार्ड मिले तो कृपया निकटतम पोस्ट बॉक्स में डाल दें।', '', 10, instY, { fontSize: 7 });
      doc.font('Helvetica').fontSize(7).text('If found please drop it in the nearest Post Box', 10, instY + 9);

      // 5. QR Code
      try {
        const qrData = JSON.stringify({
          appNo: application.applicationNo,
          name: application.name,
          empNo: idNumber,
          desig: application.designation,
          dept: application.department,
          station: application.station,
          dob: formatDate(application.dob),
          blood: application.bloodGroup || 'N/A'
        });
        const qrCodeOptions = {
          errorCorrectionLevel: 'H',
          margin: 1,
          width: 120,
          color: {
            dark: '#000000',
            light: '#ffffff'
          }
        };
        const qrCodeDataURL = await QRCode.toDataURL(qrData, qrCodeOptions);
        doc.image(qrCodeDataURL, 230, instY - 45, { width: 60, height: 60 });
      } catch (err) {
        console.error('QR Code Generation Error:', err);
      }

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

module.exports = { generateIdCard }; 