#!/usr/bin/env node
require('dotenv').config();
const { LeadsAPI } = require('../../src/api/leads');

async function testLeads() {
  console.log('🔍 Testing StockSpark Leads API\n');
  
  try {
    // Initialize leads API (it handles its own authentication)
    const leadsAPI = new LeadsAPI();
    
    // Test 1: List leads for last 7 days
    console.log('📋 Test 1: List leads for last 7 days');
    const today = new Date();
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    const dateFrom = weekAgo.toISOString().split('T')[0];
    const dateTo = today.toISOString().split('T')[0];
    
    console.log(`Date range: ${dateFrom} to ${dateTo}`);
    
    const result = await leadsAPI.listLeads({
      dateFrom,
      dateTo
    });
    
    console.log(`✅ Found ${result.totalCount} leads`);
    
    if (result.leads.length > 0) {
      console.log('\n📊 Sample lead data:');
      const sampleLead = result.leads[0];
      console.log(`- ID: ${sampleLead.id}`);
      console.log(`- Name: ${sampleLead.name}`);
      console.log(`- Email: ${sampleLead.email}`);
      console.log(`- Phone: ${sampleLead.phone}`);
      console.log(`- Type: ${sampleLead.type} (${sampleLead.typeCode})`);
      console.log(`- Vehicle: ${sampleLead.vehicle.maker} ${sampleLead.vehicle.model}`);
      console.log(`- Created: ${sampleLead.dateCreated}`);
      console.log(`- Company: ${sampleLead.company.name} (ID: ${sampleLead.company.id})`);
    }
    
    // Test 2: Group leads by type
    console.log('\n📊 Test 2: Lead distribution by type');
    const typeDistribution = {};
    result.leads.forEach(lead => {
      const type = lead.typeCode || 'unknown';
      typeDistribution[type] = (typeDistribution[type] || 0) + 1;
    });
    
    Object.entries(typeDistribution).forEach(([type, count]) => {
      console.log(`- ${type}: ${count} leads`);
    });
    
    // Test 3: Group leads by vehicle maker
    console.log('\n🚗 Test 3: Lead distribution by vehicle maker');
    const makerDistribution = {};
    result.leads.forEach(lead => {
      if (lead.vehicle && lead.vehicle.maker) {
        const maker = lead.vehicle.maker;
        makerDistribution[maker] = (makerDistribution[maker] || 0) + 1;
      }
    });
    
    Object.entries(makerDistribution)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .forEach(([maker, count]) => {
        console.log(`- ${maker}: ${count} leads`);
      });
    
    // Test 4: Privacy consent analysis
    console.log('\n🔒 Test 4: Privacy consent analysis');
    let marketingEmailConsent = 0;
    let marketingPhoneConsent = 0;
    let marketingSmsConsent = 0;
    
    result.leads.forEach(lead => {
      if (lead.privacy) {
        if (lead.privacy.marketingMail) marketingEmailConsent++;
        if (lead.privacy.marketingPhone) marketingPhoneConsent++;
        if (lead.privacy.marketingSms) marketingSmsConsent++;
      }
    });
    
    console.log(`- Email marketing consent: ${marketingEmailConsent}/${result.totalCount} (${Math.round(marketingEmailConsent/result.totalCount*100)}%)`);
    console.log(`- Phone marketing consent: ${marketingPhoneConsent}/${result.totalCount} (${Math.round(marketingPhoneConsent/result.totalCount*100)}%)`);
    console.log(`- SMS marketing consent: ${marketingSmsConsent}/${result.totalCount} (${Math.round(marketingSmsConsent/result.totalCount*100)}%)`);
    
    // Test 5: Form distribution
    console.log('\n📝 Test 5: Lead distribution by form');
    const formDistribution = {};
    result.leads.forEach(lead => {
      if (lead.form && lead.form.code) {
        const formCode = lead.form.code;
        formDistribution[formCode] = (formDistribution[formCode] || 0) + 1;
      }
    });
    
    Object.entries(formDistribution).forEach(([formCode, count]) => {
      console.log(`- ${formCode}: ${count} leads`);
    });
    
    console.log('\n✅ All tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('Error details:', error.response || error.message);
  }
}

// Run tests
testLeads();