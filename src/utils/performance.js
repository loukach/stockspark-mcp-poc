const performanceData = {
  operations: [], // Keep last 100 operations
  maxOperations: 100
};

function trackPerformance(toolName, handler) {
  return async (params) => {
    const start = Date.now();
    try {
      const result = await handler(params);
      const duration = Date.now() - start;
      
      // Store in ring buffer
      performanceData.operations.push({
        tool: toolName,
        duration,
        success: true,
        timestamp: Date.now()
      });
      
      // Keep only last 100
      if (performanceData.operations.length > performanceData.maxOperations) {
        performanceData.operations.shift();
      }
      
      // Add metadata to response
      return {
        ...result,
        _perf: { ms: duration }
      };
    } catch (error) {
      const duration = Date.now() - start;
      performanceData.operations.push({
        tool: toolName,
        duration,
        success: false,
        timestamp: Date.now()
      });
      throw error;
    }
  };
}

module.exports = { trackPerformance, performanceData };