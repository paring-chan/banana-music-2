import {
  Client,
  Collection,
  Guild,
  Message,
  MessageEmbed,
  Team,
  User,
} from 'discord.js'
import Dokdo from 'dokdo'
import path from 'path'
import fs from 'fs'
import { Command } from './typings'
import chokidar from 'chokidar'
import { Manager } from 'erela.js'

declare module 'discord.js' {
  interface Client {
    music: Manager
    controllerMap: Collection<string, Message>
  }
}

export default class BananaClient extends Client {
  owners: string[] = []

  config = require('../../config.json')

  path = path.resolve(path.join(__dirname, '../commands'))

  timeout?: NodeJS.Timeout

  constructor() {
    super({
      restTimeOffset: 0,
    })
    this.on('ready', () => console.log(`Logged in as ${this.user!.tag}`))
    this.load(this.path)
    chokidar.watch(this.path).on('change', () => {
      if (!this.timeout) {
        this.timeout = setTimeout(() => {
          this.commands = []
          this.load(this.path)
          this.timeout = undefined
        }, 1000)
      }
    })
    this.controllerMap = new Collection()
    this.on('message', this.executeCommand.bind(this))
    this.music = new Manager({
      send: (id, payload) => {
        const guild = this.guilds.cache.get(id)
        if (guild) guild.shard.send(payload)
      },
      nodes: this.config.nodes,
    })

    this.music.on('nodeConnect', (node) => {
      console.log(`Node ${node.options.host}:${node.options.port} connected.`)
    })
    this.music.on('nodeError', (node, error) => {
      console.log(
        `Node ${node.options.host}:${node.options.port} encounted an error: ${error.message}`,
      )
    })
    this.music.on('queueEnd', (player) => {
      player.destroy()
    })

    this.music.on('nodeRaw', async (payload: any) => {
      if (payload.op === 'playerUpdate') {
        const guild = this.guilds.cache.get(payload.guildId)
        if (guild) {
          let m = this.controllerMap.get(guild.id)
          if (m?.deleted) {
            this.controllerMap.set(
              guild.id,
              await m.channel
                .send(BananaClient.getNowPlayingEmbed(guild))
                .then((r) => {
                  BananaClient.initController(r)
                  return r
                }),
            )
            return
          }
          if (m) {
            m.edit(BananaClient.getNowPlayingEmbed(guild)).catch(async () => {
              const msg = await m?.channel.send(
                BananaClient.getNowPlayingEmbed(guild),
              )!
              this.controllerMap.set(guild.id, msg)
              await BananaClient.initController(msg)
              return
            })
          }
        }
      }
    })

    this.on('ready', () => this.music.init(this.user!.id))
    this.on('raw', (payload) => this.music.updateVoiceState(payload))
  }

  static async initController(msg: Message) {
    if ((msg as any).controllerInitialized) return
    const emojis = ['⏯️', '⏹️', '▶️', '🔄', '➕', '➖']

    ;(msg as any).controllerInitialized = true

    await Promise.all(emojis.map((r) => msg.react(r)))
  }

  static formatTime(duration: number) {
    const d = new Date(0)
    d.setMilliseconds(duration)
    return d.toISOString().substr(11, 8)
  }

  static createBar(
    total: number,
    current: number,
    size = 15,
    line = '▬',
    slider = '🔘',
  ) {
    if (current > total) {
      const bar = line.repeat(size + 2)
      const percentage = (current / total) * 100
      return [bar, percentage]
    } else {
      const percentage = current / total
      const progress = Math.round(size * percentage)
      const emptyProgress = size - progress
      const progressText = line.repeat(progress).replace(/.$/, slider)
      const emptyProgressText = line.repeat(emptyProgress)
      const bar = progressText + emptyProgressText
      const calculated = percentage * 100
      return [bar, calculated]
    }
  }

  static getNowPlayingEmbed(guild: Guild): MessageEmbed {
    const embed = new MessageEmbed()
    const player = guild.client.music.players.get(guild.id)
    if (!player || !player.queue.current)
      embed.setTitle('재생중인 곡이 없네요!')
    else {
      const t = player.queue.current
      embed.setTitle(
        `${player.playing ? ':arrow_forward:' : ':pause_button:'} ${t.title}`,
      )
      embed.setThumbnail(t.displayThumbnail?.('maxresdefault')!)
      embed.setDescription(
        `${this.formatTime(player.position)} ${
          this.createBar(t.duration!, player.position)[0]
        } -${this.formatTime(t.duration! - player.position)}`,
      )
      embed.addFields([
        {
          name: '볼륨',
          value: player.volume + '%',
          inline: true,
        },
        {
          name: '반복 모드',
          value: player.queueRepeat
            ? '대기열 전체 반복'
            : player.trackRepeat
            ? '현재 곡 반복'
            : '반복 안함',
          inline: true,
        },
      ])
      embed.setFooter(
        (t.requester as any).tag,
        (t.requester as any).displayAvatarURL({ dynamic: true }),
      )
    }
    return embed
  }

  async executeCommand(msg: Message) {
    const prefix = this.config.prefix as string
    if (
      msg.author.bot ||
      msg.author.id === this.user?.id ||
      !msg.content.startsWith(prefix)
    )
      return
    const args = msg.content.slice(prefix.length).split(' ')
    const command = args.shift()
    if (!command) return
    const cmd = this.commands.find(
      (i) =>
        i.name === command.toLowerCase() ||
        i.aliases.includes(command.toLowerCase()),
    )
    if (!cmd) return
    if (cmd.ownerOnly) {
      if (!this.owners.includes(msg.author.id)) return msg.reply('권한 없어여!')
    }
    try {
      await cmd.execute(msg, this)
    } catch (e) {
      return msg.reply(`에러\n\`\`\`js\n${e.message}\`\`\``)
    }
  }

  commands: Command[] = []

  load(dir: string) {
    const items = fs.readdirSync(dir)
    for (const item of items) {
      if (fs.lstatSync(path.join(dir, item)).isDirectory()) {
        this.load(path.join(dir, item))
      } else {
        const p = require.resolve(path.join(dir, item))
        delete require.cache[p]
        const module = require(p).default as Command
        this.commands.push(module)
        console.log(`Loaded command ${module.name}`)
      }
    }
  }

  async login() {
    await super.login(this.config.token)
    const app = await this.fetchApplication()
    let owners: string[] = []
    if (app.owner instanceof Team) {
      owners = app.owner.members.map((r) => r.id)
    } else if (app.owner instanceof User) {
      owners = [app.owner.id]
    }
    const dokdo = new Dokdo(this, {
      noPerm(msg) {
        msg.reply('권한 없어여')
      },
      owners,
      prefix: this.config.prefix,
    })
    this.on('message', dokdo.run.bind(dokdo))
    return this.config.token
  }
}
