const { Client } = require('@elastic/elasticsearch')
const client = new Client({
  node: 'http://localhost:9200',
  auth: {
    username: 'elastic',
    password: 'elastic_password'
  }
})

// promise API
/*
const result = await client.search({
    index: 'index_asset',
    body: {
      query: {
        match: { hello: 'world' }
      }
    }
  })
*/
const request = client.search({
  // index: 'index_asset',
  index: 'index_asset_1_test__2020_11_14_04_37_28_702z',
  /*
    body: {
      query: {
        match: { hello: 'world' }
      }
    }
    */
  body: {
    query: {
      match_all: {}
    }
  }

})

request
  .then(result => console.log(result))
  .catch(err => console.log(err)) // RequestAbortedError

/*
 request
    .then( (result) => {
        console.log(result)
    })
    .catch ( err => {
        console.log(err)
    })
*/
request.abort()

// console.log(JSON.stringify(result));
