import { ApolloClient, HttpLink, InMemoryCache } from 'apollo-boost'

import { getToken } from '@lib/auth0'
import {
  ApolloClientType,
  RunMutationArgs,
  RunQueryArgs,
} from '@customTypes/graphql'

const HASURA_GRAPHQL_ENGINE_DOMAIN = 'https://hasura.gitstart.com/v1/graphql'

const getApolloClient = (() => {
  let apolloClient: ApolloClientType | null = null

  return async (): Promise<ApolloClientType> => {
    if (!!apolloClient) return apolloClient

    const token = await getToken()

    apolloClient = new ApolloClient({
      link: new HttpLink({
        uri: HASURA_GRAPHQL_ENGINE_DOMAIN,
        headers: {
          Authorization: `Bearer ${token}`,
          'content-type': `application/json`,
        },
      }),
      cache: new InMemoryCache(),
    })

    return apolloClient
  }
})()

export async function runMutation<returnType, variableType>(
  args: RunMutationArgs<variableType>
): Promise<returnType> {
  const client: ApolloClientType = await getApolloClient()

  const { mutation, variables } = args

  const response = await client.mutate({
    mutation,
    variables,
  })

  return response.data
}

export async function runQuery<returnType, variableType>(
  args: RunQueryArgs<variableType>
): Promise<returnType> {
  const client: ApolloClientType = await getApolloClient()

  const { query, variables } = args

  const response = await client.query({
    query,
    variables,
  })

  return response.data
}

export default getApolloClient
