const express = require('express');
const router = express.Router();
const { upload, handleUploadErrors } = require('../middleware/upload');
const Gazetted = require('../models/EmployeeGaz');
const NonGazetted = require('../models/EmployeeNonGaz');

// Helper function to parse family data
const parseFamilyData = (familyString) => {
  if (!familyString) return [];
  
  const familyArray = JSON.parse(familyString);
  return familyArray.map(member => ({
    name: member.name,
    relationship: member.relationship,
    dob: member.dob,
    bloodGroup: member.bloodGroup,
    identificationMark: member.identificationMark || '' // Ensure identificationMark is included
  }));
};

// Gazetted Employee Form Submission
router.post('/gazetted', 
  upload.fields([
    { name: 'photo', maxCount: 1 },
    { name: 'sign', maxCount: 1 },
    { name: 'hindiName', maxCount: 1 },
    { name: 'hindiDesig', maxCount: 1 }
  ]), 
  handleUploadErrors, 
  async (req, res) => {
    try {
      const { 
        userId, 
        name, 
        ruid, 
        designation, 
        department, 
        station, 
        billUnit, 
        dob, 
        mobile, 
        address, 
        reason, 
        emergencyContactName, 
        emergencyContactNumber, 
        family 
      } = req.body;
      
      const entryData = {
        userId,
        name,
        ruid,
        designation,
        department,
        station,
        billUnit,
        dob,
        mobile,
        address,
        reason,
        emergencyContactName,
        emergencyContactNumber,
        family: parseFamilyData(family),
        photo: req.files?.photo?.[0]?.filename || '',
        sign: req.files?.sign?.[0]?.filename || '',
        hindiName: req.files?.hindiName?.[0]?.filename || '',
        hindiDesig: req.files?.hindiDesig?.[0]?.filename || '',
        status: 'Pending'
      };

      const entry = new Gazetted(entryData);
      await entry.validate();
      const savedEntry = await entry.save();
      
      res.json({ 
        success: true, 
        message: 'Gazetted employee application submitted successfully',
        id: savedEntry._id,
        applicationNo: savedEntry.applicationNo
      });
    } catch (error) {
      console.error('Error in gazetted form submission:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
});

// Non-Gazetted Employee Form Submission
router.post('/non-gazetted', 
  upload.fields([
    { name: 'photo', maxCount: 1 },
    { name: 'sign', maxCount: 1 }
  ]), 
  handleUploadErrors, 
  async (req, res) => {
    try {
      const { 
        userId, 
        name, 
        empNo, 
        designation, 
        department, 
        station, 
        billUnit, 
        dob, 
        mobile, 
        address, 
        reason, 
        emergencyContactName, 
        emergencyContactNumber, 
        family 
      } = req.body;
      
      const entryData = {
        userId,
        name,
        empNo,
        designation,
        department,
        station,
        billUnit,
        dob,
        mobile,
        address,
        reason,
        emergencyContactName,
        emergencyContactNumber,
        family: parseFamilyData(family),
        photo: req.files?.photo?.[0]?.filename || '',
        sign: req.files?.sign?.[0]?.filename || '',
        status: 'Pending'
      };

      const entry = new NonGazetted(entryData);
      await entry.validate();
      const savedEntry = await entry.save();
      
      res.json({ 
        success: true, 
        message: 'Non-gazetted employee application submitted successfully',
        id: savedEntry._id,
        applicationNo: savedEntry.applicationNo
      });
    } catch (error) {
      console.error('Error in non-gazetted form submission:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
});

// Admin approval routes
router.post('/gazetted/:id/approve', async (req, res) => {
  try {
    const updated = await Gazetted.findByIdAndUpdate(
      req.params.id,
      { 
        status: 'Approved', 
        approvedAt: new Date(),
        $unset: { rejectionReason: 1 } // Remove rejection reason if it exists
      },
      { new: true, runValidators: true }
    );
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Application not found' });
    }
    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Error approving gazetted application:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

router.post('/gazetted/:id/reject', async (req, res) => {
  try {
    if (!req.body.reason) {
      return res.status(400).json({ success: false, error: 'Rejection reason is required' });
    }

    const updated = await Gazetted.findByIdAndUpdate(
      req.params.id,
      { 
        status: 'Rejected', 
        rejectedAt: new Date(),
        rejectionReason: req.body.reason 
      },
      { new: true, runValidators: true }
    );
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Application not found' });
    }
    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Error rejecting gazetted application:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

router.post('/non-gazetted/:id/approve', async (req, res) => {
  try {
    const updated = await NonGazetted.findByIdAndUpdate(
      req.params.id,
      { 
        status: 'Approved', 
        approvedAt: new Date(),
        $unset: { rejectionReason: 1 } // Remove rejection reason if it exists
      },
      { new: true, runValidators: true }
    );
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Application not found' });
    }
    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Error approving non-gazetted application:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

router.post('/non-gazetted/:id/reject', async (req, res) => {
  try {
    if (!req.body.reason) {
      return res.status(400).json({ success: false, error: 'Rejection reason is required' });
    }

    const updated = await NonGazetted.findByIdAndUpdate(
      req.params.id,
      { 
        status: 'Rejected', 
        rejectedAt: new Date(),
        rejectionReason: req.body.reason 
      },
      { new: true, runValidators: true }
    );
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Application not found' });
    }
    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Error rejecting non-gazetted application:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

module.exports = router;