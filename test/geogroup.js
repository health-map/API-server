const Geogroup = require('./../models/geogroup')


// UNIT TEST

//Create groups
const options = {
    geogroup: {
        privacyLevel: 1,
        name: 'Test 1',
        description: 'Test description',
        geoTag: 1,
        geofences: [
            1,2,3
        ]
    }
};
Geogroup.createGeogroup(options, (error, results)=>{
    if(error){
        return console.log('ERROR:',error);
    }

    console.log('RESULT:',results)
})