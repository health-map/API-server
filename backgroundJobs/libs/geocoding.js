const request = require('request');
const url = require('url');

const GOOGLE_DIRECTIONS_API_KEY = process.env.GOOGLE_DIRECTIONS_API_KEY;


function googleGeocoder(address, cb) {

  const geocodingURLObject = {
    protocol: 'https',
    hostname: 'maps.googleapis.com',
    pathname: '/maps/api/geocode/json',
    query: {
      address: address.replace(' ', '+'),
      key: GOOGLE_DIRECTIONS_API_KEY
    }
  }
  const geocodingURL = url.format(geocodingURLObject)
  console.log("geocodingURL: ", JSON.stringify(geocodingURL));
  return request.get(geocodingURL, (error, response, body) => {
    if (error) return cb(error)
    if (!(response.statusCode >= 200 || response.statusCode < 300)) {
      const error = new Error('HTTP Error')
      error.statusCode = response.statusCode
      error.url = geocodingURL
      return cb(error)
    }
    const { status, results } = JSON.parse(body)
    if (status !== 'OK') {
      const error = new Error('Google Geocoding API Error')
      error.status = status
      return cb(error)
    }
    const accuracy = results[0].geometry.location_type
    const { lat: latitude, lng: longitude } = results[0].geometry.location
    const formattedAddress = results[0].formatted_address;

    return cb(null, { latitude, longitude, formattedAddress, accuracy })
  })
}

module.exports = Geocoding
