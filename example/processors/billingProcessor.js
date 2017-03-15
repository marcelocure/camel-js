module.exports = exchange => {
    return Promise.resolve({billed: true, messageDelivered: exchange })
}