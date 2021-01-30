import BananaClient from '../../utils/BananaClient'
import { Command } from '../../utils/typings'

export default {
  name: 'volume',
  aliases: ['볼륨'],
  category: 'music',
  execute: async (msg, client, [vol]) => {
    if (!msg.member?.voice.channelID)
      return msg.reply('음성 채널에 들어가주세요')
    const player =
      client.music.players.get(msg.guild!.id) ??
      client.music.create({
        selfDeafen: true,
        guild: msg.guild!.id,
        textChannel: msg.channel.id,
        voiceChannel: msg.member.voice.channelID,
      })
    if (player.voiceChannel !== msg.member.voice.channelID)
      return msg.reply('음악을 재생중인 음성채널에 들어가주세요!')
    let volume = Number(vol)
    if (isNaN(volume) || volume > 1000 || volume < 1) {
      return msg.reply(`${client.config.prefix}볼륨 <1-1000>`)
    }
    player.setVolume(volume)
    await msg.react('✅')
  },
} as Command
