import { Context, Schema } from 'koishi'

export const name = 'ffxiv-bot-aidon'

export interface Config { }

export const Config: Schema<Config> = Schema.object({})

export function apply(ctx: Context) {
  // write your plugin here
  ctx.command('查询 <item_name>')
    .action((err, item_name) => {
      console.log(item_name);
      return item_name;
    });
}
