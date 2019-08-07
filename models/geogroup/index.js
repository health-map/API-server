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
            g.id AS geofence_id,
            g.name AS geofence_name,
            ST_AsGeoJSON(g.polygon) AS geofence_polygon,
            g.granularity_level AS geofence_granularity_level
        FROM healthmap.geofence_group ge 
            LEFT JOIN healthmap.geofences_groups geg ON geg.group_id=ge.id
            LEFT JOIN healthmap.geofence g ON g.id=geg.geofence_id
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

            const geogroupsObject = results.rows.reduce((geogroups, row)=>{
                if(row.geofence_id){
                    const geofence = {
                        id: row.geofence_id,
                        name: row.geofence_name,
                        polygon: row.geofence_polygon?JSON.parse(row.geofence_polygon):[],
                        granularity_level: row.granularity_level
                    }

                    if(!geogroups[row.id]){
                        geogroups[row.id] = {
                            id: row.id, 
                            privacy_level: row.privacy_level, 
                            name: row.name, 
                            description: row.description, 
                            geo_tag: row.geo_tag, 
                            created_by: row.created_by, 
                            created_at: row.created_at, 
                            updated_at: row.updated_at,
                            geofences: []
                        }
                    }

                    if(geogroups[row.id]){
                        geogroups[row.id].geofences.push(geofence)
                    }

                }

                return geogroups;

            }, {});

            const geogroups = Object.keys(geogroupsObject).map((key)=>geogroupsObject[key]);

            cb(null, {
                statusCode: 200,
                code: 'OK',
                message: 'Successful',
                data: { geogroups }
            })
        });
        
    }

    static createGeogroup(options, cb) {

        const  { 
            geogroup
        } = options;

        const {
            privacyLevel,
            name,
            description,
            geoTag = 1,
            create_by = 1, //TODO: pending to get user id from the authObject.
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
                    create_by, 
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