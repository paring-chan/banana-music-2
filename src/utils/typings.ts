import { Message } from 'discord.js'

export type Command = {
  name: string
  aliases: string[]
  execute: (msg: Message) => Promise<any> | any
  ownerOnly?: boolean
  category: string
}
