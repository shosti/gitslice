require('dotenv').config()
const { ApolloClient, HttpLink, InMemoryCache } = require('apollo-boost')
const fetch = require('isomorphic-unfetch')
const { getToken } = require('../auth0')

global.fetch = fetch

const { HASURA_GRAPHQL_ENGINE_DOMAIN } = process.env
let apolloClient = null

async function getApolloClient() {
  if (!!apolloClient) return apolloClient
  //const token = await getToken();
  const token = 'helloworld'
  apolloClient = new ApolloClient({
    link: new HttpLink({
      uri: HASURA_GRAPHQL_ENGINE_DOMAIN,
      headers: {
        'x-hasura-admin-secret': token
      }
    }),
    cache: new InMemoryCache()
  })
  return apolloClient
}

module.exports = {
  getApolloClient
}
