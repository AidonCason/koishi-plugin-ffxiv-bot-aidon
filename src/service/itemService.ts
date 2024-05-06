import logger from '../utils/logger';
import { Context } from 'koishi';
import { xivapi_cn_host, xivapi_host } from '../constant/urls';

interface Item {
  ID: number;
  Name: string;
}

// 查询物品信息
async function fetchItemInfo(
  item_name: string,
  cn: boolean,
  ctx: Context
): Promise<Item> {
  const url = (cn ? xivapi_cn_host : xivapi_host) + '/search';
  logger.debug('url: ' + JSON.stringify(url));
  const res = await ctx.http.get(url, {
    params: {
      indexes: 'Item', // 固定，搜索物品
      string: item_name // 物品名称
    }
  });
  logger.debug('fetchItemId: ' + JSON.stringify(res));
  return res?.Results[0];
}

export { fetchItemInfo, Item };
