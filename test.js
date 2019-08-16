const geocode = require('./backgroundJobs/libs/geocoding')

// const options = [{
//     address: 
// },{
//     address: 'FERMIN CHAVEZ 0 JUSTINO CORNEJ, GUAYAQUIL'
// }]

geocode('ISLA TRIN JACOBO BUCAN  3 , GUAYAQUIL', (error)=>{
    console.log('ERROR FINAL:',error);
})