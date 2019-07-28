const postg = require('./../../db/postgre');
class Geofence{

    static getGeofences(options, cb) {

        const  { 
            geoGroup,
            granularityLevel,
            city = 1
        } = options;


        const where = [];

        //TODO the query need to check it with the filters.
        const query = `
        SELECT 
            ge.id as id,
            ge.name as name,
            ge.description as description,
            ST_AsGeoJSON(ge.polygon) as polygon,
            ge.parent_geofence_id as parent_geofence_id,
            ge.granularity_level as granularity_level,
            ge.city_id as city_id,
            ge.geo_tag as geo_tag,
            ge.population as population,
            ge.created_at as created_at,
            ge.updated_at as updated_at
        FROM 
            healthmap.geofence ge `

        postg.querySlave(query, (error, results)=>{
            if(error){
                console.log('ERROR:',error);
                return cb({
                    statusCode: 500,
                    code: 'UE',
                    message: 'Unknow error'
                });
            }

            console.log('POLYGON:',results)
            const geofences = results.rows.map((row)=>{
                return Object.assign({}, row, { polygon: JSON.parse(row.polygon) })
            });

            cb(null, {
                statusCode: 200,
                code: 'OK',
                message: 'Successful',
                data: { geofences }
            })
        });
        
    }


    static getGeofence(options, cb) {

        const  { 
            geofenceId
        } = options;


        const where = [];

        //TODO the query need to check it with the filters.
        const query = `SELECT * FROM geofence WHERE id=$1`

        postg.querySlave(query, geofenceId, (error, geofences)=>{
            if(error){
                console.log('ERROR:',error);
                return cb({
                    statusCode: 500,
                    code: 'UE',
                    message: 'Unknow error'
                });
            }

            cb(null, {
                statusCode: 200,
                code: 'OK',
                message: 'Successful',
                data: { geofences }
            })
        });
        
    }

}
module.exports = Geofence;