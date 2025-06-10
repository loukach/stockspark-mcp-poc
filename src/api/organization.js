/**
 * Organization API - Company and Dealer Management
 * Handles dynamic discovery of user's companies and dealers
 */

const { logger } = require('../utils/logger');

class OrganizationAPI {
  constructor(client) {
    this.client = client;
    this.cachedCompanies = null;
    this.cachedDealers = new Map(); // companyId -> dealers
    this.selectedCompany = null;
    this.selectedDealer = null;
  }

  /**
   * Get list of companies the user has access to
   */
  async getUserCompanies(country = null) {
    try {
      // Use provided country or default from env
      const targetCountry = country || process.env.STOCKSPARK_COUNTRY || 'it';
      
      logger.info('Fetching user companies', { country: targetCountry });
      
      const companies = await this.client.request(`/company`, {
        method: 'GET',
        country: targetCountry
      });
      
      this.cachedCompanies = companies;
      
      logger.info('Fetched user companies', { 
        count: companies.length,
        companies: companies.map(c => ({ id: c.id, name: c.name }))
      });
      
      return companies;
    } catch (error) {
      logger.error('Failed to fetch companies', { error: error.message });
      throw error;
    }
  }

  /**
   * Get dealers for a specific company
   */
  async getCompanyDealers(companyId, country = null) {
    try {
      const targetCountry = country || process.env.STOCKSPARK_COUNTRY || 'it';
      
      logger.info('Fetching dealers for company', { companyId, country: targetCountry });
      
      const dealers = await this.client.request(`/company/${companyId}/dealer`, {
        method: 'GET',
        country: targetCountry
      });
      
      this.cachedDealers.set(companyId, dealers);
      
      logger.info('Fetched company dealers', { 
        companyId,
        count: dealers.length,
        dealers: dealers.map(d => ({ id: d.id, name: d.name }))
      });
      
      return dealers;
    } catch (error) {
      logger.error('Failed to fetch dealers', { companyId, error: error.message });
      throw error;
    }
  }

  /**
   * Initialize organization context - discovers companies and dealers
   */
  async initializeContext(country = null) {
    try {
      // Step 1: Get user's companies
      const companies = await this.getUserCompanies(country);
      
      if (companies.length === 0) {
        throw new Error('User has no access to any companies');
      }
      
      // Step 2: Handle company selection
      if (companies.length === 1) {
        // Single company - auto-select
        this.selectedCompany = companies[0];
        logger.info('Auto-selected single company', { 
          companyId: this.selectedCompany.id,
          companyName: this.selectedCompany.name 
        });
      } else {
        // Multiple companies - will need user selection later
        logger.info('Multiple companies available - selection required', {
          count: companies.length,
          companies: companies.map(c => ({ id: c.id, name: c.name }))
        });
        
        // For now, select the first one (can be overridden)
        this.selectedCompany = companies[0];
      }
      
      // Step 3: Get dealers for selected company
      if (this.selectedCompany) {
        const dealers = await this.getCompanyDealers(this.selectedCompany.id, country);
        
        if (dealers.length === 1) {
          // Single dealer - auto-select
          this.selectedDealer = dealers[0];
          logger.info('Auto-selected single dealer', { 
            dealerId: this.selectedDealer.id,
            dealerName: this.selectedDealer.name 
          });
        } else if (dealers.length > 1) {
          // Multiple dealers - select first for now
          this.selectedDealer = dealers[0];
          logger.info('Multiple dealers available - selected first', {
            count: dealers.length,
            selectedDealer: { id: this.selectedDealer.id, name: this.selectedDealer.name }
          });
        }
      }
      
      return {
        companies,
        selectedCompany: this.selectedCompany,
        dealers: this.cachedDealers.get(this.selectedCompany?.id) || [],
        selectedDealer: this.selectedDealer,
        requiresCompanySelection: companies.length > 1,
        requiresDealerSelection: (this.cachedDealers.get(this.selectedCompany?.id) || []).length > 1
      };
      
    } catch (error) {
      logger.error('Failed to initialize organization context', { error: error.message });
      throw error;
    }
  }

  /**
   * Select a specific company and its dealers
   */
  async selectCompany(companyId, country = null) {
    const company = this.cachedCompanies?.find(c => c.id === companyId);
    if (!company) {
      // Try to fetch if not cached
      const companies = await this.getUserCompanies(country);
      const foundCompany = companies.find(c => c.id === companyId);
      if (!foundCompany) {
        throw new Error(`Company ${companyId} not found or user has no access`);
      }
      this.selectedCompany = foundCompany;
    } else {
      this.selectedCompany = company;
    }
    
    // Fetch dealers for the selected company
    const dealers = await this.getCompanyDealers(companyId, country);
    
    // Auto-select dealer if only one
    if (dealers.length === 1) {
      this.selectedDealer = dealers[0];
    } else {
      this.selectedDealer = null; // Reset dealer selection
    }
    
    logger.info('Selected company', {
      companyId: this.selectedCompany.id,
      companyName: this.selectedCompany.name,
      dealerCount: dealers.length
    });
    
    return {
      company: this.selectedCompany,
      dealers,
      selectedDealer: this.selectedDealer
    };
  }

  /**
   * Select a specific dealer
   */
  selectDealer(dealerId) {
    if (!this.selectedCompany) {
      throw new Error('No company selected');
    }
    
    const dealers = this.cachedDealers.get(this.selectedCompany.id) || [];
    const dealer = dealers.find(d => d.id === dealerId);
    
    if (!dealer) {
      throw new Error(`Dealer ${dealerId} not found in company ${this.selectedCompany.id}`);
    }
    
    this.selectedDealer = dealer;
    
    logger.info('Selected dealer', {
      dealerId: dealer.id,
      dealerName: dealer.name,
      companyId: this.selectedCompany.id
    });
    
    return dealer;
  }

  /**
   * Get current context (selected company and dealer)
   */
  getCurrentContext() {
    return {
      company: this.selectedCompany,
      dealer: this.selectedDealer,
      companyId: this.selectedCompany?.id,
      dealerId: this.selectedDealer?.id
    };
  }

  /**
   * Format company/dealer info for display
   */
  formatContextInfo() {
    const context = this.getCurrentContext();
    return `Company: ${context.company?.name || 'Not selected'} (ID: ${context.companyId || 'N/A'})\n` +
           `Dealer: ${context.dealer?.name || 'Not selected'} (ID: ${context.dealerId || 'N/A'})`;
  }
}

module.exports = { OrganizationAPI };