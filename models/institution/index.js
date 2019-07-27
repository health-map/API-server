const postg = require('../../db/postgre');
const redis = require('./../../db/redis');
class Institution{

    static getInstitutions(options, cb) {

        //TODO the query need to check it with the filters.
        const query = `SELECT * FROM institution `

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
                data: { institutions }
            })
        });
        
    }

}
module.exports = Institution;