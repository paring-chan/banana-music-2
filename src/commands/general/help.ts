import { Command } from "../../utils/typings";

export default {
    name: 'help',
    aliases: [],
    execute: async (msg) => {
        msg.reply('테스트인데여')
    },
    category: 'general'
} as Command