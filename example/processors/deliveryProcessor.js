module.exports = exchange => {
    return Promise.resolve({status:'ok', messageDelivered: exchange })
}