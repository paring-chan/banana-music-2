import BananaClient from '../../utils/BananaClient'
import { Command } from '../../utils/typings'

export default {
  name: 'np',
  aliases: [],
  category: 'music',
  execute: async (msg, client) => {
    if (!msg.guild) return
    const m = await msg.channel.send(
      BananaClient.getNowPlayingEmbed(msg.guild!),
    )
    if (client.controllerMap.get(msg.guild.id))
      await client.controllerMap.get(msg.guild.id)?.delete()
    client.controllerMap.set(msg.guild.id, m)
    await BananaClient.initController(m)
  },
} as Command
