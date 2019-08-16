const postg = require('../../db/postgre');
const redis = require('./../../db/redis');
const async = require('async');
class Disease{

    static getDiseasesRaw(cback){
        const query = `
            SELECT 
                * 
            FROM 
                healthmap.disease AS main
            WHERE 
                main.enabled = TRUE`;
        console.log('QUERY:',query)
        postg.querySlave(query, (error, results)=>{
            if(error){
                console.log('ERROR:',error);
                cback(error);
            }
            return cback(null, results.rows);
        })
    }

    static getDiseases(options, cb) {

        const {
            createdBy,
            privacyLevel,
            q
        } = options;
        //TODO the query need to check it with the filters.
        
        let where = undefined;
        const whereConditions = []
        whereConditions.push(` main.enabled = TRUE `);
        if (privacyLevel){
            whereConditions.push(` main.privacy_level <= ${privacyLevel} `)
        } 
        if (q && q.length && typeof(q) === 'string'){
            whereConditions.push(` UPPER(main."name") LIKE  '%${q.toUpperCase()}%' `)
        }
        
        if (whereConditions.length){
            where = 'WHERE '.concat(whereConditions.join('AND'));
        }

        async.parallel({
            diseases: (cback) => {
                const query = `
                    SELECT 
                        * 
                    FROM 
                        healthmap.disease AS main
                        ${where} 
                    LIMIT 
                        100`;
                console.log('QUERY:',query)
                postg.querySlave(query, (error, results)=>{
                    if(error){
                        console.log('ERROR:',error);
                        return cback({
                            statusCode: 500,
                            code: 'UE',
                            message: 'Unknow error'
                        });
                    }
                    return cback(null, results.rows);
                })
            },
            diseaseAggregation: (cback) => {
                const query = `
                    SELECT 
                        main.id AS id,
                        main."name" AS name,
                        main.privacy_level AS privacy_level,
                        main.enabled AS enabled,
                        main.description AS description,
                        COUNT(DISTINCT d.id) AS numberOfDiseases
                    FROM 
                        healthmap.aggregation AS main
                            LEFT JOIN healthmap.disease_aggregation dagg ON main.id = dagg.aggregation_id
                            LEFT JOIN healthmap.disease d ON d.id = dagg.disease_id
                        ${where} 
                    GROUP BY
                        main.id
                    LIMIT 
                        100`;
                postg.querySlave(query, (error, results)=>{
                    if(error){
                        console.log('ERROR:',error);
                        return cback({
                            statusCode: 500,
                            code: 'UE',
                            message: 'Unknow error'
                        });
                    }
                    return cback(null, results.rows);
                })
            }
        }, (err, results) => {
            if (err){
                console.log('ERROR', err);
                return cb({
                    statusCode: 500,
                    code: 'UE',
                    message: 'Unknow error'
                });
            }
            return cb(null, {
                statusCode: 200,
                code: 'OK',
                message: 'Successful',
                data: { 
                    diseases: results.diseases, 
                    aggregation: results.diseaseAggregation 
                }
            })
        })        
    }
}
module.exports = Disease;