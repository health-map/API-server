const async = require('async');
const fs = require('fs');
const sharp = require('sharp');
const PNG = require('pngjs').PNG;
const Storage = require('./libs/storage');
const image2base64 = require('image-to-base64');
const DBManager = require('db-manager');
const mysql = new DBManager.MySQL();
const request = require('request');

const getPixels = require("get-pixels")


const HEADERS = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-country': 'CL',
    'X-commerce': 'Falabella',
    'X-chRef': 'Shippify',
    'X-apiKey': '123'
}



const FALABELLA_URL = 'https://qa-api-supply-chain.falabella.com/trmg/'
const THRESHOLD_TO_DETECT_HEADER_SIGNATURE = 50; //threshold to detect the signature images

const RESIZE_WIDTH = 709;
const RESIZE_HEIGTH = 236;
const WORK_PATH = '/tmp'


function downloadFileByDelivery(delivery, cb){
    console.log('delivery:',delivery)

    const S3_PATH =`tasks/${delivery}`;

    async.waterfall([
        (cb)=>{
        
            Storage.listFilesFromS3(S3_PATH, (error, files) => {
                if(error){
                    console.log('error:',error);
                    return cb(error);
                }
            
                console.log('FILES:',files);
                return cb(null, files);
            })
        },
        (files, cb)=>{

            async.map(files, (fileName, cb)=>{
                const fileFinalName = fileName.replace('/', '');
                  const options = {
                    S3_BUCKET: 'shippify-photos',
                    S3_PATH: `${S3_PATH}`,
                    FINAL_PATH: `${WORK_PATH}`,
                    FILE_NAME: `${fileFinalName}`
                  };
                  Storage.getFileAWSAndSave(options, (err) => {
                      console.log('finalPath:',fileFinalName)
                     findAndSendSignature(fileFinalName, (error, results)=>{
                        if(error){
                            return cb(null , { error: error });
                        }

                        image2base64(results) // you can also to use url
                        .then((response) => {
                            cb(null, { imageB64: response, type: 'SIGNATURE' })
                        })
                        .catch((error) => {
                            cb(error);  
                        })  
                     })
                  });
            }, 
            (error, results)=>{
                if(error){
                    return cb(error)
                }
                const base64 = results.filter(({ imageB64 })=>!!imageB64);

                return cb(null, base64)
            }); 
        }
    ], (error, results)=>{
        if(error){
            return cb(error);
        }
        cb(null, results);
    });
}


function formatingImage(fileName, cb){
    try{
        console.log('fileName:',fileName)
        const img1 = PNG.sync.read(fs.readFileSync(`/${WORK_PATH}/${fileName}`));

        const { width, height } = img1;

        const outputImage = `${new Date().getTime()}.jpg`;

        sharp(fileName)
        .extract({ width: width, height: height, left: 0, top: 0 })
        .toFile(`/${WORK_PATH}/${outputImage}`)
        .then(()=>{
            console.log('Formating:',outputImage)
            return cb(null, outputImage, width, height)
        })
        .catch(function(err) {
            console.log(err);
            console.log("An error occured");
            return cb(err);
        });
    }catch(error){
        return cb(error); 
    }
    
}


function imageToArray(fileName, width, height, cb){
    const path = `${WORK_PATH}/${fileName}`;
    getPixels(path, (err, pixels)=>{
        if(err) {
            console.log("Bad image path")
            return cb(err);
        }
        const data = JSON.parse(JSON.stringify(pixels.data)).data;
        const dataProcessed = [];
        for (let y = 0; y < height; y++) {
            const rowProcessed = [];
            for (let x = 0; x < width; x++) {
                const k = (y * width + x) * 4;

                let r1 = data[k + 0];
                let g1 = data[k + 1];
                let b1 = data[k + 2];
                let a1 = data[k + 3];

                rowProcessed.push({ r: data[k + 0], g: data[k + 1], b: data[k + 2], a: data[k + 3] })
            }

            dataProcessed.push(rowProcessed);
        }

        return cb(null, dataProcessed, fileName, width, height );
    })
}

function detectIndex(dataProcessed, height, cb){
    let startIndex = 0;
    for ( let y = 0; y < height; y++ ) {
        
        if( y >= 1 ){
            if( dataProcessed[y][0].r == 242 && dataProcessed[y][0].g == 242 && dataProcessed[y][0].a == 255 ){
                
            }else{
                if(startIndex === 0){
                    startIndex = y;
                }
            }
        } 
    }

    if(startIndex > THRESHOLD_TO_DETECT_HEADER_SIGNATURE){
        return cb(null, startIndex)
    }
    return cb(null, new Error('This is not a signature!!'))
}

function findAndSendSignature(fileName, cb){
    async.waterfall([
        (cb)=>{
            formatingImage(fileName, cb);
        },
        (outputImage, width, height, cb)=>{
            imageToArray(outputImage, width, height, (error, dataProcessed, outputImage, width, height )=>cb(error, dataProcessed, outputImage, width, height ));
        },
        (dataProcessed, outputImage, width, height, cb)=>{
            detectIndex(dataProcessed, height, (error, startIndex)=>cb(error, dataProcessed, outputImage, width, height, startIndex))
        },
        (dataProcessed, outputImage, width, height, startIndex, cb)=>{
            const name = fileName.split('.')[0];
            const outImageFinal = `${WORK_PATH}/${name}-processed.jpg`;
            const newHeight = (height - (startIndex * 2)- 1);
            const path = `${WORK_PATH}/${outputImage}`;
            sharp(path)
            .extract({ width: width, height: newHeight, left: 0, top: startIndex })
            .resize(RESIZE_WIDTH, RESIZE_HEIGTH, { fit: 'contain', background: { r:255, g:255, b:255, alpha:1 } })
            .toFile(outImageFinal)
            .then(()=>{
                fs.unlinkSync(`${WORK_PATH}/${outputImage}`)
                return cb(null, outImageFinal)
            })
            .catch(function(err) {
                console.log(err);
                console.log("An error occured");
                return cb(err);
            });
        }
    ], (error, outImageFinal)=>{
        if(error){
            console.log('ERROR:',error);
            return cb(error)
        }
        return cb(null, outImageFinal)
    });
}


function getDispatchGuide(data, cb){
    const {
        referenceId
    } = data;

    return request(
         
        {  
            method: 'GET',
            url: `${FALABELLA_URL}api/v1/legal-delivery-orders/b64?document=${referenceId}&type=F12`,
            headers: HEADERS 
        },
        (error, resp, data) => {
            if (error || resp.statusCode != 200) {
                if(error){
                    console.log('ERROR:',error);
                }
               
                if(resp){
                    console.log('statusCode:',resp.statusCode)                    
                    console.log('RESPONSE:',resp);
                }

                if(data){
                    console.log('DATA PAYLOAD:',data);
                }
                return cb({ statusCode: 500, code: 'UE', message: 'Something went wrong with the Falabella get guide' });
            }
            console.log('FALABELLA DATA:',data)
            const dataObject = JSON.parse(data);
            const legalDeliveryOrdersId = dataObject.legalDeliveryOrders.length?dataObject.legalDeliveryOrders[0].id:[]; 
            return cb(null, legalDeliveryOrdersId)
        }
    );
}


function getEvent(options, cb){
    const {
        deliveryId
    } = options;
    const query = `
        SELECT 
            _status AS status,
            delivery_effective AS deliveryEffective,
            notes
        FROM 
            delivery_event 
        WHERE 
            delivery_id=${mysql.escape(deliveryId)}
        `;
    mysql.querySlave(query, (error, events)=>{
        if(error){
            return cb(error);
        }   

        if(!events.length){
            return cb(new Error('Not found events'));
        }

        const eventPivot = events[0];

        const {
            status, 
            deliveryEffective,
            notes
        } = eventPivot;

        const data = {
            status, 
            deliveryEffective,
            notes: notes?JSON.parse(notes):[]
        }
        cb(null, data);
    });
}


function getBasicData(options, cb){
    const {
        deliveryId
    } = options;
    const query = `
        SELECT 
            tks.id, 
            (CASE WHEN tks.route_id IS NOT NULL THEN tks.route_id ELSE tks.id END) AS routeId,
            tks.return_id AS referenceId, 
            (  
                CASE WHEN 
                    vh.license_plate IS NOT NULL 
                THEN vh.license_plate ELSE '-' END
            ) AS courierPlate,
            tks.items AS packages  
        FROM mv_delivery tks
        LEFT JOIN ( select * from vehicle GROUP BY ower_id ) as vh on vh.ower_id = tks.shipper_id
        WHERE 
            tks.id = ${mysql.escape(deliveryId)}
        `;
    mysql.querySlave(query, (error, deliveries)=>{
        if(error){
            return cb(error);
        }   

        if(!deliveries.length){
            return cb(new Error('Not found deliveries'));
        }

        const deliveryPivot = deliveries[0];

        const {
            id, 
            routeId,
            referenceId,
            courierPlate,
            packages,
        } = deliveryPivot;

        const data = {
            id, 
            routeId,
            referenceId,
            courierPlate,
            packages: packages?JSON.parse(packages):[]
        }
        cb(null, data);
    });
}

function createRequestToSendData(data, cb){

    const {
        referenceId,
        courierPlate,
        routeId,
    } = data;

    const payload = {
        clientService:{
            targetSystem: 'TRL'
        },
        distributionOrder:{
            id: referenceId,
            type: 'F12',
            shipment:{
                "id": routeId,
                "plate": courierPlate
            },
            provider:{
                "dni": "",
                "dniDv":"5"
            },
            product: packages.map((product)=>{
                return {
                    "sku":"",
                    "quantity": product.qty,
                    "quantityDelivered":null,
                    "quantityPackage":null,
                    "detailNumber":null,
                    "statusCode":"",
                    "statusReason":""
                }    
            }),
            status:{
                    "statusCode":"4",
                    "statusSubCode":"RC",
                    "statusCodeReason":"20",
                    "codeAuthorization":"",
                    "statusDate":"2019-03-12T18:06:16"
            },
            eventGps:{
                "statusDateGps":"",
                "eventType":"E",
                "latitude":"",
                "longitude":""
            },
            reception:{
                "name":"Matias Espildora",
                "dni":"18993674",
                "dniDv":"5",
                "numberPhone":"",
                "relativeCode":"",
                "comment":"Cliente Recibe Conforme"
            },
            image: image,
            legalDeliveryOrders:{
                "id":""
            }
        }
    }

    return request.patch(
        `${FALABELLA_URL}/api/v1/distribution-orders`, 
        { json: payload },
        (error, resp, job) => {
            if (error || resp.statusCode != 200) {
                console.log(error);
                console.log(resp);
            return cb({ statusCode: 500, code: 'UE', message: 'routing-create-job-error' });
            }

            // BLOCK tasks
            const deliveryIds = points.map(point => point.id);
            const jobObj = { id: job.id, totalDeliveries: deliveryIds.length };
            BackgroundJobCreation.lockDeliveries(deliveryIds, job.id, error => cb(error, jobObj));
        }
    );
}

exports.signatureFalabella = (event, context, callback) => {

   context.callbackWaitsForEmptyEventLoop = false;
   const deliveryId = 't-shieam-17394';

    async.waterfall([
        (cb)=>{
            downloadFileByDelivery(deliveryId, (error, result)=>{
                if(error){
                    return cb(error);
                }
                cb(null, result);
            })
        },
        (image, cb)=>{
            const options = {
                deliveryId
            };
            getBasicData(options, (error, data)=>{
                if(error){
                    return cb(error);
                }
                console.log('DATA:',data);
                cb(null, Object.assign({}, data, { image }));
            })
        },
        (data, cb)=>{
            const { referenceId } = data;
            getDispatchGuide({ referenceId }, (error, legalDeliveryOrdersId)=>{
                if(error){
                    return cb(error);
                }
                cb(null, Object.assign({}, data, { legalDeliveryOrdersId }));
            });
        },
        (data, cb)=>{
            const options = {
                deliveryId
            }
            getEvent(options, (error, events)=>{
                if(error){
                    return cb(error);
                }
                cb(null, Object.assign({}, data, events ));
            })  

        }
    ], (error, data)=>{
        if(error){
            console.log('ERROR:',error);
            return callback(error);
        }
        console.log('DATA')
        callback(null, data);
    })
}




