import { Argv, Context } from 'koishi';
import { data_center_all, servers } from '../constant/server';
import logger from '../utils/logger';
// 数据中心名
const data_center_name_map = new Map<string, boolean>(
  data_center_all.map(data_center => [
    data_center.name,
    data_center.region === '中国'
  ])
);
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const data_center_names_all = [...data_center_name_map.keys()];
const data_center_names_cn = [...data_center_name_map.keys()].filter(e =>
  data_center_name_map.get(e)
);
// 地区名
const region_name_map = new Map<string, boolean>(
  data_center_all.map(data_center => [
    data_center.region,
    data_center.region === '中国'
  ])
);
const world_center_map = new Map<
  number,
  { id: number; data_center_name: string; cn: boolean }
>(
  data_center_all
    .map(data_center =>
      data_center.worlds.map<
        [number, { id: number; data_center_name: string; cn: boolean }]
      >(world => [
        world,
        {
          id: world,
          data_center_name: data_center.name,
          cn: data_center.region === '中国'
        }
      ])
    )
    .reduce((acc, worlds) => [...acc, ...worlds])
);

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const data_center_server_map_all = new Map<string, string[]>(
  data_center_all.map(e => [
    e.name,
    e.worlds.map(w => servers.find(p => p.id === w).name)
  ])
);
const data_center_server_map_cn = new Map<string, string[]>(
  data_center_all
    .filter(e => e.region === '中国')
    .map(e => [e.name, e.worlds.map(w => servers.find(p => p.id === w).name)])
);

const servers_map = new Map<string, { id: number; cn: boolean }>(
  servers.map(server => [
    server.name,
    { id: server.id, cn: world_center_map.has(server.id) }
  ])
);

function fetchWorldNameAndDataCenterName(
  world_name_inline: string,
  world_name_query: string,
  all_mode: boolean
) {
  if (world_name_query) {
    return '';
  }
  const world_name = world_name_inline ? world_name_inline : world_name_query;
  if (!all_mode) {
    return ' ' + world_name;
  }
  const data_center_name = world_center_map.get(
    servers_map.get(world_name).id
  ).data_center_name;
  return (
    ' ' + world_name + (data_center_name ? '(' + data_center_name + ')' : '')
  );
}

async function fetchServerDB(targetId: string, ctx: Context) {
  return JSON.parse(
    (
      await ctx.database.get('ffxiv_bot_aidon_default_server', {
        targetId: { $eq: targetId }
      })
    )[0].default_server
  );
}

function fetchServer(server_name: string) {
  const servers = [];
  // 按数据中心查询，如 陆行鸟
  if (data_center_name_map.has(server_name)) {
    servers.push({
      id: server_name,
      name: server_name,
      cn: data_center_name_map.get(server_name)
    });
  }
  // 按地区查询，如 中国
  else if (region_name_map.has(server_name)) {
    servers.push({
      id: server_name,
      name: server_name,
      cn: region_name_map.get(server_name),
      all_mode: true
    });
  }
  // 按具体服务器查询，如 神意之地
  else if (servers_map.has(server_name)) {
    servers.push({ ...servers_map.get(server_name), name: server_name });
  }
  return servers;
}

const setDefaultServerHandler = (
  ctx: Context,
  argv: Argv,
  server_name: string
) => {
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
  ctx.database
    .get('ffxiv_bot_aidon_default_server', {
      targetId: { $eq: argv.session.channelId }
    })
    .then(
      record => {
        if (!record[0]) {
          // insert
          ctx.database
            .create('ffxiv_bot_aidon_default_server', {
              // id: -1, //auto
              targetId: argv.session.channelId,
              targetType: 0,
              default_server: JSON.stringify(servers[0]),
              created_at: new Date(),
              created_by: argv.session.event?.user?.id,
              updated_at: new Date(),
              updated_by: argv.session.event?.user?.id
            })
            .then(
              () => {
                argv.session.send(`成功设置 ${server_name} 为默认服务器`);
              },
              () => {
                argv.session.send('发生错误，请联系管理员');
              }
            );
        } else {
          // update
          if (servers[0].id === JSON.parse(record[0].default_server).id) {
            // no change
            argv.session.send(`当前 ${server_name} 为默认服务器，无需修改`);
          } else {
            // perform change
            ctx.database
              .upsert('ffxiv_bot_aidon_default_server', () => [
                {
                  ...record[0],
                  default_server: JSON.stringify(servers[0]),
                  updated_at: new Date(),
                  updated_by: argv.session.event?.user?.id
                }
              ])
              .then(
                () => {
                  argv.session.send(`成功修改 ${server_name} 为默认服务器`);
                },
                () => {
                  argv.session.send('发生错误，请联系管理员');
                }
              );
          }
        }
      },
      () => {
        argv.session.send('发生错误，请联系管理员');
      }
    );
};

const getDataCentersHandler = () => {
  return `可查询的大区列表如下：中国，${data_center_names_cn.join('，')}`;
};

const getServerListHandler = data_center_name => {
  if (data_center_name && data_center_names_cn.indexOf(data_center_name) < 0) {
    return (
      '大区名错误，' +
      `可查询的大区列表如下：${data_center_names_cn.join('，')}`
    );
  }
  const str = [...data_center_server_map_cn.entries()]
    .map(entry => {
      if (!data_center_name || data_center_name === entry[0]) {
        return `\n${entry[0]}\n  ` + entry[1].join('\n  ');
      } else {
        return '';
      }
    })
    .join('');
  return `可查询的服务器列表如下：${str}`;
};

export {
  fetchWorldNameAndDataCenterName,
  fetchServerDB,
  fetchServer,
  setDefaultServerHandler,
  getDataCentersHandler,
  getServerListHandler
};
