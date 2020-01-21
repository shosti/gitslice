import { ApolloClient, NormalizedCacheObject } from 'apollo-boost'

export type RunMutationArgs<variableType> = {
  mutation: string
  variables: variableType
}

export type RunQueryArgs<variableType> = {
  query: string
  variables: variableType
}

export type ApolloClientType = ApolloClient<NormalizedCacheObject>

export type GitSliceConfigType = {
  folders: string[]
  ignore: string[]
  branch: string
  repoUrl: string
  repo: string
}
