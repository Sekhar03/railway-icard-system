const mongoose = require('mongoose');
require('dotenv').config();
const path = require('path');

async function findApp() {
  await mongoose.connect(process.env.MONGO_URI);
  const Gazetted = require(path.join(__dirname, '..', 'models', 'EmployeeGaz'));
  const NonGazetted = require(path.join(__dirname, '..', 'models', 'EmployeeNonGaz'));
  
  const gaz = await Gazetted.findOne().select('applicationNo');
  const nonGaz = await NonGazetted.findOne().select('applicationNo');
  
  console.log('Valid Gazetted App:', gaz ? gaz.applicationNo : 'None');
  console.log('Valid Non-Gazetted App:', nonGaz ? nonGaz.applicationNo : 'None');
  
  await mongoose.disconnect();
}

findApp();
