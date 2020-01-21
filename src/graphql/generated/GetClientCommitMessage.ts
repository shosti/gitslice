/* tslint:disable */
/* eslint-disable */
// This file was automatically generated and should not be edited.

// ====================================================
// GraphQL query operation: GetClientCommitMessage
// ====================================================

export interface GetClientCommitMessage_tasks {
  __typename: 'tasks'
  clientCommitMessage: string | null
}

export interface GetClientCommitMessage {
  /**
   * fetch data from the table: "tasks"
   */
  tasks: GetClientCommitMessage_tasks[]
}

export interface GetClientCommitMessageVariables {
  prLink: string
}
