const postg = require('./../../db/postgre');
const redis = require('./../../db/redis');
class Incidence{

    static getIncidences(options, cb) {

        const  { 
            ageRange,
            gender,
            cie10,
            categoryGroup,
            geoGroup = [],
            geoZones = [],
            institution,
            department,
            startDate,
            endDate,
            wheather
        } = options;


        const where = [];

        //TODO the query need to check it with the filters.
        const query = `SELECT * FROM incidence `

        postg.querySlave(query, (error, results)=>{
            if(error){
                console.log('ERROR:',error);
                return cb({
                    statusCode: 500,
                    code: 'UE',
                    message: 'Unknow error'
                });
            }

            const incidences = results.rows;

            cb(null, {
                statusCode: 200,
                code: 'OK',
                message: 'Successful',
                data: { incidences }
            })
        });
        
    }

}
module.exports = Incidence;