const express = require('express');
const router = express.Router();
const Gazetted = require('../models/EmployeeGaz');
const NonGazetted = require('../models/EmployeeNonGaz');
const mongoose = require('mongoose');

// Check Gazetted application status
router.post('/gazetted', async (req, res) => {
  try {
    const { applicationNo, ruid, dob } = req.body;
    
    console.log('Gazetted status check request:', { applicationNo, ruid, dob });
    
    if (!dob) {
      return res.status(400).json({
        success: false,
        message: 'Date of Birth is required'
      });
    }

    if (!applicationNo && !ruid) {
      return res.status(400).json({
        success: false,
        message: 'Please provide either Application No or RUID No'
      });
    }

    // Build identifier $or array
    const identifierOr = [];
    if (applicationNo) {
      identifierOr.push({ applicationNo: applicationNo });
      if (mongoose.Types.ObjectId.isValid(applicationNo)) {
        identifierOr.push({ _id: applicationNo });
      }
      identifierOr.push({ ruid: applicationNo });
    }
    if (ruid) {
      identifierOr.push({ ruid: ruid });
    }

    // Build possible dob formats
    const dateFormats = [
      dob,
      new Date(dob).toISOString().split('T')[0],
      new Date(dob + 'T00:00:00.000Z'),
      new Date(dob + 'T00:00:00.000Z').toISOString().split('T')[0]
    ];

    // Final query
    const query = {
      $and: [
        { $or: identifierOr },
        { dob: { $in: dateFormats } }
      ]
    };

    console.log('Final query:', JSON.stringify(query, null, 2));
    const record = await Gazetted.findOne(query);
    console.log('Search result:', record ? 'Found' : 'Not found');
    
    if (!record) {
      return res.status(404).json({ 
        success: false, 
        message: 'No application found with the provided details' 
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
      message: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Check Non-Gazetted application status
router.post('/non-gazetted', async (req, res) => {
  try {
    const { applicationNo, empNo, dob } = req.body;
    
    console.log('Non-Gazetted status check request:', { applicationNo, empNo, dob });
    
    if (!dob) {
      return res.status(400).json({
        success: false,
        message: 'Date of Birth is required'
      });
    }

    if (!applicationNo && !empNo) {
      return res.status(400).json({
        success: false,
        message: 'Please provide either Application No or Employee No'
      });
    }

    // Build identifier $or array
    const identifierOr = [];
    if (applicationNo) {
      identifierOr.push({ applicationNo: applicationNo });
      if (mongoose.Types.ObjectId.isValid(applicationNo)) {
        identifierOr.push({ _id: applicationNo });
      }
      identifierOr.push({ empNo: applicationNo });
    }
    if (empNo) {
      identifierOr.push({ empNo: empNo });
    }

    // Build possible dob formats
    const dateFormats = [
      dob,
      new Date(dob).toISOString().split('T')[0],
      new Date(dob + 'T00:00:00.000Z'),
      new Date(dob + 'T00:00:00.000Z').toISOString().split('T')[0]
    ];

    // Final query
    const query = {
      $and: [
        { $or: identifierOr },
        { dob: { $in: dateFormats } }
      ]
    };

    console.log('Final query:', JSON.stringify(query, null, 2));
    const record = await NonGazetted.findOne(query);
    console.log('Search result:', record ? 'Found' : 'Not found');
    
    if (!record) {
      return res.status(404).json({ 
        success: false, 
        message: 'No application found with the provided details' 
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
      message: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get application by ID (for direct links)
router.get('/:type/:id', async (req, res) => {
  try {
    const { type, id } = req.params;
    
    let record;
    if (type === 'gazetted') {
      record = await Gazetted.findById(id);
    } else if (type === 'non-gazetted') {
      record = await NonGazetted.findById(id);
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid application type'
      });
    }
    
    if (!record) {
      return res.status(404).json({ 
        success: false, 
        message: 'Application not found' 
      });
    }
    
    res.json({ 
      success: true, 
      data: record 
    });
  } catch (error) {
    console.error('Application fetch error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;