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
            createBy
        } = options;


        const where = [];

        //TODO the query need to check it with the filters.
        const query = `SELECT * FROM geofence_group `

        postg.querySlave(query, (error, results)=>{
            if(error){
                console.log('ERROR:',error);
                return cb({
                    statusCode: 500,
                    code: 'UE',
                    message: 'Unknow error'
                });
            }

            const geogroups = results.rows;

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