import { Context, Logger, Schema, isInteger } from 'koishi'

export const name = 'ffxiv-bot-aidon'
export const inject = {
  optional: ['database']
}

export interface Config {

}

declare module 'koishi' {
  interface Tables {
    ffxiv_bot_aidon_default_server: DefaultServerTable
  }
}

// 这里是新增表的接口类型
export interface DefaultServerTable {
  id: number,
  targetId: string, // channelId
  targetType: number, // 0 群，频道；1 私聊；
  default_server: string,
  created_at: Date,
  created_by: string,
  updated_at: Date,
  updated_by: string,
}

export const Config: Schema<Config> = Schema.object({
  listing_num: Schema.number().default(5).min(1).max(10).step(1).description('默认列表条数'),
  history_num: Schema.number().default(5).min(1).max(10).step(1).description('默认历史条数'),
})

// universalis api
const universalis_host = 'https://universalis.app';
const data_centers_api_url = '/api/v2/data-centers';
const worlds_api_url = '/api/v2/worlds';
const market_board_api_url = '/api/v2/{worldDcRegion}/{itemIds}';
// xivapi
const xivapi_cn_host = 'https://cafemaker.wakingsands.com';
// xivapi 国际服
const xivapi_host = 'https://xivapi.com';
const search_api_url = '/search';

const logger = new Logger('fxiv-bot-aidon');

// 数据中心列表
const data_center_all = [{ "name": "Elemental", "region": "Japan", "worlds": [45, 49, 50, 58, 68, 72, 90, 94] }, { "name": "Gaia", "region": "Japan", "worlds": [43, 46, 51, 59, 69, 76, 92, 98] }, { "name": "Mana", "region": "Japan", "worlds": [23, 28, 44, 47, 48, 61, 70, 96] }, { "name": "Aether", "region": "North-America", "worlds": [40, 54, 57, 63, 65, 73, 79, 99] }, { "name": "Primal", "region": "North-America", "worlds": [35, 53, 55, 64, 77, 78, 93, 95] }, { "name": "Chaos", "region": "Europe", "worlds": [39, 71, 80, 83, 85, 97, 400, 401] }, { "name": "Light", "region": "Europe", "worlds": [33, 36, 42, 56, 66, 67, 402, 403] }, { "name": "Crystal", "region": "North-America", "worlds": [34, 37, 41, 62, 74, 75, 81, 91] }, { "name": "Materia", "region": "Oceania", "worlds": [21, 22, 86, 87, 88] }, { "name": "Meteor", "region": "Japan", "worlds": [24, 29, 30, 31, 32, 52, 60, 82] }, { "name": "Dynamis", "region": "North-America", "worlds": [404, 405, 406, 407] }, { "name": "NA Cloud DC (Beta)", "region": "NA-Cloud-DC", "worlds": [3000, 3001] }, { "name": "陆行鸟", "region": "中国", "worlds": [1167, 1081, 1042, 1044, 1060, 1173, 1174, 1175] }, { "name": "莫古力", "region": "中国", "worlds": [1172, 1076, 1171, 1170, 1113, 1121, 1166, 1176] }, { "name": "猫小胖", "region": "中国", "worlds": [1043, 1169, 1106, 1045, 1177, 1178, 1179] }, { "name": "豆豆柴", "region": "中国", "worlds": [1192, 1183, 1180, 1186, 1201, 1068, 1064, 1187] }, { "name": "한국", "region": "한국", "worlds": [2075, 2076, 2077, 2078, 2080] }];
// 数据中心名
const data_center_name_map = new Map<string, boolean>(data_center_all.map(data_center => [data_center.name, data_center.region === "中国"]));
const data_center_names_all = [...data_center_name_map.keys()];
const data_center_names_cn = [...data_center_name_map.keys()].filter(e => data_center_name_map.get(e));
// 地区名
const region_name_map = new Map<string, boolean>(data_center_all.map(data_center => [data_center.region, data_center.region === "中国"]));
const world_center_map = new Map<number, { id: number, data_center_name: string, cn: boolean }>(data_center_all
  .map(data_center => data_center.worlds.map<[number, { id: number, data_center_name: string, cn: boolean }]>(world => [world, { id: world, data_center_name: data_center.name, cn: data_center.region === "中国" }]))
  .reduce((acc, worlds) => [...acc, ...worlds]));
// 服务器列表，不怎么变动所以先写死
const servers = [{ "id": 21, "name": "Ravana" }, { "id": 22, "name": "Bismarck" }, { "id": 23, "name": "Asura" }, { "id": 24, "name": "Belias" }, { "id": 28, "name": "Pandaemonium" }, { "id": 29, "name": "Shinryu" }, { "id": 30, "name": "Unicorn" }, { "id": 31, "name": "Yojimbo" }, { "id": 32, "name": "Zeromus" }, { "id": 33, "name": "Twintania" }, { "id": 34, "name": "Brynhildr" }, { "id": 35, "name": "Famfrit" }, { "id": 36, "name": "Lich" }, { "id": 37, "name": "Mateus" }, { "id": 39, "name": "Omega" }, { "id": 40, "name": "Jenova" }, { "id": 41, "name": "Zalera" }, { "id": 42, "name": "Zodiark" }, { "id": 43, "name": "Alexander" }, { "id": 44, "name": "Anima" }, { "id": 45, "name": "Carbuncle" }, { "id": 46, "name": "Fenrir" }, { "id": 47, "name": "Hades" }, { "id": 48, "name": "Ixion" }, { "id": 49, "name": "Kujata" }, { "id": 50, "name": "Typhon" }, { "id": 51, "name": "Ultima" }, { "id": 52, "name": "Valefor" }, { "id": 53, "name": "Exodus" }, { "id": 54, "name": "Faerie" }, { "id": 55, "name": "Lamia" }, { "id": 56, "name": "Phoenix" }, { "id": 57, "name": "Siren" }, { "id": 58, "name": "Garuda" }, { "id": 59, "name": "Ifrit" }, { "id": 60, "name": "Ramuh" }, { "id": 61, "name": "Titan" }, { "id": 62, "name": "Diabolos" }, { "id": 63, "name": "Gilgamesh" }, { "id": 64, "name": "Leviathan" }, { "id": 65, "name": "Midgardsormr" }, { "id": 66, "name": "Odin" }, { "id": 67, "name": "Shiva" }, { "id": 68, "name": "Atomos" }, { "id": 69, "name": "Bahamut" }, { "id": 70, "name": "Chocobo" }, { "id": 71, "name": "Moogle" }, { "id": 72, "name": "Tonberry" }, { "id": 73, "name": "Adamantoise" }, { "id": 74, "name": "Coeurl" }, { "id": 75, "name": "Malboro" }, { "id": 76, "name": "Tiamat" }, { "id": 77, "name": "Ultros" }, { "id": 78, "name": "Behemoth" }, { "id": 79, "name": "Cactuar" }, { "id": 80, "name": "Cerberus" }, { "id": 81, "name": "Goblin" }, { "id": 82, "name": "Mandragora" }, { "id": 83, "name": "Louisoix" }, { "id": 85, "name": "Spriggan" }, { "id": 86, "name": "Sephirot" }, { "id": 87, "name": "Sophia" }, { "id": 88, "name": "Zurvan" }, { "id": 90, "name": "Aegis" }, { "id": 91, "name": "Balmung" }, { "id": 92, "name": "Durandal" }, { "id": 93, "name": "Excalibur" }, { "id": 94, "name": "Gungnir" }, { "id": 95, "name": "Hyperion" }, { "id": 96, "name": "Masamune" }, { "id": 97, "name": "Ragnarok" }, { "id": 98, "name": "Ridill" }, { "id": 99, "name": "Sargatanas" }, { "id": 400, "name": "Sagittarius" }, { "id": 401, "name": "Phantom" }, { "id": 402, "name": "Alpha" }, { "id": 403, "name": "Raiden" }, { "id": 404, "name": "Marilith" }, { "id": 405, "name": "Seraph" }, { "id": 406, "name": "Halicarnassus" }, { "id": 407, "name": "Maduin" }, { "id": 3000, "name": "Cloudtest01" }, { "id": 3001, "name": "Cloudtest02" }, { "id": 1167, "name": "红玉海" }, { "id": 1081, "name": "神意之地" }, { "id": 1042, "name": "拉诺西亚" }, { "id": 1044, "name": "幻影群岛" }, { "id": 1060, "name": "萌芽池" }, { "id": 1173, "name": "宇宙和音" }, { "id": 1174, "name": "沃仙曦染" }, { "id": 1175, "name": "晨曦王座" }, { "id": 1172, "name": "白银乡" }, { "id": 1076, "name": "白金幻象" }, { "id": 1171, "name": "神拳痕" }, { "id": 1170, "name": "潮风亭" }, { "id": 1113, "name": "旅人栈桥" }, { "id": 1121, "name": "拂晓之间" }, { "id": 1166, "name": "龙巢神殿" }, { "id": 1176, "name": "梦羽宝境" }, { "id": 1043, "name": "紫水栈桥" }, { "id": 1169, "name": "延夏" }, { "id": 1106, "name": "静语庄园" }, { "id": 1045, "name": "摩杜纳" }, { "id": 1177, "name": "海猫茶屋" }, { "id": 1178, "name": "柔风海湾" }, { "id": 1179, "name": "琥珀原" }, { "id": 1192, "name": "水晶塔" }, { "id": 1183, "name": "银泪湖" }, { "id": 1180, "name": "太阳海岸" }, { "id": 1186, "name": "伊修加德" }, { "id": 1201, "name": "红茶川" }, { "id": 1068, "name": "黄金谷" }, { "id": 1064, "name": "月牙湾" }, { "id": 1187, "name": "雪松原" }, { "id": 2075, "name": "카벙클" }, { "id": 2076, "name": "초코보" }, { "id": 2077, "name": "모그리" }, { "id": 2078, "name": "톤베리" }, { "id": 2080, "name": "펜리르" }];
const data_center_server_map_all = new Map<string, string[]>(data_center_all.map(e => [e.name, e.worlds.map(w => servers.find(p => p.id === w).name)]));
const data_center_server_map_cn = new Map<string, string[]>(data_center_all.filter(e => e.region === "中国").map(e => [e.name, e.worlds.map(w => servers.find(p => p.id === w).name)]));

const servers_map = new Map<string, { id: number, cn: boolean }>(servers.map((server) => [server.name, { id: server.id, cn: world_center_map.has(server.id) }]));


// 查询物品信息
async function fetchItemInfo(item_name: string, cn: boolean, ctx: Context): Promise<any> {
  const url = (cn ? xivapi_cn_host : xivapi_host) + '/search';
  logger.debug('url: ' + JSON.stringify(url));
  const res = await ctx.http.get(url, {
    params: {
      indexes: 'Item', // 固定，搜索物品
      'string': item_name, // 物品名称
    }
  });
  logger.debug('fetchItemId: ' + JSON.stringify(res));
  return res?.Results[0];
}

// 查询物品市场状态
async function fetchMarketBoardData(item: any, server_name: number | string, ln: number, hn: number, ctx: Context): Promise<any> {
  logger.debug('item: ' + JSON.stringify(item));
  const url = universalis_host + market_board_api_url.replace("{worldDcRegion}", `${server_name}`).replace("{itemIds}", item.ID);
  logger.debug('url: ' + JSON.stringify(url));
  const res = await ctx.http.get(url, {
    params: {
      listings: ln, // 列表大小
      entries: hn, // 历史大小
      hq: null, // 是否hq
    }
  });
  logger.debug('fetchMarketBoardData: ' + JSON.stringify(res));
  return res;
}

function fetchWorldNameAndDataCenterName(world_name_inline: string, world_name_query: string, all_mode: boolean) {
  if (world_name_query) {
    return '';
  }
  const world_name = world_name_inline ? world_name_inline : world_name_query;
  if (!all_mode) {
    return ' ' + world_name;
  }
  const data_center_name = world_center_map.get(servers_map.get(world_name).id).data_center_name;
  return ' ' + world_name + (data_center_name ? '(' + data_center_name + ')' : '');
}

async function fetchServerDB(targetId: string, ctx: Context) {
  return JSON.parse((await ctx.database.get('ffxiv_bot_aidon_default_server', { targetId: { $eq: targetId } }))[0].default_server);
}

function fetchServer(server_name: string) {
  const servers = [];
  // 按数据中心查询，如 陆行鸟
  if (data_center_name_map.has(server_name)) {
    servers.push({ id: server_name, name: server_name, cn: data_center_name_map.get(server_name) });
  }
  // 按地区查询，如 中国
  else if (region_name_map.has(server_name)) {
    servers.push({ id: server_name, name: server_name, cn: region_name_map.get(server_name), all_mode: true });
  }
  // 按具体服务器查询，如 神意之地
  else if (servers_map.has(server_name)) {
    servers.push({ ...servers_map.get(server_name), name: server_name });
  }
  return servers
}

export function apply(ctx: Context) {
  // create table
  ctx.model.extend('ffxiv_bot_aidon_default_server', {
    'id': 'unsigned',
    'targetId': 'string', // channelId
    'targetType': 'unsigned', // 0 群，频道；1 私聊；
    'default_server': 'string',
    'created_at': 'timestamp',
    'created_by': 'string',
    'updated_at': 'timestamp',
    'updated_by': 'string',
  }, {
    primary: 'id',
    unique: ['targetId'],
    foreign: null,
    autoInc: true
  });

  // write your plugin here
  ctx.command('设置默认服务器 <server_name>', '为当前群聊/频道设置默认服务器')
    .usage('设置默认服务器，已设置过则变成修改')
    .action((argv, server_name) => {
      logger.debug(argv);
      if (!argv.session) {
        return '未获取到session';
      }
      if (!ctx.database) {
        return '需要设置数据库以支持该操作';
      }
      const servers = fetchServer(server_name);
      if (servers.length == 0) {
        return '服务器不存在';
      }
      logger.debug(argv.session.channelId);
      ctx.database.get('ffxiv_bot_aidon_default_server', { targetId: { $eq: argv.session.channelId } }).then((record) => {
        if (!record[0]) {// insert
          ctx.database.create('ffxiv_bot_aidon_default_server', {
            // id: -1, //auto
            targetId: argv.session.channelId,
            targetType: 0,
            default_server: JSON.stringify(servers[0]),
            created_at: new Date(),
            created_by: argv.session.event?.user?.id,
            updated_at: new Date(),
            updated_by: argv.session.event?.user?.id,
          }).then(_ => {
            argv.session.send(`成功设置 ${server_name} 为默认服务器`);
          }).catch(_ => {
            argv.session.send('发生错误，请联系管理员');
          });
        } else { // update
          if (servers[0].id === JSON.parse(record[0].default_server).id) { // no change
            argv.session.send(`当前 ${server_name} 为默认服务器，无需修改`);
          } else { // perform change
            ctx.database.upsert('ffxiv_bot_aidon_default_server', _ => [{
              ...record[0],
              default_server: JSON.stringify(servers[0]),
              updated_at: new Date(),
              updated_by: argv.session.event?.user?.id,
            }]).then(_ => {
              argv.session.send(`成功修改 ${server_name} 为默认服务器`);
            }).catch(_ => {
              argv.session.send('发生错误，请联系管理员');
            });
          }
        }
      }).catch(_ => { argv.session.send('发生错误，请联系管理员'); });
    });

  ctx.command('查询大区列表', '大区列表查询')
    .usage('返回可用的大区列表')
    .action((_) => `可查询的大区列表如下：中国，${data_center_names_cn.join('，')}`);

  ctx.command('查询服务器列表 [data_center_name]', '服务器列表查询')
    .usage('data_center_name：大区名\n可以指定大区，如 查询服务器列表 陆行鸟，不指定默认查询所有服务器')
    .action((_, data_center_name) => {
      if (data_center_name && data_center_names_cn.indexOf(data_center_name) < 0) {
        return `大区名错误，` + `可查询的大区列表如下：${data_center_names_cn.join('，')}`
      }
      const str = [...data_center_server_map_cn.entries()].map(entry => {
        if (!data_center_name || data_center_name === entry[0]) {
          return `\n${entry[0]}\n  ` + entry[1].join('\n  ');
        } else {
          return '';
        }
      }
      ).join('');
      return `可查询的服务器列表如下：${str}`;
    });

  ctx.command('查询 <item_name> <server_name> [num1:number] [num2:number]', '市场物价查询')
    .usage('查询 物品名 服务器名 条数 历史条数 \nitem_name：道具名，可以部分\nserver_name：大区名或服务器名或地区\num1：条数，1~10\nnum2：历史条数，1~10')
    .example('查询 英雄失传碎晶 神意之地')
    .example('查询 英雄失传碎晶 陆行鸟')
    .example('查询 英雄失传碎晶 中国')
    .example('查询 英雄失传碎晶 神意之地 5 5')
    .action((argv, item_name, server_name, num1, num2) => {
      logger.debug(argv);
      if (!argv.session) {
        return '未获取到session';
      }
      const _num1 = isInteger((Number)(num1)) && num1 > 0 && num1 <= 10 ? num1 : ctx.config.listing_num;
      const _num2 = isInteger((Number)(num2)) && num2 > 0 && num2 <= 10 ? num2 : ctx.config.history_num;
      if (!item_name) {
        return '未指定物品名';
      }
      const fn = (server) => fetchItemInfo(item_name, server.cn, ctx).catch((_) => argv.session.send('发生错误，请联系管理员')).then((item) => {
        if (item) {
          fetchMarketBoardData(item, server.id, _num1, _num2, ctx).catch((_) => argv.session.send('发生错误，请联系管理员')).then((data) => {
            // 出售列表
            const listings = [...data?.listings]
              .map((value) =>
                `  ${value.pricePerUnit.toLocaleString()} x ${value.quantity.toLocaleString()}${value.hq ? '(HQ)' : ''} ` +
                `${value.retainerName}${fetchWorldNameAndDataCenterName(value.worldName, data.worldName, server.all_mode)} ` +
                `总价/手续费：${value.total.toLocaleString()}/${value.tax.toLocaleString()} ` +
                `时间：${new Date(value.lastReviewTime * 1000).toLocaleString('zh-CN', { hour12: false })}`)
              .join("\n");
            // 购买历史
            const recent_histroy = [...data?.recentHistory]
              .map((value) =>
                `  ${value.pricePerUnit.toLocaleString()} x ${value.quantity.toLocaleString()}${value.hq ? '(HQ)' : ''} ` +
                `${value.buyerName}${fetchWorldNameAndDataCenterName(value.worldName, data.worldName, server.all_mode)} ` +
                `总价：${value.total.toLocaleString()} ` +
                `时间：${new Date(value.timestamp * 1000).toLocaleString('zh-CN', { hour12: false })}`)
              .join("\n");
            // 输出消息
            const result = `` +
              `服务器：${server.name}\n` +
              `物品名称：${item.Name}\n` +
              `价格列表：\n${listings}\n` +
              `购买历史：\n${recent_histroy}\n` +
              `平均价NQ：${data.currentAveragePriceNQ.toLocaleString()} / ` + `HQ：${data.currentAveragePriceHQ.toLocaleString()}\n` +
              `最低价NQ：${data.minPriceNQ.toLocaleString()} / ` + `HQ：${data.minPriceHQ.toLocaleString()}\n` +
              `最高价NQ：${data.maxPriceNQ.toLocaleString()} / ` + `HQ：${data.maxPriceHQ.toLocaleString()}\n` +
              '';
            argv.session.send(result);
          });
        } else {
          argv.session.send('未查询到任何物品，请检查输入的物品名称');
        }
      });
      if (!server_name) {// 未提供服务器，尝试默认
        if (!ctx.database) {
          return '未指定服务器，且无默认服务器';
        } else {
          fetchServerDB(argv.session.channelId, ctx).then((server) => {
            if (!server) {
              argv.session.send('未指定服务器，且无默认服务器');
            } else {
              fn(server);
            }
          }).catch((_) => argv.session.send('发生错误，请联系管理员'));
        }
      } else {// 指名了服务器
        const servers = fetchServer(server_name);
        if (servers.length == 0) {
          return '服务器不存在';
        }
        const server: { id: number | string, cn: boolean, all_mode?: boolean } = servers.pop();
        fn(server);
      }
    });
}
