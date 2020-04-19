const async = require('async');
const moment = require('moment');
const postg = require('../../db/postgre');
const Age = require('./../age');
const Disease = require('./../disease');

class Patient{

    static createPatient(options, cb) {

        const  { 
            patient
        } = options;

        const {
            cityId,
            institutionId,
            department,
            diseaseId,
            geofenceId,
            ageId,
            gender = 'N',
            etnia = 'DESCONOCIDA',
            registeredDate,
            rawAge = -1,
            rawAgeType = 'N/A',
            latitude,
            longitude,
            geo_type = 'geozone',
            cuarantine_status,
            integration_id
        } = patient;

        const values = [
            cityId, 
            institutionId,
            department, 
            diseaseId,
            geofenceId,
            ageId,
            gender,
            registeredDate,
            'now()', 
            'now()',
            etnia,
            rawAge,
            rawAgeType,
            latitude,
            longitude,
            geo_type,
            cuarantine_status,
            integration_id
        ]

        console.log('VALUES:',values);


        const query = 
        `INSERT INTO healthmap.patient
        (
            city_id, 
            institution_id, 
            department_id, 
            disease_id, 
            geofence_id, 
            age_range, 
            gender,
            registered_at,
            created_at,
            updated_at,
            etnia,
            edad_raw,
            edad_raw_type,
            latitude,
            longitude,
            geo_type,
            cuarantine_status,
            integration_id
        )
        VALUES(
            $1,
            $2,
            $3,
            $4,
            $5,
            $6,
            $7,
            $8,
            $9,
            $10,
            $11,
            $12,
            $13,
            $14,
            $15,
            $16,
            $17,
            $18
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
            const newPatientId = result.rows[0].id;
            cb(null, Object.assign({}, patient, { id: newPatientId }));
        }); 
    }

    static getPatientsPoints(options, cb) {

        console.log('OPTIONS:', options);
      
        const  { 
            ageRange,
            gender,
            cie10,
            institution,
            department,
            startDate,
            endDate,
        } = options;
      
        const wherePatients = [];
      
        wherePatients.push(` p.enabled = TRUE `);
        wherePatients.push(` p.geo_type = 'point' `);
      
        if(ageRange){
            wherePatients.push(` p.age_range = ${ageRange} `)
        }
      
        if(gender){
            wherePatients.push(`  p.gender = '${gender}' `)
        }
      
        if(department){
            wherePatients.push(` p.department_id = ${department} `)
        }
      
        if(institution){
            wherePatients.push(` p.institution_id = ${institution} `)
        }
      
        if(startDate && endDate ){
            wherePatients.push(` p.registered_at BETWEEN '${startDate}' AND '${endDate}' `);
        }
      
        if(cie10){
          wherePatients.push(`  d.cie10_code = '${cie10}' `)
        }
      
        //TODO the query need to check it with the filters.
        const query = 
        `SELECT 
          p.latitude,
          p.longitude,
          p.edad_raw,
          d.cie10_code,
          d.name,
          p.registered_at,
          p.gender,
          p.cuarantine_status,
          p.integration_id
        FROM 
          patient p LEFT JOIN disease d ON d.id = p.disease_id
        WHERE
          ${wherePatients.join(' AND \n\t\t')}
        ;`
      
        postg.querySlave(query, (error, results)=>{
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
                data: results
            })
        });
    }
      
    static insertPatientPoint(options, cb) {

        let data = {
            age: options.age,
            cie10: options.cie10,
            ageType: options.ageType,
            registeredDate: options.registeredDate,
            institution: options.institution,
            deparment: options.department,
            gender: options.gender,
            etnia: options.etnia,
            latitude: options.latitude,
            longitude: options.longitude,
            cuarantine_status: options.cuarantine_status,
            integration_id: options.integration_id
        };
    
    
        const geofenceQuery =
        `  SELECT 
                ge.id as id,
                ge.name as name
            FROM 
                healthmap.geofence ge 
            WHERE 
                ge.granularity_level = 7 AND
                ST_Contains(ge.polygon, ST_GeomFromText('POINT(${data.longitude} ${data.latitude})')) = TRUE 
            `
        
        async.waterfall([
            (cb)=>{
                Age.getAgeRanges((error, rangesData)=>{
                    if(error){
                        return cb(error);
                    }
                    return cb(null, rangesData.data.ranges);
                });
            },
            (ranges, cb)=>{
                Disease.getDiseasesRaw((error, diseases)=>{
                    if(error){
                        return cb(error);
                    }
                    return cb(null, ranges, diseases);
                });
            },
            (ranges, diseases, cb) => {
                postg.querySlave(geofenceQuery, (err, result) => {
                    if (err){
                        return cb(err);
                    }
                    if (result && result.length){
                        data.geofenceId = result[0].id;
                    } else {
                        data.geofenceId = 1;
                    }
                    return cb(null, ranges, diseases);
                })
            },
            (ranges, diseases, cb)=>{ //Anonimization
        
                const yearsRanges = ranges
                    .filter((r)=>r.period_type==='años')
        
                const monthRanges = ranges
                    .filter((r)=>r.period_type==='meses')   
                
                const age = parseInt(data["age"]);
                const cie10 = data["cie10"];
                const ageType = data["ageType"];
    
                const dia = diseases
                    .find((y)=>y.cie10_code == cie10);
    
                const diseaseId = dia ? dia.id : -1;
                
                let ageId;
                if (ageType){
                    if (ageType === 'años'){
                        ageId = 
                        age === 0 ? 
                        monthRanges[0] : 
                        yearsRanges
                            .find((y) => {
                                return parseInt(y.start_age) <= age && parseInt(y.end_age) >= age
                            });
                    } else if (ageType === 'meses'){
                        ageId = 
                        monthRanges
                            .find((y) => {
                                return parseInt(y.start_age) <= age && parseInt(y.end_age) >= age
                            });
                    } else { // dias
                        ageId = monthRanges[0];
                    }
                } else {
                    ageId = 
                        age === 0 ? 
                        monthRanges[0] : 
                        yearsRanges
                            .find((y) => {
                                return parseInt(y.start_age) <= age && parseInt(y.end_age) >= age
                            });
                }
    
                if (!ageId){
                    console.log("BAD AGE");
                }
    
                ageId = ageId ? ageId.id : 4;
    
                data.ageId = ageId;
                data.diseaseId = diseaseId;
        
                return cb(null, data);
            },
            (item, cb)=>{
        
                const time = moment(new Date(item["registeredDate"])).format('YYYY-MM-DD HH:mm:ss');
                
                const options  = {
                    patient: {
                        cityId: 1,
                        institutionId: item["institution"] ? item["institution"] : 1,
                        department: item["department"] ? item["department"] : 1,
                        gender: item["gender"] ? item["gender"] : 'N', 
                        diseaseId: item.diseaseId,
                        geofenceId: item.geofenceId,
                        etnia: item["etnia"] ? item["etnia"] : 'DESCONOCIDA',
                        rawAge: item["age"] ? item["age"] : -1,
                        rawAgeType: item["ageType"] ? item["ageType"] : 'años',
                        ageId: item.ageId,
                        registeredDate: time,
                        geo_type: 'point',
                        latitude: item["latitude"],
                        longitude: item["longitude"],
                        cuarantine_status: item["cuarantine_status"],
                        integration_id: item["integration_id"]
                    }
                }
                if(item.geofenceId === -1 || !item.geofenceId){
                    return cb(new Error("Error loading geofence of point"));
                }
                if(item.diseaseId === -1){
                    return cb(new Error("Error loading CIE10 disease"));
                }
                if(item.ageId === -1 || !item.ageId){
                    return cb(new Error("Error loading age of patient"));
                }
                Patient.createPatient(options, (error, results)=>{
                    if(error){
                        console.log('ERROR:',error);
                        return cb(error);
                    }
                    cb(null, results);
                });
            }
        ], (error, results)=>{
            if(error){
                return cb(error);
            }
            cb(null, results)
        });
        
    }

    static editPatientPoint(options, cb) {
        const {
            latitude,
            longitude,
            cuarantine_status,
            integration_id
        } = options; 

        let setConditions = [];

        if (latitude && longitude){
            setConditions.push( ` latitude = ${latitude} ` )
            setConditions.push( ` longitude = ${longitude} ` )
        }

        if (cuarantine_status){
            setConditions.push( ` cuarantine_status = '${cuarantine_status}' ` )
        }

        const query = 
        `UPDATE healthmap.patient
        SET 
            ${setConditions.join(' , ')}
        WHERE 
            integration_id IS NOT NULL and
            integration_id = '${integration_id}'
        ;`

        postg.queryMaster(query, (error, result)=>{
            if(error){
                console.log('ERROR:',error);
                return cb({
                    statusCode: 500,
                    code: 'UE',
                    message: 'Unknow error'
                });
            }
            cb(null, result);
        }); 

    }
}
module.exports = Patient;