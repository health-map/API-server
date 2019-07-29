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
            geoFences = [],
            granularityLevel = 0,
            institution,
            department,
            startDate,
            endDate,
            wheather
        } = options;


        const where = [];

        const whereGeofences = [];

        const whereDiseases = [];

        where.push(` p.enabled = TRUE `);
        where.push(` geo.city_id = 1 `)

        //whereDiseases.push(` d.privacy_level <= 0 `);
        //whereGeofences.push(` pg.privacy_level <= 0 ` )

        if(ageRange){
            where.push(` p.age_range = ${ageRange} `)
        }

        if(gender){
            where.push(`  p.gender = '${gender}' `)
        }

        if(department){
            where.push(` p.department_id = ${department} `)
        }

        if(granularityLevel){
            where.push(` geo.granularity_level = ${granularityLevel} `)
        }
        if(institution){
            where.push(` p.institution_id = ${institution} `)
        }

        if(startDate && endDate ){
            where.push(` p.registered_at BETWEEN '${startDate}' AND '${endDate}' `);
        }

        

        if(cie10){
            whereDiseases.push(`  p.gender = '${gender}' `)
        }

        if(categoryGroup){
            whereDiseases.push(`  a.id = '${categoryGroup}' `)
        }

        

        if(geoGroup.length){
            if(geoGroup.length == 1){
                whereGeofences.push(` gg.id = ${geoGroup[0]} `)
            }else{
                whereGeofences.push(` gg.id IN (${geoGroup.join(',')}) `)
            }
        }

        if(geoFences.length){
            if(geoFences.length == 1){
                whereGeofences.push(` g.id = ${geoFences[0]} `)
            }else{
                whereGeofences.push(` g.id IN (${geoFences.join(',')}) `)
            }
        }

        //TODO the query need to check it with the filters.
        const query = 
        `SELECT 
            geo.id as id,
            geo.name as geofence_name,
            geo.population as geo_population,
            COUNT(p.id) AS "absolute",
            (COUNT(p.id) * 100) / population::decimal AS relative_to_population,
            1000 * (COUNT(p.id) * 100) / population::decimal AS every_1000_inhabitants,
            CAST(COUNT(p.id) AS DECIMAL) / (
            SELECT 
                COUNT(p.id) 
            FROM 
                patient p2
            WHERE 
                geo.id = p2.geofence_id 
            GROUP BY 
                p2.geofence_id 
            ) AS relative_to_patients
        FROM 
            geofence geo LEFT JOIN patient p ON p.geofence_id = geo.id
            WHERE
            ${where.length?
                `${where.join(' AND \n\t\t')} AND `:
                ''
            }
            p.geofence_id IN (
            SELECT 
                g.id
            FROM
                geofence_group pg 
                LEFT JOIN geofences_groups gg ON pg.id = gg.group_id 
                LEFT JOIN geofence g ON gg.geofence_id = g.id
                ${whereGeofences.length?
                    `WHERE
                        ${whereGeofences.join(' AND \n\t\t')} `:
                    ''
                }
            ) AND
            p.disease_id IN (
            SELECT
                d.id
            FROM
                disease d
                LEFT JOIN disease_aggregation da ON d.id = da.disease_id 
                LEFT JOIN aggregation a ON da.aggregation_id = a.id
                ${ whereDiseases.length?
                    ` WHERE  ${whereDiseases.join(' AND \n\t')} `: 
                    ''
                } 
            )
        GROUP by geo.id `

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