const _ = require('lodash')

let requester

function init (server, { middlewares, helpers } = {}) {
  const {
    cache,
    checkPermissions
  } = middlewares
  const {
    wrapAction,
    populateRequesterParams
  } = helpers

  server.get({
    name: 'k360academydata.list',
    path: '/k360academydata'
  }, checkPermissions([
    'category:list:all'
  ]), cache(), wrapAction(async (req, res) => {
    const fields = [
      'orderBy',
      'order',
      'nbResultsPerPage',

      // cursor pagination
      'startingAfter',
      'endingBefore',

      'id',
      'myData',
    ]

    const payload = _.pick(req.query, fields)

    let params = populateRequesterParams(req)({
      type: 'list'
    })

    params = Object.assign({}, params, payload)

    const result = await requester.send(params)
    return result
  }))

  server.get({
    name: 'k360academydata.read',
    path: '/k360academydata/:id'
  }, checkPermissions([
    'category:read:all'
  ]), wrapAction(async (req, res) => {
    const { id } = req.params

    const params = populateRequesterParams(req)({
      type: 'read',
      id: id
    })

    const result = await requester.send(params)
    return result
  }))

  server.post({
    name: 'k360academydata.create',
    path: '/k360academydata'
  }, checkPermissions([
    'category:create:all'
  ], { checkData: true }), wrapAction(async (req, res) => {
    const {
      myData
    } = req.body

    const params = populateRequesterParams(req)({
      type: 'create',
      myData
    })

    const result = await requester.send(params)
    return result
  }))

  server.patch({
    name: 'k360academydata.update',
    path: '/k360academydata/:id'
  }, checkPermissions([
    'category:edit:all'
  ], { checkData: true }), wrapAction(async (req, res) => {
    const { id } = req.params
    const {
      myData,
    } = req.body

    const params = populateRequesterParams(req)({
      type: 'update',
      id: id,
      myData
    })

    const result = await requester.send(params)
    return result
  }))

  server.del({
    name: 'k360academydata.remove',
    path: '/k360academydata/:id'
  }, checkPermissions([
    'category:remove:all'
  ]), wrapAction(async (req, res) => {
    const { id } = req.params

    const params = populateRequesterParams(req)({
      type: 'remove',
      id: id
    })

    const result = await requester.send(params)
    return result
  }))
}

function start ({ communication }) {
  const { getRequester } = communication

  requester = getRequester({
    name: 'K360academydata route > K360academydata Requester',
    key: 'k360academydata'
  })
}

function stop () {
  requester.close()
  requester = null
}

module.exports = {
  init,
  start,
  stop
}
