import { Message } from 'discord.js'
import BananaClient from './BananaClient'

export type Command = {
  name: string
  aliases: string[]
  execute: (
    msg: Message,
    client: BananaClient,
    args: string[],
  ) => Promise<any> | any
  ownerOnly?: boolean
  category: string
}
