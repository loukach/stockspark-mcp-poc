const { mapInputToVehicle } = require('./src/utils/mappers');

// Test what a manually created vehicle looks like
const manualVehicle = mapInputToVehicle({
  make: 'SEAT',
  model: 'Ibiza',
  version: '1.5 TSI EVO 110KW FR DSG',
  year: 2025,
  price: 25000,
  fuel: 'PETROL',
  transmission: 'AUTOMATIC',
  condition: 'NEW'
});

console.log('=== MANUAL VEHICLE STRUCTURE ===');
console.log(JSON.stringify(manualVehicle, null, 2));

console.log('\n=== KEY DIFFERENCES TO CHECK ===');
console.log('- Status field:', manualVehicle.status);
console.log('- Wheel formula:', manualVehicle.wheelFormula);
console.log('- VAT rate:', manualVehicle.vatRate);
console.log('- Construction date:', manualVehicle.constructionDate);