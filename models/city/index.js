const postg = require('../../db/postgre');
const redis = require('./../../db/redis');
class City{

    static getCities(cb) {

        //TODO the query need to check it with the filters.
        const query = `
        SELECT 
          id, 
          "name", 
          description, 
          geofence_id, 
          created_at, 
          updated_at
        FROM 
          healthmap.city
        WHERE
          enabled = TRUE;
        `;

        postg.querySlave(query, (error, results)=>{
            if(error){
                console.log('ERROR:',error);
                return cb({
                    statusCode: 500,
                    code: 'UE',
                    message: 'Unknow error'
                });
            }

            const cities = results.rows;

            cb(null, {
                statusCode: 200,
                code: 'OK',
                message: 'Successful',
                data: { cities }
            })
        });
        
    }

}
module.exports = City;