# Hardcoded Constants Migration

## Summary

The following StockSpark constants have been moved from environment variables to hardcoded values in the source code, as they never change and don't require user configuration:

- `STOCKSPARK_CLIENT_ID` = `'carspark-api'`
- `STOCKSPARK_AUTH_URL` = `'https://auth.motork.io/realms/prod/protocol/openid-connect/token'`
- `STOCKSPARK_API_URL` = `'https://carspark-api.dealerk.com'`

## Changes Made

### 1. Updated Files with Hardcoded Constants

#### `/src/auth.js`
- Added hardcoded `STOCKSPARK_CLIENT_ID` and `STOCKSPARK_AUTH_URL` constants
- Removed these from `validateEnvironment()` 
- Updated authentication requests to use hardcoded values

#### `/src/api/client.js`
- Added hardcoded `STOCKSPARK_API_URL` constant
- Simplified `validateEnvironment()` (no longer validates API URL)
- Updated request URL construction to use hardcoded value

#### `/src/api/images.js`
- Added hardcoded `STOCKSPARK_API_URL` constant
- Updated all image upload URLs to use hardcoded value with dynamic country

#### `/src/api/leads.js`
- Added hardcoded `STOCKSPARK_LEADS_API_URL` constant for leads API
- Updated leads API URL construction

### 2. Updated Configuration Files

#### `/tests/config/test-config.js`
- Removed hardcoded clientId and authUrl from test config
- Updated `setupEnvironment()` to not set these variables
- Added comments explaining the changes

#### `/.env.example`
- Removed `STOCKSPARK_CLIENT_ID`, `STOCKSPARK_AUTH_URL`, and `STOCKSPARK_API_URL`
- Added explanatory comment about hardcoded constants
- Simplified required environment variables

#### `/README.md`
- Updated setup instructions to remove hardcoded environment variables
- Simplified Claude Desktop configuration example
- Updated required vs optional environment variables

## Benefits

1. **Simplified Configuration**: Users no longer need to set constants that never change
2. **Reduced Error Potential**: Eliminates common configuration mistakes
3. **Cleaner Setup**: Fewer environment variables to manage
4. **Maintained Flexibility**: Country and other dynamic settings remain configurable

## Required Environment Variables (After Changes)

### Minimal Required
```bash
STOCKSPARK_USERNAME=your-email@dealership.com
STOCKSPARK_PASSWORD=your-password
```

### Optional (with defaults)
```bash
STOCKSPARK_COUNTRY=it  # defaults to 'it'
STOCKSPARK_COMPANY_ID=auto-discovered  # if not set
STOCKSPARK_DEALER_ID=auto-discovered   # if not set
```

## Verification

All changes have been tested and verified:
- ✅ Authentication works with hardcoded client ID and auth URL
- ✅ API requests work with hardcoded API URL
- ✅ Image uploads work with hardcoded API URL
- ✅ Leads API works with hardcoded leads URL
- ✅ Existing test suite passes
- ✅ No breaking changes to public interface

## Backward Compatibility

The changes are fully backward compatible - if the old environment variables are still set, they will be ignored in favor of the hardcoded values. No existing deployments will break.