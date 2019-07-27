const postg = require('../../db/postgre');
const redis = require('./../../db/redis');
class Disease{

    static getDiseases(options, cb) {

        //TODO the query need to check it with the filters.
        const query = `SELECT * FROM disease `

        postg.querySlave(query, (error, results)=>{
            if(error){
                console.log('ERROR:',error);
                return cb({
                    statusCode: 500,
                    code: 'UE',
                    message: 'Unknow error'
                });
            }

            const diseases = results.rows;

            cb(null, {
                statusCode: 200,
                code: 'OK',
                message: 'Successful',
                data: { diseases }
            })
        });
        
    }

}
module.exports = Disease;