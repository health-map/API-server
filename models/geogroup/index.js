const postg = require('./../../db/postgre');
const async = require('async');


function Inserts(template, data) {
    if (!(this instanceof Inserts)) {
        return new Inserts(template, data);
    }
    this._rawDBType = true;
    this.formatDBType = function () {
        return data.map(d=>'(' + pgp.as.format(template, d) + ')').join(',');
    };
}

  
class Geogroup{

    static getGeogroups(options, cb) {

        const  { 
            createdBy,
            privacyLevel,
            q,
            cityId
        } = options;

        let where = undefined;

        let whereConditions = [];
        if (createdBy){
            whereConditions.push(` ge.created_by = ${createdBy} `);
        }
        if (cityId){
            whereConditions.push(` g.city_id = ${cityId} `);
        }
        if (privacyLevel){
            whereConditions.push(` ge.privacy_level <= ${privacyLevel} `);
        } 
        if (q && q.length && typeof(q) === 'string'){
            whereConditions.push(` ge."name" LIKE '%${q}%' `);
        }
        
        if (whereConditions.length){
            where = 'WHERE '.concat(whereConditions.join('AND'));
        }

        //TODO the query need to check it with the filters.
        const query = `
        SELECT 
            ge.id AS id, 
            ge.privacy_level AS privacy_level, 
            ge.name AS name, 
            ge.description AS description, 
            ge.geo_tag AS geo_tag, 
            ge.created_by AS created_by, 
            ge.created_at AS created_at, 
            ge.updated_at AS updated_at,
            CONCAT('[', string_agg(DISTINCT(CONCAT('{"id":"', g.id,'", "shape":',ST_AsGeoJSON(g.polygon),'}')), ','), ']') as polygons
        FROM healthmap.geofence_group ge 
            LEFT JOIN healthmap.geofences_groups geg ON geg.group_id=ge.id
            LEFT JOIN healthmap.geofence g ON g.id=geg.geofence_id
        ${where ? where : '' } 
        GROUP BY
            ge.id
        ;`

        postg.querySlave(query, (error, result)=>{
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
                data: { 
                    geogroups: result.rows.map((geogroup) => {
                        return {
                            ...geogroup,
                            polygons: geogroup.polygons ? JSON.parse(geogroup.polygons) : undefined 
                        };
                    })
                }
            })
        });
        
    }

    static createGeogroup(options, cb) {

        const  { 
            geogroup,
            createdBy,
            privacyLevel
        } = options;


        const {
            name,
            description,
            geoTag = 1,
            geofences = [] // Array of geofences.
        } = geogroup;

        if(!geofences.length){
            return cb({
                statusCode: 412,
                code: 'PF',
                message: 'Missing param [geofences]'
            });
        }

        async.waterfall([
            (cb)=>{

                const values = [
                    privacyLevel, 
                    name, 
                    description, 
                    geoTag, 
                    createdBy, 
                    'now()', 
                    'now()'
                ]


                const query = 
                `INSERT INTO healthmap.geofence_group
                (
                    privacy_level, 
                    "name", 
                    description, 
                    geo_tag, 
                    created_by, 
                    created_at, 
                    updated_at
                )
                VALUES(
                    $1,
                    $2,
                    $3,
                    $4,
                    $5,
                    $6,
                    $7
                ) RETURNING id `
                postg.queryMaster(query, values, (error, result)=>{
                    if(error){
                        console.log('ERROR:',error);
                        return cb({
                            statusCode: 500,
                            code: 'UE',
                            message: 'Unknow error'
                        });
                    }
                    const newGeofenceGroupId = result.rows[0].id;
                    cb(null, newGeofenceGroupId)
                });
            },
            (newId, cb)=>{

                async.mapSeries(geofences,(g, cb)=>{

                    const values = [
                        newId,
                        g,
                        'now()', 
                        'now()'
                    ];
                    const query = 
                    `INSERT INTO healthmap.geofences_groups
                    (
                        group_id, 
                        geofence_id, 
                        created_at, 
                        updated_at
                    )
                    VALUES ($1,$2,$3,$4) `
                    postg.queryMaster(query, values, (error)=>{
                        if(error){
                            console.log('ERROR:',error);
                            return cb({
                                statusCode: 500,
                                code: 'UE',
                                message: 'Unknow error'
                            });
                        }
                        cb(null);
                    });
                },
                (error)=>{
                    if(error){
                        return cb(error);
                    }
                    return cb(null, newId);
                });
            }
        ], (error, newId)=>{
            if(error){
                return cb(error);
            }
            const result = Object.assign({}, geogroup, { id: newId });
            cb(null, {
                statusCode: 200,
                code: 'OK',
                message: 'Successful',
                data: { geogroups: result }
            });
        }); 
    }

}
module.exports = Geogroup;