const postg = require('./../../db/postgre');
class Age{

    static getAgeRanges(cb) {

        //TODO the query need to check it with the filters.
        const query = `SELECT * FROM patient_age `

        postg.querySlave(query, (error, ranges)=>{
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
                data: { ranges }
            })
        });
        
    }

}
module.exports = Age;