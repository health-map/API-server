const request = require('request');
const url = require('url');

const redis = require('./../../db/redis');
const asyncF = require('async');

const GEOCODING_SERVICES = 'geocoder'

const GOOGLE_DIRECTIONS_API_KEY = process.env.GOOGLE_DIRECTIONS_API_KEY;

const hash = require('json-hash');

const DataLoader = require('dataloader');
const RedisDataLoader = require('redis-dataloader')({ redis: redis.connect() });


const geocodingAddressDataloader = new RedisDataLoader(
  // set a prefix for t he keys stored in redis. This way you can avoid key
  // collisions for different data-sets in your redis instance.
  `${GEOCODING_SERVICES}:query`,
  /* create a regular dataloader.
  This should always be set with caching disabled. */
  new DataLoader(
    geocoderBatchingFunction,
    {
      cache: false,
      cacheKeyFn: keys => `${hash.digest(keys)}`
    }
  ),
  // The options here are the same as the regular dataloader options, with
  // the additional option "expire"
  {
    // caching here is a local in memory cache. Caching is always done
    // to redis.
    cache: false,
    // if set redis keys will be set to expire after this many seconds
    // this may be useful as a fallback for a redis cache.
    expire: 604800, // 1 month!
    cacheKeyFn: keys => `${hash.digest(keys)}`
  }
);


function geocode(address, cback){
  console.log('address:',address)
  const params = {
    address
  }
  const date = new Date().getTime();
  geocodingAddressDataloader.load(params)
    .catch((error) => {
      const totalTime = new Date().getTime() - date;
      console.log('Time:', totalTime);
      console.log('error en google', error);
      return cback(error);
    })
    .then((result) => {
      if(result){ 
        console.log('ENCONTRADA', result);
        const totalTime = new Date().getTime() - date;
        console.log('Time:', totalTime);
        return cback(null, result);
      }
    });
}

function geocoderBatchingFunction(key) {
  console.log('KEY:',key)
  return new Promise((resolve, reject) => {
    asyncF.map(
      key,
      (keys, cb) => {
        const {
          address
        } = keys;
        console.log('address:',address)
  
        const geocodingURLObject = {
          protocol: 'https',
          hostname: 'maps.googleapis.com',
          pathname: '/maps/api/geocode/json',
          query: {
            address: address.replace(' ', '+'),
            key: GOOGLE_DIRECTIONS_API_KEY,
            bounds: "-2.289252,-80.04871|-2.00194,-79.853512"
          }
        }
        const geocodingURL = url.format(geocodingURLObject)
        console.log("geocodingURL: ", JSON.stringify(geocodingURL));
        return request.get(geocodingURL, (error, response, body) => {
          if (error) return cb(error)
          if (!(response.statusCode >= 200 || response.statusCode < 300)) {
            return cb('HTTP Error')
          }
          const { status, results } = JSON.parse(body)
          if (status !== 'OK') {
            return cb('Google Geocoding API Error')
          }

          const accuracy = results[0].geometry.location_type
          console.log('accuracy:',accuracy)
          const { lat: latitude, lng: longitude } = results[0].geometry.location
          const formattedAddress = results[0].formatted_address;
          return cb(null, { latitude, longitude, formattedAddress, accuracy })
        })
      },
      (error, results) => {
        if (error) {
          //console.log('ERROR:', error);
          return reject(error);
        }
        return resolve(results);
      }
    );
  });
}

module.exports = geocode
