//const async = require('async');
const postq = require('./../../db/postgre');
const moment = require('moment');
const asyncF = require('async');
const uc = require('upper-case');

var Combinatorics = require('./../libs/combinatorics');

const geocoder = require('./../libs/geocoding');

const Patient = require('./../../models/patient');

const Age = require('./../../models/age');
const Disease = require('./../../models/disease');

String.prototype.replaceAlfa = function(){
    const number = parseInt(this);
    return Number.isNaN(number)?this:`${number}`;
};

const COLUMNA_EDAD = 'edad';
const COLUMNA_ETNIA = 'etnia';
const COLUMNA_DEPARTAMENT = 'department';
const COLUMNA_EDAD_TIPO = 'tipo_edad';
const COLUMNA_CIE10 = 'CIE10';
const COLUMNA_DIRECCION = 'direccion';
const COLUMNA_GENERO = 'genero';
const COLUMNA_INGRESO = 'fecha_ingreso';
const COLUMNA_INSTITUCION = 'institution';



class Curation{


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
            ge.granularity_level = 7 AND
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

            // filter adresses with less than 4 characters
            const dataTotest = data.filter((d, i)=>d[COLUMNA_DIRECCION].length > 4);

            let summary = {
                totalPacients: dataTotest.length
            }
            asyncF.waterfall([
                (cb)=>{
                    return asyncF.mapSeries(dataTotest, (item, cb)=>{
                        Curation.placesGeocoder(item, city, cb); //places
                    }, (_, dataProcessed)=>{
                        const  placesgeocoder = dataProcessed.filter(d=>d.geocoder=='placesgeocoder')
                        summary.placesgeocoder = placesgeocoder.length;
                        cb(null, dataProcessed)
                    });
                },
                (dataTotest, cb)=>{ //BIGRAMS TRIGRAMS...
                    Curation.nplGeocoder(dataTotest, geofences, (error, dataProcessed)=>{
                        if(error){
                            console.log('ERROR:',error);
                            return cb(error);
                        }
                        
                        const nplGeocoder = dataProcessed.filter(d=>d.geocoder=='nplgeocoder')
                        summary.nplGeocoder = nplGeocoder.length;
                        return cb(null, dataProcessed);  
                    });
                },
                (dataTotest, cb)=>{
                    return asyncF.mapSeries(dataTotest, (item, cb)=>{
                        Curation.processIntersection(item, city, cb); //Intersections
                    }, (_, dataProcessed)=>{
                        const  intersectionsGeocoder = dataProcessed.filter(d=>d.geocoder=='intersections')
                        summary.intersectionsGeocoder = intersectionsGeocoder.length;
                        cb(null, dataProcessed)
                    });
                },
                (dataTotest, cb)=>{ //GOOGLE
                    Curation.googleGeocoder(dataTotest, city, (error, dataProcessed)=>{
                        if(error){
                            return cb(error);
                        }
                        const googleGeocoder = dataProcessed.filter(d=>d.geocoder=='google')
                        summary.googleGeocoder = googleGeocoder.length;
                        return cb(null, dataProcessed)
                    })
                },
            ], (error, dataProcessed)=>{
                if(error){
                    return cb(error);
                }

                const dataFiltered = dataProcessed.filter(d=>d.geofenceId)
                const dataMissingGeocoded = dataProcessed.filter(d=>!d.geofenceId)

                summary.totalGeocodedPatients = dataFiltered.length;
                console.log('SUMMARY:',summary)
                Curation.insertPatients(dataFiltered, (error, result)=>{
                                
                    if(error){
                        return cb(error);
                    }
                    summary.savedPatients = result.length;
                    console.log('SUMMARY:',summary);
                    console.log('NOT FOUND ADDRESSES:',dataMissingGeocoded.map((d)=>d[COLUMNA_DIRECCION]).join('\n\t'));
                    console.log('SUMMARY:',summary)
                    console.log('DONE!')
                    return cb(null, summary)
                })
            })    
        });
    }

    static nGramQuery(cmb, cb, type = undefined){
        const composedLike = cmb.map((ct)=>{
                return ` cp.place_name LIKE '%${ct.map((c)=>c.length <= 2 ?`${c}`: c).join('%')}%' `
        }).join(' OR ');
        const query = `
        SELECT 
            ge.id 
        FROM 
            healthmap.geofence ge           
            left join healthmap.city_place cp ON cp.related_geofence=ge.id
        WHERE 
            ge.granularity_level = 7 AND
            ${ type === 'place' ? "cp.type = 'place' AND " : ''}  
            ${ type === 'intersection' ? "cp.type = 'intersection' AND " : ''}  
            (${composedLike}) `

            postq.queryMaster(query, (error, result)=>{
                if(error){
                    console.log('ERROR:',error);
                    return cb(null, null);
                }
                if(result.rows.length){
                    console.log('FOUND response with N-GRAMS')
                    return cb(null, result.rows[0].id)
                }
            cb(null, null)
        });
    }


    static filterShortWords(d){

        return (d.length &&
        d !== 'LA'  &&
        d !== 'PARROQUIA' &&
        d !== '00' &&
        d !== '0' &&
        d !== '000' &&
        d !== 'COOP' &&
        d !== 'COOP.' &&
        d !== 'COP.' &&
        d !== 'COP' &&
        d !== 'SL.' &&
        d !== 'S' &&
        d !== 'SL' &&
        d !== 'DEL' &&
        d !== 'LOS' &&
        d !== 'ETAPA' &&
        d !== 'AVA' &&
        d !== 'AV' &&
        d !== 'AVA.' &&
        d !== 'MZ' &&
        d !== 'MZB' &&
        d !== 'CALLEJON' &&
        d !== 'CALLE' &&
        d !== 'DE' &&
        d !== 'ENTRE' &&
        d !== 'MZ.' &&
        d !== 'DEL' &&
        d !== 'SOLAR' &&
        d !== 'SOLAR' &&
        d !== 'AVAS' &&
        d !== 'EN' &&
        d !== 'BARRIO' &&
        d !== '.')
    }

    static placesGeocoder(item, city, cb){

        if(item.geofenceId){
            return cb(null, item); 
        }

        const preAddress = item[COLUMNA_DIRECCION].toString().toUpperCase();
        console.log('preAddress:',preAddress)
        const addresses = preAddress.split(' Y ').reduce(( addresses, address)=>{
            return addresses.concat(address.split(' '));
        }, [])
        .map((address)=>Curation.commonCharactersForIntersections(address))
        .filter(Curation.filterShortWords)

        asyncF.waterfall([
            // (result, cb)=>{ //N-GRAMS 
            //     if(result){
            //       return cb(null, result)
            //     }
            //     try{
            //         const address = addresses.splice(0, 5);
            //         const cmb = Combinatorics.combination(address, 4);
            //         Curation.nGramQuery(cmb, cb)
            //     }catch(error){
            //         console.log('ERROR:',error)
            //         return cb(null, null) //No results
            //     }
            // },
            (cb)=>{ // TRI-GRAMS
                // if(result){
                //     return cb(null, result)
                // }
                console.log('TRIGRAMS');
                try{
                    let address = addresses.slice(0, 5);
                    address = address.filter((t) => {
                      return t.length > 2;
                    })
                    const cmb = Combinatorics.combination(address, 3);
                    Curation.nGramQuery(cmb, cb, 'place')
                }catch(error){
                    console.log('ERROR:',error)
                    return cb(null, null) //No results
                }
            },
            (result, cb)=>{ // BI-GRAMS
                console.log('bigrams');
                if(result){
                    return cb(null, result)
                }
                try{
                    let address = addresses.slice(0, 5);
                    address = address.filter((t) => {
                      return t.length > 2;
                    })
                    const cmb = Combinatorics.combination(address, 2);
                    Curation.nGramQuery(cmb, cb, 'place')
                }catch(error){
                    console.log('ERROR:',error)
                    return cb(null, null) //No results
                }
            },
            (result, cb)=>{ //UNI-GRAMS 
              console.log('uni-grams!');
              if(result){
                return cb(null, result)
              }
              try{
                  const address = addresses.filter((token)=>{
                    return token.length > 4 || token == 'FAE';
                  })
                  const cmb = Combinatorics.combination(address, 1);
                  Curation.nGramQuery(cmb, cb, 'place')
              }catch(error){
                  console.log('ERROR:',error)
                  return cb(null, null) //No results
              }
            },
            (result, cb)=>{ // BI-GRAMS
              console.log('bigrams intersections');
              if(result){
                  return cb(null, result)
              }
              try{
                  let address = addresses.slice(0, 5);
                  const cmb = Combinatorics.combination(address, 2);
                  Curation.nGramQuery(cmb, cb, 'intersection')
              }catch(error){
                  console.log('ERROR:',error)
                  return cb(null, null) //No results
              }
            },
            (result, cb)=>{ // BI-GRAMS
              console.log('trigrams intersections');
              if(result){
                  return cb(null, result)
              }
              try{
                  let address = addresses.slice(0, 5);
                  const cmb = Combinatorics.combination(address, 3);
                  Curation.nGramQuery(cmb, cb, 'intersection')
              }catch(error){
                  console.log('ERROR:',error)
                  return cb(null, null) //No results
              }
            },
            
            //,
            // (result, cb)=>{ // BI-GRAMS
            //     if(result){
            //         return cb(null, result)
            //     }
            //     try{
            //         Curation.nGramQuery([addresses], cb)
            //     }catch(error){
            //         console.log('ERROR:',error)
            //         return cb(null, null) //No results
            //     }
            // }
        ], (error, geofenceId)=>{
            if(error){
                console.log('ERROR:',error);
                return cb(null, item);
            }

            if(!geofenceId){
                return cb(null, item);
            }

            console.log('PLACESGEOCODER:',item[COLUMNA_DIRECCION],'GEO:',geofenceId)
            return cb( null, Object.assign({}, item, { geofenceId, geocoder: 'placesgeocoder' }))
        })

    }

    static computingGeofence(options, cb){
        const {
            latitude,
            longitude
        } = options;


        const query =
         `  SELECT 
                ge.id as id,
                ge.name as name
            FROM 
                healthmap.geofence ge 
            WHERE 
                ge.granularity_level = 7 AND
                ST_Contains(ge.polygon, ST_GeomFromText('POINT(${longitude} ${latitude})')) = TRUE 
            `

        postq.queryMaster(query, (error, result)=>{
            if(error){
                console.log('ERROR:',error);
                return cb(error);
            }

            if(!result.rows.length){
                return cb(new Error('Not found geofence'));
            }

            console.log(' =========== FOUND GEOFENCE ID: =========',result.rows[0].id);
            const geofenceId = result.rows[0].id
            return cb(null, geofenceId)
        })
    }
    static googleGeocoder(data, city, cb){
        asyncF.mapSeries( data, (item, cb)=>{

            if(item.geofenceId){
              return cb(null, item);
            }
            setTimeout(() => {

                const preAddress = item[COLUMNA_DIRECCION].toString().toUpperCase();
                console.log('preAddress:',preAddress)

                geocoder(preAddress, (error, result)=>{
                    if(error){
                        return cb(null, item);
                    }

                    Curation.computingGeofence(result, (error, geofenceId)=>{
                        if(error){
                            return cb(null, item);
                        }
                        return cb( null, Object.assign({}, item, { geofenceId, geocoder: 'google' }))
                    })
                })
            }, 100);
        }, (error, results)=>{
            if(error){
                return cb(error);
            }
            cb(null, results);
        })
    }


    static processIntersection(item, city, cb){

        if(item.geofenceId){
            return cb(null, item);
        }

        console.log('item:',item)
        const preAddress = item[COLUMNA_DIRECCION].toString().toUpperCase();
        console.log('preAddress:',preAddress)
        const addresses = preAddress.split(' Y ').reduce(( addresses, address)=>{
            return addresses.concat(address.split(' ').filter(d=>d.length));
        }, []);

        if(addresses.length < 2){
            return cb(null, item);
        }

        const likeComposer = `'%${addresses.map((address)=> Curation.commonCharactersForIntersections(address).trim())
            .filter(d=>{
            return (d.length && d.length > 2 &&
            d !== 'LA'  &&
            d !== 'PARROQUIA' &&
            d !== 'COOP' &&
            d !== 'COOP.' &&
            d !== 'DEL' &&
            d !== 'LOS' &&
            d !== 'ETAPA' &&
            d !== 'VILLA' &&
            d !== 'AVA' &&
            d !== 'AVA.' &&
            d !== 'MZ' &&
            d !== 'MZ.' &&
            d !== 'AVAS' &&
            d !== 'EN' &&
            d !== '.' && 
            d !== 'ENTRE' &&
            d !== 'EL'  && 
            d !== 'CDLA' && 
            d !== 'CDLA.' && 
            d !== 'LA' &&
            d !== 'PARROQUIA' &&
            d !== 'CANTON' &&
            d !== 'SL' &&
            d !== 'CLLEJON' &&
            d !== 'CLLJ.' &&
            d !== 'EO' &&
            d !== 'BLOQUE' &&
            d !== 'BLOQ' && 
            d !== 'BLOQUES' &&
            d !== 'URB' &&
            d !== 'URB.' &&
            d !== 'BQ' &&
            d !== 'MZN' &&
            d !== 'MZN.' &&
            d !== 'VIL' )
        })
        .join('%')}%'`;

        if (likeComposer === "'%%'" || likeComposer.length < 6){
          return cb(null, item);
        }
         
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
            ge.granularity_level = 7 AND
            ge.city_id=${city} and cp.type='intersection' and
            cp.place_name LIKE ${likeComposer}
            `

        postq.queryMaster(query, (error, result)=>{
            if(error){
                console.log('ERROR:',error);
                return cb(error);
            }

            if(!result.rows.length){
                return cb(null, item);
            }

            console.log('============= FOUND GEOFENCE ID: ===========',result.rows[0].id);
            const geofenceId = result.rows[0].id

            cb(null, Object.assign({}, item, { geofenceId, geocoder: 'intersections' }))
        })
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

                const monthRanges = ranges
                    .filter((r)=>r.period_type==='meses')   
                
                const withAge = data.map((d)=>{
                    const age = parseInt(d[COLUMNA_EDAD]);
                    const cie10 = d[COLUMNA_CIE10];
                    const ageType = d[COLUMNA_EDAD_TIPO];

                    const dia = diseases
                        .find((y)=>y.cie10_code == cie10);

                    const diseaseId = dia ? dia.id : -1;
                    
                    let ageId
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

                    d.ageId = ageId;
                    d.diseaseId = diseaseId;
                    return d;
                });

                return cb(null, withAge)
            },
            (dataWithAge, cb)=>{
                return asyncF.mapSeries(dataWithAge, (item, cback)=>{

                    const time = moment(new Date(item[COLUMNA_INGRESO])).format('YYYY-MM-DD HH:mm:ss');
                   
                    const options  = {
                        patient: {
                            cityId: 1,
                            institutionId: item[COLUMNA_INSTITUCION] ? item[COLUMNA_INSTITUCION] : 1,
                            department: item[COLUMNA_DEPARTAMENT] ? item[COLUMNA_DEPARTAMENT] : 1,
                            gender: item[COLUMNA_GENERO] ? item[COLUMNA_GENERO] : 'N', 
                            diseaseId: item.diseaseId,
                            geofenceId: item.geofenceId,
                            etnia: item[COLUMNA_ETNIA] ? item[COLUMNA_ETNIA] : 'DESCONOCIDA',
                            rawAge: item[COLUMNA_EDAD] ? item[COLUMNA_EDAD] : -1,
                            rawAgeType: item[COLUMNA_EDAD_TIPO] ? item[COLUMNA_EDAD_TIPO] : 'años',
                            ageId: item.ageId,
                            registeredDate: time
                        }
                    }
                    if(item.geofenceId === -1 || !item.geofenceId){
                      return cback(null, options);
                    }
                    if(item.diseaseId === -1){
                      return cback(null, options);
                    }
                    if(item.ageId === -1 || !item.ageId){
                      return cback(null, options);
                    }
                    setTimeout(() => {
                        Patient.createPatient(options, (error, results)=>{
                            if(error){
                                console.log('ERROR:',error);
                                return cback(null, []);
                            }
                            cback(null, results);
                        });
                    }, 5);
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

            const itemsExtra = Curation.commonCharactersForIntersections(place_name)
            .split(' ')
            .map((it)=>`${it}`.trim())
            .filter((it)=>it && it.length);

            const items = Curation.commonCharactersForIntersections(description)
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

            if(dataItem.geofenceId){
                return dataItem; 
            }

            const address = Curation.commonCharactersForIntersections(dataItem[COLUMNA_DIRECCION]);
            
            const entities = await manager.findEntities(
                address,
                'es',
            )


            const entity = entities.length?
            entities.find((e)=>!e.resolution && e.len > 4)
            :undefined

            console.log('Direccion:',dataItem[COLUMNA_DIRECCION], ' \n Match:', entity);

            dataItem.matches = entity;
            if(dataItem.matches){
                dataItem.geofenceId = dataToCompareObject[dataItem.matches.option].id;
                dataItem.geocoder = 'nplgeocoder'
            }
            return dataItem;
        })).then((dataProcessed) => {
            return cback(null, dataProcessed);
        })
        .catch((error)=>{
            console.log('ERROR:',error);
            return cback(error);
        })

    }


    static commonCharactersForIntersections(str){
        
        return str.replace('SECTOR', ' ')
        .replace(' AVA ', ' ')
         .replace('CDLA', '')
         .replace('CDLA.', '')
         .replace(' LA ', ' ')
         .replace('PARROQUIA', '')
         .replace('COOP.', '')
         .replace(' STA ', ' SANTA ')
         .replace(' FCO ', ' FRANCISCO ')
         .replace(' CANTON ', ' ')
         .replace(' SL ', ' ')
         .replace(' CLLEJON ', ' ')
         .replace('ENTRE', '')
         .replace(' DEL ', ' ')
         .replace(' LA ', ' ')
         .replace('#', '')
         .replace(' LO ', ' ')
         .replace(' LOS ', ' ')
         .replace(' S ', ' ')
         .replace(' 00 ', ' ')
         .replace(' 0 ', ' ')
         .replace(' 000 ', ' ')
         .replace(' EN ', ' ')
         .replace(' CLLJ. ', ' ')
         .replace(' DE ', ' ')
         .replace(' I ', ' ')
         .replace(' EO ', ' ')
         .replace(' LOS ', ' ')
         .replace('COOP', ' ')
         .replace(' MZ ', ' ')
         .replace(' VIL ', ' ')
         .replace(' CD ', ' ')
         .replace(' BLOQ ', ' ')
         .replace(' BLOQUE ', ' ')
         .replace(' CAAR ', ' ')
         .replace(' VILLA ', ' ')
         .replace(' E/ ', ' ')
         .replace(' CLL. ', ' ')
         .replace(' CLL ', ' ')
         .replace(' BLOQUES ', ' ')
         .replace(' CALLEJON ', ' ')
         .replace(' CALLE ', ' ')
         .replace(' E. ', ' ')
         .replace(' MZ. ', ' ')
         .replace(' ETAPA ', ' ')
         .replace('URB.', ' ')
         .replace('URB', ' ')
         .replace(' BQ. ', ' ')
         .replace(' AVA. ', ' ')
         .replace(' AV ', ' ')
         .replace(' ERATIVA ', ' ')
         .replace(' EN ', ' ')
         .replace(' BLQ ', ' ')
         .replace(' MZN ', ' ')
         .replace(' I ', ' ')
         .replace(' . ', ' ')
         .replace(' BARRIO ', ' ')
         .replace(/[^\w\s]|_/g, " ")
         .replace(/\s+/g, " ")
        //  .replace("\\d[a-zA-Z]", "")
         .replaceAlfa()
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
        .replace('sector', ' ')
        .replace(' ava ', ' ')
        .replace('cdla', '')
        .replace('cdla.', '')
        .replace(' la ', ' ')
        .replace('parroquia', '')
        .replace('coop.', '')
        .replace(' sta ', ' santa ')
        .replace(' fco ', ' francisco ')
        .replace(' canton ', ' ')
        .replace(' sl ', ' ')
        .replace(' cllejon ', ' ')
        .replace('entre', '')
        .replace(' del ', ' ')
        .replace(' la ', ' ')
        .replace('#', '')
        .replace(' los ', ' ')
        .replace(' 00 ', ' ')
        .replace(' 0 ', ' ')
        .replace(' 000 ', ' ')
        .replace(' en ', ' ')
        .replace(' cllj. ', ' ')
        .replace(' de ', ' ')
        .replace(' i ', ' ')
        .replace(' eo ', ' ')
        .replace(' los ', ' ')
        .replace('coop', ' ')
        .replace(' mz ', ' ')
        .replace(' vil ', ' ')
        .replace(' cd ', ' ')
        .replace(' bloq ', ' ')
        .replace(' bloque ', ' ')
        .replace(' caar ', ' ')
        .replace(' villa ', ' ')
        .replace(' e/ ', ' ')
        .replace(' cll. ', ' ')
        .replace(' cll ', ' ')
        .replace(' bloques ', ' ')
        .replace(' callejon ', ' ')
        .replace(' calle ', ' ')
        .replace(' e. ', ' ')
        .replace(' mz. ', ' ')
        .replace(' etapa ', ' ')
        .replace('urb.', ' ')
        .replace('urb', ' ')
        .replace(' bq. ', ' ')
        .replace(' ava. ', ' ')
        .replace(' av ', ' ')
        .replace(' erativa ', ' ')
        .replace(' en ', ' ')
        .replace(' blq ', ' ')
        .replace(' mzn ', ' ')
        .replace(' i ', ' ')
        .replace(' . ', ' ')
        .replace(' barrio ', ' ')
    }
    
}



module.exports = Curation;