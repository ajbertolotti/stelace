const { Joi, objectIdParamsSchema, getRangeFilter } = require('../../util/validation')
const { DEFAULT_NB_RESULTS_PER_PAGE } = require('../../util/pagination')

const orderByFields = [
  'createdDate',
  'updatedDate',
]

const schemas = {}

// ////////// //
// 2020-08-10 //
// ////////// //
schemas['2020-08-10'] = {}
schemas['2020-08-10'].list = {
  query: Joi.object()
    .keys({
      // order
      orderBy: Joi.string().valid(...orderByFields).default('createdDate'),
      order: Joi.string().valid('asc', 'desc').default('desc'),

      // cursor pagination
      nbResultsPerPage: Joi.number().integer().min(1).max(100).default(DEFAULT_NB_RESULTS_PER_PAGE),
      startingAfter: Joi.string(),
      endingBefore: Joi.string(),

      // filters
      id: Joi.array().unique().items(Joi.string()).single(),
      createdDate: getRangeFilter(Joi.string().isoDate()),
      updatedDate: getRangeFilter(Joi.string().isoDate()),
      parentId: Joi.array().unique().items(Joi.string()).single(),
    })
    .oxor('startingAfter', 'endingBefore')
}

// ////////// //
// 2019-05-20 //
// ////////// //
schemas['2019-05-20'] = {}
schemas['2019-05-20'].list = null
schemas['2019-05-20'].read = {
  params: objectIdParamsSchema
}
schemas['2019-05-20'].create = {
  body: Joi.object().keys({
    name: Joi.string().required(),
    parentId: Joi.string().allow(null),
    myData: Joi.string().allow(null),
    metadata: Joi.object().unknown(),
    platformData: Joi.object().unknown()
  }).required()
}

schemas['2019-05-20'].update = {
  params: objectIdParamsSchema,
  body: schemas['2019-05-20'].create.body
    // .fork('name', schema => schema.optional())
    // .fork(['name', 'myData'], schema => schema.optional())
    .fork(['name', 'myData'], schema => schema.forbidden())

}

/*
schemas['2019-05-20'].update = {
  params: objectIdParamsSchema,
  body: schemas['2019-05-20'].create.body
    .fork('name', schema => schema.optional())
}
*/
schemas['2019-05-20'].remove = {
  params: objectIdParamsSchema
}

const validationVersions = {
  '2020-08-10': [
    {
      target: 'k360.list',
      schema: schemas['2020-08-10'].list
    },
  ],

  '2019-05-20': [
    {
      target: 'k360.list',
      schema: schemas['2019-05-20'].list
    },
    {
      target: 'k360.read',
      schema: schemas['2019-05-20'].read
    },
    {
      target: 'k360.create',
      schema: schemas['2019-05-20'].create
    },
    {
      target: 'k360.update',
      schema: schemas['2019-05-20'].update
    },
    {
      target: 'k360.remove',
      schema: schemas['2019-05-20'].remove
    }
  ]
}

module.exports = validationVersions
