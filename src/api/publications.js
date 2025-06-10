class PublicationAPI {
  constructor(client) {
    this.client = client;
    
    // Map portal names to activation codes from environment variables
    this.portalCodes = {
      'myportal': process.env.MYPORTAL_ACTIVATION_CODE,
      'automobile.it': process.env.AUTOMOBILE_IT_ACTIVATION_CODE
    };
  }

  // Validate portal and get activation code
  getActivationCode(portalName) {
    const code = this.portalCodes[portalName.toLowerCase()];
    if (!code) {
      throw new Error(`Unknown portal: ${portalName}. Available portals: ${Object.keys(this.portalCodes).join(', ')}`);
    }
    return code;
  }

  // Publish vehicle to a specific portal
  async publishVehicle(vehicleId, portalName) {
    const activationCode = this.getActivationCode(portalName);
    
    try {
      const result = await this.client.post(
        `/publications/${vehicleId}/${activationCode}:publish`,
        {}
      );
      
      return {
        success: true,
        vehicleId,
        portal: portalName,
        activationCode,
        message: `Vehicle ${vehicleId} published to ${portalName}`,
        result
      };
    } catch (error) {
      // Check if already published
      if (error.message.includes('already published')) {
        return {
          success: true,
          vehicleId,
          portal: portalName,
          activationCode,
          message: `Vehicle ${vehicleId} was already published to ${portalName}`,
          alreadyPublished: true
        };
      }
      throw error;
    }
  }

  // Unpublish vehicle from a specific portal
  async unpublishVehicle(vehicleId, portalName) {
    const activationCode = this.getActivationCode(portalName);
    
    try {
      const result = await this.client.post(
        `/publications/${vehicleId}/${activationCode}:unpublish`,
        {}
      );
      
      return {
        success: true,
        vehicleId,
        portal: portalName,
        activationCode,
        message: `Vehicle ${vehicleId} unpublished from ${portalName}`,
        result
      };
    } catch (error) {
      // Check if not published
      if (error.message.includes('not published')) {
        return {
          success: true,
          vehicleId,
          portal: portalName,
          activationCode,
          message: `Vehicle ${vehicleId} was not published to ${portalName}`,
          notPublished: true
        };
      }
      throw error;
    }
  }

  // Publish vehicle to multiple portals
  async publishToMultiplePortals(vehicleId, portalNames) {
    const results = [];
    const errors = [];
    
    for (const portal of portalNames) {
      try {
        const result = await this.publishVehicle(vehicleId, portal);
        results.push(result);
      } catch (error) {
        errors.push({
          portal,
          error: error.message
        });
      }
    }
    
    return {
      vehicleId,
      totalRequested: portalNames.length,
      successCount: results.length,
      results,
      errors,
      success: errors.length === 0
    };
  }

  // Unpublish vehicle from multiple portals
  async unpublishFromMultiplePortals(vehicleId, portalNames) {
    const results = [];
    const errors = [];
    
    for (const portal of portalNames) {
      try {
        const result = await this.unpublishVehicle(vehicleId, portal);
        results.push(result);
      } catch (error) {
        errors.push({
          portal,
          error: error.message
        });
      }
    }
    
    return {
      vehicleId,
      totalRequested: portalNames.length,
      successCount: results.length,
      results,
      errors,
      success: errors.length === 0
    };
  }

  // Publish to all available portals
  async publishToAllPortals(vehicleId) {
    try {
      const result = await this.client.post(
        `/publications/${vehicleId}:publishAll`,
        {}
      );
      
      return {
        success: true,
        vehicleId,
        message: `Vehicle ${vehicleId} published to all portals`,
        portals: Object.keys(this.portalCodes),
        result
      };
    } catch (error) {
      throw error;
    }
  }

  // Unpublish from all portals
  async unpublishFromAllPortals(vehicleId) {
    try {
      const result = await this.client.post(
        `/publications/${vehicleId}:unpublishAll`,
        {}
      );
      
      return {
        success: true,
        vehicleId,
        message: `Vehicle ${vehicleId} unpublished from all portals`,
        portals: Object.keys(this.portalCodes),
        result
      };
    } catch (error) {
      throw error;
    }
  }

  // Get publication status for a vehicle
  async getPublicationStatus(vehicleId) {
    try {
      // Get vehicle details to check publication status
      const vehicle = await this.client.get(`/vehicle/${vehicleId}`);
      
      // Extract publication info from vehicle data
      const publications = vehicle.publications || {};
      const status = {};
      
      // Check each portal
      for (const [portalName, activationCode] of Object.entries(this.portalCodes)) {
        status[portalName] = {
          published: publications[activationCode] === true || 
                    publications[portalName] === true ||
                    false,
          activationCode
        };
      }
      
      // Count published portals
      const publishedPortals = Object.entries(status)
        .filter(([_, info]) => info.published)
        .map(([portal, _]) => portal);
      
      return {
        vehicleId,
        publishedCount: publishedPortals.length,
        totalPortals: Object.keys(this.portalCodes).length,
        publishedPortals,
        status,
        allPublished: publishedPortals.length === Object.keys(this.portalCodes).length,
        nonePublished: publishedPortals.length === 0
      };
    } catch (error) {
      throw new Error(`Failed to get publication status: ${error.message}`);
    }
  }

  // Get list of available portals
  getAvailablePortals() {
    const portals = [];
    
    for (const [name, code] of Object.entries(this.portalCodes)) {
      portals.push({
        name,
        activationCode: code,
        configured: !!code
      });
    }
    
    return {
      count: portals.length,
      portals,
      configuredCount: portals.filter(p => p.configured).length
    };
  }

  // Bulk publish multiple vehicles
  async bulkPublish(vehicleIds, portalNames) {
    const results = [];
    const errors = [];
    
    for (const vehicleId of vehicleIds) {
      try {
        const result = await this.publishToMultiplePortals(vehicleId, portalNames);
        results.push({
          vehicleId,
          success: result.success,
          publishedTo: result.results.map(r => r.portal)
        });
      } catch (error) {
        errors.push({
          vehicleId,
          error: error.message
        });
      }
    }
    
    return {
      totalVehicles: vehicleIds.length,
      successCount: results.length,
      results,
      errors,
      success: errors.length === 0
    };
  }
}

module.exports = { PublicationAPI };