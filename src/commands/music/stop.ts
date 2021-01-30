import { Command } from '../../utils/typings'

export default {
  name: 'stop',
  aliases: [],
  category: 'music',
  execute: async (msg, client, args) => {
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
    player.destroy()
    await msg.react('✅')
  },
} as Command
