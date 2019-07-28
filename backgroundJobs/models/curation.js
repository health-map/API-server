//const async = require('async');
const postq = require('./../../db/postgre');
class Curation{

    static process(data, city, progress, cb){
        const query = `
        SELECT 
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
            ci.name as city_name
        FROM 
            healthmap.geofence ge 
        LEFT JOIN healthmap.city ci ON ci.id=ge.city_id
        WHERE 
            ge.city_id=${city}
        `
        
        postq.querySlave(query, (error, result)=>{
            if(error){
                return cb(error);
            }

            const geofences = result.rows.map((row)=>{
                return Object.assign({}, row, { polygon: JSON.parse(row.polygon) })
            });
            
            Curation.nplGeocoder(data, geofences)
            .then((dataFiltered) => {

            })
            .catch((error)=>{
                console.log('ERROR:',error);
            })
        })
    }

    static async nplGeocoder(data, dataToCompare, cback){

        const { NerManager } = require('node-nlp');

        let manager = new NerManager({ languages: ['es'], threshold: 0.8 });


        const dataToCompareObject = dataToCompare.reduce((dataToCompareObject, dataItem)=>{
            dataToCompareObject[dataItem.name] = dataItem;
            return dataToCompareObject;
        }, {});
        
        dataToCompare.map((dataToProcess)=>{
            const { 
                city_name,
                name,
                description 
            } = dataToProcess;

            console.log('DESCRIPTION:',description);
            const items = description
            .replace('Sector', '')
            .replace('PARROQUIA', '')
            .replace('Parroquia', '')
            .split(' ')
            .map((it)=>`${it}`.trim())
            .filter((it)=>it && it.length);

            // console.log('ITEMS CITY NAME:',city_name);
            // console.log('ITEMS NAME :',name);
            // console.log('ITEMS:',items);
            // console.log('================================');

            manager.addNamedEntityText(
                city_name,
                name,
                ['es'],
                items,
            );
        });

        const dataProcessed = []

        Promise.all(data.map(async (dataItem) => {

            const address = dataItem.Direccion
            
            const entities = await manager.findEntities(
                address,
                'es',
            )

            console.log('Direccion:',dataItem.Direccion)

            if(entities.length){
                const pivotEntity = entities[0];
                const resolution = !pivotEntity.resolution && 
                pivotEntity.option &&
                parseFloat(pivotEntity.accuracy) > 0.7
                ?
                dataToCompareObject[entities[0].option]:
            }



            

            return console.log('entities:',entities)


           // console.log('ERROR:',entities)
            
            // If not existing, create it
        }));

    }
    
}
module.exports = Curation;