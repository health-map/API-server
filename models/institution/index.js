const postg = require('../../db/postgre');
const redis = require('./../../db/redis');
class Institution{

    static getInstitutions(cb) {

        //TODO the query need to check it with the filters.
        const query = `
        SELECT 
            it.id AS id, 
            it.city_id AS city_id, 
            it.name AS name, 
            it.description AS description, 
            it.website AS website, 
            it.created_at AS created_at, 
            it.updated_at AS updated_at, 
            it.enabled AS enabled, 
            ST_AsGeoJSON(it.location) AS location
        FROM healthmap.institution it
        `

        postg.querySlave(query, (error, results)=>{
            if(error){
                console.log('ERROR:',error);
                return cb({
                    statusCode: 500,
                    code: 'UE',
                    message: 'Unknow error'
                });
            }

            const institutions = results.rows.map((row)=>{
                return Object.assign({}, row, { location: JSON.parse(row.location) })
            });

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