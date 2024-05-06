import { Schema } from 'koishi';

export interface Config {
  listing_num: number;
  history_num: number;
  use_markdown_qq: boolean;
  templdate_id_pvp_qq: string;
}

export const Config: Schema<Config> = Schema.object({
  listing_num: Schema.number()
    .default(5)
    .min(1)
    .max(10)
    .step(1)
    .description('默认列表条数'),
  history_num: Schema.number()
    .default(5)
    .min(1)
    .max(10)
    .step(1)
    .description('默认历史条数'),
  use_markdown_qq: Schema.boolean()
    .default(false)
    .description('使用markdown模板发送部分消息，目前仅支持qq')
    .experimental(),
  templdate_id_pvp_qq: Schema.string().description(
    '战场信息用的模板id，对应在qq后台申请的'
  )
});
