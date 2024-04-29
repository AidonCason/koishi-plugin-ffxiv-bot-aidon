import { Context } from 'koishi';
import { Config } from './config/settings';
import {} from '@koishijs/plugin-adapter-qq';
import { getMarketBoardDataHandler } from './service/marketService';
import { getBattleFieldInfoHandler } from './service/battleFieldService';
import {
  getDataCentersHandler,
  getServerListHandler,
  setDefaultServerHandler
} from './service/serverService';

// 插件名
export const name = 'ffxiv-bot-aidon';
// 前置服务
export const inject = {
  // 可选
  optional: ['database']
};

export function apply(ctx: Context, config: Config) {
  // create table
  ctx.model.extend(
    'ffxiv_bot_aidon_default_server',
    {
      id: 'unsigned',
      targetId: 'string', // channelId
      targetType: 'unsigned', // 0 群，频道；1 私聊；
      default_server: 'string',
      created_at: 'timestamp',
      created_by: 'string',
      updated_at: 'timestamp',
      updated_by: 'string'
    },
    {
      primary: 'id',
      unique: ['targetId'],
      foreign: null,
      autoInc: true
    }
  );

  ctx.i18n.define('zh-CN', {
    '1': '周一',
    '2': '周二',
    '3': '周三',
    '4': '周四',
    '5': '周五',
    '6': '周六',
    '7': '周日'
  });
  // write your plugin here
  ctx
    .command('战场', '查询战场轮换信息')
    .action(argv => getBattleFieldInfoHandler(ctx, config, argv));

  ctx
    .command('设置默认服务器 <server_name>', '为当前群聊/频道设置默认服务器')
    .usage('设置默认服务器，已设置过则变成修改')
    .action((argv, server_name) =>
      setDefaultServerHandler(ctx, argv, server_name)
    );

  ctx
    .command('查询大区列表', '大区列表查询')
    .usage('返回可用的大区列表')
    .action(() => getDataCentersHandler());

  ctx
    .command('查询服务器列表 [data_center_name]', '服务器列表查询')
    .usage(
      'data_center_name：大区名\n可以指定大区，如 查询服务器列表 陆行鸟，不指定默认查询所有服务器'
    )
    .action((_, data_center_name) => getServerListHandler(data_center_name));

  ctx
    .command(
      '查询 <item_name> <server_name> [num1:number] [num2:number]',
      '市场物价查询'
    )
    .usage(
      '查询 物品名 服务器名 条数 历史条数 \nitem_name：道具名，可以部分\nserver_name：大区名或服务器名或地区，设置了默认服务器的情况下可以省略(当前channel)\num1：条数，1~10\nnum2：历史条数，1~10'
    )
    .example('查询 英雄失传碎晶 神意之地')
    .example('查询 英雄失传碎晶 陆行鸟')
    .example('查询 英雄失传碎晶 中国')
    .example('查询 英雄失传碎晶 神意之地 5 5')
    .action((argv, item_name, server_name, num1, num2) =>
      getMarketBoardDataHandler(ctx, argv, item_name, server_name, num1, num2)
    );
}
