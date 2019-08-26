const request = require('request');
const postg = require('../../db/postgre');
const redis = require('./../../db/redis');
const fs = require("fs");

const CKAN_URL = 'http://132.145.168.139/api/3/action/'

class Upload{

    static run(cb) {
    
        const dataResult = fs.createReadStream("/api/results.json");

        
        const options = { method: 'POST',
          url: `${CKAN_URL}resource_create`,
          headers: 
           { Connection: 'keep-alive',
             'Content-Length': '11793',
             'Accept-Encoding': 'gzip, deflate',
             Host: '132.145.168.139',
             Accept: '*/*',
             'User-Agent': 'PostmanRuntime/7.15.2',
             Authorization: '92ccb25a-0ba5-4fb4-937c-251cecdc03db',
             'Content-Type': 'application/json',
             'content-type': 'multipart/form-data; boundary=----WebKitFormBoundary7MA4YWxkTrZu0gW' },
          formData: 
           {    package_id: '30243a4c-3acc-4863-96f4-9a23b1f9be26',
               'package-no-role': '30243a4c-3acc-4863-96f4-9a23b1f9be26',
             url: 'test',
             description: 'Health Map Data',
             format: 'geojson',
             name: `Datos de Salud ${new Date().getUTCDate()}`,
             resource_type: 'vector',
             upload: 
              { value: dataResult,
                options: 
                 { filename: 'patients.json',
                   contentType: 'application/json' } },
             url_type: 'upload',
             source: 'Listo' } };
        console.log('PAYLOAD TO UPLOAD', JSON.stringify(options));
        
        request(options, function (error, resp, body) {
            if (error || resp.statusCode != 200) {
                ///console.log(error);
                console.log(resp);
                return cb({ 
                    statusCode: 500, 
                    code: 'UE', 
                    message: 'Problem creating the request' 
                });
            }
            
            console.log('BODY:',resp)
            cb({ 
                statusCode: 200, 
                code: 'OK', 
                message: `Data created successfully`,
                data: body
            });
        });

    }

}
module.exports = Upload;