const rabbitMqAdapter = require('./rabbitMQAdapter')

const protocols = {
    rabbitmq: rabbitMqAdapter
}

const from = (protocol, options, routeName) => {
    const adapter = protocols[protocol];
    adapter.engage(options, routeName);
}

module.exports = {
    from: from
}