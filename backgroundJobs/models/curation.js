//const async = require('async');
const postq = require('./../../db/postgre');
const moment = require('moment');
const asyncF = require('async');
const uc = require('upper-case');

const Patient = require('./../../models/patient');

const Age = require('./../../models/age');
const Disease = require('./../../models/disease');

class Curation{


    static processIntersection(item, city, cb){

        if(item.geofenceId){
            return cb(null, item);
        }

        console.log('item:',item)
        const preAddress = uc(item['Direccion'].toString().toUpperCase());
        console.log('preAddress:',preAddress)
        const addresses = preAddress.split(' Y ').reduce(( addresses, address)=>{
            return addresses.concat(address.split(' ').filter(d=>d.length));
        }, []);

        if(addresses.length < 2){
            return cb(null, item);
        }

        const likeComposer = `'%${addresses.map((address)=> Curation.commonCharactersForIntersections(address)).filter(d=>{
            return (d.length &&
            d !== 'LA'  &&
            d !== 'PARROQUIA' &&
            d !== 'COOP' &&
            d !== 'COOP.' &&
            d !== 'DEL' &&
            d !== 'LOS' &&
            d !== 'ETAPA' &&
            d !== 'AVA' &&
            d !== 'AVA.' &&
            d !== 'MZ' &&
            d !== 'MZ.' &&
            d !== 'AVAS' &&
            d !== 'EN' &&
            d !== '.' 
            )
        })
        .join('%')}%'`;

         
        const query = `SELECT 
            ge.id as id,
            ge.name as name,
            ge.description as description,
            ST_AsGeoJSON(ge.polygon) as polygon,
            ge.parent_geofence_id as parent_geofence_id,
            ge.granularity_level as granularity_level,
            ge.city_id as city_id,
            ge.geo_tag as geo_tag,
            ge.population as population,
            ge.created_at as created_at,
            ge.updated_at as updated_at,
            cp.related_geofence_name as city_name,
            cp.place_name,
            cp.type
        FROM 
            healthmap.geofence ge 
        left join healthmap.city_place cp ON cp.related_geofence=ge.id
        WHERE 
            ge.city_id=${city} and cp.type='intersection' and
            cp.place_name SIMILAR TO ${likeComposer}
            `

        postq.queryMaster(query, (error, result)=>{
            if(error){
                console.log('ERROR:',error);
                return cb(error);
            }

            if(!result.rows.length){
                return cb(null, item);
            }

            console.log('FOUND GEOFENCE ID:',result.rows[0].id);
            const geofenceId = result.rows[0].id

            cb(null, Object.assign({}, item, { geofenceId }))
        })
    }

    static process(data, city, progress, cb){

        const query = `SELECT 
            ge.id as id,
            ge.name as name,
            ge.description as description,
            ST_AsGeoJSON(ge.polygon) as polygon,
            ge.parent_geofence_id as parent_geofence_id,
            ge.granularity_level as granularity_level,
            ge.city_id as city_id,
            ge.geo_tag as geo_tag,
            ge.population as population,
            ge.created_at as created_at,
            ge.updated_at as updated_at,
            cp.related_geofence_name as city_name,
            cp.place_name,
            cp.type
        FROM 
            healthmap.geofence ge 
        left join healthmap.city_place cp ON cp.related_geofence=ge.id
        WHERE 
            ge.city_id=${city} and cp.type='place'
        `
        
        postq.queryMaster(query, (error, result)=>{
            if(error){
                console.log('ERROR:',error);
                return cb(error);
            }

            const geofences = result.rows.map((row)=>{
                return Object.assign({}, row, { polygon: JSON.parse(row.polygon) })
            }).filter((d)=>d.place_name)
            .filter((d)=>d.type === 'place');

            const dataTotest = data.filter((_, index)=>index<200);
            Curation.nplGeocoder(dataTotest, geofences, (error, dataProcessed)=>{
                if(error){
                    console.log('ERROR:',error);
                    return cb(error);
                }
                
                return asyncF.map(dataProcessed, (item, cb)=>{
                    Curation.processIntersection(item, city, cb); //Intersections
                }, (_, dataProcessed)=>{

                    const dataFiltered = dataProcessed.filter((d)=>d.geofenceId);

                    let summary = {
                        dataProcessed,
                        dataProcessedLength: dataProcessed.length,
                        dataFiltered,
                        dataFilteredLength: dataFiltered.length
                    }

                    console.log('dataFiltered:',dataFiltered)

                    Curation.insertPatients(dataFiltered, (error, result)=>{
                        
                        if(error){
                            return cb(error);
                        }
                        summary.patients = result;
                        console.log('SUMMARY:',summary)
                        console.log('DONE!')
                        cb(null, summary);
                    })
                });
            });
        });
    }


    static insertPatients(data, cb){

        asyncF.waterfall([
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
            (ranges, diseases, cb)=>{ //Anonimization

                
                const yearsRanges = ranges
                .filter((r)=>r.period_type==='años')
                
                const withAge = data.map((d)=>{
                    const age = parseInt(d['Edad']);
                    const cie10 = d['CIE10'];

                    const dia = diseases
                    .find((y)=>y.cie10_code == cie10);

                    console.log('DIA:',dia)

                    const diseaseId = dia?dia.id:-1
                 
                    console.log('AGE:',age)
                    console.log('cie10:',cie10)
                    const ageId = age === 0? yearsRanges[0].id:yearsRanges
                    .find((y)=>parseInt(y.start_age) <= age && parseInt(y.end_age) >= age).id;

                    d.ageId = ageId;
                    d.diseaseId = diseaseId;
                    return d;
                });

                return cb(null, withAge)
            },
            (dataWithAge, cb)=>{
                return asyncF.each(dataWithAge, (item, cback)=>{

                    const time = moment(new Date(item['Fecha Ingreso'])).format('YYYY-MM-DD HH:mm:ss');
                   
                    const options  = {
                        patient: {
                            cityId: 1,
                            institutionId: 1,
                            department: 1,
                            diseaseId: item.diseaseId,
                            geofenceId: item.geofenceId,
                            ageId: item.ageId,
                            registeredDate: time
                        }
                    }
                    if(item.geofenceId === -1){
                        cback(null, options);
                    }

                    Patient.createPatient(options, (error, results)=>{
                        if(error){
                            console.log('ERROR:',error);
                            return cback(error)
                        }
                        cback(null, results);
                    });
                }, (error, results)=>{
                    if(error){
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

    static async intersectionGeocoder(data){

    }

    static async nplGeocoder(data, dataToCompare, cback){

        const { NerManager } = require('node-nlp');

        let manager = new NerManager({ languages: ['es'], threshold: 0.8 });


        const dataToCompareObject = dataToCompare
        .reduce((dataToCompareObject, dataItem)=>{
            dataToCompareObject[dataItem.place_name] = dataItem;
            return dataToCompareObject;
        }, {});
        
        dataToCompare.map((dataToProcess)=>{
            const { 
                city_name,
                place_name,
                description 
            } = dataToProcess;

            //console.log('DESCRIPTION:',description);

            const itemsExtra = Curation.commonCharacters(place_name)
            .split(' ')
            .map((it)=>`${it}`.trim())
            .filter((it)=>it && it.length);

            const items = Curation.commonCharacters(description)
            .split(' ')
            .map((it)=>`${it}`.trim())
            .filter((it)=>it && it.length)
            .concat(itemsExtra);

            

            // console.log('ITEMS PLACE NAME :',place_name);
            // console.log('ITEMS:',items);
            // console.log('================================');

            manager.addNamedEntityText(
                description,
                place_name,
                ['es'],
                items,
            );
        });

        Promise.all(data.map(async (dataItem) => {

            const address = Curation.commonCharacters(dataItem.Direccion);
            
            const entities = await manager.findEntities(
                address,
                'es',
            )


            const entity = entities.length?
            entities.find((e)=>!e.resolution && e.len > 4)
            :undefined

            console.log('Direccion:',dataItem.Direccion, ' \n Match:', entity);

            dataItem.matches = entity;
            if(dataItem.matches){
                dataItem.geofenceId = dataToCompareObject[dataItem.matches.option].id;
            }
            return dataItem;
        })).then((dataProcessed) => {
            console.log('dataProcessed:',dataProcessed)
            return cback(null, dataProcessed);
        })
        .catch((error)=>{
            console.log('ERROR:',error);
            return cback(error);
        })

    }


    static commonCharactersForIntersections(str){
        return str.replace('SECTOR', '')
         .replace('LA', '')
         .replace('PARROQUIA', '')
         .replace('COOP.', '')
         .replace('ENTRE', '')
         .replace(' DEL ', '')
         .replace(' LA ', '')
         .replace(' CLLJ. ')
         .replace(' DE ', '')
         .replace(' LOS ', '')
         .replace('COOP', '')
         .replace(' ETAPA ', '')
         .replace('URB.', '')
         .replace(' BQ. ', '')
         .replace(' AVA. ', '')
         .replace(' ERATIVA ', '')
         .replace(' EN ', '')
         .replace(' I ', '')
         .replace(' . ', '')
         .trim()
     }

    static commonCharacters(str){
       return str.toLowerCase().replace('sector', '')
        .replace('parroquia', '')
        .replace('cdla.', '')
        .replace('cdla', '')
        .replace('coop.', '')
        .replace(' del ', '')
        .replace(' la ', '')
        .replace(' de ', '')
        .replace(' los ', '')
        .replace('coop', '')
        .replace(' etapa ', '')
        .replace('urb.', '')
        .replace(' bq. ', '')
        .replace(' erativa ', '')
        .replace(' en ', '')
        .replace(' i ', '')
        .replace(' y ', '')
        .replace(' . ', '')
        .replace(' 1 ', '')
        .replace(' 2 ', '')
        .replace(' 3 ', '')
        .replace(' 4 ', '')
        .replace(' 5 ', '')
        .replace(' 6 ', '')
        .replace(' 7 ', '')
        .replace(' 8 ', '')
        .replace(' 9 ', '')
        .replace(' 10 ', '')
    }
    
}



module.exports = Curation;