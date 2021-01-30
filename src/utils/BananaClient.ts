import { Client, Team, User } from "discord.js";
import Dokdo from "dokdo";

export default class BananaClient extends Client {
    owners = []

    config = require('../../config.json')

    constructor() {
        super({
            restTimeOffset: 0
        })
    }

    async login() {
        await super.login(this.config.token)
        const app = await this.fetchApplication()
        let owners: string[] = []
        if (app.owner instanceof Team) {
            owners = app.owner.members.map(r=>r.id)
        } else if (app.owner instanceof User) {
            owners = [app.owner.id]
        }
        const dokdo = new Dokdo(this, {
            noPerm(msg) {
                msg.reply('권한 없어여')
            },
            owners,
            prefix: this.config.prefix
        })
        this.on('message', dokdo.run.bind(dokdo))
        return this.config.token
    }
}