import { MessageEmbed } from 'discord.js'
import { Command } from '../../utils/typings'
import _ from 'lodash'
import { MessageReaction } from 'discord.js'
import { User } from 'discord.js'

export default {
  name: 'queue',
  aliases: [],
  category: 'music',
  execute: async (msg, client) => {
    if (!msg.guild) return
    const player = client.music.players.get(msg.guild.id)
    if (!player) return msg.reply('재생중인 노래가 없어요')
    if (!player.queue.length) return msg.reply('남은 곡이 없어요')
    const embed = new MessageEmbed()
    let page = 0
    const chunked = _.chunk(player.queue, 10)
    embed.setTitle(`대기열 - ${page + 1}/${chunked.length}페이지`)
    embed.setDescription(
      chunked[page].map(
        (it, i) =>
          `${page * 10 + i + 1} - [${
            it.title.length > 35 ? it.title.slice(0, 35) + '...' : it.title
          }](${it.uri})`,
      ),
    )
    const m = await msg.channel.send(embed)
    await Promise.all(['◀️', '▶️'].map((r) => m.react(r)))
    const collector = m.createReactionCollector(
      (reaction: MessageReaction, user: User) => user.id === msg.author.id,
      {
        time: 300000,
        dispose: true,
      },
    )
    const execute = (reaction: MessageReaction) => {
      if (reaction.emoji.name === '◀️') {
        if (chunked[page - 1]) {
          page--
        }
      } else if (reaction.emoji.name === '▶️') {
        if (chunked[page + 1]) {
          page++
        }
      } else return
      embed.setTitle(`대기열 - ${page + 1}/${chunked.length}페이지`)
      embed.setDescription(
        chunked[page].map(
          (it, i) =>
            `${page * 10 + i + 1} - [${
              it.title.length > 35 ? it.title.slice(0, 35) + '...' : it.title
            }](${it.uri})`,
        ),
      )
      return m.edit(embed)
    }
    collector.on('collect', execute)
    collector.on('remove', execute)
  },
} as Command
