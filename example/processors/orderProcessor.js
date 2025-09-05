export default exchange => {
    var order = exchange
    order.date = new Date()
    order.authCode = 12345
    return Promise.resolve(order)
}