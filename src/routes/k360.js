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
    name: 'k360.list',
    path: '/k360'
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
      'createdDate',
      'updatedDate',
      'parentId',
      'myData'
    ]

    const payload = _.pick(req.query, fields)

    let params = populateRequesterParams(req)({
      type: 'list'
    })

    params = Object.assign({}, params, payload)

    return requester.send(params)
  }))

  server.get({
    name: 'k360.read',
    path: '/k360/:id'
  }, checkPermissions([
    'category:read:all'
  ]), wrapAction(async (req, res) => {
    const { id } = req.params

    const params = populateRequesterParams(req)({
      type: 'read',
      k360Id: id
    })

    const result = await requester.send(params)
    return result
  }))

  server.post({
    name: 'k360.create',
    path: '/k360'
  }, checkPermissions([
    'category:create:all'
  ], { checkData: true }), wrapAction(async (req, res) => {
    const {
      name,
      parentId,
      myData,
      metadata,
      platformData
    } = req.body

    const params = populateRequesterParams(req)({
      type: 'create',
      name,
      parentId,
      myData,
      metadata,
      platformData
    })

    const result = await requester.send(params)
    return result
  }))

  server.patch({
    name: 'k360.update',
    path: '/k360/:id'
  }, checkPermissions([
    'category:edit:all'
  ], { checkData: true }), wrapAction(async (req, res) => {
    const { id } = req.params
    const {
      name,
      parentId,
      myData,
      metadata,
      platformData
    } = req.body

    const params = populateRequesterParams(req)({
      type: 'update',
      k360Id: id,
      name,
      parentId,
      myData,
      metadata,
      platformData
    })

    const result = await requester.send(params)
    return result
  }))

  server.del({
    name: 'k360.remove',
    path: '/k360/:id'
  }, checkPermissions([
    'category:remove:all'
  ]), wrapAction(async (req, res) => {
    const { id } = req.params

    const params = populateRequesterParams(req)({
      type: 'remove',
      k360Id: id
    })

    const result = await requester.send(params)
    return result
  }))
}

function start ({ communication }) {
  const { getRequester } = communication

  requester = getRequester({
    name: 'K360 route > K360 Requester',
    key: 'k360'
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
