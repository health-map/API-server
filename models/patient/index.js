const postg = require('../../db/postgre');
const async = require('async');
  
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
            rawAgeType
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
            edad_raw_type
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
            $13
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

}
module.exports = Patient;