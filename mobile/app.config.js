// Adds the optional Google Maps key for Android from the environment (never committed).
module.exports = ({ config }) => {
  const key = process.env.GOOGLE_MAPS_API_KEY || '';
  return {
    ...config,
    android: { ...config.android, ...(key ? { config: { googleMaps: { apiKey: key } } } : {}) },
    extra: { ...config.extra, hasGoogleMapsKey: !!key },
  };
};
