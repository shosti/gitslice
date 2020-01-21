import { ApolloClient, NormalizedCacheObject, DocumentNode } from 'apollo-boost'

export type RunMutationArgs<variableType> = {
  mutation: DocumentNode
  variables: variableType
}

export type RunQueryArgs<variableType> = {
  query: DocumentNode
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
