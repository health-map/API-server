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
        const query = `SELECT * FROM healthmap.geofence `

        postg.querySlave(query, (error, results)=>{
            if(error){
                console.log('ERROR:',error);
                return cb({
                    statusCode: 500,
                    code: 'UE',
                    message: 'Unknow error'
                });
            }

            const geofences = results.rows;
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