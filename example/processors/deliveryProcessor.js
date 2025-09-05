export default exchange => {
    return Promise.resolve({status:'ok', messageDelivered: exchange })
}