const { ValidationError } = require('../utils/errors');
const { logger } = require('../utils/logger');
const { API } = require('../config/constants');

class LeadsAPI {
  constructor(client) {
    this.client = client;
  }

  async listLeads(params = {}) {
    const { 
      dateFrom, 
      dateTo,
      companyId,
      ...otherParams 
    } = params;

    // Validate required parameters
    if (!dateFrom || !dateTo) {
      throw new ValidationError('Both dateFrom and dateTo are required', {
        missingParams: ['dateFrom', 'dateTo'].filter(p => !params[p]),
        hint: 'Provide date range in YYYY-MM-DD format'
      });
    }

    // For now, use the fixed API key from environment
    const apiKey = process.env.STOCKSPARK_API_KEY;
    if (!apiKey) {
      throw new ValidationError('STOCKSPARK_API_KEY not configured', {
        hint: 'Set STOCKSPARK_API_KEY in your MCP config file'
      });
    }

    logger.info(`Fetching leads for date range: ${dateFrom} to ${dateTo}`);

    // Build the URL with the API key embedded
    const url = `${API.LEADS_URL}/v2/${apiKey}/lead/list`;
    
    // Build query parameters
    const queryParams = new URLSearchParams({
      dateFrom,
      dateTo,
      format: 'json',
      ...otherParams
    });

    try {
      // Make direct request without going through the standard client
      // since this API uses a different authentication pattern
      const fetch = require('node-fetch');
      const response = await fetch(`${url}?${queryParams.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Leads API Error: ${response.status} ${response.statusText} - ${errorBody}`);
      }

      const data = await response.json();
      
      // Extract leads from response structure
      const leads = data.response || [];
      
      logger.info(`Retrieved ${leads.length} leads`);
      
      return {
        request: data.request,
        leads: leads.map(lead => this.mapLead(lead)),
        totalCount: leads.length
      };
    } catch (error) {
      logger.error('Failed to fetch leads', error);
      throw error;
    }
  }

  mapLead(lead) {
    return {
      id: lead.id,
      name: `${lead.nome} ${lead.surname}`.trim(),
      email: lead.email,
      phone: lead.phone,
      cellphone: lead.cellphone,
      dateCreated: lead.dateCreated,
      type: lead.type,
      typeCode: lead.typeCode,
      channel: lead.channel,
      
      // Vehicle information
      vehicle: {
        maker: lead.maker,
        model: lead.model,
        version: lead.version,
        type: lead.vehicleType,
        class: lead.vehicleClass,
        id: lead.vehicle_id,
        price: lead.price
      },
      
      // Personal information
      personal: {
        cap: lead.cap,
        city: lead.city,
        county: lead.county,
        country: lead.country,
        vat: lead.vat,
        job: lead.job,
        isCompany: lead.isCompany,
        companyName: lead.companyName
      },
      
      // Company information
      company: lead.company,
      
      // Form information
      form: {
        name: lead.form_name,
        code: lead.form_code,
        sourceUrl: lead.source_url
      },
      
      // Marketing attribution
      attribution: {
        campaign: lead.originCampaign,
        source: lead.originSource,
        detail: lead.originDetail,
        term: lead.originTerm,
        content: lead.originContent,
        gclid: lead.originGclid
      },
      
      // Privacy consents
      privacy: {
        marketingSms: lead.privacyMarketingSms,
        marketingPhone: lead.privacyMarketingPhone,
        marketingMail: lead.privacyMarketingMail,
        financing: lead.privacyFinancing,
        commercial: lead.privacyCommercial,
        legal: lead.privacyLegal
      },
      
      // Additional data
      note: lead.note,
      internalNotes: lead.internalNotes,
      descOptional: lead.descOptional,
      extraFields: lead.extraFields,
      qualified: lead.qualified,
      dealerInfo: {
        id: lead.dealer_id,
        name: lead.dealer_name,
        address: lead.dealer_address,
        dmsCode: lead.dealer_dms_code,
        city: lead.dealer_city
      },
      externalId: lead.external_id,
      rawLead: lead.rawLead
    };
  }
}

module.exports = { LeadsAPI };