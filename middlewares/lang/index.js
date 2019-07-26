module.exports = (request, response, next)=>{
    const lang = 
    request.query? 
        request.query.lang?request.query.lang:'es'
    :request.body?
        request.body.lang?request.body.lang:'es': 'es';
    request.i18n.setLocale(lang);
    if(request.cookie)
    request.cookie('locale', lang, { maxAge: 900000, httpOnly: true });
    next();
}