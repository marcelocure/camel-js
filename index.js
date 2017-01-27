var routes = require('./route')

routes.init('my route', () => console.log('init'))
    .registerProcessor(() => console.log('my processor'))
    .end()

routes.init('my second route', () => console.log('init2'))
    .registerProcessor(() => console.log('my processor2'))
    .registerProcessor(() => console.log('my processor3'))
    .end()

routes.load()