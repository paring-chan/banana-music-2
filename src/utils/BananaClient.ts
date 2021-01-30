import { Client, Team, User } from 'discord.js'
import Dokdo from 'dokdo'
import path from 'path'
import fs from 'fs'
import { Command } from './typings'
import chokidar from 'chokidar'

export default class BananaClient extends Client {
  owners = []

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
