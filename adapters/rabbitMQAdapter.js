const amqp = require('amqplib');
var queues = {};

const recordRoute = (queueName,eventType, routeName) => {
    if (!queues[queueName]){
        queues[queueName] = {};
    }
    queues[queueName][eventType] = routeName;
}

const buildConnectionString = (options) => {
    return `amqp://${options.username}:${options.password}@${options.host}:${options.port}`
}

const engage = (options, routeName) => {
    const connectionString = buildConnectionString(options)
    const durable = options.durable || false;
    const exclusive = options.exclusive || false;
    const queueName = options.queueName;

    return amqp.connect(connectionString)
    .then(conn => conn.createChannel())
    .then(_channel => {
        channel = _channel;
        return channel.assertQueue(queueName, { durable: durable, exclusive: exclusive });
    })
    .then(() => channel.bindQueue(queueName, options.exchangeName, options.routingKey))
    .then(() => recordRoute(queueName, options.routingKey, routeName))
    .then(() => {
        channel.consume(queueName, msg => {
            const obj = JSON.parse(msg.content);
            const routeName = queues[queueName][msg.fields.routingKey];
            const camel = require('../index')
            camel.sendMessage(routeName, obj)
            channel.ack(msg);
    });
    }).catch(error => {
        console.error("Error on bind event: ", error);
    });
}

module.exports = {
    engage: engage
}