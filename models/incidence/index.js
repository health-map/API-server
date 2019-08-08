const postg = require('./../../db/postgre');
const redis = require('./../../db/redis');
const async = require('async');
const hash = require('json-hash');
const DataLoader = require('dataloader');
const redisClient = redis.connect();
const RedisDataLoader = require('redis-dataloader')({ redis: redisClient });

const PREFIX_INCIDENCES = 'prefix_incidences'


function getLoaderIncidences(params, cb) {
        const date = new Date().getTime();
        availableIncidences.load(params)
          .catch((error) => {
            console.log('ERROR:',error);
            const totalTime = new Date().getTime() - date;
            console.log('Time:', totalTime);
            return cb({
                statusCode: 500,
                code: 'UE',
                message: 'Unknow error'
            });
          })
          .then((incidences) => {
            const totalTime = new Date().getTime() - date;
            console.log('Time:', totalTime);
            cb(null, {
                statusCode: 200,
                code: 'OK',
                message: 'Successful',
                data: { incidences }
            })
          });
}

function getIncidences(key) {

        return new Promise((resolve, reject) => {
            async.map(
              key,
              (options, cb) => {
                console.log('KEYS:', options);

                const  { 
                    ageRange,
                    gender,
                    cie10,
                    categoryGroup,
                    geoGroup = [],
                    geoFences = [],
                    granularityLevel = 0,
                    institution,
                    department,
                    startDate,
                    endDate,
                    wheather
                } = options;


                const where = [];

                const whereGeofences = [];

                const whereDiseases = [];

                const wherePatients = [];

                wherePatients.push(` p.enabled = TRUE `);
                where.push(` geo.city_id = 1 `)

                //whereDiseases.push(` d.privacy_level <= 0 `);
                //whereGeofences.push(` pg.privacy_level <= 0 ` )

                if(ageRange){
                    wherePatients.push(` p.age_range = ${ageRange} `)
                }

                if(gender){
                    wherePatients.push(`  p.gender = '${gender}' `)
                }

                if(department){
                    wherePatients.push(` p.department_id = ${department} `)
                }

                if(granularityLevel){
                    where.push(` geo.granularity_level = ${granularityLevel} `)
                }
                if(institution){
                    wherePatients.push(` p.institution_id = ${institution} `)
                }

                if(startDate && endDate ){
                    wherePatients.push(` p.registered_at BETWEEN '${startDate}' AND '${endDate}' `);
                }

                

                if(cie10){
                    whereDiseases.push(`  d.cie10_code = '${cie10}' `)
                }

                if(categoryGroup){
                    whereDiseases.push(`  a.id = '${categoryGroup}' `)
                }

                

                if(geoGroup.length){
                    if(geoGroup.length == 1){
                        whereGeofences.push(` gg.id = ${geoGroup[0]} `)
                    }else{
                        whereGeofences.push(` gg.id IN (${geoGroup.join(',')}) `)
                    }
                }

                if(geoFences.length){
                    if(geoFences.length == 1){
                        whereGeofences.push(` g.id = ${geoFences[0]} `)
                    }else{
                        whereGeofences.push(` g.id IN (${geoFences.join(',')}) `)
                    }
                }

                //TODO the query need to check it with the filters.
                const query = 
                `SELECT 
                    geo.id as id,
                    ST_AsGeoJSON(geo.polygon) as polygon,
                    geo.name as geofence_name,
                    geo.population as geo_population,
                    COUNT(p.id) AS "absolute",
                    (COUNT(p.id) * 100) / NULLIF(population::decimal, 0) AS relative_to_population,
                    1000 * (COUNT(p.id) * 100) / NULLIF(population::decimal, 0) AS every_1000_inhabitants,
                    CAST(COUNT(p.id) AS DECIMAL) / NULLIF((
                    SELECT 
                        COUNT(p.id) 
                    FROM 
                        patient p2
                    WHERE 
                        geo.id = p2.geofence_id 
                    GROUP BY 
                        p2.geofence_id 
                    ), 0) AS relative_to_patients
                FROM 
                    geofence geo LEFT JOIN patient p ON 
                        p.geofence_id = geo.id 
                        ${wherePatients.length ?
                            ` AND ${wherePatients.join(' AND \n\t\t')} `
                            : ''
                        }
                WHERE
                    ${where.length?
                        `${where.join(' AND \n\t\t')} `:
                        ''
                    }
                    ${whereGeofences.length? 
                        `
                        AND
                        p.geofence_id IN (
                        SELECT 
                            g.id
                        FROM
                            geofence_group pg 
                            LEFT JOIN geofences_groups gg ON pg.id = gg.group_id 
                            LEFT JOIN geofence g ON gg.geofence_id = g.id
                            WHERE
                                ${whereGeofences.join(' AND \n\t\t')} 
                        )
                        ` 
                        : ''
                    }
                    ${ whereDiseases.length ?
                        ` 
                        AND
                        p.disease_id IN (
                        SELECT
                            d.id
                        FROM
                            disease d
                            LEFT JOIN disease_aggregation da ON d.id = da.disease_id 
                            LEFT JOIN aggregation a ON da.aggregation_id = a.id
                                WHERE  ${whereDiseases.join(' AND \n\t')} 
                        )
                        ` 
                        : ''
                    }
                GROUP BY 
                    geo.id
                ;`

                postg.querySlave(query, (error, results)=>{
                    if(error){
                        console.log('ERROR:',error);
                        return cb({
                            statusCode: 500,
                            code: 'UE',
                            message: 'Unknow error'
                        });
                    }

                    const incidences = results.rows.map((row) => {
                        return {
                            ...row,
                            polygon: JSON.parse(row.polygon)
                        }
                    });

                    cb(null, {
                        statusCode: 200,
                        code: 'OK',
                        message: 'Successful',
                        data: { incidences }
                    })
                });

            //End
            },
            (error, results) => {
                if (error) {
                    console.log('ERROR:', error);
                    return reject(error);
                }
                console.log('results:', results.length);
                return resolve(results);
            });
        });
}

const availableIncidences = new RedisDataLoader(
    // set a prefix for t he keys stored in redis. This way you can avoid key
    // collisions for different data-sets in your redis instance.
    `${PREFIX_INCIDENCES}:query`,
    /* create a regular dataloader.
    This should always be set with caching disabled. */
    new DataLoader(
        getIncidences,
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
      expire: 3600,
      cacheKeyFn: keys => `${hash.digest(keys)}`
    }
);

module.exports = {
    getLoaderIncidences
};