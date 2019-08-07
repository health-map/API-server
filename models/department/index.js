const postg = require('../../db/postgre');
const redis = require('./../../db/redis');
class Department{

    static getDepartments(options, cb) {

        const {
            institutionId
        } = options;

        let where = undefined;
        const whereConditions = []
        whereConditions.push(` dep.enabled = TRUE `);
        if (institutionId){
            whereConditions.push(` dep.institution_id = ${institutionId} `)
        } 
        
        if (whereConditions.length){
            where = 'WHERE '.concat(whereConditions.join('AND'));
        }

        //TODO the query need to check it with the filters.
        const query = `
          SELECT 
          dep.id, 
          dep.institution_id, 
          dep.city_id, 
          dep."name", 
          dep.website,
          dep.description, 
          dep.created_at, 
          dep.updated_at
        FROM 
          healthmap.department AS dep
        ${where ? where : '' }
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

            const departments = results.rows;

            cb(null, {
                statusCode: 200,
                code: 'OK',
                message: 'Successful',
                data: { departments }
            })
        });
        
    }

}
module.exports = Department;