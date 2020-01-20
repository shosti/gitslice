export type Helptype = {
  header?: string
  content?: string | string[]
  optionList?: {
    name: string
    typeLabel: string
    description: string
  }[]
}
